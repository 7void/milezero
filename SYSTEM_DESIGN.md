# MileZero System Design Document

## 1. Architectural Philosophy: Modular Monolith

MileZero is engineered as a **modular monolith** with NestJS and PostgreSQL. Last-mile logistics requires strict ACID transactional consistency across pricing quotes, fleet assignment, driver capacity, and immutable tracking history. Splitting these cohesive domains across microservices prematurely introduces dual-write anomalies and distributed transaction overhead (Sagas) without operational benefit.

Domain boundaries are cleanly decoupled into dedicated modules communicating via typed interfaces and atomic Prisma transactions:
- **`PricingModule`**: Authoritative, database-driven pricing calculation.
- **`AssignmentModule`**: Geospatial driver matching with zone fallbacks.
- **`OrdersModule`**: Deterministic Finite State Machine (FSM).
- **`TrackingModule`**: Append-only immutable audit trail and public tracking.
- **`ZonesModule` & `AgentsModule`**: Geographic matrix and fleet state.

---

## 2. Authoritative Rate Calculation Engine

The backend is the sole source of truth for pricing. Client-side price tampering is impossible. Pricing executes through an authoritative 7-step pipeline:

```text
Input: Dimensions (L×W×H), Actual Weight, Pincodes, ServiceType (B2C/B2B), PaymentMode (Prepaid/COD)
  ↓
1. Resolve Zones: Map pickup/drop pincodes to database Zone entities.
2. Volumetric Weight: (Length × Width × Height) / 5000 (cm to kg).
3. Billable Weight: max(Actual Weight, Volumetric Weight).
4. Zone Classification: INTRA_ZONE (pickupZone == dropZone) vs INTER_ZONE (pickupZone != dropZone).
5. Rate Card Lookup: Match active RateCard for ServiceType.
6. Base & Excess Weight Charge:
     Excess Weight = max(0, Billable Weight - BaseWeight)
     Weight Charge = BasePrice + (Excess Weight × PerKgRate)
7. COD Surcharge: Apply active CodConfig (percentage with min/max clamps or flat fee).
```

All pricing parameters (base thresholds, multipliers, min charge, COD caps) are stored in database tables (`RateCard`, `CodConfig`) and modifiable via Admin APIs without code deployments.

---

## 3. Zone Detection Approach

Urban delivery hubs divide cities into operational logistics zones. MileZero models zones with a relational hierarchy:
- **`Zone`**: Geographic entity (e.g., Central Business Hub, North Metro Corridor).
- **`ZonePincode`**: Maps 6-digit postal codes and area landmarks to a parent zone with representative centroid coordinates $(lat, lon)$.

### Resolution Algorithm
1. **Pincode Lookup**: When an order is booked, the system queries `ZonePincode` by `pickupAddress.pincode` and `dropAddress.pincode`.
2. **Coordinate Enrichment**: If address latitude/longitude are omitted, the zone centroid coordinates are assigned automatically.
3. **Fallback Resolution**: If an unmapped pincode is entered, the engine falls back to the default hub zone (`ZONE-CENTRAL`), ensuring resilient uninterrupted operations.

---

## 4. Intelligent Auto-Assignment Logic & Availability

Driver dispatch balances proximity with availability isolation. Drivers exist in three states: `AVAILABLE`, `BUSY`, and `OFFLINE`.

### Proximity Scoring (Haversine Formula)
When auto-assignment executes, candidate drivers are filtered where $\text{availabilityStatus} = \text{AVAILABLE}$. Proximity to the pickup coordinates is computed using the spherical Haversine formula:
$$d = 2R \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$
$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$

### Tiered Fallbacks
1. **Tier 1 (Proximity)**: Selects the nearest available agent with live GPS coordinates.
2. **Tier 2 (Zone Alignment)**: If GPS is unavailable, selects an available agent assigned to `pickupZoneId`.
3. **Tier 3 (Global Pool)**: Selects any active available agent across the city.

### Atomic Concurrency Control
Assignment runs within an atomic database transaction (`prisma.$transaction`). The order transitions to `ASSIGNED`, the driver transitions to `BUSY`, and an audit log event is appended simultaneously, eliminating race conditions.

---

## 5. Order Lifecycle & Failed Delivery Handling

Orders follow a deterministic Finite State Machine (FSM):
$$\text{PENDING} \longrightarrow \text{ASSIGNED} \longrightarrow \text{PICKED\_UP} \longrightarrow \text{IN\_TRANSIT} \longrightarrow \text{OUT\_FOR\_DELIVERY} \longrightarrow \text{DELIVERED}$$

