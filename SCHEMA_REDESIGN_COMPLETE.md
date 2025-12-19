# Schema Redesign - Complete Documentation

## Overview

Your pharmacy POS system has been completely redesigned with a proper architectural foundation that follows industry best practices. The system now properly separates concerns and maintains data integrity through a ledger-based approach.

## Core Architectural Principles

### 1. **Products ≠ Batches ≠ Stock**
- **Products** are master data (name, barcode, category)
- **Batches** represent physical inventory purchases (expiry, cost, supplier)
- **Stock** is calculated from movements, never stored

### 2. **Ledger-Based Stock Management**
- All stock changes flow through `stock_movements` table
- Current stock = SUM of all movements for a batch
- Complete audit trail of every stock change
- No sync issues or data corruption

### 3. **Batch-Specific Pricing**
- Each batch has its own cost price, selling price, and VAT rate
- Enables accurate profit tracking per batch
- Handles price changes over time correctly

## New Database Structure

### Master Data Tables

#### `suppliers`
Normalized supplier information
- `id` - UUID primary key
- `name` - Unique supplier name
- `phone` - Contact phone
- `email` - Contact email

#### `categories`
Product categories
- `id` - UUID primary key
- `name` - Unique category name

#### `products` (updated)
Pure master data only
- `id` - UUID primary key
- `name` - Product name
- `category_id` - FK to categories
- `supplier_id` - FK to suppliers (default supplier)
- `barcode` - Unique barcode
- `min_stock_level` - Reorder level
- `is_vat_exempt` - VAT exemption flag
- **Removed**: `cost_price`, `selling_price`, `current_stock` (now in batches)

### Purchase Flow Tables

#### `purchase_invoices` (replaces `invoices`)
Supplier purchase invoices
- `id` - UUID primary key
- `invoice_number` - Unique invoice number
- `supplier_id` - FK to suppliers
- `invoice_date` - Date of invoice
- `notes` - Additional notes
- `created_by` - User who created the invoice

#### `product_batches` ⭐ CRITICAL TABLE
Each purchase creates a batch
- `id` - UUID primary key
- `product_id` - FK to products
- `supplier_id` - FK to suppliers
- `purchase_invoice_id` - FK to purchase_invoices
- `batch_number` - Batch identifier
- `expiry_date` - When the batch expires
- `cost_price` - Purchase cost per unit
- `selling_price` - Retail price per unit
- `vat_rate` - VAT percentage for this batch
- `quantity_received` - Initial quantity received

**Why batches matter:**
- Track expiry per batch (not per product)
- Different batches can have different costs
- Different batches can have different prices
- Complete traceability of which batch was sold

### Stock Ledger

#### `stock_movements` ⭐ CRITICAL TABLE
Ledger for all stock changes
- `id` - UUID primary key
- `product_batch_id` - FK to product_batches
- `movement_type` - Type of movement:
  - `purchase` - Stock received from supplier
  - `sale` - Stock sold to customer
  - `supplier_return` - Returned to supplier
  - `customer_return` - Returned by customer
  - `expiry` - Expired stock removed
  - `adjustment` - Manual adjustment (stock take)
- `quantity` - Positive for increases, negative for decreases
- `reference_type` - Type of document (invoice_item, sale_item, etc.)
- `reference_id` - ID of the reference document
- `notes` - Additional notes
- `created_by` - User who created the movement

**Current stock calculation:**
```sql
SELECT SUM(quantity)
FROM stock_movements
WHERE product_batch_id = ?
```

### Sales Flow Tables

#### `sales` (updated)
Sales transactions
- Added `payment_status` - pending, completed, cancelled

#### `sale_items` (updated)
Individual sale line items
- Added `product_batch_id` - FK to product_batches (IMPORTANT: tracks which batch was sold)

#### `payments` (new)
Payment tracking
- `id` - UUID primary key
- `sale_id` - FK to sales
- `method` - cash, mpesa, card, insurance
- `amount` - Payment amount
- `status` - pending, completed, failed, refunded
- `reference` - Payment reference

### Returns & Credit Notes

#### `credit_note_items` (new)
Items being returned to supplier
- `credit_note_id` - FK to credit_notes
- `product_batch_id` - FK to product_batches
- `quantity` - Quantity being returned

