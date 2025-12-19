# Complete Schema Redesign - DONE ✅

## Migration Summary

Your pharmacy POS system has been completely redesigned from the ground up with a proper, industry-standard architecture. All old columns have been removed and the system now uses a clean batch-and-ledger approach.

---

## What Changed

### ✅ Products Table - NOW PURE MASTER DATA

**REMOVED COLUMNS:**
- `cost_price` → Now in `product_batches`
- `selling_price` → Now in `product_batches`
- `current_stock` → Calculated from `stock_movements`
- `supplier` (text) → Replaced by `supplier_id` FK
- `category` (text) → Replaced by `category_id` FK
- `batch_number` → Each batch is now a separate record
- `expiry_date` → Now in `product_batches`
- `vat_rate` → Now in `product_batches`
- All other calculated/derived fields

**KEPT COLUMNS:**
- `id` - Product ID
- `name` - Product name
- `barcode` - Unique barcode
- `category_id` - FK to categories table
- `supplier_id` - FK to suppliers table (default supplier)
- `min_stock_level` - Reorder threshold
- `is_vat_exempt` - VAT exemption flag
- `created_at`, `updated_at` - Audit timestamps

### ✅ New Tables Created

1. **suppliers** (2 suppliers)
   - Normalized supplier information

2. **categories** (2 categories)
   - Normalized category information

3. **product_batches** (13 batches) ⭐ CRITICAL
   - Each purchase creates a batch
   - Tracks: cost, price, expiry, VAT per batch

4. **stock_movements** (13 movements) ⭐ CRITICAL
   - Ledger of ALL stock changes
   - Current stock = SUM of movements

5. **purchase_invoices** (1 invoice)
   - Replaces old invoices table

6. **payments** (ready)
   - Track payment transactions

7. **customer_returns** (ready)
   - Customer return tracking

8. **customer_return_items** (ready)
   - Items returned by customers

9. **stock_take_items** (ready)
   - Batch-level stock counting

### ✅ New Views Created

1. **current_stock_view** - Real-time stock per batch
   - Shows: product, batch, expiry, prices, stock
   - Stock calculated from ledger

2. **product_summary_view** - Inventory listing
   - Shows: total stock, batch count, avg prices

3. **low_stock_view** - Products below min level
   - Shows: stock shortage, batch count

4. **expiring_batches_view** - Batches expiring in 90 days
   - Shows: days until expiry, current stock

### ✅ Helper Functions

1. **get_batch_stock(batch_id)** - Get stock for a batch
2. **get_product_stock(product_id)** - Get total stock for product
3. **get_product_batches_with_stock(product_id)** - Get all batches

---

## Current Database State

```
📦 MASTER DATA
  ├─ 13 products (pure master data)
  ├─ 2 suppliers (normalized)
  └─ 2 categories (normalized)

🏭 PURCHASE FLOW
  ├─ 1 purchase invoice
  └─ 13 product batches (with cost, price, expiry)

📊 STOCK LEDGER
  └─ 13 stock movements (purchase movements)

💰 SALES FLOW
  ├─ 0 sales
  ├─ 0 sale items
  └─ 0 payments

🔄 RETURNS
  ├─ 0 supplier returns
  └─ 0 customer returns

📋 STOCK TAKE
  └─ 1 session (0 items)
```

---

## How to Use the New Schema

### 1. Query Current Stock

```sql
-- Get all products with stock
SELECT * FROM current_stock_view;

-- Get stock for a specific product
SELECT * FROM current_stock_view WHERE product_id = 'uuid-here';

-- Get product summary
SELECT * FROM product_summary_view;
```

### 2. Create a Purchase Invoice