```
                ┌──────────────────────────────────┐
                │        OUT_FOR_DELIVERY          │
                └────────┬────────────────┬────────┘
        Delivery Success │                │ Delivery Failed
                ┌────────▼───┐    ┌───────▼────────┐
                │ DELIVERED  │    │     FAILED     │ (Captures reason & logs attempt)
                └────────────┘    └───────┬────────┘
                                          │ Customer picks new date
                                  ┌───────▼────────┐
                                  │  RESCHEDULED   │ ──► Re-queued for Auto-Assignment
                                  └────────────────┘
```

### Failed Delivery Flow
1. **Failure Capture**: If delivery cannot be completed, the driver selects a verified failure reason (e.g., *Customer Unavailable*, *Payment Not Ready*).
2. **Attempt Recording**: A `DeliveryAttempt` record is created with timestamp, attempt count, and reason.
3. **Driver Release**: The driver's status is freed back to `AVAILABLE`.
4. **Customer Notification & Reschedule**: The customer receives in-app/email/SMS notifications with a 1-click rescheduling modal.
5. **Re-Dispatch**: Choosing a new date sets status to `RESCHEDULED`, clearing the previous assignment and re-queuing the shipment for dispatch.
6. **Immutable Audit Trail (`OrderStatusHistory`)**: Every transition appends an immutable record with actor details, role, timestamp, and GPS coordinates.

---

## 6. Email & In-App Notification Provider Architecture

Notification delivery is designed with **zero-failure resilience** to isolate critical order state transitions from third-party vendor downtime:

```text
Event Trigger (e.g. Order Created / Out for Delivery / Failed / Rescheduled)
  │
  ├─► 1. Always Persist Notification Entity (PostgreSQL) -> User Inbox / Bell Center
  │
  └─► 2. Email Dispatch Pipeline:
         ├─ Check RESEND_API_KEY -> Dispatch via Resend REST API (https://api.resend.com/emails)
         ├─ Check SENDGRID_API_KEY -> Dispatch via SendGrid v3 Mail API
         ├─ Check EMAIL_WEBHOOK_URL -> Dispatch via Generic Webhook
         └─ Fallback: Safe structured audit logging (Zero uncaught exceptions)
```

All external API interactions are isolated in non-blocking try/catch routines, ensuring that network timeouts or provider unavailability will never block or rollback core database transactions.

---

## 7. Role-Based Access Control & Transition Guarding

To prevent status tampering and unauthorized lifecycle updates, endpoint security enforces multi-layered defense:

| Action / Endpoint | Permitted Roles | Authorization Guard Logic |
| :--- | :--- | :--- |
| `POST /orders` | `CUSTOMER`, `ADMIN` | Customer creates for self; Admin can create on behalf of customer. |
| `PATCH /orders/:id/status` | `AGENT`, `ADMIN` | Strictly barred from customers. Agents can only transition orders currently assigned to their profile. |
| `POST /orders/:id/reschedule` | `CUSTOMER`, `ADMIN` | Order must be in `FAILED` status and owned by requesting customer. |
| `POST /orders/:id/cancel` | `CUSTOMER`, `ADMIN` | Customers can only cancel prior to dispatch (`PENDING`, `ASSIGNED`, `RESCHEDULED`). Post-pickup requires Admin override. |
| `POST /orders/:id/admin-override` | `ADMIN` | Mandatory audit reason recorded directly to `OrderStatusHistory`. |

---

## 8. Multi-Tier COD Surcharge Hierarchy

Cash On Delivery fee calculations follow a hierarchical resolution strategy:

1. **Service-Specific Rule**: The pricing engine first looks up an active `CodConfig` matching the order's `ServiceType` (`B2C` or `B2B`).
2. **Global Fallback**: If no service-specific rule is found, the active universal `CodConfig` (`serviceType = null`) is applied.
3. **Dynamic Computation**: Supports percentage-based charges with min/max clamps (e.g. 2% with min ₹30, max ₹500) or flat fees.

---

## 9. Continuous Integration & Quality Assurance

Automated CI executes via GitHub Actions on every push and pull request:
- **Backend Matrix**: Node.js 20, Prisma schema generation, full Jest unit & FSM regression tests, production bundle compilation.
- **Frontend Matrix**: TypeScript typecheck (`tsc -b`), production Vite build.
- **Pre-commit Integrity**: Zero build warnings, clean ESLint validation, deterministic database seeders.

