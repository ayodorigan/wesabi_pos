import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { formatKES, calculateSellingPrice, getMinimumSellingPrice, enforceMinimumSellingPrice } from '../utils/currency';
import { medicineDatabase, drugCategories, commonSuppliers } from '../data/medicineDatabase';
import { useAuth } from './AuthContext';
import { useAlert } from './AlertContext';
import { retryDatabaseOperation } from '../utils/retry';
import { Product, PriceHistory, SaleItem, Sale, StockTake, ActivityLog, StockAlert, SalesHistoryItem } from '../types';
import { getAllDrugNames, addDrugToRegistry } from '../utils/drugRegistry';

interface AppContextType {
  products: Product[];
  sales: Sale[];
  stockTakes: StockTake[];
  activityLogs: ActivityLog[];
  salesHistory: SalesHistoryItem[];
  categories: string[];
  suppliers: string[];
  medicineTemplates: typeof medicineDatabase;
  loading: boolean;
  error: Error | null;
  stockTakeSessions: any[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'priceHistory'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addSale: (sale: Omit<Sale, 'id' | 'createdAt' | 'receiptNumber'>) => Promise<string>;
  addStockTake: (stockTake: Omit<StockTake, 'id' | 'createdAt'>) => Promise<void>;
  createStockTakeSession: (name: string) => Promise<string>;
  updateStockTakeSession: (id: string, updates: any) => Promise<void>;
  deleteStockTakeSession: (id: string) => Promise<void>;
  completeStockTakeSession: (sessionId: string, stockTakes: any[]) => Promise<void>;
  logActivity: (action: string, details: string) => Promise<void>;
  getStockAlerts: () => StockAlert[];
  importProducts: (products: any[]) => Promise<void>;
  addCategory: (category: string) => void;
  addSupplier: (supplier: string) => void;
  addMedicine: (medicine: string) => Promise<void>;
  getMedicineByName: (name: string) => typeof medicineDatabase[0] | undefined;
  getSalesHistory: () => SalesHistoryItem[];
  generateReceipt: (sale: Sale) => void;
  exportToPDF: (data: any, type: string) => void;
  refreshData: () => Promise<void>;
  getLastSoldPrice: (productId: string) => Promise<number | null>;
  isSupabaseEnabled: boolean;
  lastRefreshTime: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { showAlert } = useAlert();
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [stockTakes, setStockTakes] = useState<StockTake[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [salesHistory, setSalesHistory] = useState<SalesHistoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>(drugCategories);
  const [suppliers, setSuppliers] = useState<string[]>(commonSuppliers);
  const [medicineTemplates, setMedicineTemplates] = useState(medicineDatabase);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [stockTakeSessions, setStockTakeSessions] = useState<any[]>([]);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);

  // Load data from database
  const refreshData = async () => {
    setLoading(true);
    setError(null);
    let hasError = false;

    try {
      // Skip database operations if Supabase is not enabled
      if (!isSupabaseEnabled) {
        console.log('Supabase not configured - running in demo mode with mock data only');
        setLoading(false);
        return;
      }

      // Additional safety check for supabase client
      if (!supabase) {
        console.warn('Supabase client not initialized - running in demo mode');
        setLoading(false);
        return;
      }

      // Declare variables at function scope
      let formattedProducts: Product[] = [];
      let formattedStockTakes: StockTake[] = [];
      let formattedLogs: ActivityLog[] = [];

      // Load products - don't exit early on error, just log it
      try {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (productsError) {
          console.error('Error loading products:', productsError);
          hasError = true;
        } else {
          formattedProducts = (productsData || []).map(product => ({
          id: product.id,
          name: product.name,
          category: product.category,
          supplier: product.supplier,
          batchNumber: product.batch_number,
          expiryDate: new Date(product.expiry_date),
          costPrice: parseFloat(product.cost_price) || 0,
          sellingPrice: parseFloat(product.selling_price) || 0,
          currentStock: product.current_stock || 0,
          minStockLevel: product.min_stock_level || 10,
          barcode: product.barcode,
          invoiceNumber: product.invoice_number,
          priceHistory: [],
          createdAt: new Date(product.created_at),
          updatedAt: new Date(product.updated_at),
        }));

        // Load price history for all products
        const { data: priceHistoryData, error: priceHistoryError } = await supabase
          .from('price_history')
          .select('*')
          .order('created_at', { ascending: false });

        if (!priceHistoryError && priceHistoryData) {
          // Group price history by product_id
          const priceHistoryByProduct: Record<string, PriceHistory[]> = {};
          priceHistoryData.forEach(history => {
            if (!priceHistoryByProduct[history.product_id]) {
              priceHistoryByProduct[history.product_id] = [];
            }
            priceHistoryByProduct[history.product_id].push({
              id: history.id,
              productId: history.product_id,
              date: new Date(history.created_at),
              costPrice: parseFloat(history.cost_price) || 0,
              sellingPrice: parseFloat(history.selling_price) || 0,
              userId: history.user_id || 'demo-user',
              userName: history.user_name,
            });
          });

          // Assign price history to each product
          formattedProducts = formattedProducts.map(product => ({
            ...product,
            priceHistory: priceHistoryByProduct[product.id] || []
          }));
        }

          setProducts(formattedProducts);
        }
      } catch (error) {
        console.error('Error in products loading block:', error);
        hasError = true;
      }

      // Sales data is loaded on-demand by the SalesHistory component
      // Not loaded here to improve initial load performance

      // Load stock takes
      try {
        const { data: stockTakesData, error: stockTakesError } = await supabase
          .from('stock_takes')
          .select('*')
          .order('created_at', { ascending: false });

        if (stockTakesError) {
          console.error('Error loading stock takes:', stockTakesError);
          hasError = true;
        } else {
        formattedStockTakes = (stockTakesData || []).map(stockTake => ({
          id: stockTake.id,
          productId: stockTake.product_id,
          productName: stockTake.product_name,
          expectedStock: stockTake.expected_stock,
          actualStock: stockTake.actual_stock,
          difference: stockTake.difference,
          reason: stockTake.reason,
          userId: stockTake.user_id || 'demo-user',
          userName: stockTake.user_name,
          createdAt: new Date(stockTake.created_at),
        }));
          setStockTakes(formattedStockTakes);
        }
      } catch (error) {
        console.error('Error in stock takes loading block:', error);
        hasError = true;
      }

      // Load activity logs
      try {
        const { data: logsData, error: logsError } = await supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (logsError) {
          console.error('Error loading activity logs:', logsError);
          hasError = true;
        } else {
        formattedLogs = (logsData || []).map(log => ({
          id: log.id,
          userId: log.user_id || 'demo-user',
          userName: log.user_name,
          action: log.action,
          details: log.details,
          timestamp: new Date(log.created_at),
        }));
          setActivityLogs(formattedLogs);
        }
      } catch (error) {
        console.error('Error in activity logs loading block:', error);
        hasError = true;
      }

      // Load stock take sessions
      try {
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('stock_take_sessions')
          .select('*')
          .order('created_at', { ascending: false });

        if (sessionsError) {
          console.error('Error loading stock take sessions:', sessionsError);
          hasError = true;
        } else {
        const formattedSessions = (sessionsData || []).map(session => ({
          id: session.id,
          name: session.session_name,
          session_name: session.session_name,
          userId: session.user_id || 'demo-user',
          userName: session.user_name,
          status: session.status,
          createdAt: new Date(session.created_at || session.started_at),
          completedAt: session.completed_at ? new Date(session.completed_at) : null,
          progress_data: session.progress_data || {},
        }));
          setStockTakeSessions(formattedSessions);
        }
      } catch (error) {
        console.error('Error in stock take sessions loading block:', error);
        hasError = true;
      }

      // Sales history is generated on-demand by the SalesHistory component
      // Not generated here to improve initial load performance

      // Load drug registry
      try {
        const { success, data: drugNames } = await getAllDrugNames();
        if (success && drugNames && drugNames.length > 0) {
          // Merge drug registry with existing medicine database
          const registryMedicines = drugNames.map(drug => ({
            name: drug.name,
            category: drug.category || 'Other',
            commonDosages: ['As prescribed'],
            description: 'Registered medicine'
          }));

          // Combine with existing templates, avoiding duplicates
          const existingNames = new Set(medicineDatabase.map(m => m.name.toLowerCase()));
          const uniqueRegistry = registryMedicines.filter(
            m => !existingNames.has(m.name.toLowerCase())
          );

          setMedicineTemplates([...medicineDatabase, ...uniqueRegistry]);
        }
      } catch (error) {
        console.error('Error loading drug registry:', error);
        // Continue without registry data - fallback to static data
      }

      // Update categories and suppliers from loaded data
      const loadedCategories = [...new Set(formattedProducts.map(p => p.category))];
      const loadedSuppliers = [...new Set(formattedProducts.map(p => p.supplier))];

      setCategories(prev => [...new Set([...prev, ...loadedCategories])]);
      setSuppliers(prev => [...new Set([...prev, ...loadedSuppliers])]);

    } catch (error) {
      console.error('Error refreshing data:', error);

      // Check if it's a network/fetch error
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.warn('Network error detected. Please check:');
        console.warn('1. Supabase URL and API key are correct in .env file');
        console.warn('2. Internet connection is stable');
        console.warn('3. CORS settings in Supabase dashboard allow localhost:5173');
        console.warn('4. No firewall/ad blocker blocking requests to *.supabase.co');

        setError(error instanceof Error ? error : new Error('Network error'));
        console.warn('Continuing in demo mode due to network error');
        return;
      }

      // For other errors, log but don't crash the app
      setError(error instanceof Error ? error : new Error('Database error'));
      console.warn('Database error occurred, continuing in demo mode:', error);
    } finally {
      setLoading(false);
      setLastRefreshTime(Date.now());
    }
  };

