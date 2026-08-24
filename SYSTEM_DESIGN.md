# MileZero System Design Document

MileZero is an enterprise-grade last-mile delivery management platform engineered as a **modular monolith** using NestJS, TypeScript, and PostgreSQL (Prisma ORM). It delivers ACID transactional consistency across pricing calculations, geospatial dispatch, and immutable tracking history.

---

## 1. Authoritative Rate Calculation Engine

The backend serves as the authoritative source of truth for rate calculations to prevent client-side tampering. Quotes execute through a deterministic 7-step pipeline:

```text
Input: Dimensions (L×W×H), Actual Weight, Pincodes, ServiceType (B2C/B2B), PaymentMode (Prepaid/COD)
  ↓
1. Zone Detection: Map pickup & drop pincodes to database Zone entities.
2. Volumetric Weight: (Length × Width × Height) / 5000 (cm to kg).
3. Billable Weight: max(Actual Weight, Volumetric Weight).
4. Zone Classification: INTRA_ZONE (pickupZone == dropZone) vs INTER_ZONE.
5. Rate Card Lookup: Match active RateCard for ServiceType (B2C Standard / B2B Freight).
6. Weight Charge: BasePrice + max(0, BillableWeight - BaseThreshold) × PerKgRate.
7. COD Surcharge: Apply active CodConfig (percentage with min/max bounds or flat fee).
```

### Dynamic Formulae
$$\text{Volumetric Weight (kg)} = \frac{L \times W \times H}{5000}$$
$$\text{Billable Weight (kg)} = \max(\text{Actual Weight}, \text{Volumetric Weight})$$
$$\text{Weight Charge} = \text{Base Price} + \max(0, \text{Billable Weight} - \text{Base Weight}) \times \text{Per-Kg Rate}$$

All thresholds, base multipliers, and COD surcharge rates are stored in database entities (`RateCard`, `CodConfig`) and dynamically modifiable by Admins without code deployments.

---

## 2. Zone Detection Approach

Urban delivery operations divide metropolitan service areas into distinct geographic logistics zones:
- **`Zone`**: Represents an operational hub (e.g., Central Hub, North Metro Corridor).
- **`ZonePincode`**: Maps 6-digit postal codes to a parent zone with geographic centroid coordinates $(lat, lon)$.

### Resolution Algorithm
1. **Pincode Lookup**: Queries `ZonePincode` matching `pickupAddress.pincode` and `dropAddress.pincode`.
2. **Coordinate Enrichment**: If customer address coordinates are omitted, the zone centroid coordinates are assigned automatically.
3. **Fallback Resolution**: Unmapped pincodes automatically resolve to the default central hub (`ZONE-CENTRAL`), guaranteeing uninterrupted order booking.

---

## 3. Intelligent Auto-Assignment Logic & Availability

Driver dispatch balances proximity optimization with strict driver availability state management (`AVAILABLE`, `BUSY`, `OFFLINE`).

### Proximity Scoring (Haversine Formula)
Auto-assignment filters active drivers where $\text{availabilityStatus} = \text{AVAILABLE}$ and calculates the spherical distance $d$ to the pickup coordinates:
$$d = 2R \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$
$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$

### 3-Tier Fallback Hierarchy
1. **Tier 1 (GPS Proximity)**: Assigns the nearest available driver with active GPS telemetry.
2. **Tier 2 (Zone Alignment)**: If GPS is unavailable, selects an available driver stationed in `pickupZoneId`.
3. **Tier 3 (Global Fleet Pool)**: Selects any active available driver across the metropolitan fleet.

### Concurrency Isolation
Assignments execute inside atomic database transactions (`prisma.$transaction`). The order transitions to `ASSIGNED`, the driver transitions to `BUSY`, and an audit event is recorded simultaneously, preventing double-dispatch race conditions.

---

## 4. Order Lifecycle & Failed Delivery Handling

Shipments follow a strict Finite State Machine (FSM):
$$\text{PENDING} \longrightarrow \text{ASSIGNED} \longrightarrow \text{PICKED\_UP} \longrightarrow \text{IN\_TRANSIT} \longrightarrow \text{OUT\_FOR\_DELIVERY} \longrightarrow \text{DELIVERED}$$

```
                ┌──────────────────────────────────┐
                │        OUT_FOR_DELIVERY          │
                └────────┬────────────────┬────────┘
        Delivery Success │                │ Delivery Failed
                ┌────────▼───┐    ┌───────▼────────┐
                │ DELIVERED  │    │     FAILED     │ (Captures reason & logs attempt)
                └────────────┘    └───────┬────────┘
                                          │ Customer selects new date
                                  ┌───────▼────────┐
                                  │  RESCHEDULED   │ ──► Re-queued for Auto-Assignment
                                  └────────────────┘
```

### Failed Delivery & Rescheduling Flow
1. **Failure Capture**: If delivery fails, the driver records a verified reason (*Customer Unavailable*, *Address Incomplete*, *Payment Not Ready*).
2. **Attempt Audit**: A `DeliveryAttempt` record is created logging timestamp, attempt count, and driver notes.
3. **Driver Release**: The driver's status is immediately freed back to `AVAILABLE`.
4. **Customer Reschedule**: The customer receives instant in-app and Resend transactional email notifications with a 1-click rescheduling modal.
5. **Re-Dispatch**: Selecting a new preferred date transitions the order to `RESCHEDULED`, clearing the previous agent assignment and re-queuing the order for auto-dispatch.
6. **Immutable Audit Trail (`OrderStatusHistory`)**: Every lifecycle event appends an immutable database record with actor role, timestamp, notes, and GPS coordinates.
