import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase environment variables are properly configured
const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://placeholder.supabase.co' && 
  supabaseAnonKey !== 'placeholder-key' &&
  supabaseUrl.startsWith('https://') &&
  supabaseUrl.includes('.supabase.co')
);

if (!isSupabaseConfigured) {
  console.warn('Supabase environment variables not properly configured. Running in demo mode with mock data.');
  console.warn('Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set correctly.');
}

// Create Supabase client only if properly configured
export const supabase = isSupabaseConfigured ? createClient(
  supabaseUrl!,
  supabaseAnonKey!,
  {
    auth: {
      storage: null
    }
  }
) : null;

// Export configuration status
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