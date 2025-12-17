// Frontend types
export interface PriceHistory {
  id: string;
  productId: string;
  date: Date;
  costPrice: number;
  sellingPrice: number;
  userId: string;
  userName: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  supplier: string;
  batchNumber: string;
  expiryDate: Date;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  minStockLevel: number;
  barcode: string;
  invoiceNumber?: string;
  invoicePrice?: number;
  supplierDiscountPercent?: number;
  vatRate?: number;
  otherCharges?: number;
  priceHistory: PriceHistory[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  originalPrice?: number;
  priceAdjusted?: boolean;
  batchNumber?: string;
}

export interface Sale {
  id: string;
  receiptNumber: string;
  customerName?: string;
  totalAmount: number;
  paymentMethod: 'cash' | 'mpesa' | 'card' | 'insurance';
  salesPersonId: string;
  salesPersonName: string;
  items: SaleItem[];
  createdAt: Date;
}

export interface StockTake {
  id: string;
  productId: string;
  productName: string;
  expectedStock: number;
  actualStock: number;
  difference: number;
  reason?: string;
  userId: string;
  userName: string;
  createdAt: Date;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: Date;
}

export interface StockAlert {
  id: string;
  productId: string;
  productName: string;
  alertType: 'low_stock' | 'expiry_warning';
  currentStock?: number;
  minStockLevel?: number;
  expiryDate?: Date;
  daysToExpiry?: number;
}

export interface SalesHistoryItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  totalCost: number;
  totalRevenue: number;
  profit: number;
  paymentMethod: string;
  customerName?: string;
  salesPersonName: string;
  receiptNumber: string;
  saleDate: Date;
}

export interface InvoiceItem {
  id?: string;
  productName: string;
  category: string;
  batchNumber: string;
  expiryDate: Date;
  quantity: number;
  invoicePrice?: number;
  supplierDiscountPercent?: number;
  vatRate?: number;
  otherCharges?: number;
  costPrice: number;
  sellingPrice: number;
  totalCost: number;
  barcode: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  supplier: string;
  invoiceDate: Date;
  totalAmount: number;
  notes?: string;
  userId: string;
  userName: string;
  items: InvoiceItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditNoteItem {
  id?: string;
  productId: string;
  productName: string;
  batchNumber: string;
  quantity: number;
  costPrice: number;
  totalCredit: number;
  reason?: string;
}

export interface CreditNote {
  id: string;
  creditNoteNumber: string;
  invoiceId?: string;
  invoiceNumber: string;
  supplier: string;
  returnDate: Date;
  totalAmount: number;
  reason: string;
  returnReasonCode?: string;
  userId: string;
  userName: string;
  items: CreditNoteItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceReversalItem {
  id?: string;
  originalInvoiceItemId?: string;
  productId?: string;
  productName: string;
  category?: string;
  batchNumber?: string;
  expiryDate?: Date;
  quantity: number;
  invoicePrice?: number;
  supplierDiscountPercent?: number;
  vatRate?: number;
  otherCharges?: number;
  costPrice: number;
  sellingPrice?: number;
  totalCost: number;
  barcode?: string;
}

export interface InvoiceReversal {
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

export type ReturnReasonCode = 'excess' | 'expired' | 'near_expiry' | 'not_ordered' | 'damaged' | 'other';

export const RETURN_REASONS: Record<ReturnReasonCode, string> = {
  excess: 'Excess/Overstocked',
  expired: 'Expired Product',
  near_expiry: 'Near Expiry',
  not_ordered: 'Not Ordered',
  damaged: 'Damaged/Defective',
  other: 'Other (Specify)'
};