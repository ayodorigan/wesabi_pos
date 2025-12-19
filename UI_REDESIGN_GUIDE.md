# UI Redesign Implementation Guide

## Overview

The frontend has been updated to work with the new batch-and-ledger database schema. This guide explains the key changes and how to work with the new system.

---

## Key Changes

### 1. TypeScript Interfaces ✅

All types in `src/types/index.ts` have been updated to match the new schema:

**New Core Types:**
- `Product` - Master data only (no pricing/stock)
- `ProductBatch` - Batch-specific data (pricing, expiry)
- `CurrentStockView` - Real-time stock per batch
- `ProductSummaryView` - Aggregated product info
- `PurchaseInvoice` - Purchase tracking
- `StockMovement` - Stock change ledger
- `Sale`, `SaleItem` - Sales with batch references
- `StockTakeSession`, `StockTakeItem` - Batch-level counting

### 2. Data Fetching Pattern

**OLD:**
```typescript
const { data } = await supabase
  .from('products')
  .select('*');
```

**NEW:**
```typescript
const { data } = await supabase
  .from('current_stock_view')
  .select('*');
```

**Key Views to Use:**
- `current_stock_view` - Show inventory with stock
- `product_summary_view` - Product listing
- `low_stock_view` - Low stock alerts
- `expiring_batches_view` - Expiring items

---

## Component Updates Required

### 1. Inventory Component

**What Changed:**
- Now queries `current_stock_view` instead of `products`
- Shows batch information (batch number, expiry per batch)
- Each product can have multiple batches
- Stock is read-only (calculated from ledger)

**Key Code Changes:**

```typescript
// Fetch inventory
const { data: stockData } = await supabase
  .from('current_stock_view')
  .select('*')
  .order('product_name');

// Group by product if needed
const productGroups = stockData.reduce((acc, batch) => {
  if (!acc[batch.product_id]) {
    acc[batch.product_id] = [];
  }
  acc[batch.product_id].push(batch);
  return acc;
}, {});

// Display
- Product Name
- Batch Number
- Expiry Date
- Current Stock (per batch)
- Cost Price, Selling Price (per batch)
- Actions: View batches, no direct stock edit
```

**Adding Products:**
- Not done here anymore
- Use Invoice Management to receive stock

### 2. Invoice Management (Purchase Flow)

**What Changed:**
- Creates `purchase_invoices` record
- For each item, creates `product_batches` record
- For each batch, creates `stock_movements` record
- Multiple records per transaction (atomic)

**Implementation Flow:**

```typescript
// Step 1: Create purchase invoice
const { data: invoice } = await supabase
  .from('purchase_invoices')
  .insert({
    invoice_number: 'INV-001',
    supplier_id: supplierUuid,
    invoice_date: '2025-12-19',
    notes: 'Monthly order',
    created_by: user.id
  })
  .select()
  .single();

// Step 2: For each product, create batch
for (const item of items) {
  const { data: batch } = await supabase
    .from('product_batches')
    .insert({
      product_id: item.productId,
      supplier_id: supplierUuid,
      purchase_invoice_id: invoice.id,
      batch_number: item.batchNumber,
      expiry_date: item.expiryDate,
      cost_price: item.costPrice,
      selling_price: item.sellingPrice,
      supplier_discount_percent: item.discount,
      vat_rate: item.vatRate,
      quantity_received: item.quantity
    })
    .select()
    .single();

  // Step 3: Create stock movement (adds to stock)
  await supabase
    .from('stock_movements')
    .insert({
      product_batch_id: batch.id,
      movement_type: 'purchase',
      quantity: item.quantity,
      reference_type: 'purchase_invoice',
      reference_id: invoice.id,
      created_by: user.id
    });
}
```

**UI Changes:**
- Add "Select Product" (from products master)
- If product doesn't exist, create it first
- Enter batch details for EACH purchase
- Show batch number and expiry prominently
- Calculate and show pricing per batch

### 3. POS Component (Sales Flow)

**What Changed:**
- Select from available batches (FIFO preferred)
- Create sale with batch references
- Create stock movements (negative quantity)
- Track cost at time of sale

**Implementation Flow:**