#### `customer_returns` (new)
Customer return transactions
- `sale_id` - FK to sales
- `reason` - Reason for return

#### `customer_return_items` (new)
Items being returned by customer
- `customer_return_id` - FK to customer_returns
- `product_batch_id` - FK to product_batches
- `quantity` - Quantity being returned

### Stock Take Tables

#### `stock_take_sessions` (updated)
Stock counting sessions
- `name` - Session name
- `status` - in_progress, completed
- `started_at` - When counting started
- `completed_at` - When counting finished

#### `stock_take_items` (new)
Individual batch counts
- `session_id` - FK to stock_take_sessions
- `product_batch_id` - FK to product_batches
- `expected_quantity` - System calculated stock
- `actual_quantity` - Physically counted stock

When completed, differences generate `adjustment` stock_movements

### Audit Tables

#### `price_history` (new)
Track all price changes
- `product_id` - FK to products
- `old_price` - Previous price
- `new_price` - New price
- `reason` - Reason for change
- `changed_by` - User who made the change

## Views and Functions

### `current_stock_view`
Real-time view of current stock
```sql
SELECT * FROM current_stock_view;
```
Returns:
- batch_id
- product_name
- batch_number
- expiry_date
- cost_price
- selling_price
- supplier_name
- category_name
- current_stock (calculated)

### Helper Functions

#### `get_batch_stock(batch_id)`
Get current stock for a specific batch
```sql
SELECT get_batch_stock('batch-uuid-here');
```

#### `get_product_stock(product_id)`
Get total stock for a product (all batches)
```sql
SELECT get_product_stock('product-uuid-here');
```

#### `get_product_batches_with_stock(product_id)`
Get all batches with stock for a product
```sql
SELECT * FROM get_product_batches_with_stock('product-uuid-here');
```

## Migration Summary

### What Was Migrated

✅ **13 Products** → Split into:
- 13 Products (master data)
- 13 Product Batches (with pricing and expiry)

✅ **1 Invoice** → Converted to:
- 1 Purchase Invoice
- 13 Stock Movements (purchases)

✅ **Suppliers** → Extracted:
- 2 Suppliers (including "Unknown Supplier" for safety)

✅ **Categories** → Extracted:
- 2 Categories (including "Uncategorized" for safety)

✅ **151 Activity Logs** → Preserved

### Data Integrity Verified

- All products linked to categories
- All products linked to suppliers
- All batches linked to products
- All stock movements linked to batches
- Stock calculations accurate
- All tables have RLS enabled

## How to Use the New Schema

### Creating a Purchase Invoice

```sql
-- 1. Create the invoice
INSERT INTO purchase_invoices (invoice_number, supplier_id, invoice_date, notes, created_by)
VALUES ('INV-001', supplier_uuid, '2025-12-19', 'Monthly order', user_uuid)
RETURNING id;

-- 2. For each product in the invoice, create a batch
INSERT INTO product_batches (
  product_id, supplier_id, purchase_invoice_id,
  batch_number, expiry_date, cost_price, selling_price, vat_rate, quantity_received
)
VALUES (
  product_uuid, supplier_uuid, invoice_uuid,
  'BATCH-123', '2026-12-31', 100, 150, 16, 50
)
RETURNING id;

-- 3. Create stock movement (automatically done via trigger or explicit)
INSERT INTO stock_movements (
  product_batch_id, movement_type, quantity,
  reference_type, reference_id, created_by
)
VALUES (
  batch_uuid, 'purchase', 50,
  'purchase_invoice', invoice_uuid, user_uuid
);
```

### Making a Sale