```sql
-- Step 1: Create the invoice
INSERT INTO purchase_invoices (invoice_number, supplier_id, invoice_date, notes, created_by)
VALUES ('INV-001', 'supplier-uuid', '2025-12-19', 'Monthly order', 'user-uuid')
RETURNING id;

-- Step 2: For each product, create a batch
INSERT INTO product_batches (
  product_id, supplier_id, purchase_invoice_id,
  batch_number, expiry_date, cost_price, selling_price,
  vat_rate, quantity_received
)
VALUES (
  'product-uuid', 'supplier-uuid', 'invoice-uuid',
  'BATCH-123', '2026-12-31', 100.00, 150.00,
  16, 50
)
RETURNING id;

-- Step 3: Create stock movement (adds to stock)
INSERT INTO stock_movements (
  product_batch_id, movement_type, quantity,
  reference_type, reference_id, created_by
)
VALUES (
  'batch-uuid', 'purchase', 50,
  'purchase_invoice', 'invoice-uuid', 'user-uuid'
);
```

### 3. Make a Sale

```sql
-- Step 1: Find batches with stock (FIFO - earliest expiry first)
SELECT * FROM get_product_batches_with_stock('product-uuid');

-- Step 2: Create the sale
INSERT INTO sales (receipt_number, payment_status, created_by)
VALUES ('SALE-001', 'completed', 'user-uuid')
RETURNING id;

-- Step 3: Add sale items
INSERT INTO sale_items (
  sale_id, product_batch_id, quantity,
  unit_price, total_price
)
VALUES (
  'sale-uuid', 'batch-uuid', 2,
  150.00, 300.00
);

-- Step 4: Create stock movement (reduces stock)
INSERT INTO stock_movements (
  product_batch_id, movement_type, quantity,
  reference_type, reference_id, created_by
)
VALUES (
  'batch-uuid', 'sale', -2,
  'sale_item', 'sale-item-uuid', 'user-uuid'
);

-- Step 5: Record payment
INSERT INTO payments (sale_id, method, amount, status)
VALUES ('sale-uuid', 'cash', 300.00, 'completed');
```

### 4. Check Low Stock

```sql
-- Products below minimum stock level
SELECT * FROM low_stock_view;
```

### 5. Check Expiring Stock

```sql
-- Batches expiring in next 90 days
SELECT * FROM expiring_batches_view;
```

### 6. Stock Take

```sql
-- Step 1: Create session
INSERT INTO stock_take_sessions (session_name, created_by)
VALUES ('Monthly Stock Take', 'user-uuid')
RETURNING id;

-- Step 2: For each batch, create item
INSERT INTO stock_take_items (
  session_id, product_batch_id,
  expected_quantity, actual_quantity
)
SELECT
  'session-uuid',
  pb.id,
  get_batch_stock(pb.id),
  NULL  -- Will be filled during counting
FROM product_batches pb;

-- Step 3: Update with counted quantities
UPDATE stock_take_items
SET actual_quantity = 45
WHERE id = 'item-uuid';

-- Step 4: Complete session
UPDATE stock_take_sessions
SET status = 'completed', completed_at = now()
WHERE id = 'session-uuid';

-- Step 5: Create adjustment movements for differences
INSERT INTO stock_movements (
  product_batch_id, movement_type, quantity,
  reference_type, reference_id, notes, created_by
)
SELECT
  product_batch_id,
  'adjustment',
  actual_quantity - expected_quantity,
  'stock_take_item',
  id,
  'Stock take adjustment',
  'user-uuid'
FROM stock_take_items
WHERE session_id = 'session-uuid'
  AND actual_quantity != expected_quantity;
```

---

## Key Benefits

### 1. Accurate Batch Tracking
- Each purchase creates a unique batch
- Track expiry date per batch
- Different costs and prices per batch
- FIFO/FEFO selling strategies

### 2. Stock Accuracy
- Stock calculated from ledger, never stored
- No sync issues between tables
- Complete audit trail of all changes
- Can't have "phantom" stock

### 3. Financial Accuracy
- VAT tracked per batch
- Correct profit calculation per sale
- Historical pricing preserved
- Supplier discounts tracked