```typescript
// Step 1: Find available batches for product (FIFO)
const { data: batches } = await supabase
  .from('current_stock_view')
  .select('*')
  .eq('product_id', productId)
  .gt('current_stock', 0)
  .order('expiry_date', { ascending: true, nullsFirst: false })
  .order('created_at', { ascending: true });

// Step 2: Create sale
const { data: sale } = await supabase
  .from('sales')
  .insert({
    receipt_number: 'SALE-001',
    payment_status: 'completed',
    total_amount: totalAmount,
    amount_paid: amountPaid,
    change_amount: changeAmount,
    created_by: user.id
  })
  .select()
  .single();

// Step 3: For each item sold
for (const item of cartItems) {
  // Find batch to sell from (FIFO logic)
  const batch = batches.find(b =>
    b.product_id === item.productId &&
    b.current_stock >= item.quantity
  );

  // Create sale item
  const { data: saleItem } = await supabase
    .from('sale_items')
    .insert({
      sale_id: sale.id,
      product_batch_id: batch.batch_id,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      cost_price_at_sale: batch.cost_price,
      profit_amount: (item.unitPrice - batch.cost_price) * item.quantity
    })
    .select()
    .single();

  // Create stock movement (reduces stock)
  await supabase
    .from('stock_movements')
    .insert({
      product_batch_id: batch.batch_id,
      movement_type: 'sale',
      quantity: -item.quantity,
      reference_type: 'sale_item',
      reference_id: saleItem.id,
      created_by: user.id
    });
}

// Step 4: Record payment
await supabase
  .from('payments')
  .insert({
    sale_id: sale.id,
    method: paymentMethod,
    amount: amountPaid,
    status: 'completed'
  });
```

**UI Changes:**
- Product search returns batches, not just products
- Show batch info in search results (expiry, stock per batch)
- Auto-select FIFO batch
- Allow manual batch selection if needed
- Show "Stock: 5 in batch A, 3 in batch B"

### 4. Sales History

**What Changed:**
- Join sales → sale_items → product_batches
- Show batch information in history
- Profit calculated from cost_price_at_sale

**Query:**

```typescript
const { data: salesHistory } = await supabase
  .from('sales')
  .select(`
    *,
    items:sale_items(
      *,
      batch:product_batches(batch_number)
    ),
    payments(*)
  `)
  .order('created_at', { ascending: false });
```

**Display:**
- Receipt Number
- Items sold with batch numbers
- Profit per item (from cost_price_at_sale)
- Payment information

### 5. Stock Take

**What Changed:**
- Create session per stock take
- Count stock per BATCH, not per product
- Generate adjustments from differences

**Implementation:**

```typescript
// Step 1: Create session
const { data: session } = await supabase
  .from('stock_take_sessions')
  .insert({
    session_name: 'Monthly Count - Dec 2025',
    status: 'in_progress',
    created_by: user.id
  })
  .select()
  .single();

// Step 2: Get all batches with stock
const { data: batches } = await supabase
  .from('current_stock_view')
  .select('*')
  .gt('current_stock', 0);

// Step 3: Create stock take items
const items = batches.map(batch => ({
  session_id: session.id,
  product_batch_id: batch.batch_id,
  expected_quantity: batch.current_stock,
  actual_quantity: null
}));

await supabase
  .from('stock_take_items')
  .insert(items);

// Step 4: User counts and updates actual_quantity
await supabase
  .from('stock_take_items')
  .update({ actual_quantity: countedQty })
  .eq('id', itemId);

// Step 5: Complete session and create adjustments
const { data: discrepancies } = await supabase
  .from('stock_take_items')
  .select('*')
  .eq('session_id', session.id)
  .neq('expected_quantity', 'actual_quantity');

for (const item of discrepancies) {
  const difference = item.actual_quantity - item.expected_quantity;

  await supabase
    .from('stock_movements')
    .insert({
      product_batch_id: item.product_batch_id,
      movement_type: 'adjustment',
      quantity: difference,
      reference_type: 'stock_take_item',
      reference_id: item.id,
      notes: `Stock take adjustment: expected ${item.expected_quantity}, found ${item.actual_quantity}`,
      created_by: user.id
    });
}

await supabase
  .from('stock_take_sessions')
  .update({
    status: 'completed',
    completed_at: new Date().toISOString()
  })
  .eq('id', session.id);
```

### 6. Dashboard

**What Changed:**
- Use views for aggregated data
- Show low stock and expiring batches

**Queries:**

```typescript
// Low stock products
const { data: lowStock } = await supabase
  .from('low_stock_view')
  .select('*')
  .limit(10);

// Expiring batches
const { data: expiring } = await supabase
  .from('expiring_batches_view')
  .select('*')
  .limit(10);

// Total stock value
const { data: stockValue } = await supabase
  .from('current_stock_view')
  .select('cost_price, current_stock');

const totalValue = stockValue.reduce((sum, batch) =>
  sum + (batch.cost_price * batch.current_stock), 0
);

// Sales today
const { data: salesToday } = await supabase
  .from('sales')
  .select('total_amount')
  .gte('created_at', new Date().toISOString().split('T')[0]);

const todayTotal = salesToday.reduce((sum, sale) => sum + sale.total_amount, 0);
```