  // Initialize data on mount - wait for auth to complete
  useEffect(() => {
    if (!authLoading && !loading && user) {
      console.log('[AppContext] Auth complete, loading data for user:', user.email);
      refreshData();
    }
  }, [authLoading]);

  // Refresh data when user changes (sign in/out)
  useEffect(() => {
    if (user && !authLoading && !loading) {
      console.log('[AppContext] User changed, refreshing data for:', user.email);
      refreshData();
    }
  }, [user]);

  const logActivity = async (action: string, details: string) => {
    if (!isSupabaseEnabled || !supabase) {
      console.log('Demo mode: Activity logged -', action, details);
      return;
    }

    // Check if user is mock user (demo mode) - prevent database writes
    if (!user || user.user_id === '00000000-0000-0000-0000-000000000001' || user.user_id === 'demo-user') {
      console.log('Demo mode: Activity logged -', action, details);
      return;
    }

    try {
      const { error } = await supabase
        .from('activity_logs')
        .insert({
          user_id: user.user_id,
          user_name: user?.name || 'Demo User',
          action,
          details,
        });

      if (error) {
        console.error('Error logging activity:', error);
      } else {
        // Refresh activity logs
        const { data: logsData } = await supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (logsData) {
          const formattedLogs: ActivityLog[] = logsData.map(log => ({
            id: log.id,
            userId: log.user_id || 'demo-user',
            userName: log.user_name,
            action: log.action,
            details: log.details,
            timestamp: new Date(log.created_at),
          }));
          setActivityLogs(formattedLogs);
        }
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'priceHistory'>) => {
    if (!isSupabaseEnabled || !supabase) {
      console.log('Demo mode: Cannot add products without Supabase configuration');
      throw new Error('Database not configured. Please set up Supabase environment variables.');
    }

    console.log('🔄 Starting product addition process...');
    console.log('Product data to insert:', productData);

    // Enforce minimum selling price with new pricing logic
    const pricingInputs = {
      invoicePrice: productData.invoicePrice,
      supplierDiscountPercent: productData.supplierDiscountPercent,
      vatRate: productData.vatRate,
      otherCharges: productData.otherCharges,
      costPrice: productData.costPrice
    };
    const enforcedSellingPrice = enforceMinimumSellingPrice(productData.sellingPrice, pricingInputs);

    try {
      console.log('📡 Inserting product into database...');
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: productData.name,
          category: productData.category,
          supplier: productData.supplier,
          batch_number: productData.batchNumber,
          expiry_date: productData.expiryDate.toISOString(),
          invoice_price: productData.invoicePrice || null,
          supplier_discount_percent: productData.supplierDiscountPercent || null,
          vat_rate: productData.vatRate || 0,
          other_charges: productData.otherCharges || null,
          cost_price: productData.costPrice,
          selling_price: enforcedSellingPrice,
          current_stock: productData.currentStock,
          min_stock_level: productData.minStockLevel,
          barcode: productData.barcode,
          invoice_number: productData.invoiceNumber,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Database error adding product:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        throw error;
      }

      console.log('✅ Product inserted successfully:', data);

      // Add price history entry
      console.log('📊 Adding price history entry...');
      const { error: priceHistoryError } = await supabase
        .from('price_history')
        .insert({
          product_id: data.id,
          cost_price: productData.costPrice,
          selling_price: enforcedSellingPrice,
          user_id: user?.user_id || 'demo-user',
          user_name: user?.name || 'Demo User',
        });

      if (priceHistoryError) {
        console.warn('⚠️ Warning: Could not add price history:', priceHistoryError);
        // Don't throw error for price history failure
      }

      console.log('📝 Logging activity...');
      await logActivity('ADD_PRODUCT', `Added product: ${productData.name}`);
      
      console.log('🔄 Refreshing data...');
      await refreshData();
      
      console.log('🎉 Product addition completed successfully!');
    } catch (error) {
      console.error('💥 Fatal error adding product:', error);
      throw error;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    if (!isSupabaseEnabled || !supabase) {
      console.log('Demo mode: Cannot update products without Supabase configuration');
      throw new Error('Database not configured. Please set up Supabase environment variables.');
    }

    try {
      const updateData: any = {};

      if (updates.name) updateData.name = updates.name;
      if (updates.category) updateData.category = updates.category;
      if (updates.supplier) updateData.supplier = updates.supplier;
      if (updates.batchNumber) updateData.batch_number = updates.batchNumber;
      if (updates.expiryDate) updateData.expiry_date = updates.expiryDate.toISOString();
      if (updates.invoicePrice !== undefined) updateData.invoice_price = updates.invoicePrice || null;
      if (updates.supplierDiscountPercent !== undefined) updateData.supplier_discount_percent = updates.supplierDiscountPercent || null;
      if (updates.vatRate !== undefined) updateData.vat_rate = updates.vatRate || 0;
      if (updates.otherCharges !== undefined) updateData.other_charges = updates.otherCharges || null;
      if (updates.costPrice !== undefined) updateData.cost_price = updates.costPrice;
      if (updates.sellingPrice !== undefined) {
        // Enforce minimum selling price with new pricing logic
        const existingProduct = products.find(p => p.id === id);
        const pricingInputs = {
          invoicePrice: updates.invoicePrice !== undefined ? updates.invoicePrice : existingProduct?.invoicePrice,
          supplierDiscountPercent: updates.supplierDiscountPercent !== undefined ? updates.supplierDiscountPercent : existingProduct?.supplierDiscountPercent,
          vatRate: updates.vatRate !== undefined ? updates.vatRate : existingProduct?.vatRate || 0,
          otherCharges: updates.otherCharges !== undefined ? updates.otherCharges : existingProduct?.otherCharges,
          costPrice: updates.costPrice !== undefined ? updates.costPrice : existingProduct?.costPrice || 0
        };
        updateData.selling_price = enforceMinimumSellingPrice(updates.sellingPrice, pricingInputs);
      }
      if (updates.currentStock !== undefined) updateData.current_stock = updates.currentStock;
      if (updates.minStockLevel !== undefined) updateData.min_stock_level = updates.minStockLevel;
      if (updates.barcode) updateData.barcode = updates.barcode;
      if (updates.invoiceNumber) updateData.invoice_number = updates.invoiceNumber;

      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Error updating product:', error);
        throw error;
      }

      await logActivity('UPDATE_PRODUCT', `Updated product: ${updates.name || id}`);
      await refreshData();
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    if (!isSupabaseEnabled || !supabase) {
      console.log('Demo mode: Cannot delete products without Supabase configuration');
      throw new Error('Database not configured. Please set up Supabase environment variables.');
    }

    try {
      const product = products.find(p => p.id === id);
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting product:', error);
        throw error;
      }

      await logActivity('DELETE_PRODUCT', `Deleted product: ${product?.name || id}`);
      await refreshData();
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  };

  const addSale = async (saleData: Omit<Sale, 'id' | 'createdAt' | 'receiptNumber'>): Promise<string> => {
    if (!isSupabaseEnabled || !supabase) {
      console.log('Demo mode: Cannot process sales without Supabase configuration');
      throw new Error('Database not configured. Please set up Supabase environment variables.');
    }

    try {
      // Generate receipt number
      const receiptNumber = `WSB${String(sales.length + 1).padStart(4, '0')}`;
      
      // Insert sale
      const { data: saleResult, error: saleError } = await supabase
        .from('sales')
        .insert({
          receipt_number: receiptNumber,
          customer_name: saleData.customerName,
          total_amount: saleData.totalAmount,
          payment_method: saleData.paymentMethod,
          sales_person_id: saleData.salesPersonId,
          sales_person_name: saleData.salesPersonName,
        })
        .select()
        .single();

      if (saleError) {
        console.error('Error adding sale:', saleError);
        throw saleError;
      }

      // Insert sale items
      const saleItems = saleData.items.map(item => ({
        sale_id: saleResult.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        batch_number: item.batchNumber,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) {
        console.error('Error adding sale items:', itemsError);
        throw itemsError;
      }

      // Update product stock and add price history in parallel
      const stockUpdates = saleData.items.map(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const newStock = product.currentStock - item.quantity;
          return supabase
            .from('products')
            .update({ current_stock: newStock })
            .eq('id', item.productId);
        }
        return null;
      }).filter(Boolean);

      // Batch insert price history entries
      const priceHistoryEntries = saleData.items
        .filter(() => user && user.user_id !== '00000000-0000-0000-0000-000000000001' && user.user_id !== 'demo-user')
        .map(item => {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            return {
              product_id: item.productId,
              cost_price: product.costPrice,
              selling_price: item.unitPrice,
              user_id: user.user_id,
              user_name: user?.name || 'Demo User',
            };
          }
          return null;
        })
        .filter(Boolean);

      // Execute all updates in parallel
      const priceHistoryPromise = priceHistoryEntries.length > 0
        ? supabase.from('price_history').insert(priceHistoryEntries)
        : Promise.resolve({ data: null, error: null });

      await Promise.all([
        ...stockUpdates,
        priceHistoryPromise,
        logActivity('SALE', `Sale completed: ${receiptNumber} - ${formatKES(saleData.totalAmount)}`)
      ]);

      // Update local product stock
      setProducts(prev => prev.map(p => {
        const soldItem = saleData.items.find(item => item.productId === p.id);
        if (soldItem) {
          return {
            ...p,
            currentStock: p.currentStock - soldItem.quantity
          };
        }
        return p;
      }));

      return receiptNumber;
    } catch (error) {
      console.error('Error adding sale:', error);
      throw error;
    }
  };

  const addStockTake = async (stockTakeData: Omit<StockTake, 'id' | 'createdAt'>) => {
    if (!isSupabaseEnabled || !supabase) {
      throw new Error('Database not configured. Please set up Supabase environment variables.');
    }

    try {
      const { data, error } = await supabase
        .from('stock_takes')
        .insert({
          product_id: stockTakeData.productId,
          product_name: stockTakeData.productName,
          expected_stock: stockTakeData.expectedStock,
          actual_stock: stockTakeData.actualStock,
          difference: stockTakeData.difference,
          reason: stockTakeData.reason,
          user_id: stockTakeData.userId,
          user_name: stockTakeData.userName,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding stock take:', error);
        throw error;
      }

      console.log('Stock take saved to database:', data);

      await logActivity('STOCK_TAKE', `Stock take: ${stockTakeData.productName} - Difference: ${stockTakeData.difference}`);
      await refreshData();
    } catch (error) {
      console.error('Error adding stock take:', error);
      throw error;
    }
  };

  const createStockTakeSession = async (name: string): Promise<string> => {
    if (!isSupabaseEnabled || !supabase) {
      throw new Error('Database not configured. Please set up Supabase environment variables.');
    }

    try {
      const { data, error } = await supabase
        .from('stock_take_sessions')
        .insert({
          session_name: name.trim(),
          user_id: user?.user_id || 'demo-user',
          user_name: user?.name || 'Demo User',
          status: 'in_progress'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating stock take session:', error);
        throw error;
      }

      await logActivity('CREATE_STOCK_TAKE_SESSION', `Created stock take session: ${name}`);
      await refreshData();
      
      return data.id;
    } catch (error) {
      console.error('Error creating stock take session:', error);
      throw error;
    }
  };

  const updateStockTakeSession = async (id: string, updates: any) => {
    if (!isSupabaseEnabled || !supabase) {
      throw new Error('Database not configured. Please set up Supabase environment variables.');
    }

    try {
      const { error } = await supabase
        .from('stock_take_sessions')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Error updating stock take session:', error);
        throw error;
      }

      await logActivity('UPDATE_STOCK_TAKE_SESSION', `Updated stock take session: ${id}`);
      await refreshData();
    } catch (error) {
      console.error('Error updating stock take session:', error);
      throw error;
    }
  };

  const deleteStockTakeSession = async (id: string) => {
    if (!isSupabaseEnabled || !supabase) {
      throw new Error('Database not configured. Please set up Supabase environment variables.');
    }

    try {
      const { error } = await supabase
        .from('stock_take_sessions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting stock take session:', error);
        throw error;
      }

      await logActivity('DELETE_STOCK_TAKE_SESSION', `Deleted stock take session: ${id}`);
      await refreshData();
    } catch (error) {
      console.error('Error deleting stock take session:', error);
      throw error;
    }
  };

  const completeStockTakeSession = async (sessionId: string, stockTakeEntries: any[]) => {
    if (!isSupabaseEnabled || !supabase) {
      throw new Error('Database not configured. Please set up Supabase environment variables.');
    }

    try {
      // Insert all stock take entries with session reference
      const stockTakeInserts = stockTakeEntries.map(entry => ({
        session_id: sessionId,
        product_id: entry.productId,
        product_name: entry.productName,
        expected_stock: entry.expectedStock,
        actual_stock: entry.actualStock,
        difference: entry.difference,
        reason: entry.reason,
        user_id: entry.userId,
        user_name: entry.userName,
      }));

      const { error: stockTakeError } = await supabase
        .from('stock_takes')
        .insert(stockTakeInserts);

      if (stockTakeError) {
        console.error('Error inserting stock takes:', stockTakeError);
        throw stockTakeError;
      }

      // Mark session as completed
      const { error: sessionError } = await supabase
        .from('stock_take_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (sessionError) {
        console.error('Error completing session:', sessionError);
        throw sessionError;
      }

      await logActivity('COMPLETE_STOCK_TAKE_SESSION', `Completed stock take session: ${sessionId}`);
      await refreshData();
    } catch (error) {
      console.error('Error completing stock take session:', error);
      throw error;
    }
  };

  const getStockAlerts = (): StockAlert[] => {
    const alerts: StockAlert[] = [];
    const now = new Date();

    products.forEach(product => {
      if (product.currentStock <= product.minStockLevel) {
        alerts.push({
          id: `low-${product.id}`,
          productId: product.id,
          productName: product.name,
          alertType: 'low_stock',
          currentStock: product.currentStock,
          minStockLevel: product.minStockLevel,
        });
      }

      const daysToExpiry = Math.ceil((product.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysToExpiry <= 30 && daysToExpiry > 0) {
        alerts.push({
          id: `expiry-${product.id}`,
          productId: product.id,
          productName: product.name,
          alertType: 'expiry_warning',
          expiryDate: product.expiryDate,
          daysToExpiry,
        });
      }
    });

    return alerts;
  };

  const importProducts = async (importedProducts: any[]) => {
    try {
      const productsToInsert = importedProducts.map(item => {
        const invoicePrice = parseFloat(item.invoiceprice) || 0;
        const supplierDiscountPercent = parseFloat(item.supplierdiscountpercent) || 0;
        const vatRate = parseFloat(item.vatrate) || 0;
        const otherCharges = parseFloat(item.othercharges) || 0;
        const costPrice = parseFloat(item.costprice) || 0;
        let sellingPrice = parseFloat(item.sellingprice) || 0;

        const pricingInputs = {
          invoicePrice: invoicePrice || undefined,
          supplierDiscountPercent: supplierDiscountPercent || undefined,
          vatRate: vatRate || 0,
          otherCharges: otherCharges || undefined,
          costPrice: costPrice
        };

        const minSellingPrice = getMinimumSellingPrice(pricingInputs);
        if (sellingPrice < minSellingPrice) {
          sellingPrice = minSellingPrice;
        }

        return {
          name: item.name || '',
          category: item.category || '',
          supplier: item.supplier || '',
          batch_number: item.batchnumber || `BATCH-${Date.now()}`,
          expiry_date: item.expirydate ? new Date(item.expirydate).toISOString() : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          invoice_price: invoicePrice || null,
          supplier_discount_percent: supplierDiscountPercent || null,
          vat_rate: vatRate || 0,
          other_charges: otherCharges || null,
          cost_price: costPrice,
          selling_price: sellingPrice,
          current_stock: parseInt(item.currentstock) || 0,
          min_stock_level: parseInt(item.minstocklevel) || 10,
          barcode: item.barcode || `${Date.now()}-${Math.random()}`,
          invoice_number: item.invoicenumber || '',
        };
      });

      const { error } = await supabase
        .from('products')
        .insert(productsToInsert);

      if (error) {
        console.error('Error importing products:', error);
        throw error;
      }

      await logActivity('IMPORT_PRODUCTS', `Imported ${importedProducts.length} products`);
      await refreshData();
    } catch (error) {
      console.error('Error importing products:', error);
      throw error;
    }
  };

  const addCategory = (category: string) => {
    if (!categories.includes(category)) {
      setCategories(prev => [...prev, category].sort());
    }
  };

  const addSupplier = (supplier: string) => {
    if (!suppliers.includes(supplier)) {
      setSuppliers(prev => [...prev, supplier].sort());
    }
  };

  const addMedicine = async (medicine: string) => {
    const newMedicine = {
      name: medicine,
      category: 'Other',
      commonDosages: ['As prescribed'],
      description: 'User-added medicine'
    };
    setMedicineTemplates(prev => [...prev, newMedicine]);

    // Also add to the drug registry database
    if (isSupabaseEnabled && supabase) {
      try {
        await addDrugToRegistry(medicine, 'Other');
      } catch (error) {
        console.error('Error adding medicine to registry:', error);
        // Continue anyway - the local state is updated
      }
    }
  };

  const getMedicineByName = (name: string) => {
    return medicineTemplates.find(med => 
      med.name.toLowerCase() === name.toLowerCase()
    );
  };

  const getSalesHistory = (): SalesHistoryItem[] => {
    return salesHistory.sort((a, b) => b.saleDate.getTime() - a.saleDate.getTime());
  };

  const generateReceipt = (sale: Sale) => {
    try {
      const receiptContent = `
        <html>
          <head>
            <title>Receipt - ${sale.receiptNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; line-height: 1.4; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
              .item { display: flex; justify-content: space-between; margin: 8px 0; padding: 2px 0; }
              .total { border-top: 2px solid #000; padding-top: 10px; font-weight: bold; margin-top: 15px; }
              .footer { text-align: center; margin-top: 20px; border-top: 1px solid #ccc; padding-top: 15px; }
              h2 { margin: 0 0 10px 0; font-size: 18px; }
              @media print { 
                body { margin: 0; padding: 10px; } 
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>WESABI PHARMACY</h2>
              <p><strong>Receipt #${sale.receiptNumber}</strong></p>
              <p>${sale.createdAt.toLocaleDateString('en-KE')} ${sale.createdAt.toLocaleTimeString('en-KE')}</p>
              ${sale.customerName ? `<p>Customer: ${sale.customerName}</p>` : ''}
            </div>
            
            <div class="items">
              ${sale.items.map(item => `
                <div class="item">
                  <span>${item.productName} x${item.quantity}</span>
                  <span>${formatKES(item.totalPrice)}</span>
                </div>
              `).join('')}
            </div>
            
            <div class="total">
              <div class="item">
                <span>TOTAL:</span>
                <span>${formatKES(sale.totalAmount)}</span>
              </div>
              <div class="item">
                <span>Payment Method:</span>
                <span>${sale.paymentMethod.toUpperCase()}</span>
              </div>
            </div>
            
            <div class="footer">
              <p>Thank you for your business!</p>
              <p>Served by: ${sale.salesPersonName}</p>
            </div>
          </body>
        </html>
      `;
      
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (printWindow) {
        printWindow.document.write(receiptContent);
        printWindow.document.close();
        
        // Wait for content to load then trigger print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
      } else {
        showAlert({ title: 'App Context', message: 'Please allow popups to print receipts', type: 'warning' });
      }
    } catch (error) {
      console.error('Error generating receipt:', error);
      showAlert({ title: 'App Context', message: 'Error generating receipt. Please try again.', type: 'error' });
    }
  };

  const exportToPDF = (data: any, type: string) => {
    let content = '';
    
    switch (type) {
      case 'inventory':
        content = `
          <h1>WESABI PHARMACY - INVENTORY REPORT</h1>
          <p>Generated: ${new Date().toLocaleDateString('en-KE')}</p>
          <table border="1" style="width: 100%; border-collapse: collapse;">
            <tr><th>Product</th><th>Category</th><th>Stock</th><th>Price</th><th>Value</th></tr>
            ${data.map((product: Product) => `
              <tr>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>${product.currentStock}</td>
                <td>${formatKES(product.sellingPrice)}</td>
                <td>${formatKES(product.currentStock * product.sellingPrice)}</td>
              </tr>
            `).join('')}
          </table>
        `;
        break;
      case 'sales':
        content = `
          <h1>WESABI PHARMACY - SALES REPORT</h1>
          <p>Generated: ${new Date().toLocaleDateString('en-KE')}</p>
          <table border="1" style="width: 100%; border-collapse: collapse;">
            <tr><th>Date</th><th>Product</th><th>Quantity</th><th>Revenue</th><th>Profit</th></tr>
            ${data.map((item: SalesHistoryItem) => `
              <tr>
                <td>${item.saleDate.toLocaleDateString('en-KE')}</td>
                <td>${item.productName}</td>
                <td>${item.quantity}</td>
                <td>${formatKES(item.totalRevenue)}</td>
                <td>${formatKES(item.profit)}</td>
              </tr>
            `).join('')}
          </table>
        `;
        break;
    }
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${type.toUpperCase()} Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };
  const getLastSoldPrice = async (productId: string): Promise<number | null> => {
    if (!isSupabaseEnabled || !supabase) {
      console.log('Demo mode: Cannot fetch price history without Supabase configuration');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('price_history')
        .select('selling_price')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching last sold price:', error);
        return null;
      }

      if (data && data.length > 0) {
        const lastPrice = parseFloat(data[0].selling_price);
        console.log(`Last sold price for product ${productId}:`, lastPrice);
        return lastPrice;
      }
      
      console.log(`No price history found for product ${productId}`);
      return null;
    } catch (error) {
      console.error('Error fetching last sold price:', error);
      return null;
    }
  };

  return (
    <AppContext.Provider value={{
      products,
      sales,
      stockTakes,
      stockTakeSessions,
      activityLogs,
      salesHistory,
      categories,
      suppliers,
      medicineTemplates,
      loading,
      error,
      addProduct,
      updateProduct,
      deleteProduct,
      addSale,
      addStockTake,
      createStockTakeSession,
      updateStockTakeSession,
      deleteStockTakeSession,
      completeStockTakeSession,
      logActivity,
      getStockAlerts,
      importProducts,
      addCategory,
      addSupplier,
      addMedicine,
      getMedicineByName,
      getSalesHistory,
      generateReceipt,
      exportToPDF,
      refreshData,
      getLastSoldPrice,
      isSupabaseEnabled,
      lastRefreshTime,
    }}>
      {children}
    </AppContext.Provider>
  );
};