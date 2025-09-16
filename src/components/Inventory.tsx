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
  Package
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Product } from '../types';
import { formatKES, calculateSellingPrice } from '../utils/currency';
import AutocompleteInput from './AutocompleteInput';

const Inventory: React.FC = () => {
  const { 
    user,
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

  const exportToCSV = () => {
    try {
      const content = `
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
                  <td>${formatKES(product.costPrice)}</td>
                  <td>${formatKES(product.sellingPrice)}</td>
                  <td>${product.currentStock}</td>
                  <td>${product.minStockLevel}</td>
                  <td>${product.barcode}</td>
                </tr>
              `).join('')}
            </table>
          </body>
        </html>
      `;
      
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
        alert('Please allow popups to export PDF reports');
      }
    } catch (error) {
      console.error('Error exporting inventory report:', error);
      alert('Error generating PDF report. Please try again.');
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
    const autoSellingPrice = calculateSellingPrice(costPrice);
    
    setFormData(prev => ({
      ...prev,
      costPrice: value,
      sellingPrice: autoSellingPrice.toString()
    }));
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🏥 Form submitted with data:', formData);
    
    // Check for duplicate product names (case insensitive)
    const existingProduct = products.find(p => 
      p.name.toLowerCase() === formData.name.toLowerCase()
    );
    
    if (existingProduct) {
      alert(`Product "${formData.name}" already exists in inventory. Please use a different name or update the existing product.`);
      return;
    }
    
    const productData = {
      name: formData.name,
      category: formData.category,
      supplier: formData.supplier || 'Unknown Supplier',
      batchNumber: formData.batchNumber || '',
      expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now if not specified
      invoiceNumber: formData.invoiceNumber,
      costPrice: parseFloat(formData.costPrice) || 0,
      sellingPrice: parseFloat(formData.sellingPrice) || calculateSellingPrice(parseFloat(formData.costPrice) || 0),
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
        alert(`Failed to add product: ${error.message}`);
      });
  };

  const handleEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editingProduct) return;

    const totalUnits = parseInt(formData.packSize || '1') * parseInt(formData.numberOfPacks || '1');

    const updates = {
      name: formData.name,
      category: formData.category,
      supplier: formData.supplier || editingProduct.supplier,
      batchNumber: formData.batchNumber || editingProduct.batchNumber,
      expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : editingProduct.expiryDate,
      invoiceNumber: formData.invoiceNumber || editingProduct.invoiceNumber,
      costPrice: parseFloat(formData.costPrice) || 0,
      sellingPrice: parseFloat(formData.sellingPrice) || calculateSellingPrice(parseFloat(formData.costPrice) || 0),
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
      costPrice: product.costPrice.toString(),
      sellingPrice: product.sellingPrice.toString(),
      currentStock: product.currentStock.toString(),
      minStockLevel: product.minStockLevel.toString(),
      barcode: product.barcode,
    });
  };

  const canManagePricing = user?.role === 'admin';
  const canManageInventory = user?.role === 'admin' || user?.role === 'inventory_manager';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">Wesabi Pharmacy - Stock Control System</p>
        </div>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                {canManageInventory && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => {
                const daysToExpiry = Math.ceil((product.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                const isLowStock = product.currentStock <= product.minStockLevel;
                const isExpiringSoon = daysToExpiry <= 30 && daysToExpiry > 0;

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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatKES(product.sellingPrice)}</div>
                      <div className="text-sm text-gray-500">Cost: {formatKES(product.costPrice)}</div>
                    </td>
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
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {user?.role === 'admin' && (
                          <button
                            onClick={() => deleteProduct(product.id)}
                            className="text-red-600 hover:text-red-900"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number <span className="text-red-500">*</span></label>
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
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (KES)</label>
                      <input
                        type="text"
                        value={formData.sellingPrice}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (KES)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.costPrice}
                        onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (KES)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.sellingPrice}
                        onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
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