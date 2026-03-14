# CoreInventory — MERN Stack IMS

A modular, production-grade Inventory Management System built with MongoDB, Express, React, and Node.js. Covers the full inventory lifecycle: incoming goods, outgoing deliveries, internal transfers (warehouse-to-warehouse and rack-to-rack), stock adjustments, and a real-time dashboard.

---

## Project Structure

```
coreinventory/
├── backend/
│   ├── models/
│   │   ├── User.js           # Users — roles: admin | manager | staff
│   │   ├── Product.js        # Product catalog with reorder point
│   │   ├── Inventory.js      # Category, Warehouse, Location (rack/shelf/bin),
│   │   │                     #   StockLedger (source of truth), StockMove (audit log)
│   │   └── Operations.js     # Receipt, Delivery (pick→pack flow), Transfer, Adjustment
│   │
│   ├── routes/
│   │   ├── auth.js           # Register, Login, OTP reset, User management (admin)
│   │   ├── products.js       # Product CRUD + stock per location
│   │   ├── categories.js     # Category CRUD (admin only for write)
│   │   ├── warehouses.js     # Warehouse CRUD (admin only for write)
│   │   ├── locations.js      # Sub-locations: Rack A, Shelf 3, Bin D1 (admin only for write)
│   │   ├── receipts.js       # Incoming stock — Draft→Waiting→Ready→Done
│   │   ├── deliveries.js     # Outgoing stock — Draft→Waiting→Picking→Packing→Ready→Done
│   │   ├── transfers.js      # Internal transfers — warehouse-to-warehouse or rack-to-rack
│   │   ├── adjustments.js    # Physical count corrections
│   │   ├── moves.js          # Full stock ledger / audit log
│   │   └── dashboard.js      # KPIs + 7-day trend + low stock alerts (with filters)
│   │
│   ├── middleware/
│   │   └── auth.js           # JWT protect + role-based authorize()
│   ├── server.js             # Express entry point
│   ├── seed.js               # Demo data: 3 users, 3 warehouses, 5 locations, 6 products
│   └── .env.example
│
└── frontend/
    └── src/
        ├── components/
        │   ├── common/UI.jsx            # Modal, StatusBadge, Spinner, ConfirmDialog, etc.
        │   └── layout/
        │       ├── Sidebar.jsx          # Role-aware navigation (Users menu: admin only)
        │       └── AppLayout.jsx        # Page wrapper with sticky header
        │
        ├── context/
        │   └── AuthContext.jsx          # JWT auth state (login, register, logout)
        │
        ├── pages/
        │   ├── auth/AuthPages.jsx       # Login, Register (staff by default), Forgot Password (OTP)
        │   ├── dashboard/Dashboard.jsx  # KPIs, chart, recent moves, low stock alerts + 4 filters
        │   ├── products/Products.jsx    # Product list with warehouse/rack stock breakdown
        │   ├── operations/
        │   │   ├── OperationsPages.jsx  # Receipts + Transfers (shared status flow)
        │   │   ├── DeliveriesPage.jsx   # Deliveries with Pick→Pack→Ship visual stepper
        │   │   └── Adjustments.jsx      # Stock adjustment with system vs counted diff
        │   ├── settings/
        │   │   └── SettingsPages.jsx    # Warehouses+Locations, Categories, Users, Profile
        │   └── misc/
        │       └── MiscPages.jsx        # Move History (full audit log)
        │
        ├── utils/api.js                 # Axios instance + all API service functions
        ├── styles/global.css            # Full design system (hex colours, no CSS var issues)
        └── App.jsx                      # React Router v6 with protected + public routes
```


### Demo Credentials (after seed)

| Role    | Email             | Password  |
|---------|-------------------|-----------|
| Admin   | admin@core.com    | admin123  |
| Manager | priya@core.com    | admin123  |
| Staff   | ravi@core.com     | admin123  |

---

## Role Permissions

| Action                              | Admin | Manager | Staff |
|-------------------------------------|:-----:|:-------:|:-----:|
| Register / manage users             |  ✅   |   ❌    |  ❌   |
| Create warehouses & locations       |  ✅   |   ❌    |  ❌   |
| Create product categories           |  ✅   |   ❌    |  ❌   |
| Create & edit products              |  ✅   |   ✅    |  ❌   |
| Create draft operations             |  ✅   |   ✅    |  ✅   |
| Advance status (Draft→Waiting→Ready)|  ✅   |   ✅    |  ✅   |
| Validate operations (stock changes) |  ✅   |   ✅    |  ❌   |
| Apply stock adjustments             |  ✅   |   ✅    |  ❌   |
| Delete draft documents              |  ✅   |   ✅    |  ❌   |
| View dashboard & move history       |  ✅   |   ✅    |  ✅   |

