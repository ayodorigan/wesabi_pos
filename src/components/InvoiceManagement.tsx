import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, Trash2, Eye, Package, Edit, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { supabase } from '../lib/supabase';
import { Invoice, InvoiceItem } from '../types';
import { formatKES, calculateSellingPrice } from '../utils/currency';
import AutocompleteInput from './AutocompleteInput';
import { useApp } from '../contexts/AppContext';

const InvoiceManagement: React.FC = () => {
  const { user, canDeleteProducts } = useAuth();
  const { showAlert } = useAlert();
  const { categories, suppliers, addCategory, addSupplier, medicineTemplates, getMedicineByName, refreshData, logActivity } = useApp();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: '',
    supplier: '',
    invoiceDate: new Date().toISOString().split('T')[0],
  });

  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [currentItem, setCurrentItem] = useState({
    productName: '',
    category: '',
    batchNumber: '',
    expiryDate: '',
    quantity: '',
    costPrice: '',
    sellingPrice: '',
    barcode: '',
  });

  const medicineNames = medicineTemplates.map(med => med.name);

  useEffect(() => {
    loadInvoices();
  }, [user]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      if (!supabase) return;

      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .order('invoice_date', { ascending: false });

      if (invoicesError) throw invoicesError;

      const invoicesWithItems = await Promise.all(
        (invoicesData || []).map(async (invoice) => {
          const { data: items } = await supabase
            .from('invoice_items')
            .select('*')
            .eq('invoice_id', invoice.id);

          return {
            ...invoice,
            id: invoice.id,
            invoiceNumber: invoice.invoice_number,
            supplier: invoice.supplier,
            invoiceDate: new Date(invoice.invoice_date),
            totalAmount: parseFloat(invoice.total_amount),
            notes: invoice.notes,
            userId: invoice.user_id,
            userName: invoice.user_name,
            items: (items || []).map((item: any) => ({
              id: item.id,
              productName: item.product_name,
              category: item.category,
              batchNumber: item.batch_number,
              expiryDate: new Date(item.expiry_date),
              quantity: item.quantity,
              costPrice: parseFloat(item.cost_price),
              sellingPrice: parseFloat(item.selling_price),
              totalCost: parseFloat(item.total_cost),
              barcode: item.barcode,
            })),
            createdAt: new Date(invoice.created_at),
            updatedAt: new Date(invoice.updated_at),
          };
        })
      );

      setInvoices(invoicesWithItems);
    } catch (error) {
      console.error('Error loading invoices:', error);
      showAlert({ title: 'Invoice Management', message: 'Failed to load invoices', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleMedicineNameChange = (name: string) => {
    setCurrentItem(prev => ({ ...prev, productName: name }));

    const medicine = getMedicineByName(name);
    if (medicine) {
      setCurrentItem(prev => ({
        ...prev,
        productName: medicine.name,
        category: medicine.category,
        costPrice: medicine.defaultCostPrice?.toString() || prev.costPrice,
        sellingPrice: medicine.defaultSellingPrice?.toString() || prev.sellingPrice,
      }));
    }
  };

  const handleCostPriceChange = (value: string) => {
    const costPrice = parseFloat(value) || 0;
    const autoSellingPrice = calculateSellingPrice(costPrice);

    setCurrentItem(prev => ({
      ...prev,
      costPrice: value,
      sellingPrice: autoSellingPrice.toString()
    }));
  };

  const addItemToInvoice = () => {
    if (!currentItem.productName || !currentItem.quantity || !currentItem.costPrice) {
      showAlert({ title: 'Invoice Management', message: 'Please fill in all required fields for the item', type: 'error' });
      return;
    }

    const quantity = parseInt(currentItem.quantity);
    const costPrice = parseFloat(currentItem.costPrice);
    const sellingPrice = parseFloat(currentItem.sellingPrice);
    const totalCost = quantity * costPrice;

    const newItem: InvoiceItem = {
      productName: currentItem.productName,
      category: currentItem.category || 'General',
      batchNumber: currentItem.batchNumber || '',
      expiryDate: currentItem.expiryDate ? new Date(currentItem.expiryDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      quantity,
      costPrice,
      sellingPrice,
      totalCost,
      barcode: currentItem.barcode || `${Date.now()}`,
    };

    setInvoiceItems([newItem, ...invoiceItems]);

    setCurrentItem({
      productName: '',
      category: '',
      batchNumber: '',
      expiryDate: '',
      quantity: '',
      costPrice: '',
      sellingPrice: '',
      barcode: '',
    });
  };

  const removeItemFromInvoice = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const saveInvoice = async () => {
    if (!invoiceData.invoiceNumber || !invoiceData.supplier) {
      showAlert({ title: 'Invoice Management', message: 'Please fill in invoice number and supplier', type: 'error' });
      return;
    }

    if (invoiceItems.length === 0) {
      showAlert({ title: 'Invoice Management', message: 'Please add at least one item to the invoice', type: 'error' });
      return;
    }

    if (!user || !supabase) return;

    setLoading(true);
    try {
      const totalAmount = invoiceItems.reduce((sum, item) => sum + item.totalCost, 0);

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceData.invoiceNumber,
          supplier: invoiceData.supplier,
          invoice_date: invoiceData.invoiceDate,
          total_amount: totalAmount,
          user_id: user.user_id,
          user_name: user.name,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      for (const item of invoiceItems) {
        const { data: existingProduct } = await supabase
          .from('products')
          .select('*')
          .eq('name', item.productName)
          .eq('batch_number', item.batchNumber)
          .maybeSingle();

        let productId = existingProduct?.id;

        if (existingProduct) {
          const { error: updateError } = await supabase
            .from('products')
            .update({
              current_stock: existingProduct.current_stock + item.quantity,
              cost_price: item.costPrice,
              selling_price: item.sellingPrice,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingProduct.id);

          if (updateError) throw updateError;
        } else {
          const { data: newProduct, error: productError } = await supabase
            .from('products')
            .insert({
              name: item.productName,
              category: item.category,
              supplier: invoiceData.supplier,
              batch_number: item.batchNumber,
              expiry_date: item.expiryDate.toISOString().split('T')[0],
              cost_price: item.costPrice,
              selling_price: item.sellingPrice,
              current_stock: item.quantity,
              min_stock_level: 10,
              barcode: item.barcode,
              invoice_number: invoiceData.invoiceNumber,
            })
            .select()
            .single();

          if (productError) throw productError;
          productId = newProduct.id;
        }

        const { error: itemError } = await supabase
          .from('invoice_items')
          .insert({
            invoice_id: invoice.id,
            product_id: productId,
            product_name: item.productName,
            category: item.category,
            batch_number: item.batchNumber,
            expiry_date: item.expiryDate.toISOString().split('T')[0],
            quantity: item.quantity,
            cost_price: item.costPrice,
            selling_price: item.sellingPrice,
            total_cost: item.totalCost,
            barcode: item.barcode,
          });

        if (itemError) throw itemError;
      }

      setLoading(false);
      await refreshData();
      await loadInvoices();

      // Log activity
      await logActivity(
        'INVOICE_CREATED',
        `Created invoice ${invoiceData.invoiceNumber} for supplier ${invoiceData.supplier} - Total: ${formatKES(totalAmount)}, Items: ${invoiceItems.length}`
      );

      resetForm();
      setShowAddForm(false);
      showAlert({ title: 'Invoice Management', message: 'Invoice saved successfully! Inventory updated.', type: 'success' });
    } catch (error: any) {
      console.error('Error saving invoice:', error);
      showAlert({ title: 'Invoice Management', message: `Failed to save invoice: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const deleteInvoice = async (invoiceId: string) => {
    const invoiceToDelete = invoices.find(inv => inv.id === invoiceId);

    if (!confirm('Are you sure you want to delete this invoice? This will NOT reverse inventory changes.')) {
      return;
    }

    setLoading(true);
    try {
      if (!supabase) return;

      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;

      // Log activity
      await logActivity(
        'INVOICE_DELETED',
        `Deleted invoice ${invoiceToDelete?.invoiceNumber || invoiceId} - Supplier: ${invoiceToDelete?.supplier || 'Unknown'}`
      );

      await loadInvoices();
      showAlert({ title: 'Invoice Management', message: 'Invoice deleted successfully', type: 'success' });
    } catch (error: any) {
      console.error('Error deleting invoice:', error);
      showAlert({ title: 'Invoice Management', message: `Failed to delete invoice: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const viewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowViewModal(true);
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      const lines = csvText.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        showAlert({ title: 'Invoice Management', message: 'CSV file is empty or invalid', type: 'error' });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      const requiredHeaders = ['productname', 'category', 'batchnumber', 'expirydate', 'quantity', 'costprice', 'sellingprice'];
      const hasAllHeaders = requiredHeaders.every(h => headers.includes(h));

      if (!hasAllHeaders) {
        showAlert({ title: 'Invoice Management', message: 'CSV must have columns: ProductName, Category, BatchNumber, ExpiryDate, Quantity, CostPrice, SellingPrice', type: 'error' });
        return;
      }

      const items: InvoiceItem[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};

        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        if (!row.productname || !row.quantity || !row.costprice) continue;

        items.push({
          productName: row.productname,
          category: row.category || 'General',
          batchNumber: row.batchnumber || '',
          expiryDate: row.expirydate ? new Date(row.expirydate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          quantity: parseInt(row.quantity) || 0,
          costPrice: parseFloat(row.costprice) || 0,
          sellingPrice: parseFloat(row.sellingprice) || calculateSellingPrice(parseFloat(row.costprice) || 0),
          totalCost: (parseInt(row.quantity) || 0) * (parseFloat(row.costprice) || 0),
          barcode: row.barcode || `${Date.now()}-${i}`,
        });
      }

      setInvoiceItems(items);
      showAlert({ title: 'Invoice Management', message: `Imported ${items.length} items from CSV`, type: 'success' });
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  const resetForm = () => {
    setInvoiceData({
      invoiceNumber: '',
      supplier: '',
      invoiceDate: new Date().toISOString().split('T')[0],
    });
    setInvoiceItems([]);
    setCurrentItem({
      productName: '',
      category: '',
      batchNumber: '',
      expiryDate: '',
      quantity: '',
      costPrice: '',
      sellingPrice: '',
      barcode: '',
    });
  };

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.supplier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoice Management</h1>
          <p className="text-gray-600">Add inventory by invoice</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          <span>New Invoice</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Added By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="font-medium">{invoice.invoiceNumber}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{invoice.supplier}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{invoice.invoiceDate.toLocaleDateString('en-KE')}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      <Package className="h-3 w-3 mr-1" />
                      {invoice.items.length} items
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{formatKES(invoice.totalAmount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.userName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => viewInvoice(invoice)}
                        className="text-blue-600 hover:text-blue-800"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {canDeleteProducts() && (
                        <button
                          onClick={() => deleteInvoice(invoice.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No invoices found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Invoice Modal */}
      {showViewModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Invoice Details</h3>

              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Invoice Number</p>
                  <p className="font-semibold">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Supplier</p>
                  <p className="font-semibold">{selectedInvoice.supplier}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-semibold">{selectedInvoice.invoiceDate.toLocaleDateString('en-KE')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="font-semibold text-green-600">{formatKES(selectedInvoice.totalAmount)}</p>
                </div>
              </div>

              <h4 className="font-semibold mb-2">Items ({selectedInvoice.items.length})</h4>
              <div className="border rounded-lg overflow-hidden mb-4">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Batch</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Cost</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Selling</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedInvoice.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-sm">{item.productName}</td>
                        <td className="px-3 py-2 text-sm">{item.batchNumber}</td>
                        <td className="px-3 py-2 text-sm">{item.quantity}</td>
                        <td className="px-3 py-2 text-sm">{formatKES(item.costPrice)}</td>
                        <td className="px-3 py-2 text-sm">{formatKES(item.sellingPrice)}</td>
                        <td className="px-3 py-2 text-sm font-medium">{formatKES(item.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedInvoice(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Invoice Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Add New Invoice</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceData.invoiceNumber}
                    onChange={(e) => setInvoiceData({ ...invoiceData, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <AutocompleteInput
                  value={invoiceData.supplier}
                  onChange={(value) => setInvoiceData({ ...invoiceData, supplier: value })}
                  options={suppliers}
                  placeholder="Select or add supplier"
                  label="Supplier"
                  allowAddNew
                  onAddNew={addSupplier}
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={invoiceData.invoiceDate}
                    onChange={(e) => setInvoiceData({ ...invoiceData, invoiceDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Upload className="h-4 w-4 inline mr-2" />
                  Import Items from CSV
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  CSV format: ProductName, Category, BatchNumber, ExpiryDate, Quantity, CostPrice, SellingPrice
                </p>
              </div>

              <div className="border-t pt-4 mb-4">
                <h4 className="font-semibold mb-3">Add Items to Invoice</h4>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <AutocompleteInput
                    value={currentItem.productName}
                    onChange={handleMedicineNameChange}
                    options={medicineNames}
                    placeholder="Product name"
                    label="Product Name"
                    required
                  />

                  <AutocompleteInput
                    value={currentItem.category}
                    onChange={(value) => setCurrentItem({ ...currentItem, category: value })}
                    options={categories}
                    placeholder="Category"
                    label="Category"
                    allowAddNew
                    onAddNew={addCategory}
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
                    <input
                      type="text"
                      value={currentItem.batchNumber}
                      onChange={(e) => setCurrentItem({ ...currentItem, batchNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={currentItem.expiryDate}
                      onChange={(e) => setCurrentItem({ ...currentItem, expiryDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (KES)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentItem.costPrice}
                      onChange={(e) => handleCostPriceChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (KES)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentItem.sellingPrice}
                      onChange={(e) => setCurrentItem({ ...currentItem, sellingPrice: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={addItemToInvoice}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add Item
                    </button>
                  </div>
                </div>
              </div>

              {invoiceItems.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">Invoice Items ({invoiceItems.length})</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Batch</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Cost</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Selling</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Total</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {invoiceItems.map((item, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm">{item.productName}</td>
                            <td className="px-3 py-2 text-sm">{item.batchNumber}</td>
                            <td className="px-3 py-2 text-sm">{item.quantity}</td>
                            <td className="px-3 py-2 text-sm">{formatKES(item.costPrice)}</td>
                            <td className="px-3 py-2 text-sm">{formatKES(item.sellingPrice)}</td>
                            <td className="px-3 py-2 text-sm font-medium">{formatKES(item.totalCost)}</td>
                            <td className="px-3 py-2 text-sm">
                              <button
                                onClick={() => removeItemFromInvoice(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-semibold">
                          <td colSpan={5} className="px-3 py-2 text-right">Total:</td>
                          <td className="px-3 py-2">
                            {formatKES(invoiceItems.reduce((sum, item) => sum + item.totalCost, 0))}
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={saveInvoice}
                  disabled={loading || invoiceItems.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Invoice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceManagement;