---

## Database Helper Functions

The database provides helper functions you can call:

```typescript
// Get stock for a batch
const { data } = await supabase
  .rpc('get_batch_stock', { batch_id: batchId });

// Get total stock for a product (all batches)
const { data } = await supabase
  .rpc('get_product_stock', { product_id: productId });

// Get all batches for a product with stock
const { data } = await supabase
  .rpc('get_product_batches_with_stock', { product_id: productId });
```

---

## Critical Rules

### 1. NEVER Update Stock Directly
```typescript
// ❌ WRONG - Don't do this
await supabase
  .from('products')
  .update({ current_stock: newStock });

// ✅ CORRECT - Create stock movement
await supabase
  .from('stock_movements')
  .insert({
    product_batch_id: batchId,
    movement_type: 'adjustment',
    quantity: difference,
    notes: 'Manual adjustment',
    created_by: user.id
  });
```

### 2. Always Reference Batches in Sales
```typescript
// ❌ WRONG
sale_items.insert({
  product_id: productId,
  quantity: 5
});

// ✅ CORRECT
sale_items.insert({
  product_batch_id: batchId,  // Reference specific batch
  quantity: 5
});
```

### 3. Use FIFO for Sales
```typescript
// Get batches ordered by expiry (FIFO)
.order('expiry_date', { ascending: true, nullsFirst: false })
.order('created_at', { ascending: true })
```

### 4. Create Products Before Batches
```typescript
// Check if product exists
let productId = existingProductId;

if (!productId) {
  const { data: product } = await supabase
    .from('products')
    .insert({
      name: 'Product Name',
      barcode: 'BARCODE',
      category_id: categoryId,
      supplier_id: supplierId,
      min_stock_level: 10,
      is_vat_exempt: false
    })
    .select()
    .single();

  productId = product.id;
}

// Then create batch
await supabase
  .from('product_batches')
  .insert({
    product_id: productId,
    // ... other fields
  });
```

---

## Migration Checklist

- [x] Database schema redesigned
- [x] TypeScript types updated
- [ ] Inventory component updated
- [ ] Invoice Management updated
- [ ] POS component updated
- [ ] Sales History updated
- [ ] Stock Take updated
- [ ] Dashboard updated
- [ ] AppContext updated (data fetching)
- [ ] All components tested

---

## Testing Guide

### Test Purchase Flow
1. Go to Invoice Management
2. Create new invoice
3. Add products with batch numbers
4. Save invoice
5. Verify:
   - `purchase_invoices` record created
   - `product_batches` records created
   - `stock_movements` records created
   - Stock visible in `current_stock_view`

### Test Sales Flow
1. Go to POS
2. Search for product
3. See available batches with stock
4. Add to cart
5. Complete sale
6. Verify:
   - `sales` record created
   - `sale_items` with batch references created
   - `stock_movements` with negative quantity created
   - Stock reduced in `current_stock_view`

### Test Stock Take
1. Go to Stock Take
2. Create new session
3. Count batches
4. Complete session
5. Verify:
   - Adjustments created for discrepancies
   - Stock corrected in `current_stock_view`

---

## Common Issues

### Issue: "Cannot find product"
**Solution:** Products must exist in `products` table before creating batches. Create master product first.

### Issue: "Stock not updating"
**Solution:** Check that `stock_movements` record was created. Stock is calculated from movements, not stored directly.

### Issue: "Multiple batches confusing"
**Solution:** Show batch number and expiry clearly in UI. Group by product in inventory view.

### Issue: "FIFO not working"
**Solution:** Ensure query orders by `expiry_date ASC, created_at ASC`.

---

## Next Steps

1. Update AppContext to fetch from new views
2. Update each component one by one
3. Test thoroughly after each change
4. Update API calls to use new schema
5. Test end-to-end workflows

**Priority Order:**
1. Invoice Management (can't add stock without it)
2. Inventory (need to see what we have)
3. POS (need to sell)
4. Sales History (need to track)
5. Dashboard (nice to have)
6. Stock Take (periodic)

---

## Support

Refer to `SCHEMA_REDESIGN_COMPLETE.md` for database schema details.

**Quick Reference:**
- Products table: Master data only
- product_batches: Pricing, expiry per batch
- stock_movements: Ledger of all changes
- current_stock_view: Real-time stock display
- product_summary_view: Aggregated product info
