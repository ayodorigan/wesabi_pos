# Invoice Reversal System Implementation

## Overview
This document describes the invoice reversal system implemented to prevent invoice deletion and maintain proper audit trails while allowing corrections through reversals.

## Key Changes

### 1. Database Schema
**Migration:** `create_invoice_reversal_system`

#### New Tables

**invoice_reversals**
- Stores all invoice reversal records
- Links to original invoice via `original_invoice_id`
- Tracks reversal type (purchase/sales)
- Immutable once created (no updates/deletes allowed)
- Fields:
  - `id`: UUID primary key
  - `original_invoice_id`: Reference to original invoice
  - `reversal_number`: Unique reversal identifier (e.g., REV-INV001-timestamp)
  - `reversal_type`: 'purchase' or 'sales'
  - `reversal_date`: Date of reversal
  - `total_amount`: Total amount being reversed
  - `reason`: Reason for reversal
  - `notes`: Additional notes
  - `user_id`, `user_name`: Who created the reversal
  - `created_at`, `updated_at`: Timestamps

**invoice_reversal_items**
- Individual line items in a reversal
- Mirrors invoice_items structure
- Links to original invoice item for audit trail
- Fields mirror invoice_items with addition of:
  - `reversal_id`: Reference to parent reversal
  - `original_invoice_item_id`: Links to original invoice item

**credit_notes enhancement**
- Added `return_reason_code` field for standardized reasons

#### Security (RLS Policies)
- Users can view all reversals (read-only audit trail)
- Users can create reversals (with auth check)
- **No updates or deletes allowed** - reversals are permanent records
- Policies prevent modification after creation

### 2. Invoice Management UI Changes

**Removed:**
- Delete button for invoices
- `deleteInvoice()` function

**Added:**
- "Create Reversal" button (orange RotateCcw icon)
- `createReversal()` function

**Reversal Workflow:**
1. User clicks "Create Reversal" button
2. Confirmation dialog explains the action
3. System creates reversal record
4. System adjusts inventory (subtracts quantities)
5. System validates sufficient stock before reversing
6. Activity log records the reversal
7. Original invoice remains in database unchanged

### 3. Credit Notes UI Changes

**Standard Return Reasons:**
- Excess/Overstocked
- Expired Product
- Near Expiry
- Not Ordered
- Damaged/Defective
- Other (with custom reason field)

**Removed:**
- Delete functionality for credit notes
- Free-text reason field

**Added:**
- Dropdown selector for standard return reasons
- Conditional custom reason input for "Other"
- `returnReasonCode` field tracking

### 4. Type Definitions

**New Types:**
```typescript
interface InvoiceReversal {
  id: string;
  originalInvoiceId: string;
  reversalNumber: string;
  reversalType: 'purchase' | 'sales';
  reversalDate: Date;
  totalAmount: number;
  reason: string;
  notes?: string;
  userId: string;
  userName: string;
  items: InvoiceReversalItem[];
  createdAt: Date;
  updatedAt: Date;
}

interface InvoiceReversalItem {
  // Mirrors invoice_items structure
  // Plus originalInvoiceItemId for tracking
}

type ReturnReasonCode = 'excess' | 'expired' | 'near_expiry' | 'not_ordered' | 'damaged' | 'other';

const RETURN_REASONS: Record<ReturnReasonCode, string>
```

## Business Logic

### Purchase Invoice Reversal
**When reversing a purchase invoice:**
1. Creates reversal record with type 'purchase'
2. For each item:
   - Finds matching product in inventory
   - Validates sufficient stock exists
   - **Subtracts** quantity from inventory
   - Creates reversal item record
3. Logs activity
4. Refreshes data

**Example:**
- Original: Added 100 units of Product A
- Reversal: Removes 100 units from Product A inventory
- Both records remain in database for audit

### Credit Notes (Returns to Supplier)
**When creating a credit note:**
1. User selects standard return reason
2. System validates stock availability
3. **Subtracts** quantity from inventory
4. Creates credit note with reason code
5. Original purchase invoice remains unchanged

### Inventory Safety
**Prevents negative stock:**
```typescript
if (newStock < 0) {
  throw new Error(`Insufficient stock for ${productName}`);
}
```

**Validation happens before any changes are committed**

## Audit Trail

### What's Preserved
- Original invoices (never deleted)
- All reversal records (immutable)
- Activity logs for all actions
- Complete transaction history

### Activity Log Entries
- `INVOICE_REVERSED`: When reversal is created
- `CREDIT_NOTE_CREATED`: When return is processed
- Each entry includes amounts, dates, and user info

## User Permissions

### Who Can Create Reversals
- Users with `canDeleteProducts()` permission
- Typically: super_admin, admin roles

### Who Can View
- All authenticated users can view invoices
- All authenticated users can view reversals
- Read-only access ensures transparency

## Data Consistency

### Guaranteed Consistency
1. **Atomic operations**: Reversal creation is transactional
2. **Stock validation**: Checks before subtracting
3. **Error handling**: Rolls back on failure
4. **Audit trail**: Every action is logged

### Preventing Data Loss
- No deletion of historical records
- Reversals are additive corrections
- Complete audit trail maintained
- Original documents preserved

## Migration Safety

The migration includes:
- `IF NOT EXISTS` clauses for safe re-runs
- Proper foreign key relationships
- Cascading deletes only for child records
- Comments documenting purpose and constraints

## Usage Examples

### Creating a Purchase Invoice Reversal
1. Navigate to Invoice Management
2. Find the invoice to reverse
3. Click the orange reversal icon (RotateCcw)
4. Confirm the action
5. System creates reversal and adjusts inventory

### Creating a Credit Note
1. Navigate to Credit Notes
2. Click "New Credit Note"
3. Enter invoice details
4. Add products to return
5. Select standard return reason (or custom)
6. Save - inventory is automatically adjusted

## Best Practices

1. **Always use reversals** - Never delete invoices
2. **Document reasons** - Use standard codes when possible
3. **Verify stock** - System validates, but check beforehand
4. **Review audit logs** - Track all corrections
5. **Keep original invoices** - They're part of the audit trail

## Technical Notes

### Database Constraints
- Foreign key on `original_invoice_id` prevents orphaned reversals
- Unique constraint on `reversal_number` prevents duplicates
- Check constraints ensure positive quantities

### Performance Considerations
- Indexes on frequently queried fields (invoice_id, user_id, date)
- Efficient cascading for related items
- Optimized queries for listing operations

### Error Handling
- Validates stock before making changes
- Clear error messages for users
- Logs all errors for debugging
- Graceful failure with helpful feedback

## Future Enhancements

Potential additions:
- Partial reversals (reverse only some items)
- Reversal approval workflow
- Batch reversal operations
- Reversal reports and analytics
- Reversal reason analytics

## Conclusion

The invoice reversal system provides:
- ✅ Complete audit trail
- ✅ Inventory consistency
- ✅ Data integrity
- ✅ User-friendly interface
- ✅ Proper error handling
- ✅ Secure permissions
- ✅ No data loss

All corrections are tracked, reversible operations maintain inventory accuracy, and the complete history is preserved for compliance and auditing purposes.
