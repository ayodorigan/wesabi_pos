import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatKES, calculateSellingPrice } from '../utils/currency';
import { medicineDatabase, drugCategories, commonSuppliers } from '../data/medicineDatabase';

// Mock user for the system
const MOCK_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@wesabi.co.ke',
  name: 'Administrator',
  role: 'admin' as const,
  phone: '+254700000001'
};

// Frontend types
interface PriceHistory {
  id: string;
  date: Date;
  costPrice: number;
  sellingPrice: number;
  userId: string;
  userName: string;
}

interface Product {
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

interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  originalPrice?: number;
  priceAdjusted?: boolean;
  batchNumber?: string;
}

interface Sale {
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

interface StockTake {
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

interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: Date;
}

interface StockAlert {
  id: string;
  productId: string;
  productName: string;
  alertType: 'low_stock' | 'expiry_warning';
  currentStock?: number;
  minStockLevel?: number;
  expiryDate?: Date;
  daysToExpiry?: number;
}

interface SalesHistoryItem {
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
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'priceHistory'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addSale: (sale: Omit<Sale, 'id' | 'createdAt' | 'receiptNumber'>) => Promise<string>;
  addStockTake: (stockTake: Omit<StockTake, 'id' | 'createdAt'>) => Promise<void>;
  logActivity: (action: string, details: string) => Promise<void>;
  getStockAlerts: () => StockAlert[];
  importProducts: (products: any[]) => Promise<void>;
  addCategory: (category: string) => void;
  addSupplier: (supplier: string) => void;
  getMedicineByName: (name: string) => typeof medicineDatabase[0] | undefined;
  getSalesHistory: () => SalesHistoryItem[];
  generateReceipt: (sale: Sale) => void;
  exportToPDF: (data: any, type: string) => void;
  refreshData: () => Promise<void>;
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
  const [loading, setLoading] = useState(false);

  // Load data from database
  const refreshData = async () => {
    try {
      // Don't show loading screen for data refresh
      
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
          priceHistory: [], // We'll load this separately if needed
          createdAt: new Date(product.created_at),
          updatedAt: new Date(product.updated_at),
        }));
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
    } finally {
      // Loading state managed elsewhere if needed
    }
  };

  // Initialize data on mount
  useEffect(() => {
    refreshData();
  }, []);

  const logActivity = async (action: string, details: string) => {
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
          selling_price: productData.sellingPrice,
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
    try {
      const updateData: any = {};
      
      if (updates.name) updateData.name = updates.name;
      if (updates.category) updateData.category = updates.category;
      if (updates.supplier) updateData.supplier = updates.supplier;
      if (updates.batchNumber) updateData.batch_number = updates.batchNumber;
      if (updates.expiryDate) updateData.expiry_date = updates.expiryDate.toISOString();
      if (updates.costPrice !== undefined) updateData.cost_price = updates.costPrice;
      if (updates.sellingPrice !== undefined) updateData.selling_price = updates.sellingPrice;
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

      await logActivity('SALE', `Sale completed: ${receiptNumber} - ${formatKES(saleData.totalAmount)}`);
      await refreshData();
      
      return receiptNumber;
    } catch (error) {
      console.error('Error adding sale:', error);
      throw error;
    }
  };

  const addStockTake = async (stockTakeData: Omit<StockTake, 'id' | 'createdAt'>) => {
    try {
      const { error } = await supabase
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
        });

      if (error) {
        console.error('Error adding stock take:', error);
        throw error;
      }

      // Update product stock if there's a difference
      if (stockTakeData.difference !== 0) {
        await supabase
          .from('products')
          .update({ current_stock: stockTakeData.actualStock })
          .eq('id', stockTakeData.productId);
      }

      await logActivity('STOCK_TAKE', `Stock take: ${stockTakeData.productName} - Difference: ${stockTakeData.difference}`);
      await refreshData();
    } catch (error) {
      console.error('Error adding stock take:', error);
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

  const getMedicineByName = (name: string) => {
    return medicineDatabase.find(med => 
      med.name.toLowerCase() === name.toLowerCase()
    );
  };

  const getSalesHistory = (): SalesHistoryItem[] => {
    return salesHistory.sort((a, b) => b.saleDate.getTime() - a.saleDate.getTime());
  };

  const generateReceipt = (sale: Sale) => {
    const receiptContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${sale.receiptNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .item { display: flex; justify-content: space-between; margin: 5px 0; }
          .total { border-top: 1px solid #000; padding-top: 10px; font-weight: bold; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>WESABI PHARMACY</h2>
          <p>Receipt #${sale.receiptNumber}</p>
          <p>${sale.createdAt.toLocaleDateString('en-KE')} ${sale.createdAt.toLocaleTimeString('en-KE')}</p>
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
            <span>Payment:</span>
            <span>${sale.paymentMethod.toUpperCase()}</span>
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px;">
          <p>Thank you for your business!</p>
          <p>Served by: ${sale.salesPersonName}</p>
        </div>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();
      printWindow.print();
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

  return (
    <AppContext.Provider value={{
      user: MOCK_USER,
      products,
      sales,
      stockTakes,
      activityLogs,
      salesHistory,
      categories,
      suppliers,
      medicineTemplates: medicineDatabase,
      loading,
      addProduct,
      updateProduct,
      deleteProduct,
      addSale,
      addStockTake,
      logActivity,
      getStockAlerts,
      importProducts,
      addCategory,
      addSupplier,
      getMedicineByName,
      getSalesHistory,
      generateReceipt,
      exportToPDF,
      refreshData,
    }}>
      {children}
    </AppContext.Provider>
  );
};