> **Key rule:** Only validated operations change stock. Staff prepare documents; managers approve them.

---

## Status Flows

### Receipts & Transfers
```
Draft → Waiting → Ready → Done
                        ↘ Cancelled (any step before Done)
```

### Deliveries (Pick & Pack)
```
Draft → Waiting → Picking → Packing → Ready → Done
                                             ↘ Cancelled
```

- **Picking** — staff physically picks items from shelves (stock checked here)
- **Packing** — staff packs items into boxes
- **Ready** — awaiting manager validation
- **Done** — manager validates → stock decreases automatically

---

## API Reference

### Auth
| Method | Endpoint                    | Role     | Description              |
|--------|-----------------------------|----------|--------------------------|
| POST   | /api/auth/register          | Public   | Register (role: staff)   |
| POST   | /api/auth/login             | Public   | Login → JWT token        |
| POST   | /api/auth/forgot-password   | Public   | Send OTP to email        |
| POST   | /api/auth/reset-password    | Public   | Reset with OTP           |
| GET    | /api/auth/me                | Any      | Current user info        |
| PUT    | /api/auth/profile           | Any      | Update own profile       |
| GET    | /api/auth/users             | Admin    | List all users           |
| POST   | /api/auth/users             | Admin    | Create user with role    |
| PUT    | /api/auth/users/:id         | Admin    | Update role / status     |

### Products
| Method | Endpoint           | Role           | Description                      |
|--------|--------------------|----------------|----------------------------------|
| GET    | /api/products      | Any            | List with stock per location     |
| POST   | /api/products      | Admin/Manager  | Create + optional initial stock  |
| PUT    | /api/products/:id  | Admin/Manager  | Update                           |
| DELETE | /api/products/:id  | Admin/Manager  | Archive (soft delete)            |

### Categories
| Method | Endpoint              | Role  | Description   |
|--------|-----------------------|-------|---------------|
| GET    | /api/categories       | Any   | List all      |
| POST   | /api/categories       | Admin | Create        |
| PUT    | /api/categories/:id   | Admin | Update        |
| DELETE | /api/categories/:id   | Admin | Delete        |

### Warehouses
| Method | Endpoint              | Role  | Description   |
|--------|-----------------------|-------|---------------|
| GET    | /api/warehouses       | Any   | List active   |
| POST   | /api/warehouses       | Admin | Create        |
| PUT    | /api/warehouses/:id   | Admin | Update        |
| DELETE | /api/warehouses/:id   | Admin | Archive       |

### Locations (Rack / Shelf / Bin)
| Method | Endpoint              | Role  | Description                       |
|--------|-----------------------|-------|-----------------------------------|
| GET    | /api/locations        | Any   | List (filter: ?warehouse=id)      |
| POST   | /api/locations        | Admin | Create sub-location               |
| PUT    | /api/locations/:id    | Admin | Update                            |
| DELETE | /api/locations/:id    | Admin | Archive                           |

### Receipts
| Method | Endpoint                      | Role           | Description              |
|--------|-------------------------------|----------------|--------------------------|
| GET    | /api/receipts                 | Any            | List with filters        |
| POST   | /api/receipts                 | Any            | Create draft             |
| PUT    | /api/receipts/:id             | Any            | Edit (non-done)          |
| POST   | /api/receipts/:id/advance     | Any            | Draft→Waiting→Ready      |
| POST   | /api/receipts/:id/revert      | Any            | Step back                |
| POST   | /api/receipts/:id/cancel      | Any            | Cancel                   |
| POST   | /api/receipts/:id/validate    | Admin/Manager  | Ready→Done, stock +qty   |
| DELETE | /api/receipts/:id             | Admin/Manager  | Delete draft             |