### 4. Audit Compliance
- Every stock change logged
- Who, what, when, why recorded
- Immutable history
- Easy to trace issues

### 5. Scalability
- Ledger design scales to millions of transactions
- Efficient queries via views
- Proper indexes on critical columns

---

## Views Reference

### current_stock_view
Shows all batches with current stock

**Columns:**
- batch_id, product_id, product_name, barcode
- batch_number, expiry_date
- cost_price, selling_price, selling_price_inc_vat
- vat_rate, vat_amount
- supplier_name, category_name
- current_stock (calculated from ledger)
- is_vat_exempt, min_stock_level

### product_summary_view
Aggregated view per product

**Columns:**
- product_id, product_name, barcode
- category_name, default_supplier_name
- total_stock (across all batches)
- active_batch_count
- earliest_expiry
- avg_cost_price, avg_selling_price

### low_stock_view
Products below minimum stock level

**Columns:**
- product_id, product_name, barcode, category_name
- min_stock_level, current_stock
- stock_shortage (how many needed)
- batch_count, nearest_expiry

### expiring_batches_view
Batches expiring within 90 days

**Columns:**
- batch_id, product_id, product_name
- batch_number, expiry_date
- current_stock, cost_price, selling_price
- supplier_name, days_until_expiry

---

## Frontend Migration Guide

### BEFORE (Old Structure)
```sql
-- Getting stock
SELECT current_stock FROM products WHERE id = ?;

-- Making a sale
UPDATE products SET current_stock = current_stock - ? WHERE id = ?;
```

### AFTER (New Structure)
```sql
-- Getting stock (use view)
SELECT current_stock FROM current_stock_view WHERE product_id = ?;

-- Getting stock (use function)
SELECT get_product_stock(?);

-- Making a sale (use ledger)
-- 1. Insert sale record
-- 2. Find batch with stock (FIFO)
-- 3. Insert sale_item with product_batch_id
-- 4. Insert stock_movement with negative quantity
```

### What Needs to Change in Frontend

1. **Inventory Listing**
   - Query `product_summary_view` instead of `products`
   - Display total stock and batch count
   - Show earliest expiry date

2. **Stock Display**
   - Use `current_stock_view` to show stock per batch
   - Display batch number and expiry with each item

3. **Purchase Invoices**
   - Create records in `purchase_invoices` table
   - Create `product_batches` for each item
   - Create `stock_movements` to add stock

4. **Sales / POS**
   - Select from available batches (FIFO preferred)
   - Reference `product_batch_id` in `sale_items`
   - Create `stock_movements` to reduce stock

5. **Stock Takes**
   - Use `stock_take_sessions` and `stock_take_items`
   - Count per batch, not per product
   - Generate adjustment movements for differences

6. **Reports**
   - Use views for aggregated data
   - Query `stock_movements` for history
   - Join with `product_batches` for batch details

---

## Testing Checklist

- [x] Products table cleaned (9 columns remaining)
- [x] New tables created and populated
- [x] Data migrated successfully
- [x] Views created and functional
- [x] Helper functions working
- [x] Low stock alerts working
- [x] Expiring batches detected
- [x] Stock calculations accurate
- [x] All tables have RLS enabled
- [x] Foreign key constraints in place

---

## Support

If you need to:
- **Check stock**: Query `current_stock_view`
- **Find low stock**: Query `low_stock_view`
- **Find expiring items**: Query `expiring_batches_view`
- **Get product summary**: Query `product_summary_view`
- **Trace stock changes**: Query `stock_movements` with batch_id
- **Get batch stock**: Use `get_batch_stock(batch_id)`
- **Get product stock**: Use `get_product_stock(product_id)`

---

**Migration Date:** 2025-12-19
**Status:** ✅ COMPLETE
**Data Migrated:** 13 products, 13 batches, 13 stock movements
**Schema:** Clean, normalized, production-ready
