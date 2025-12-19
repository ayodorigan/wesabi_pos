# Frontend-Backend Schema Sync Plan

## Overview

The backend schema has been completely redesigned with a normalized structure (products → batches → stock movements), but the frontend still references the old flat structure. This requires a phased migration to avoid breaking the application.

## Current State

**Backend (NEW):**
- ✅ Normalized schema with `purchase_invoices`, `product_batches`, `stock_movements`
- ✅ Batch-aware inventory tracking
- ✅ Stock calculated from ledger (not stored)

**Frontend (OLD):**
- ❌ References deleted tables: `invoices`, `invoice_items`, `supplier_orders`, `stock_takes`, `drug_registry`
- ❌ Flat product structure with embedded pricing/stock
- ❌ Direct stock updates instead of ledger
- ❌ AppContext (1164 lines) is central bottleneck

## Migration Strategy: 6 Phases

### Phase 1: Database Compatibility Layer (FOUNDATION)
**Critical first step - enables gradual migration**

Create SQL views that emulate old table structure:
- `invoices` view → maps to `purchase_invoices` + `product_batches`
- `invoice_items` view → maps to `product_batches`
- `stock_takes` view → maps to `stock_take_items` + `stock_take_sessions`
- `products_with_stock` view → joins products + batches + calculated stock

Add helper functions:
- `add_stock_movement()` - Create stock movements
- `get_batch_stock()` - Calculate current stock for batch
- `get_product_stock()` - Calculate total stock for product

**Files:** `supabase/migrations/20251220_add_compatibility_views.sql`

### Phase 2: TypeScript Adapter Layer
**Enables type-safe gradual migration**

Create adapters to transform new schema → old interface:
- `SchemaAdapter.purchaseInvoiceToLegacy()` - Convert purchase invoice to old format
- `SchemaAdapter.batchToLegacyProduct()` - Convert batch to product with stock
- `SchemaAdapter.stockTakeItemToLegacy()` - Convert new stock take structure

Keep legacy types temporarily alongside new types.

**Files:** `src/adapters/schemaAdapters.ts`, `src/types/index.ts`

### Phase 3: AppContext Migration
**Update central data layer while maintaining interface**

Update `AppContext.tsx` to:
- Use compatibility views for data loading
- Create stock movements instead of direct updates
- Keep legacy interface for components (no breaking changes yet)
- Add new functions for batch-aware operations

**Files:** `src/contexts/AppContext.tsx`

### Phase 4: Component Refactoring (CRITICAL)
**Update each component to work with new schema**

Priority order:

**Critical (Complex changes):**
1. **InvoiceManagement.tsx** - Replace `invoices`/`invoice_items` with `purchase_invoices`/`product_batches`
   - Create batches when receiving invoices
   - Generate stock movements for each batch
   - Update supplier/category to use IDs not names

2. **Orders.tsx** - Deprecate component
   - Remove Orders.tsx entirely
   - Use InvoiceManagement for all purchasing workflows
   - Update navigation to remove Orders link

3. **POS.tsx** - Implement batch-aware sales
   - Fetch available batches for products
   - Implement FEFO batch selection (First Expiry First Out)
   - Create stock movements on sale (negative quantity)

**Medium (Moderate changes):**
4. **CreditNotes.tsx** - Update to reference `purchase_invoices`, create stock movements
5. **StockTake.tsx** - Use `stock_take_sessions` + `stock_take_items` structure
6. **Inventory.tsx** - Display batch-level information

**Minor (Query updates only):**
7. **SalesHistory.tsx** - Update queries to use new structure
8. **Analytics.tsx** - Update profit calculations with batch data

**Files:** All component files listed above

### Phase 5: Remove Compatibility Layer
**Clean up temporary code once migration complete**

- Drop compatibility views from database
- Remove adapter layer (`src/adapters/schemaAdapters.ts`)
- Remove legacy types from `src/types/index.ts`
- Update all imports to use new types directly

### Phase 6: Enhancements & Edge Cases
**Add missing functionality**

- Polish FEFO batch selection logic with visual indicators
- Add batch-level price history tracking
- Create supplier/category management UI
- Add batch expiry alerts and warnings
- Optimize queries with proper indexes
- Add batch stock visibility in inventory view

## Critical Files to Modify

1. `supabase/migrations/20251220_add_compatibility_views.sql` - Compatibility layer (NEW)
2. `src/adapters/schemaAdapters.ts` - Type transformations (NEW)
3. `src/contexts/AppContext.tsx` (1164 lines) - Central data management (UPDATE)
4. `src/components/InvoiceManagement.tsx` (1442 lines) - Most complex (UPDATE)
5. `src/components/POS.tsx` (1010 lines) - FEFO batch selection (UPDATE)
6. `src/components/Orders.tsx` (1012 lines) - Deprecate (DELETE)
7. `src/components/Layout.tsx` - Remove Orders navigation link (UPDATE)
8. `src/types/index.ts` - Type definitions (UPDATE)
9. `src/utils/drugRegistry.ts` - Remove completely (DELETE)

## Data Migration Strategy

No existing data to migrate - fresh start. Skip migration scripts.

## Testing Checkpoints

After each phase verify:
- ✅ All products visible in inventory
- ✅ Stock counts are accurate
- ✅ Can create purchase invoices
- ✅ Can make sales
- ✅ Can process returns
- ✅ Can perform stock takes
- ✅ No console errors
- ✅ Historical data preserved

## Rollback Strategy

**Phase 1-2:** Drop views, restore from backup
**Phase 3-4:** Git revert changes, keep compatibility layer active
**Phase 5-6:** Restore compatibility views and adapter layer

## Timeline Estimate

- Phase 1 (Database): 2-3 days
- Phase 2 (Adapters): 1-2 days
- Phase 3 (AppContext): 2-3 days
- Phase 4 (Components): 5-7 days
- Phase 5 (Cleanup): 1-2 days
- Phase 6 (Enhancements): 2-3 days

**Total: 13-20 days (2-4 weeks)**

## Decisions Made

1. **Orders Component:** Deprecate - use InvoiceManagement instead (simpler, less duplication)
2. **Batch Selection:** FEFO (First Expiry First Out) - better for pharmacies to minimize waste
3. **Existing Data:** No migration needed - fresh start
4. **Drug Registry:** Remove completely - use products table for autocomplete

## Recommendations

1. ✅ Start with Phase 1 immediately - enables parallel development
2. ✅ Test heavily after Phase 3 - AppContext is the critical dependency
3. ✅ Consider feature freeze during Phase 4 - component migration is high risk
4. ✅ Keep old schema tables for 1 month as rollback safety
5. ✅ Document batch selection strategy before implementing
