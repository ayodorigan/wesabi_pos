export interface Supplier {
  id: string;
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  category_id: string;
  category_name?: string;
  supplier_id: string;
  supplier_name?: string;
  min_stock_level: number;
  is_vat_exempt: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ProductBatch {
  id: string;
  product_id: string;
  product_name: string;
  supplier_id: string;
  supplier_name?: string;
  purchase_invoice_id?: string;
  batch_number?: string;
  expiry_date?: Date;
  cost_price: number;
  selling_price: number;
  supplier_discount_percent?: number;
  vat_rate: number;
  quantity_received: number;
  current_stock?: number;
  created_at: Date;
  updated_at: Date;
}

export interface CurrentStockView {
  batch_id: string;
  product_id: string;
  product_name: string;
  barcode: string;
  batch_number?: string;
  expiry_date?: Date;
  cost_price: number;
  selling_price: number;
  supplier_discount_percent?: number;
  vat_rate: number;
  vat_amount: number;
  selling_price_inc_vat: number;
  supplier_name?: string;
  supplier_id: string;
  category_name?: string;
  category_id: string;
  is_vat_exempt: boolean;
  min_stock_level: number;
  current_stock: number;
  quantity_received: number;
  purchase_invoice_id?: string;
  created_at: Date;
}

export interface ProductSummaryView {
  product_id: string;
  product_name: string;
  barcode: string;
  category_name?: string;
  category_id: string;
  default_supplier_name?: string;
  default_supplier_id: string;
  min_stock_level: number;
  is_vat_exempt: boolean;
  total_stock: number;
  active_batch_count: number;
  earliest_expiry?: Date;
  avg_cost_price: number;
  avg_selling_price: number;
  created_at: Date;
  updated_at: Date;
}

export interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  supplier_id: string;
  supplier_name?: string;
  invoice_date: Date;
  total_amount: number;
  notes?: string;
  created_by: string;
  created_by_name?: string;
  created_at: Date;
  updated_at: Date;
  items?: ProductBatch[];
}

export interface StockMovement {
  id: string;
  product_batch_id: string;
  movement_type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'stock_take';
  quantity: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  created_by: string;
  created_at: Date;
}

export interface Sale {
  id: string;
  receipt_number: string;
  customer_name?: string;
  customer_phone?: string;
  payment_method?: 'cash' | 'mpesa' | 'card' | 'insurance';
  payment_status: 'pending' | 'completed' | 'cancelled';
  total_amount: number;
  amount_paid: number;
  change_amount: number;
  notes?: string;
  created_by: string;
  created_by_name?: string;
  created_at: Date;
  updated_at: Date;
  items?: SaleItem[];
  payments?: Payment[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_batch_id: string;
  product_name: string;
  batch_number?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  cost_price_at_sale: number;
  profit_amount: number;
  created_at: Date;
}

export interface Payment {
  id: string;
  sale_id: string;
  method: 'cash' | 'mpesa' | 'card' | 'insurance';
  amount: number;
  reference_number?: string;
  status: 'pending' | 'completed' | 'failed';
  mpesa_transaction_id?: string;
  created_at: Date;
}

export interface CreditNote {
  id: string;
  credit_note_number: string;
  supplier_id: string;
  supplier_name?: string;
  purchase_invoice_id?: string;
  invoice_number?: string;
  return_date: Date;
  total_amount: number;
  reason: string;
  notes?: string;
  created_by: string;
  created_by_name?: string;
  created_at: Date;
  updated_at: Date;
  items?: CreditNoteItem[];
}

export interface CreditNoteItem {
  id: string;
  credit_note_id: string;
  product_batch_id: string;
  product_name: string;
  batch_number?: string;
  quantity: number;
  cost_price: number;
  total_amount: number;
  reason?: string;
  created_at: Date;
}

export interface CustomerReturn {
  id: string;
  return_number: string;
  sale_id?: string;
  receipt_number?: string;
  customer_name?: string;
  return_date: Date;
  total_refund: number;
  reason: string;
  notes?: string;
  processed_by: string;
  processed_by_name?: string;
  created_at: Date;
  updated_at: Date;
  items?: CustomerReturnItem[];
}

export interface CustomerReturnItem {
  id: string;
  customer_return_id: string;
  sale_item_id?: string;
  product_batch_id: string;
  product_name: string;
  batch_number?: string;
  quantity: number;
  unit_price: number;
  refund_amount: number;
  reason?: string;
  created_at: Date;
}

export interface StockTakeSession {
  id: string;
  session_name: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  started_at: Date;
  completed_at?: Date;
  total_items?: number;
  items_counted?: number;
  discrepancies_found?: number;
  created_by: string;
  created_by_name?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  items?: StockTakeItem[];
}

export interface StockTakeItem {
  id: string;
  session_id: string;
  product_batch_id: string;
  product_name: string;
  batch_number?: string;
  expected_quantity: number;
  actual_quantity?: number;
  difference?: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  details: string;
  timestamp: Date;
}

export interface StockAlert {
  id: string;
  product_id: string;
  product_name: string;
  alertType: 'low_stock' | 'expiry_warning';
  current_stock?: number;
  min_stock_level?: number;
  expiry_date?: Date;
  days_to_expiry?: number;
}

export interface LowStockView {
  product_id: string;
  product_name: string;
  barcode: string;
  category_name?: string;
  min_stock_level: number;
  current_stock: number;
  stock_shortage: number;
  batch_count: number;
  nearest_expiry?: Date;
}

export interface ExpiringBatchView {
  batch_id: string;
  product_id: string;
  product_name: string;
  batch_number?: string;
  expiry_date: Date;
  current_stock: number;
  cost_price: number;
  selling_price: number;
  supplier_name?: string;
  days_until_expiry: number;
}

export interface SalesHistoryItem {
  id: string;
  receipt_number: string;
  product_name: string;
  batch_number?: string;
  quantity: number;
  unit_price: number;
  cost_price_at_sale: number;
  profit_amount: number;
  total_price: number;
  payment_method?: string;
  customer_name?: string;
  sales_person_name: string;
  sale_date: Date;
}

export type ReturnReasonCode = 'excess' | 'expired' | 'near_expiry' | 'not_ordered' | 'damaged' | 'other';

export const RETURN_REASONS: Record<ReturnReasonCode, string> = {
  excess: 'Excess/Overstocked',
  expired: 'Expired Product',
  near_expiry: 'Near Expiry',
  not_ordered: 'Not Ordered',
  damaged: 'Damaged/Defective',
  other: 'Other (Specify)'
};

export interface PriceHistory {
  id: string;
  product_id: string;
  date: Date;
  cost_price: number;
  selling_price: number;
  user_id: string;
  user_name: string;
}
