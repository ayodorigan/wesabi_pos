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