```sql
-- 1. Create the sale
INSERT INTO sales (receipt_number, payment_status, created_by)
VALUES ('SALE-001', 'completed', user_uuid)
RETURNING id;

-- 2. For each item, find the batch with earliest expiry (FIFO)
SELECT id, selling_price, vat_rate
FROM product_batches pb
WHERE product_id = product_uuid
  AND (SELECT SUM(quantity) FROM stock_movements WHERE product_batch_id = pb.id) > 0
ORDER BY expiry_date ASC
LIMIT 1;

-- 3. Add sale item
INSERT INTO sale_items (
  sale_id, product_batch_id, quantity, selling_price, vat_rate
)
VALUES (sale_uuid, batch_uuid, 2, 150, 16);

-- 4. Create stock movement (reduces stock)
INSERT INTO stock_movements (
  product_batch_id, movement_type, quantity,
  reference_type, reference_id, created_by
)
VALUES (
  batch_uuid, 'sale', -2,
  'sale_item', sale_item_uuid, user_uuid
);

-- 5. Record payment
INSERT INTO payments (sale_id, method, amount, status)
VALUES (sale_uuid, 'cash', 300, 'completed');
```

### Checking Stock

```sql
-- Get current stock for all products
SELECT
  product_name,
  batch_number,
  expiry_date,
  current_stock
FROM current_stock_view
ORDER BY product_name, expiry_date;

-- Get stock for a specific product
SELECT get_product_stock('product-uuid-here');

-- Get all batches for a product
SELECT * FROM get_product_batches_with_stock('product-uuid-here');
```

### Stock Take

```sql
-- 1. Create session
INSERT INTO stock_take_sessions (name, created_by)
VALUES ('Monthly Stock Take - Dec 2025', user_uuid)
RETURNING id;

-- 2. For each batch, record counts
INSERT INTO stock_take_items (
  session_id, product_batch_id,
  expected_quantity, actual_quantity
)
SELECT
  session_uuid,
  pb.id,
  get_batch_stock(pb.id),
  NULL -- Will be filled during counting
FROM product_batches pb;

-- 3. During counting, update actual quantities
UPDATE stock_take_items
SET actual_quantity = 45
WHERE id = item_uuid;

-- 4. Complete session and create adjustments
UPDATE stock_take_sessions
SET status = 'completed', completed_at = now()
WHERE id = session_uuid;

-- 5. For each discrepancy, create adjustment movement
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
  user_uuid
FROM stock_take_items
WHERE session_id = session_uuid
  AND actual_quantity != expected_quantity;
```

## Benefits of the New Design

### 1. Accurate Stock Tracking
- Stock is calculated, not stored
- No sync issues between tables
- Complete audit trail

### 2. Proper Batch Management
- Track expiry per batch
- FIFO/FEFO selling strategies
- Different costs per batch

### 3. Financial Accuracy
- VAT tracked per batch
- Profit calculated per sale
- Historical pricing preserved

### 4. Audit Compliance
- Every stock change logged
- Who, what, when, why recorded
- Immutable history

### 5. Scalability
- Ledger design scales to millions of transactions
- Indexes on critical columns
- Efficient queries via views

### 6. Data Integrity
- Foreign key constraints prevent orphaned data
- Check constraints prevent invalid values
- RLS ensures security

## Next Steps

### Frontend Updates Required

The frontend will need updates to work with the new schema:

1. **Inventory Management**
   - Query `current_stock_view` instead of `products.current_stock`
   - Display batch information (batch number, expiry)
   - Support FIFO batch selection during sales

2. **Purchase Invoices**
   - Use `purchase_invoices` and `product_batches` tables
   - Create stock movements after batch creation

3. **Sales**
   - Select from available batches (preferring earliest expiry)
   - Reference `product_batch_id` in sale_items
   - Create stock movements after sales

4. **Stock Takes**
   - Use new `stock_take_sessions` and `stock_take_items`
   - Compare expected vs actual per batch
   - Generate adjustment movements

5. **Reports**
   - Use `current_stock_view` for stock reports
   - Query `stock_movements` for stock history
   - Join with `product_batches` for batch details

### Recommended Improvements

1. **Auto-select batches during sales** (FIFO/FEFO)
2. **Low stock alerts** per batch
3. **Expiry alerts** dashboard
4. **Batch transfer** between locations
5. **Automated stock movement creation** via triggers

## Support

For questions or issues with the new schema:
1. Check `current_stock_view` for stock accuracy
2. Query `stock_movements` to trace stock changes
3. Verify batch information in `product_batches`
4. Review `activity_logs` for user actions

---

**Migration Date:** 2025-12-19
**Migration File:** `complete_schema_redesign_v2.sql`
**Status:** ✅ Complete and Verified
