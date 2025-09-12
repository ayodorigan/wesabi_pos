import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { formatKES, calculateSellingPrice } from '../utils/currency';
import { medicineDatabase, drugCategories, commonSuppliers } from '../data/medicineDatabase';

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
  products: Product[];
  sales: Sale[];
  stockTakes: StockTake[];
  activityLogs: ActivityLog[];
  salesHistory: SalesHistoryItem[];
  categories: string[];
  suppliers: string[];
  medicineTemplates: typeof medicineDatabase;
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
  updateUsers: (users: any[]) => void;
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
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [stockTakes, setStockTakes] = useState<StockTake[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [salesHistory, setSalesHistory] = useState<SalesHistoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>(drugCategories);
  const [suppliers, setSuppliers] = useState<string[]>(commonSuppliers);
  const [loading, setLoading] = useState(true);

  // Load data from Supabase
  const refreshData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Load products with price history
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          price_history (*)
        `)
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error loading products:', productsError);
      } else {
        const formattedProducts: Product[] = (productsData || []).map(product => ({
          id: product.id,
          name: product.name,
          category: product.category,
          supplier: product.supplier,
          batchNumber: product.batch_number,
          expiryDate: new Date(product.expiry_date),
          costPrice: product.cost_price,
          sellingPrice: product.selling_price,
          currentStock: product.current_stock,
          minStockLevel: product.min_stock_level,
          barcode: product.barcode,
          invoiceNumber: product.invoice_number,
          priceHistory: (product.price_history || []).map((ph: any) => ({
            id: ph.id,
            date: new Date(ph.created_at),
            costPrice: ph.cost_price,
            sellingPrice: ph.selling_price,
            userId: ph.user_id,
            userName: ph.user_name
          })),
          createdAt: new Date(product.created_at),
          updatedAt: new Date(product.updated_at)
        }));

        setProducts(formattedProducts);

        // Extract categories and suppliers
        const uniqueCategories = [...new Set([...drugCategories, ...formattedProducts.map(p => p.category)])];
        const uniqueSuppliers = [...new Set([...commonSuppliers, ...formattedProducts.map(p => p.supplier)])];
        setCategories(uniqueCategories);
        setSuppliers(uniqueSuppliers);
      }

      // Load sales with items
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (*)
        `)
        .order('created_at', { ascending: false });

      if (salesError) {
        console.error('Error loading sales:', salesError);
      } else {
        const formattedSales: Sale[] = (salesData || []).map(sale => ({
          id: sale.id,
          receiptNumber: sale.receipt_number,
          customerName: sale.customer_name,
          totalAmount: sale.total_amount,
          paymentMethod: sale.payment_method,
          salesPersonId: sale.sales_person_id,
          salesPersonName: sale.sales_person_name,
          items: (sale.sale_items || []).map((item: any) => ({
            productId: item.product_id,
            productName: item.product_name,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            totalPrice: item.total_price,
            batchNumber: item.batch_number
          })),
          createdAt: new Date(sale.created_at)
        }));

        setSales(formattedSales);

        // Generate sales history
        const salesHistoryData: SalesHistoryItem[] = [];
        formattedSales.forEach(sale => {
          sale.items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product) {
              salesHistoryData.push({
                id: `${sale.id}-${item.productId}`,
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                costPrice: product.costPrice,
                sellingPrice: item.unitPrice,
                totalCost: product.costPrice * item.quantity,
                totalRevenue: item.totalPrice,
                profit: item.totalPrice - (product.costPrice * item.quantity),
                paymentMethod: sale.paymentMethod,
                customerName: sale.customerName,
                salesPersonName: sale.salesPersonName,
                receiptNumber: sale.receiptNumber,
                saleDate: sale.createdAt
              });
            }
          });
        });

        setSalesHistory(salesHistoryData);
      }

      // Load stock takes
      const { data: stockTakesData, error: stockTakesError } = await supabase
        .from('stock_takes')
        .select('*')
        .order('created_at', { ascending: false });

      if (stockTakesError) {
        console.error('Error loading stock takes:', stockTakesError);
      } else {
        const formattedStockTakes: StockTake[] = (stockTakesData || []).map(st => ({
          id: st.id,
          productId: st.product_id,
          productName: st.product_name,
          expectedStock: st.expected_stock,
          actualStock: st.actual_stock,
          difference: st.difference,
          reason: st.reason,
          userId: st.user_id,
          userName: st.user_name,
          createdAt: new Date(st.created_at)
        }));
        setStockTakes(formattedStockTakes);
      }

      // Load activity logs
      const { data: activityLogsData, error: activityLogsError } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (activityLogsError) {
        console.error('Error loading activity logs:', activityLogsError);
      } else {
        const formattedActivityLogs: ActivityLog[] = (activityLogsData || []).map(log => ({
          id: log.id,
          userId: log.user_id,
          userName: log.user_name,
          action: log.action,
          details: log.details,
          timestamp: new Date(log.created_at)
        }));
        setActivityLogs(formattedActivityLogs);
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [user]);

  const logActivity = async (action: string, details: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          user_name: user.name,
          action,
          details
        });

      if (error) throw error;
      
      // Refresh activity logs
      const { data } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) {
        const formattedLogs: ActivityLog[] = data.map(log => ({
          id: log.id,
          userId: log.user_id,
          userName: log.user_name,
          action: log.action,
          details: log.details,
          timestamp: new Date(log.created_at)
        }));
        setActivityLogs(formattedLogs);
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'priceHistory'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: productData.name,
          category: productData.category,
          supplier: productData.supplier,
          batch_number: productData.batchNumber,
          expiry_date: productData.expiryDate.toISOString().split('T')[0],
          cost_price: productData.costPrice,
          selling_price: productData.sellingPrice,
          current_stock: productData.currentStock,
          min_stock_level: productData.minStockLevel,
          barcode: productData.barcode,
          invoice_number: productData.invoiceNumber
        })
        .select()
        .single();

      if (error) throw error;

      // Add price history
      await supabase
        .from('price_history')
        .insert({
          product_id: data.id,
          cost_price: productData.costPrice,
          selling_price: productData.sellingPrice,
          user_id: user.id,
          user_name: user.name
        });

      await logActivity('ADD_PRODUCT', `Added product: ${productData.name}`);
      await refreshData();
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    if (!user) return;

    try {
      const updateData: any = {};
      
      if (updates.name) updateData.name = updates.name;
      if (updates.category) updateData.category = updates.category;
      if (updates.supplier) updateData.supplier = updates.supplier;
      if (updates.batchNumber) updateData.batch_number = updates.batchNumber;
      if (updates.expiryDate) updateData.expiry_date = updates.expiryDate.toISOString().split('T')[0];
      if (updates.costPrice !== undefined) updateData.cost_price = updates.costPrice;
      if (updates.sellingPrice !== undefined) updateData.selling_price = updates.sellingPrice;
      if (updates.currentStock !== undefined) updateData.current_stock = updates.currentStock;
      if (updates.minStockLevel !== undefined) updateData.min_stock_level = updates.minStockLevel;
      if (updates.barcode) updateData.barcode = updates.barcode;
      if (updates.invoiceNumber) updateData.invoice_number = updates.invoiceNumber;
      
      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Add price history if price changed
      if (updates.costPrice !== undefined || updates.sellingPrice !== undefined) {
        const product = products.find(p => p.id === id);
        if (product) {
          await supabase
            .from('price_history')
            .insert({
              product_id: id,
              cost_price: updates.costPrice || product.costPrice,
              selling_price: updates.sellingPrice || product.sellingPrice,
              user_id: user.id,
              user_name: user.name
            });
        }
      }

      await logActivity('UPDATE_PRODUCT', `Updated product: ${updates.name || id}`);
      await refreshData();
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    if (!user) return;

    try {
      const product = products.find(p => p.id === id);
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logActivity('DELETE_PRODUCT', `Deleted product: ${product?.name || id}`);
      await refreshData();
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  };

  const addSale = async (saleData: Omit<Sale, 'id' | 'createdAt' | 'receiptNumber'>): Promise<string> => {
    if (!user) return '';

    try {
      // Generate receipt number
      const receiptNumber = `WSB${String(sales.length + 1).padStart(4, '0')}`;

      // Create sale
      const { data: saleRecord, error: saleError } = await supabase
        .from('sales')
        .insert({
          receipt_number: receiptNumber,
          customer_name: saleData.customerName,
          total_amount: saleData.totalAmount,
          payment_method: saleData.paymentMethod,
          sales_person_id: saleData.salesPersonId,
          sales_person_name: saleData.salesPersonName
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItems = saleData.items.map(item => ({
        sale_id: saleRecord.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        batch_number: item.batchNumber
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // Update product stock
      for (const item of saleData.items) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          await supabase
            .from('products')
            .update({
              current_stock: product.currentStock - item.quantity,
              updated_at: new Date().toISOString()
            })
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
    if (!user) return;

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
          user_name: stockTakeData.userName
        });

      if (error) throw error;

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
      // Low stock alert
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

      // Expiry warning (30 days)
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
    if (!user) return;

    try {
      const productsToInsert = importedProducts.map(item => ({
        name: item.name || '',
        category: item.category || '',
        supplier: item.supplier || '',
        batch_number: item.batchnumber || '',
        expiry_date: item.expirydate || new Date().toISOString().split('T')[0],
        cost_price: parseFloat(item.costprice) || 0,
        selling_price: parseFloat(item.sellingprice) || 0,
        current_stock: parseInt(item.currentstock) || 0,
        min_stock_level: parseInt(item.minstocklevel) || 10,
        barcode: item.barcode || `${Date.now()}-${Math.random()}`,
        invoice_number: item.invoicenumber || ''
      }));

      const { error } = await supabase
        .from('products')
        .insert(productsToInsert);

      if (error) throw error;

      await logActivity('IMPORT_PRODUCTS', `Imported ${productsToInsert.length} products`);
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

  const updateUsers = (users: any[]) => {
    // This is for compatibility with the Settings component
    // In Supabase version, user management should be done through Supabase
    console.log('User management should be done through Supabase');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pharmacy data...</p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{
      products,
      sales,
      stockTakes,
      activityLogs,
      salesHistory,
      categories,
      suppliers,
      medicineTemplates: medicineDatabase,
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
      updateUsers,
    }}>
      {children}
    </AppContext.Provider>
  );
};