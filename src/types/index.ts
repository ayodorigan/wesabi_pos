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
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { Product } from '../types';
import { formatKES } from '../utils/currency';

const Inventory: React.FC = () => {
  const { user } = useAuth();
  const { products, addProduct, updateProduct, deleteProduct, importProducts } = useApp();
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
    costPrice: '',
    sellingPrice: '',
    currentStock: '',
    minStockLevel: '',
    barcode: '',
    invoiceNumber: '',
  });

  const categories = Array.from(new Set(products.map(p => p.category)));
  
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.barcode.includes(searchTerm) ||
                         product.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const exportToCSV = () => {
    const headers = ['Name', 'Category', 'Supplier', 'Batch Number', 'Expiry Date', 'Cost Price', 'Selling Price', 'Current Stock', 'Min Stock Level', 'Barcode', 'Invoice Number'];
    const csvContent = [
      headers.join(','),
      ...filteredProducts.map(product => [
        product.name,
        product.category,
        product.supplier,
        product.batchNumber,
        product.expiryDate.toISOString().split('T')[0],
        product.costPrice,
        product.sellingPrice,
        product.currentStock,
        product.minStockLevel,
        product.barcode,
        product.invoiceNumber || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory.csv';
    a.click();
    window.URL.revokeObjectURL(url);
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
      costPrice: '',
      sellingPrice: '',
      currentStock: '',
      minStockLevel: '',
      barcode: '',
      invoiceNumber: '',
    });
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    
    const productData = {
      name: formData.name,
      category: formData.category,
      supplier: formData.supplier,
      batchNumber: formData.batchNumber,
      expiryDate: new Date(formData.expiryDate),
      costPrice: parseFloat(formData.costPrice) || 0,
      sellingPrice: parseFloat(formData.sellingPrice) || 0,
      currentStock: parseInt(formData.currentStock) || 0,
      minStockLevel: parseInt(formData.minStockLevel) || 10,
      barcode: formData.barcode,
      invoiceNumber: formData.invoiceNumber,
    };

    addProduct(productData);
    setShowAddForm(false);
    resetForm();
  };

  const handleEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const updates = {
      name: formData.name,
      category: formData.category,
      supplier: formData.supplier,
      batchNumber: formData.batchNumber,
      expiryDate: new Date(formData.expiryDate),
      costPrice: parseFloat(formData.costPrice) || 0,
      sellingPrice: parseFloat(formData.sellingPrice) || 0,
      currentStock: parseInt(formData.currentStock) || 0,
      minStockLevel: parseInt(formData.minStockLevel) || 10,
      barcode: formData.barcode,
      invoiceNumber: formData.invoiceNumber,
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
      expiryDate: product.expiryDate.toISOString().split('T')[0],
      costPrice: product.costPrice.toString(),
      sellingPrice: product.sellingPrice.toString(),
      currentStock: product.currentStock.toString(),
      minStockLevel: product.minStockLevel.toString(),
      barcode: product.barcode,
      invoiceNumber: product.invoiceNumber || '',
    });
  };

  const canManagePricing = user?.role === 'super_admin' || user?.role === 'admin';
  const canManageInventory = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'inventory_manager';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
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
                        {product.invoiceNumber && (
                          <div className="text-sm text-gray-500">Invoice: {product.invoiceNumber}</div>
                        )}
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
                          <button
                            onClick={() => deleteProduct(product.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
                  name, category, supplier, batchnumber, expirydate, costprice, sellingprice, currentstock, minstocklevel, barcode, invoicenumber
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