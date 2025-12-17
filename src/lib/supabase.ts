import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig, config, isProduction, isDevelopment } from '../config/environment';

const supabaseConfig = getSupabaseConfig();

const isSupabaseConfigured = Boolean(
  supabaseConfig.url &&
  supabaseConfig.anonKey &&
  supabaseConfig.url !== 'https://placeholder.supabase.co' &&
  supabaseConfig.anonKey !== 'placeholder-key' &&
  !supabaseConfig.url.includes('your-') &&
  !supabaseConfig.anonKey.includes('your-') &&
  supabaseConfig.url.startsWith('https://') &&
  supabaseConfig.url.includes('.supabase.co')
);

if (!isSupabaseConfigured) {
  console.error('❌ Supabase not configured properly');
  console.error('Please check your environment variables in .env.' + config.env);
  throw new Error('Supabase configuration is required');
}

if (isProduction()) {
  if (supabaseConfig.url.includes('localhost') || supabaseConfig.url.includes('127.0.0.1')) {
    throw new Error('CRITICAL: Production environment cannot use localhost database!');
  }
  console.log('🔒 Production database connection initialized');
} else if (isDevelopment()) {
  console.log('🔧 Development database connection initialized');
}

export const supabase = createClient(
  supabaseConfig.url,
  supabaseConfig.anonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export const isSupabaseEnabled = isSupabaseConfigured;

// Database types
export interface User {
  id: string;
  email: string;
  phone?: string;
  name: string;
  role: 'super_admin' | 'admin' | 'inventory_manager' | 'sales' | 'cashier';
  is_active: boolean;
  password_hash: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  supplier: string;
  batch_number: string;
  expiry_date: string;
  cost_price: number;
  selling_price: number;
  current_stock: number;
  min_stock_level: number;
  barcode: string;
  invoice_number?: string;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  receipt_number: string;
  customer_name?: string;
  total_amount: number;
  payment_method: 'cash' | 'mpesa' | 'card' | 'insurance';
  sales_person_id: string;
  sales_person_name: string;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  batch_number?: string;
}

export interface PriceHistory {
  id: string;
  product_id: string;
  cost_price: number;
  selling_price: number;
  user_id: string;
  user_name: string;
  created_at: string;
}

export interface StockTake {
  id: string;
  product_id: string;
  product_name: string;
  expected_stock: number;
  actual_stock: number;
  difference: number;
  reason?: string;
  user_id: string;
  user_name: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  details: string;
  created_at: string;
}