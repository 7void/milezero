# MileZero 🚚 — Last-Mile Delivery Management Platform

[![CI Pipeline](https://github.com/7void/milezero/actions/workflows/ci.yml/badge.svg)](https://github.com/7void/milezero/actions/workflows/ci.yml)
[![Security Audit](https://github.com/7void/milezero/actions/workflows/security.yml/badge.svg)](https://github.com/7void/milezero/actions/workflows/security.yml)
[![Tests](https://img.shields.io/badge/Tests-34%20Passed-emerald.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.4-red.svg)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748.svg)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)

**MileZero** is a modern, production-grade last-mile delivery management platform engineered as a **modular monolith**. It features an authoritative database-driven pricing engine, intelligent geospatial agent assignment, an immutable tracking audit log, multi-attempt failure/rescheduling lifecycles, and a live Mapbox operational map experience.

---

## 🌟 Key Capabilities

1. **Authoritative Database-Driven Pricing Engine**:
   - Volumetric weight calculation: $\frac{\text{Length (cm)} \times \text{Width (cm)} \times \text{Height (cm)}}{5000}$.
   - Automatic billable weight determination: $\max(\text{Actual Weight}, \text{Volumetric Weight})$.
   - Intra-zone vs Inter-zone rate cards for **B2C Standard** and **B2B Freight** tiers.
   - **Service-Type Specific COD Rules**: Multi-tier Cash On Delivery surcharge configuration tailored per service tier (`B2C`, `B2B`) with automated fallback to universal default rate cards.
   - Customers receive an instant, itemized breakdown before order confirmation; the backend remains the sole authoritative source of truth.

2. **Geospatial Agent Auto-Assignment & Fleet Management**:
   - Intelligent driver scoring using the **Haversine Distance Formula** to match nearest available agents to pickup locations.
   - Three-tiered fallback logic: Exact Proximity $\to$ Zone Matching $\to$ Fleet Global Pool.
   - Strict agent availability state machine (`AVAILABLE`, `BUSY`, `OFFLINE`).
   - **Admin Fleet Command & Filtering**: Multi-dimensional filtering across availability status, vehicle types (Bike, Scooter, Van, Truck, EV), operating zones, driver search, and quick capacity metrics.

3. **Finite State Machine & Tight RBAC Enforcement**:
   - Strict lifecycle transitions: `PENDING` $\to$ `ASSIGNED` $\to$ `PICKED_UP` $\to$ `IN_TRANSIT` $\to$ `OUT_FOR_DELIVERY` $\to$ `DELIVERED`.
   - **Tighter Status-Update Authorization**: Explicit role checks ensuring customers cannot tamper with delivery progress; assigned agents can only update their own deliveries; customers can cancel prior to dispatch and reschedule upon failure; admins maintain audited override controls.
   - Append-only immutable tracking history (`OrderStatusHistory`) logging every state change, actor role, timestamp, notes, and GPS coordinates.

4. **Multi-Attempt Failure & Rescheduling Flow**:
   - When an agent marks a delivery as `FAILED`, mandatory failure reasons are recorded and a `DeliveryAttempt` is logged.
   - The driver is freed back to `AVAILABLE`.
   - The customer can reschedule to a new preferred date, which re-queues the shipment for automated dispatch.

5. **Real-Time Email & In-App Notification System**:
   - Built-in provider hooks for **Transactional Email** via **[Resend](https://resend.com)**, **SendGrid**, and generic webhooks.
   - Real-time customer delivery updates (`Order Confirmed`, `Package Picked Up`, `Out for Delivery`, `Delivered`, `Delivery Failed/Rescheduled`) delivered directly to recipient inboxes and stored in the persistent in-app notification center.
   - **Resilient Fallback**: If external providers or API keys are omitted, the notification engine gracefully logs structured audit events while keeping all core database transactions completely intact.

6. **Live Mapbox Operational Experience**:
   - Interactive customer tracking view with pickup/drop pins, animated driver GPS markers, and polyline delivery routes.
   - Driver console with turn-by-turn navigation and simulated GPS route driver.
   - Admin City Fleet Command Tower displaying all active agents and shipments across zones.
   - Built-in vector tactical visualizer fallback for zero-setup demonstration when a Mapbox token is omitted.

7. **1-Click Evaluator Persona Switcher**:
   - Instant header switcher allowing evaluators to jump between Admin, Customers, and Delivery Agents in 1 click.

---

## 🏗️ Architecture & Tech Stack

### Tech Stack
- **Backend API**: Node.js, TypeScript, **NestJS**, REST API, JWT Authentication, Passport, Swagger / OpenAPI, Jest.
- **Database & ORM**: **PostgreSQL 16**, **Prisma ORM**.
- **Frontend App**: **React 19**, **TypeScript**, **Vite**, **Tailwind CSS v4**, **React Router v7**, **TanStack Query v5**, **Mapbox GL**, **Lucide React**.

### System Architecture Diagram
```mermaid
graph TD
    subgraph Frontend [React 19 + Tailwind v4 + Mapbox GL]
        RoleBar[1-Click Persona Switcher]
        CustPortal[Customer Portal: Booking, Live Quote, Tracking]
        AgentPortal[Agent Console: Shift Toggle, Nav Route, Failure Report]
        AdminTower[Admin Tower: Fleet Map, Orders, Zones, Pricing Editor]
    end

    subgraph Backend [NestJS Modular Monolith API]
        AuthMod[Auth & RBAC Guards: JWT]
        PricingMod[Pricing Engine: Volumetric, Zone Matrix, Rate Cards, COD]
        AssignMod[Assignment Engine: Haversine Proximity, State Machine]
        OrderMod[Order Lifecycle & Finite State Machine]
        TrackMod[Immutable Tracking & Delivery Attempts]
        ZoneMod[Zone & Pincode Resolution]
        AgentMod[Agent Fleet & Route Simulation]
        NotifMod[Notifications & Multi-Channel Dispatch]
        AdminMod[Admin Analytics & Operational Overview]
    end

    subgraph Database [PostgreSQL 16 via Prisma ORM]
        UsersTable[(Users & Profiles)]
        ZonesTable[(Zones & Pincodes)]
        RateCardsTable[(Rate Cards & COD Config)]
        OrdersTable[(Orders & Package Specs)]
        HistoryTable[(OrderStatusHistory - Immutable)]
        AttemptsTable[(DeliveryAttempts)]
        NotifsTable[(Notifications)]
    end

    Frontend --> Backend
    Backend --> Database
```

---

## 🌐 Hosted Deployments & Live Demo

- **Frontend Web Application (Vercel)**: [`https://milezero-gray.vercel.app`](https://milezero-gray.vercel.app)
- **Backend API & Swagger Docs (Render)**: [`https://milezero-xzck.onrender.com/api/docs`](https://milezero-xzck.onrender.com/api/docs)
- **GitHub Repository**: [`https://github.com/7void/milezero`](https://github.com/7void/milezero)

---

## 🗄️ Database Schema & Relational Models

The relational schema is managed via **Prisma ORM** with PostgreSQL:

| Model / Table | Purpose & Key Fields |
| :--- | :--- |
| **`User`** | Accounts with role-based access (`CUSTOMER`, `AGENT`, `ADMIN`), email, hashed password, phone. |
| **`AgentProfile`** | Delivery agent details, `availabilityStatus` (`AVAILABLE`, `BUSY`, `OFFLINE`), live `currentLat`/`currentLng`, `currentZoneId`, `vehicleType`. |
| **`Zone`** | Urban logistics zones (`code`, `name`, `city`, `isActive`, `isDefault`). |
| **`ZonePincode`** | 6-digit postal codes mapped to zones with centroid `lat`/`lng` and area landmarks. |
| **`RateCard`** | Base pricing rules per service tier (`B2C`, `B2B`), `baseWeightKg`, `baseRateIntra`, `baseRateInter`, `perKgRateIntra`, `perKgRateInter`, `minCharge`. |
| **`CodConfig`** | Service-specific and global Cash-On-Delivery surcharge rules (`serviceType`, `feeType`, `fixedFee`, `percentage`, `minFee`, `maxFee`). |
| **`Order`** | Core shipment lifecycle (`trackingNumber`, `serviceType`, `paymentMode`, `status`, volumetric/billable weight, total price breakdown, pickup/drop addresses, assigned agent). |
| **`OrderStatusHistory`** | **Append-only immutable audit log** tracking every state transition with `actorRole`, `actorId`, `timestamp`, `notes`, and GPS coordinates. |
| **`DeliveryAttempt`** | Detailed failure audit records (`attemptNumber`, `failureReason`, `driverNotes`, `attemptedAt`). |
| **`Notification`** | In-app user notifications and dispatch logs with unread badges and channel tracking (`IN_APP`, `EMAIL`). |

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node.js 24)
- **PostgreSQL 16** (or Docker for `docker compose`)

### 2. Clone & Environment Configuration
```bash
git clone https://github.com/7void/milezero.git
cd milezero
```

Copy the environment example files:
```bash
# In the root directory
cp .env.example .env

# In the backend directory
cp .env.example backend/.env
```

Default `.env` configuration:
```env
DATABASE_URL="postgresql://milezero:milezeropassword@localhost:5432/milezerodb?schema=public"
PORT=3001
JWT_SECRET="milezero-super-secret-jwt-key-2026-production-grade"
JWT_EXPIRES_IN="7d"
VITE_MAPBOX_TOKEN=""
VITE_API_BASE_URL="http://localhost:3001/api"
```

### 3. Start PostgreSQL Database
```bash
# Start PostgreSQL container via Docker Compose
docker compose up -d
```

### 4. Install Dependencies, Migrate Database & Seed Demo Data
```bash
# Install root & backend dependencies
npm install
cd backend && npm install && cd ..

# Push Prisma schema to PostgreSQL & seed demo dataset
npm run seed
```

### 5. Run Dev Servers Concurrently
```bash
npm run dev
```
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:3001/api`
- **Swagger API Docs**: `http://localhost:3001/api/docs`

---

## 🔑 Demo Accounts & Seed Credentials

All accounts share the password: `Password123!`

| Role | Account Name | Email | Persona & Focus |
| :--- | :--- | :--- | :--- |
| **Admin** | Sarah Chen (Ops Director) | `admin@milezero.io` | Operations Command Tower, Rate Card editor, Fleet dispatch & admin overrides |
| **Customer (B2C)** | Rahul Sharma | `rahul.sharma@example.com` | Instant booking, live volumetric price quotes, live tracking map |
| **Customer (B2B)** | TechCorp Logistics | `techcorp@example.com` | Enterprise freight shipments, heavy cartons, COD payments |
| **Customer (B2C)** | Priya Patel | `priya.retail@example.com` | Boutique retail shipments, failed delivery reschedule workflow |
| **Agent** | Alex Rivera | `alex.agent@milezero.io` | Available driver (Central Hub), bike courier, GPS location updates |
| **Agent** | Sam Wilson | `sam.agent@milezero.io` | Busy driver (North Metro), heavy freight van, in-transit delivery |
| **Agent** | Marcus Vance | `marcus.agent@milezero.io` | Available driver (South Tech Corridor), scooter delivery |
| **Agent** | Elena Rostova | `elena.agent@milezero.io` | Offline driver (East Industrial) |

---

## 🧮 Pricing Engine Architecture

The pricing engine is 100% database-driven:

```text
Package Dimensions (L × W × H) + Actual Weight + Pickup/Drop Pincodes
                           ↓
1. Resolve Pickup Zone & Drop Zone via ZonePincode lookup
2. Compute Volumetric Weight = (L × W × H) / 5000
3. Select Billable Weight = max(Actual Weight, Volumetric Weight)
4. Classify Zone Relationship:
     • Intra-Zone (Pickup Zone == Drop Zone)
     • Inter-Zone (Pickup Zone != Drop Zone)
5. Match Active RateCard for ServiceType (B2C Standard vs B2B Freight)
6. Calculate Base Price (covers up to Base Weight) + Excess Weight Surcharge
7. Evaluate COD Surcharge (if PaymentMode == COD)
8. Return Authoritative Price Breakdown Object
```

### Rate Card Structure
- **B2C Standard Express**: Base Weight 1.0kg • Base Intra ₹40 • Base Inter ₹70 • Per-Kg Intra ₹20 • Per-Kg Inter ₹35 • Min Charge ₹40.
- **B2B Freight Express**: Base Weight 5.0kg • Base Intra ₹120 • Base Inter ₹200 • Per-Kg Intra ₹15 • Per-Kg Inter ₹25 • Min Charge ₹120.

---

## 📍 Geospatial Agent Assignment

### 1. Nearest Neighbor Proximity (Haversine Formula)
Computes spherical surface distance between agent GPS coordinates $(lat_1, lon_1)$ and pickup location $(lat_2, lon_2)$:
$$d = 2R \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$
where $a = \sin^2(\Delta\phi/2) + \cos(\phi_1)\cos(\phi_2)\sin^2(\Delta\lambda/2)$.

### 2. Tiered Assignment Fallbacks
1. **Proximity**: Selects the available agent with the lowest distance $d$.
2. **Zone Match**: If GPS is unavailable, selects an available agent assigned to the pickup zone.
3. **Global Pool**: Fallback to any active available agent.

---

## 🔄 Order Lifecycle State Machine

```
      [ Customer Books Order ]
                 ↓
             [ PENDING ]
                 ↓  (Auto-assign or Admin manual dispatch)
            [ ASSIGNED ]
                 ↓  (Agent confirms pickup)
           [ PICKED_UP ]
                 ↓  (Agent starts transit)
           [ IN_TRANSIT ]
                 ↓  (Agent arrives in area)
       [ OUT_FOR_DELIVERY ]
         /              \
(Delivery Success)     (Delivery Failed)
       /                  \
[ DELIVERED ]          [ FAILED ]  (Captures reason & logs attempt)
                           ↓
                     [ RESCHEDULED ]  (Customer picks new date)
                           ↓
                      [ ASSIGNED ]
```

---

## 🧪 Automated Testing

Exhaustive Jest unit test suites validate the core business logic:

```bash
# Run backend test suite
npm run test:backend
```

### Verified Test Suites:
- **`pricing.service.spec.ts`**:
  - Volumetric formula verification: $(30 \times 20 \times 15)/5000 = 1.8\text{ kg}$.
  - Bulky volumetric selection ($12.0\text{ kg}$ vs $3.0\text{ kg}$ actual).
  - Dense actual weight selection ($5.0\text{ kg}$ vs $0.2\text{ kg}$ volumetric).
  - Intra-zone vs Inter-zone rate card application.
  - B2B freight tier ($5\text{ kg}$ threshold).
  - COD surcharge calculations and clamping.
- **`assignment.service.spec.ts`**:
  - Haversine spherical distance calculation.
  - Nearest available agent selection.
  - Zone fallback when GPS coordinates are missing.
- **`orders.service.spec.ts`**:
  - Allowed vs invalid state transitions.
  - Mandatory failure reason capture on `FAILED`.
  - Customer rescheduling workflow.
- **`zones.service.spec.ts`**:
  - Pincode resolution and fallback mappings.

---

## 🗺️ Live Map Experience & Mapbox Setup

MileZero uses Mapbox GL for vector map rendering. To enable street satellite vector tiles:
1. Obtain a public access token from [mapbox.com](https://mapbox.com).
2. Set `VITE_MAPBOX_TOKEN="pk.your_token_here"` in `.env`.
3. If no token is provided, MileZero's built-in **Tactical Operational Visualizer** automatically takes over, providing interactive marker plotting, route lines, and simulated GPS driver movement.

---

## 📄 System Design Write-Up

For architectural rationale (Modular Monolith decisions, concurrency management, data normalization, and state consistency), read [SYSTEM_DESIGN.md](file:///c:/projects/milezero/SYSTEM_DESIGN.md).
