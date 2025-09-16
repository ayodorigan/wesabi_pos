import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { formatKES, calculateSellingPrice, getMinimumSellingPrice, enforceMinimumSellingPrice } from '../utils/currency';
import { medicineDatabase, drugCategories, commonSuppliers } from '../data/medicineDatabase';
import { Product, PriceHistory, SaleItem, Sale, StockTake, ActivityLog, StockAlert, SalesHistoryItem } from '../types';

// Mock user for the system
const MOCK_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@wesabi.co.ke',
  name: 'Administrator',
  role: 'admin' as const,
  phone: '+254700000001'
};

interface AppContextType {
  user: typeof MOCK_USER;
  products: Product[];
  sales: Sale[];
  stockTakes: StockTake[];
  activityLogs: ActivityLog[];
  salesHistory: SalesHistoryItem[];
  categories: string[];
  suppliers: string[];
  medicineTemplates: typeof medicineDatabase;
  loading: boolean;
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
  addMedicine: (medicine: string) => void;
  getMedicineByName: (name: string) => typeof medicineDatabase[0] | undefined;
  getSalesHistory: () => SalesHistoryItem[];
  generateReceipt: (sale: Sale) => void;
  exportToPDF: (data: any, type: string) => void;
  refreshData: () => Promise<void>;
  getLastSoldPrice: (productId: string) => Promise<number | null>;
  isSupabaseEnabled: boolean;
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
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [stockTakes, setStockTakes] = useState<StockTake[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [salesHistory, setSalesHistory] = useState<SalesHistoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>(drugCategories);
  const [suppliers, setSuppliers] = useState<string[]>(commonSuppliers);
  const [medicineTemplates, setMedicineTemplates] = useState(medicineDatabase);
  const [loading, setLoading] = useState(false);
  const [stockTakeSessions, setStockTakeSessions] = useState<any[]>([]);

  // Load data from database
  const refreshData = async () => {
    try {
      // Skip database operations if Supabase is not enabled
      if (!isSupabaseEnabled) {
        console.log('Supabase not configured - running in demo mode with mock data only');
        return;
      }

      // Additional safety check for supabase client
      if (!supabase) {
        console.warn('Supabase client not initialized - running in demo mode');
        return;
      }
      
      // Declare variables at function scope
      let formattedProducts: Product[] = [];
      let formattedSales: Sale[] = [];
      let formattedStockTakes: StockTake[] = [];
      let formattedLogs: ActivityLog[] = [];
      
      // Load products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error loading products:', productsError);
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
              userId: history.user_id || MOCK_USER.id,
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

      // Load sales
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            id,
            product_id,
            product_name,
            quantity,
            unit_price,
            total_price,
            batch_number
          )
        `)
        .order('created_at', { ascending: false });

      if (salesError) {
        console.error('Error loading sales:', salesError);
      } else {
        formattedSales = (salesData || []).map(sale => ({
          id: sale.id,
          receiptNumber: sale.receipt_number,
          customerName: sale.customer_name,
          totalAmount: parseFloat(sale.total_amount) || 0,
          paymentMethod: sale.payment_method,
          salesPersonId: sale.sales_person_id || MOCK_USER.id,
          salesPersonName: sale.sales_person_name,
          items: (sale.sale_items || []).map((item: any) => ({
            productId: item.product_id,
            productName: item.product_name,
            quantity: item.quantity,
            unitPrice: parseFloat(item.unit_price) || 0,
            totalPrice: parseFloat(item.total_price) || 0,
            batchNumber: item.batch_number,
          })),
          createdAt: new Date(sale.created_at),
        }));
        setSales(formattedSales);
      }

      // Load stock takes
      const { data: stockTakesData, error: stockTakesError } = await supabase
        .from('stock_takes')
        .select('*')
        .order('created_at', { ascending: false });

      if (stockTakesError) {
        console.error('Error loading stock takes:', stockTakesError);
      } else {
        formattedStockTakes = (stockTakesData || []).map(stockTake => ({
          id: stockTake.id,
          productId: stockTake.product_id,
          productName: stockTake.product_name,
          expectedStock: stockTake.expected_stock,
          actualStock: stockTake.actual_stock,
          difference: stockTake.difference,
          reason: stockTake.reason,
          userId: stockTake.user_id || MOCK_USER.id,
          userName: stockTake.user_name,
          createdAt: new Date(stockTake.created_at),
        }));
        setStockTakes(formattedStockTakes);
      }

      // Load activity logs
      const { data: logsData, error: logsError } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) {
        console.error('Error loading activity logs:', logsError);
      } else {
        formattedLogs = (logsData || []).map(log => ({
          id: log.id,
          userId: log.user_id || MOCK_USER.id,
          userName: log.user_name,
          action: log.action,
          details: log.details,
          timestamp: new Date(log.created_at),
        }));
        setActivityLogs(formattedLogs);
      }

      // Load stock take sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('stock_take_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (sessionsError) {
        console.error('Error loading stock take sessions:', sessionsError);
      } else {
        const formattedSessions = (sessionsData || []).map(session => ({
          id: session.id,
          name: session.name,
          userId: session.user_id || MOCK_USER.id,
          userName: session.user_name,
          status: session.status,
          createdAt: new Date(session.created_at),
          completedAt: session.completed_at ? new Date(session.completed_at) : null,
        }));
        setStockTakeSessions(formattedSessions);
      }

      // Generate sales history from sales data
      const salesHistoryItems: SalesHistoryItem[] = [];
      formattedSales.forEach(sale => {
        sale.items.forEach(item => {
          const product = formattedProducts.find(p => p.id === item.productId);
          const costPrice = product?.costPrice || 0;
          const totalCost = costPrice * item.quantity;
          const profit = item.totalPrice - totalCost;
          
          salesHistoryItems.push({
            id: `${sale.id}-${item.productId}`,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            costPrice: costPrice,
            sellingPrice: item.unitPrice,
            totalCost: totalCost,
            totalRevenue: item.totalPrice,
            profit: profit,
            paymentMethod: sale.paymentMethod,
            customerName: sale.customerName,
            salesPersonName: sale.salesPersonName,
            receiptNumber: sale.receiptNumber,
            saleDate: sale.createdAt,
          });
        });
      });
      setSalesHistory(salesHistoryItems);

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
        
        // Don't throw the error, just log it and continue in demo mode
        console.warn('Continuing in demo mode due to network error');
        return;
      }
      
      // For other errors, log but don't crash the app
      console.warn('Database error occurred, continuing in demo mode:', error);
    }
  };

  // Initialize data on mount
  useEffect(() => {
    refreshData();
  }, []);

  const logActivity = async (action: string, details: string) => {
    if (!isSupabaseEnabled || !supabase) {
      console.log('Demo mode: Activity logged -', action, details);
      return;
    }

    try {
      const { error } = await supabase
        .from('activity_logs')
        .insert({
          user_id: MOCK_USER.id,
          user_name: MOCK_USER.name,
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
            userId: log.user_id || MOCK_USER.id,
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

    // Enforce minimum selling price
    const enforcedSellingPrice = enforceMinimumSellingPrice(productData.sellingPrice, productData.costPrice);
    
    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: productData.name,
          category: productData.category,
          supplier: productData.supplier,
          batch_number: productData.batchNumber,
          expiry_date: productData.expiryDate.toISOString(),
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
        console.error('Error adding product:', error);
        throw error;
      }

      await logActivity('ADD_PRODUCT', `Added product: ${productData.name}`);
      await refreshData();
    } catch (error) {
      console.error('Error adding product:', error);
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
      if (updates.costPrice !== undefined) updateData.cost_price = updates.costPrice;
      if (updates.sellingPrice !== undefined) {
        // Enforce minimum selling price
        const costPrice = updates.costPrice !== undefined ? updates.costPrice : 
          products.find(p => p.id === id)?.costPrice || 0;
        updateData.selling_price = enforceMinimumSellingPrice(updates.sellingPrice, costPrice);
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

      // Update product stock
      for (const item of saleData.items) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const newStock = product.currentStock - item.quantity;
          await supabase
            .from('products')
            .update({ current_stock: newStock })
            .eq('id', item.productId);
        }
      }

      // Add price history entries for all sold items
      for (const item of saleData.items) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          await supabase
            .from('price_history')
            .insert({
              product_id: item.productId,
              cost_price: product.costPrice,
              selling_price: item.unitPrice,
              user_id: MOCK_USER.id,
              user_name: MOCK_USER.name,
            });
        }
      }
      await logActivity('SALE', `Sale completed: ${receiptNumber} - ${formatKES(saleData.totalAmount)}`);
      await refreshData();
      
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
          name: name.trim(),
          user_id: MOCK_USER.id,
          user_name: MOCK_USER.name,
          status: 'active'
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
      const productsToInsert = importedProducts.map(item => ({
        name: item.name || '',
        category: item.category || '',
        supplier: item.supplier || '',
        batch_number: item.batchnumber || `BATCH-${Date.now()}`,
        expiry_date: item.expirydate ? new Date(item.expirydate).toISOString() : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        cost_price: parseFloat(item.costprice) || 0,
        selling_price: parseFloat(item.sellingprice) || 0,
        current_stock: parseInt(item.currentstock) || 0,
        min_stock_level: parseInt(item.minstocklevel) || 10,
        barcode: item.barcode || `${Date.now()}-${Math.random()}`,
        invoice_number: item.invoicenumber || '',
      }));

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

  const addMedicine = (medicine: string) => {
    const newMedicine = {
      name: medicine,
      category: 'Other',
      commonDosages: ['As prescribed'],
      description: 'User-added medicine'
    };
    setMedicineTemplates(prev => [...prev, newMedicine]);
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
        alert('Please allow popups to print receipts');
      }
    } catch (error) {
      console.error('Error generating receipt:', error);
      alert('Error generating receipt. Please try again.');
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
      user: MOCK_USER,
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
    }}>
      {children}
    </AppContext.Provider>
  );
};