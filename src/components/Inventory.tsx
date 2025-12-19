import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  AlertTriangle,
  Package,
  TrendingUp
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { Product } from '../types';
import { formatKES, calculateSellingPrice, getMinimumSellingPrice, enforceMinimumSellingPrice } from '../utils/currency';
import { getErrorMessage } from '../utils/errorMessages';
import AutocompleteInput from './AutocompleteInput';
import VATRateInput from './VATRateInput';
import { usePageRefresh } from '../hooks/usePageRefresh';
import { usePagination } from '../hooks/usePagination';
import Pagination from './Pagination';
import { usePricing } from '../hooks/usePricing';
import { formatCurrency, shouldWarnLowMargin } from '../utils/pricing';

const Inventory: React.FC = () => {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    importProducts,
    medicineTemplates,
    addMedicine,
    categories,
    suppliers,
    addCategory,
    addSupplier,
    getMedicineByName
  } = useApp();
  const { user, canManagePricing, canDeleteProducts } = useAuth();
  const { showAlert } = useAlert();
  const { getProductPricing } = usePricing();
  usePageRefresh('inventory', { refreshOnMount: true, staleTime: 30000 });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    supplier: '',
    batchNumber: '',
    expiryDate: '',
    invoiceNumber: '',
    invoicePrice: '',
    supplierDiscountPercent: '0',
    vatRate: '0',
    otherCharges: '0',
    costPrice: '',
    sellingPrice: '',
    currentStock: '',
    minStockLevel: '10',
    barcode: '',
  });

  const medicineNames = medicineTemplates.map(med => med.name);
  
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.barcode.includes(searchTerm) ||
                         product.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const {
    currentPage,
    paginatedItems: paginatedProducts,
    goToPage,
    itemsPerPage
  } = usePagination({ items: filteredProducts, itemsPerPage: 20 });

  const exportToCSV = () => {
    try {
      if (filteredProducts.length === 0) {
        showAlert({ title: 'Inventory', message: 'No products to export', type: 'warning' });
        return;
      }

      const content = `<!DOCTYPE html>
<html>
<head>
  <title>Inventory Report - ${new Date().toLocaleDateString('en-KE')}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 8px 4px; text-align: left; border: 1px solid #333; font-size: 11px; }
    th { background-color: #f0f0f0; font-weight: bold; }
    h1 { color: #333; text-align: center; margin-bottom: 30px; }
    .summary { margin-bottom: 20px; }
    @media print { 
      body { margin: 0; } 
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>WESABI PHARMACY - INVENTORY REPORT</h1>
  <div class="summary">
    <p><strong>Generated:</strong> ${new Date().toLocaleDateString('en-KE')} at ${new Date().toLocaleTimeString('en-KE')}</p>
    <p><strong>Total Products:</strong> ${filteredProducts.length}</p>
  </div>
  
  <table>
    <tr>
      <th>Product</th>
      <th>Category</th>
      <th>Supplier</th>
      <th>Batch Number</th>
      <th>Expiry Date</th>
      <th>Invoice Price</th>
      <th>Discount %</th>
      <th>VAT %</th>
      <th>Cost Price</th>
      <th>Selling Price</th>
      <th>Stock</th>
      <th>Min Stock</th>
      <th>Barcode</th>
    </tr>
    ${filteredProducts.map(product => `
    <tr>
      <td>${product.name}</td>
      <td>${product.category}</td>
      <td>${product.supplier}</td>
      <td>${product.batchNumber || '-'}</td>
      <td>${product.expiryDate.toLocaleDateString('en-KE')}</td>
      <td>${product.invoicePrice ? formatKES(product.invoicePrice) : '-'}</td>
      <td>${product.supplierDiscountPercent || '0'}%</td>
      <td>${product.vatRate || '0'}%</td>
      <td>${formatKES(product.costPrice)}</td>
      <td>${formatKES(product.sellingPrice)}</td>
      <td>${product.currentStock}</td>
      <td>${product.minStockLevel}</td>
      <td>${product.barcode}</td>
    </tr>
    `).join('')}
  </table>
</body>
</html>`;
      
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(content);
        printWindow.document.close();
        
        // Wait for content to load then trigger print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
      } else {
        showAlert({ title: 'Inventory', message: 'Please allow popups to export PDF reports', type: 'warning' });
      }
    } catch (error) {
      console.error('Error exporting inventory report:', error);
      showAlert({ title: 'Inventory', message: 'Error generating PDF report. Please try again.', type: 'error' });
    }
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      const lines = csvText.split('\n');
      const headers = lines[0].split(',');
      
      const importedData = lines.slice(1).filter(line => line.trim()).map(line => {
        const values = line.split(',');
        return headers.reduce((obj, header, index) => {
          obj[header.toLowerCase().replace(/ /g, '')] = values[index];
          return obj;
        }, {} as any);
      });

      importProducts(importedData);
      setShowImportModal(false);
    };
    reader.readAsText(file);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      supplier: '',
      batchNumber: '',
      expiryDate: '',
      invoiceNumber: '',
      invoicePrice: '',
      supplierDiscountPercent: '0',
      vatRate: '0',
      otherCharges: '0',
      costPrice: '',
      sellingPrice: '',
      currentStock: '',
      minStockLevel: '10',
      barcode: '',
    });
  };

  const handleMedicineNameChange = (name: string) => {
    setFormData(prev => ({ ...prev, name }));
    
    // Auto-fill data if medicine exists in database
    const medicine = getMedicineByName(name);
    if (medicine) {
      setFormData(prev => ({
        ...prev,
        name: medicine.name,
        category: medicine.category,
        costPrice: medicine.defaultCostPrice?.toString() || prev.costPrice,
        sellingPrice: medicine.defaultSellingPrice?.toString() || prev.sellingPrice,
      }));
    }
  };

  const handleCostPriceChange = (value: string) => {
    const costPrice = parseFloat(value) || 0;
    const pricingInputs = {
      invoicePrice: parseFloat(formData.invoicePrice) || undefined,
      supplierDiscountPercent: parseFloat(formData.supplierDiscountPercent) || undefined,
      vatRate: parseFloat(formData.vatRate) || 0,
      otherCharges: parseFloat(formData.otherCharges) || undefined,
      costPrice: costPrice
    };
    const autoSellingPrice = calculateSellingPrice(pricingInputs);

    setFormData(prev => ({
      ...prev,
      costPrice: value,
      sellingPrice: autoSellingPrice.toString()
    }));
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🏥 Form submitted with data:', formData);
    
    // Validate required fields
    if (!formData.name.trim()) {
      showAlert({ title: 'Inventory', message: 'Product name is required', type: 'error' });
      return;
    }

    if (!formData.category.trim()) {
      showAlert({ title: 'Inventory', message: 'Category is required', type: 'error' });
      return;
    }

    if (!formData.invoiceNumber.trim()) {
      showAlert({ title: 'Inventory', message: 'Invoice number is required', type: 'error' });
      return;
    }

    if (!formData.currentStock.trim()) {
      showAlert({ title: 'Inventory', message: 'Quantity is required', type: 'error' });
      return;
    }

    // Check for duplicate product names (case insensitive)
    const existingProduct = products.find(p =>
      p.name.toLowerCase() === formData.name.toLowerCase()
    );

    if (existingProduct) {
      showAlert({ title: 'Inventory', message: `Product "${formData.name}" already exists in inventory. Please use a different name or update the existing product.`, type: 'error' });
      return;
    }

    // Validate selling price against minimum
    const invoicePrice = parseFloat(formData.invoicePrice) || 0;
    const supplierDiscountPercent = parseFloat(formData.supplierDiscountPercent) || 0;
    const vatRate = parseFloat(formData.vatRate) || 0;
    const otherCharges = parseFloat(formData.otherCharges) || 0;
    const costPrice = parseFloat(formData.costPrice) || 0;
    const sellingPrice = parseFloat(formData.sellingPrice) || 0;

    const pricingInputs = {
      invoicePrice: invoicePrice || undefined,
      supplierDiscountPercent: supplierDiscountPercent || undefined,
      vatRate: vatRate || 0,
      otherCharges: otherCharges || undefined,
      costPrice: costPrice
    };

    const minSellingPrice = getMinimumSellingPrice(pricingInputs);

    if (sellingPrice < minSellingPrice) {
      showAlert({ title: 'Inventory', message: `Selling price cannot be less than ${formatKES(minSellingPrice)} (1.33 × net cost)`, type: 'error' });
      return;
    }

    const productData = {
      name: formData.name,
      category: formData.category || 'General',
      supplier: formData.supplier || 'Unknown Supplier',
      batchNumber: formData.batchNumber || '',
      expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      invoiceNumber: formData.invoiceNumber,
      invoicePrice: invoicePrice || undefined,
      supplierDiscountPercent: supplierDiscountPercent || undefined,
      vatRate: vatRate || 0,
      otherCharges: otherCharges || undefined,
      costPrice: costPrice,
      sellingPrice: enforceMinimumSellingPrice(sellingPrice, pricingInputs),
      currentStock: parseInt(formData.currentStock) || 0,
      minStockLevel: parseInt(formData.minStockLevel) || 10,
      barcode: formData.barcode || `${Date.now()}`,
    };

    console.log('📦 Processed product data:', productData);
    addProduct(productData)
      .then(() => {
        console.log('✅ Product added successfully');
        setShowAddForm(false);
        resetForm();
      })
      .catch((error) => {
        console.error('❌ Failed to add product:', error);
        showAlert({ title: 'Inventory', message: getErrorMessage(error), type: 'error' });
        console.log('Error details:', error);
      });
  };

  const handleEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editingProduct) return;

    // Validate selling price against minimum
    const invoicePrice = parseFloat(formData.invoicePrice) || 0;
    const supplierDiscountPercent = parseFloat(formData.supplierDiscountPercent) || 0;
    const vatRate = parseFloat(formData.vatRate) || 0;
    const otherCharges = parseFloat(formData.otherCharges) || 0;
    const costPrice = parseFloat(formData.costPrice) || 0;
    const sellingPrice = parseFloat(formData.sellingPrice) || 0;

    const pricingInputs = {
      invoicePrice: invoicePrice || undefined,
      supplierDiscountPercent: supplierDiscountPercent || undefined,
      vatRate: vatRate || 0,
      otherCharges: otherCharges || undefined,
      costPrice: costPrice
    };

    const minSellingPrice = getMinimumSellingPrice(pricingInputs);

    if (sellingPrice < minSellingPrice) {
      showAlert({ title: 'Inventory', message: `Selling price cannot be less than ${formatKES(minSellingPrice)} (1.33 × net cost)`, type: 'error' });
      return;
    }

    const totalUnits = parseInt(formData.packSize || '1') * parseInt(formData.numberOfPacks || '1');

    const updates = {
      name: formData.name,
      category: formData.category,
      supplier: formData.supplier || editingProduct.supplier,
      batchNumber: formData.batchNumber || editingProduct.batchNumber,
      expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : editingProduct.expiryDate,
      invoiceNumber: formData.invoiceNumber || editingProduct.invoiceNumber,
      invoicePrice: invoicePrice || undefined,
      supplierDiscountPercent: supplierDiscountPercent || undefined,
      vatRate: vatRate || 0,
      otherCharges: otherCharges || undefined,
      costPrice: costPrice,
      sellingPrice: enforceMinimumSellingPrice(sellingPrice, pricingInputs),
      currentStock: totalUnits,
      minStockLevel: parseInt(formData.minStockLevel) || 10,
      barcode: formData.barcode || editingProduct.barcode,
    };

    updateProduct(editingProduct.id, updates);
    setEditingProduct(null);
    resetForm();
  };

  const startEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      supplier: product.supplier,
      batchNumber: product.batchNumber,
      expiryDate: product.expiryDate ? product.expiryDate.toISOString().split('T')[0] : '',
      invoiceNumber: product.invoiceNumber || '',
      invoicePrice: product.invoicePrice?.toString() || '',
      supplierDiscountPercent: product.supplierDiscountPercent?.toString() || '0',
      vatRate: product.vatRate?.toString() || '0',
      otherCharges: product.otherCharges?.toString() || '0',
      costPrice: product.costPrice.toString(),
      sellingPrice: product.sellingPrice.toString(),
      currentStock: product.currentStock.toString(),
      minStockLevel: product.minStockLevel.toString(),
      barcode: product.barcode,
    });
  };

  const handleDeleteProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    showAlert({
      title: 'Delete Product',
      message: `Are you sure you want to delete "${product?.name}"? This action cannot be undone.`,
      type: 'confirm',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await deleteProduct(productId);
          showAlert({ title: 'Inventory', message: 'Product deleted successfully', type: 'success' });
        } catch (error: any) {
          showAlert({ title: 'Inventory', message: getErrorMessage(error), type: 'error' });
        }
      }
    });
  };

  const canManageInventory = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'sales' || user?.role === 'inventory';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
        {canManageInventory && (
          <div className="flex space-x-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload className="h-4 w-4" />
              <span>Import</span>
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
            <button
              onClick={() => {
                setShowAddForm(true);
                resetForm();
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Product</span>
            </button>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products, barcode, or supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                {canManagePricing && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discounted Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discounted Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selling Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
                  </>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                {canManageInventory && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedProducts.map((product) => {
                const daysToExpiry = Math.ceil((product.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                const isLowStock = product.currentStock <= product.minStockLevel;
                const isExpiringSoon = daysToExpiry <= 30 && daysToExpiry > 0;

                // Calculate pricing information
                const pricing = getProductPricing(product);
                const hasDiscount = pricing.hasDiscount;
                const isCloseToMinimum = shouldWarnLowMargin(
                  product.sellingPrice,
                  pricing.discountedPriceRounded,
                  pricing.sellingPriceRounded
                );

                // Calculate profit margins
                const actualCost = pricing.actualCost;
                const profitAmount = product.sellingPrice - actualCost;
                const profitMarginPercent = actualCost > 0 ? (profitAmount / actualCost) * 100 : 0;

                // Calculate margin improvement from discount
                const marginWithoutDiscount = pricing.sellingPriceRounded - product.costPrice;
                const marginWithDiscount = pricing.discountedCost
                  ? pricing.sellingPriceRounded - pricing.discountedCost
                  : marginWithoutDiscount;
                const marginImprovement = marginWithDiscount / marginWithoutDiscount;
                const isHighMargin = hasDiscount && marginImprovement > 1.3;

                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">Batch: {product.batchNumber}</div>
                        <div className="text-sm text-gray-500">Barcode: {product.barcode}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.currentStock} units</div>
                      <div className="text-sm text-gray-500">Min: {product.minStockLevel}</div>
                    </td>
                    {canManagePricing && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatCurrency(product.costPrice)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {pricing.discountedCost ? (
                              <div>
                                <div>{formatCurrency(pricing.discountedCost)}</div>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  {product.supplierDiscountPercent}% off
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            {pricing.discountedPriceRounded ? (
                              <div>
                                <div className="font-medium text-gray-900">
                                  {formatCurrency(pricing.discountedPriceRounded)}
                                </div>
                                {hasDiscount && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                                    With Discount
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(pricing.sellingPriceRounded)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatKES(product.sellingPrice)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col space-y-1">
                            <div className="text-sm font-semibold text-gray-900">
                              {profitMarginPercent.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-500">
                              Profit: {formatCurrency(profitAmount)}
                            </div>
                            {isHighMargin && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                High Margin
                              </span>
                            )}
                            {isCloseToMinimum && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-800">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Close to Min
                              </span>
                            )}
                            {hasDiscount && !isHighMargin && !isCloseToMinimum && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                                Discounted
                              </span>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {product.expiryDate.toLocaleDateString('en-KE')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {daysToExpiry > 0 ? `${daysToExpiry} days` : 'Expired'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        {isLowStock && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Low Stock
                          </span>
                        )}
                        {isExpiringSoon && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Expiring Soon
                          </span>
                        )}
                        {!isLowStock && !isExpiringSoon && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            <Package className="h-3 w-3 mr-1" />
                            Good
                          </span>
                        )}
                      </div>
                    </td>
                    {canManageInventory && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => startEdit(product)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit product"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {canDeleteProducts() && (
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          <Pagination
            currentPage={currentPage}
            totalItems={filteredProducts.length}
            itemsPerPage={itemsPerPage}
            onPageChange={goToPage}
            itemName="products"
          />
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Add New Product - Wesabi Pharmacy</h3>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AutocompleteInput
                  value={formData.name}
                  onChange={handleMedicineNameChange}
                  options={medicineNames}
                  placeholder="Start typing medicine name..."
                  label="Product Name"
                  allowAddNew
                  onAddNew={addMedicine}
                  required
                />
                
                <AutocompleteInput
                  value={formData.category}
                  onChange={(value) => setFormData({ ...formData, category: value })}
                  options={categories}
                  placeholder="Select or add category"
                  label="Category"
                  allowAddNew
                  onAddNew={addCategory}
                  required
                />

                <AutocompleteInput
                  value={formData.supplier}
                  onChange={(value) => setFormData({ ...formData, supplier: value })}
                  options={suppliers}
                  placeholder="Select or add supplier"
                  label="Supplier"
                  allowAddNew
                  onAddNew={addSupplier}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
                  <input
                    type="text"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    placeholder="Enter batch number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    placeholder="Enter invoice number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {canManagePricing && (
                  <>
                    <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-blue-900 mb-3">Pricing Calculation</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Price (KES)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.invoicePrice}
                            onChange={(e) => setFormData({ ...formData, invoicePrice: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Original price from supplier"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Discount (%)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={formData.supplierDiscountPercent}
                            onChange={(e) => setFormData({ ...formData, supplierDiscountPercent: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <VATRateInput
                          value={formData.vatRate}
                          onChange={(value) => setFormData({ ...formData, vatRate: value })}
                        />
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Other Charges (KES)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.otherCharges}
                            onChange={(e) => setFormData({ ...formData, otherCharges: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Shipping, handling, etc."
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        Net Cost = (Invoice Price - Supplier Discount) + VAT + Other Charges
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (KES)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9.]*"
                        step="0.1"
                        value={formData.costPrice}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.]/g, '');
                          setFormData({ ...formData, costPrice: value });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none"
                        style={{ MozAppearance: 'textfield' }}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Use this if not using invoice-based pricing above
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (KES)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.sellingPrice}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          const pricingInputs = {
                            invoicePrice: parseFloat(formData.invoicePrice) || undefined,
                            supplierDiscountPercent: parseFloat(formData.supplierDiscountPercent) || undefined,
                            vatRate: parseFloat(formData.vatRate) || 0,
                            otherCharges: parseFloat(formData.otherCharges) || undefined,
                            costPrice: parseFloat(formData.costPrice) || 0
                          };
                          const minPrice = getMinimumSellingPrice(pricingInputs);

                          if (value < minPrice && (pricingInputs.costPrice > 0 || pricingInputs.invoicePrice)) {
                            showAlert({ title: 'Inventory', message: `Selling price cannot be less than ${formatKES(minPrice)} (1.33 × net cost)`, type: 'error' });
                            return;
                          }

                          setFormData({ ...formData, sellingPrice: e.target.value });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      {(formData.costPrice || formData.invoicePrice) && (
                        <p className="text-xs text-gray-500 mt-1">
                          Minimum: {formatKES(getMinimumSellingPrice({
                            invoicePrice: parseFloat(formData.invoicePrice) || undefined,
                            supplierDiscountPercent: parseFloat(formData.supplierDiscountPercent) || undefined,
                            vatRate: parseFloat(formData.vatRate) || 0,
                            otherCharges: parseFloat(formData.otherCharges) || undefined,
                            costPrice: parseFloat(formData.costPrice) || 0
                          }))}
                        </p>
                      )}
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    value={formData.currentStock}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setFormData({ ...formData, currentStock: value });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none"
                    style={{ MozAppearance: 'textfield' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
                  <input
                    type="number"
                    value={formData.minStockLevel}
                    onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Edit Product - Wesabi Pharmacy</h3>
            <form onSubmit={handleEditProduct} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AutocompleteInput
                  value={formData.name}
                  onChange={handleMedicineNameChange}
                  options={medicineNames}
                  placeholder="Start typing medicine name..."
                  label="Product Name"
                  required
                />
                
                <AutocompleteInput
                  value={formData.category}
                  onChange={(value) => setFormData({ ...formData, category: value })}
                  options={categories}
                  placeholder="Select or add category"
                  label="Category"
                  allowAddNew
                  onAddNew={addCategory}
                  required
                />

                <AutocompleteInput
                  value={formData.supplier}
                  onChange={(value) => setFormData({ ...formData, supplier: value })}
                  options={suppliers}
                  placeholder="Select or add supplier"
                  label="Supplier"
                  allowAddNew
                  onAddNew={addSupplier}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
                  <input
                    type="text"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {canManagePricing && (
                  <>
                    <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-blue-900 mb-3">Pricing Calculation</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Price (KES)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.invoicePrice}
                            onChange={(e) => setFormData({ ...formData, invoicePrice: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Original price from supplier"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Discount (%)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={formData.supplierDiscountPercent}
                            onChange={(e) => setFormData({ ...formData, supplierDiscountPercent: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <VATRateInput
                          value={formData.vatRate}
                          onChange={(value) => setFormData({ ...formData, vatRate: value })}
                        />
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Other Charges (KES)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.otherCharges}
                            onChange={(e) => setFormData({ ...formData, otherCharges: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Shipping, handling, etc."
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        Net Cost = (Invoice Price - Supplier Discount) + VAT + Other Charges
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (KES)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.costPrice}
                        onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Use this if not using invoice-based pricing above
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (KES)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.sellingPrice}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          const pricingInputs = {
                            invoicePrice: parseFloat(formData.invoicePrice) || undefined,
                            supplierDiscountPercent: parseFloat(formData.supplierDiscountPercent) || undefined,
                            vatRate: parseFloat(formData.vatRate) || 0,
                            otherCharges: parseFloat(formData.otherCharges) || undefined,
                            costPrice: parseFloat(formData.costPrice) || 0
                          };
                          const minPrice = getMinimumSellingPrice(pricingInputs);

                          if (value < minPrice && (pricingInputs.costPrice > 0 || pricingInputs.invoicePrice)) {
                            showAlert({ title: 'Inventory', message: `Selling price cannot be less than ${formatKES(minPrice)} (1.33 × net cost)`, type: 'error' });
                            return;
                          }

                          setFormData({ ...formData, sellingPrice: e.target.value });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      {(formData.costPrice || formData.invoicePrice) && (
                        <p className="text-xs text-gray-500 mt-1">
                          Minimum: {formatKES(getMinimumSellingPrice({
                            invoicePrice: parseFloat(formData.invoicePrice) || undefined,
                            supplierDiscountPercent: parseFloat(formData.supplierDiscountPercent) || undefined,
                            vatRate: parseFloat(formData.vatRate) || 0,
                            otherCharges: parseFloat(formData.otherCharges) || undefined,
                            costPrice: parseFloat(formData.costPrice) || 0
                          }))}
                        </p>
                      )}
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
                  <input
                    type="number"
                    value={formData.minStockLevel}
                    onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Update Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Import Products from CSV</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
              </div>
              <div className="text-sm text-gray-600">
                <p>CSV should include columns:</p>
                <p className="font-mono text-xs mt-1">
                  name, category, supplier, batchnumber, expirydate, costprice, sellingprice, currentstock, minstocklevel, barcode
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;