### Deliveries
| Method | Endpoint                      | Role           | Description                  |
|--------|-------------------------------|----------------|------------------------------|
| GET    | /api/deliveries               | Any            | List with filters            |
| POST   | /api/deliveries               | Any            | Create draft                 |
| POST   | /api/deliveries/:id/confirm   | Any            | Draft → Waiting              |
| POST   | /api/deliveries/:id/pick      | Any            | Waiting → Picking (stock check) |
| POST   | /api/deliveries/:id/pack      | Any            | Picking → Packing            |
| POST   | /api/deliveries/:id/ready     | Any            | Packing → Ready              |
| POST   | /api/deliveries/:id/validate  | Admin/Manager  | Ready → Done, stock −qty     |
| POST   | /api/deliveries/:id/revert    | Any            | Step back one                |
| POST   | /api/deliveries/:id/cancel    | Any            | Cancel                       |
| DELETE | /api/deliveries/:id           | Admin/Manager  | Delete draft                 |

### Transfers
| Method | Endpoint                      | Role           | Description                        |
|--------|-------------------------------|----------------|------------------------------------|
| GET    | /api/transfers                | Any            | List with filters                  |
| POST   | /api/transfers                | Any            | Create draft (WH→WH or Rack→Rack)  |
| POST   | /api/transfers/:id/advance    | Any            | Draft→Waiting→Ready                |
| POST   | /api/transfers/:id/revert     | Any            | Step back                          |
| POST   | /api/transfers/:id/cancel     | Any            | Cancel                             |
| POST   | /api/transfers/:id/validate   | Admin/Manager  | Ready→Done, moves stock            |
| DELETE | /api/transfers/:id            | Admin/Manager  | Delete draft                       |

### Adjustments
| Method | Endpoint                        | Role           | Description                    |
|--------|---------------------------------|----------------|--------------------------------|
| GET    | /api/adjustments                | Any            | List                           |
| POST   | /api/adjustments                | Admin/Manager  | Create (auto-fills system qty) |
| POST   | /api/adjustments/:id/validate   | Admin/Manager  | Apply → sets stock to counted  |
| DELETE | /api/adjustments/:id            | Admin/Manager  | Delete draft                   |

### Dashboard
| Method | Endpoint        | Params                               | Description                     |
|--------|-----------------|--------------------------------------|---------------------------------|
| GET    | /api/dashboard  | ?docType= &status= &warehouse= &category= | KPIs + trend + alerts + moves |

### Move History
| Method | Endpoint    | Params                              | Description       |
|--------|-------------|-------------------------------------|-------------------|
| GET    | /api/moves  | ?type= &warehouse= &product= &from= &to= | Full audit log |

---

## Key Inventory Logic

| Operation   | Stock Effect                                          |
|-------------|-------------------------------------------------------|
| Receipt     | `StockLedger` +qty at destination warehouse/location  |
| Delivery    | `StockLedger` −qty at source warehouse                |
| Transfer    | −qty from source, +qty at destination (WH or location)|
| Adjustment  | Sets qty to counted value (overwrite, not increment)  |

All validated operations write to both:
- **`StockLedger`** — current qty per product per warehouse per location (source of truth)
- **`StockMove`** — immutable audit record of every change (who, when, how much, reference number)

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Database  | MongoDB 7 + Mongoose 8              |
| API       | Node.js 18 + Express 4              |
| Auth      | JWT (jsonwebtoken) + bcryptjs        |
| Frontend  | React 18 + React Router v6          |
| Charts    | Recharts                            |
| HTTP      | Axios                               |
| Toasts    | React Hot Toast                     |
| Icons     | Lucide React                        |
| Fonts     | DM Sans + DM Mono (Google Fonts)    |

---

## Seed Data

**Users:**
- `admin@core.com` / `admin123` — Admin (full access)
- `priya@core.com` / `admin123` — Manager (operations)
- `ravi@core.com`  / `admin123` — Staff (drafts only)

**Warehouses & Locations:**
- Main Warehouse (WH-MAIN) → Rack A, Rack B, Shelf 1
- Production Floor (WH-PROD) → Rack P1
- Dispatch Bay (WH-DISP) → Bin D1

**Categories:** Raw Materials, Finished Goods, Packaging, Spare Parts

**Products:** 6 products with initial stock (Steel Rods, Aluminium Sheet, Industrial Chair, Cardboard Box, Bearing, Paint)

**Sample Operations:**
- 1 Receipt in "ready" status (waiting for manager to validate)
- 1 Delivery in "draft" status (created by staff)
