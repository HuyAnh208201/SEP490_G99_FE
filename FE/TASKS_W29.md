# Work items — Week Jul 13–19 (copy into Excel)

Columns: **Site | Task | Notes | Status**

---

## Already on the sheet (keep as-is)

| Site | Task | Notes | Status |
|------|------|-------|--------|
| Users | Login | | In review |
| Users | Forgot password / reset password | | In progress |
| Users | Report 4 | | In review |
| Admin | Create admin account | | In review |
| Admin | Create product categories | | In review |
| Admin | Create products (code, name, barcode, price, unit) | | In review |
| Admin | Create suppliers | | In review |
| Admin | Create branches | | In review |
| Admin | Create Branch Manager and assign to branch | | In review |
| Admin | Create Stock Staff & Cashier and assign to branch | | In review |
| Admin | Merge code | | Done |

---

## This week — Phase 2 + 3 (no POS yet)

| Site | Task | Notes | Status |
|------|------|-------|--------|
| Import | Branch Manager creates purchase request → warehouse approves | In-stock vs out-of-stock; order status; batch consolidation | In progress |
| Import | E2E test: in stock → batch → dispatch → branch receive | Real API only, no mock fallback | To do |
| Import | E2E test: out of stock → supplier PO → central receive → continue flow | Use low-stock seed (product_id=7) | To do |
| Inventory | Central warehouse stock screen | `/warehouse/inventory` — table, filter, low-stock badge | Done (FE) — needs BE running |
| Inventory | Branch receive goods screen | `/branch-manager/receive` — queue + branch stock panel | Done (FE) — needs BE running |
| Import | Purchase request status labels (English) | Draft → Pending → Approved → … → Received | Done (FE) |
| Import | Consolidated view + dispatch planning UX | Link from consolidated to dispatch planning | Done (FE) |
| Shifts | Branch Manager creates shift, assigns staff, opening cash | ShiftsPage + weekly view | In progress |
| Shifts | Cashier shift check-in | **Waiting on BE** — `/shifts/my` and `/check-in` not implemented | To do |
| Shifts | “My shifts” page for cashier | UI exists at `/my-shifts` — **waiting on BE** | To do |

---

## Later (not this week)

| Site | Task | Notes | Status |
|------|------|-------|--------|
| POS | Cashier check-in → POS sales | No POS module yet | To do |
| Loyalty | Customer points from invoices | Needs sales module | To do |
| Shifts | Close shift → cash reconciliation → BM approval | Needs POS + sales data | To do |
| Reports | Reports & analytics | Needs sales data | To do |

---

## Quick FE smoke test

1. Log in as Branch Manager, Warehouse Manager, Inventory Staff.
2. Create PR → approve → check central inventory screen updates.
3. Consolidate → dispatch → receive → check branch inventory screen.
4. Branch Manager: create and publish a shift (check-in can wait for BE).
