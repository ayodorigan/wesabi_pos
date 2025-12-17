import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, Download, Search, Filter, X, RotateCcw, CheckCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { AlertDialog } from './AlertDialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { usePageRefresh } from '../hooks/usePageRefresh';
import { usePagination } from '../hooks/usePagination';
import Pagination from './Pagination';

interface Product {
  id: string;
  name: string;
  current_stock: number;
  min_stock_level: number;
}

interface OrderItem {
  id?: string;
  product_id: string;
  product_name: string;
  current_quantity: number;
  order_quantity: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  notes: string;
  total_items: number;
  created_at: string;
  created_by: string;
  user_profiles: {
    name: string;
  };
}

export default function Orders() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchProduct, setSearchProduct] = useState('');
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    min_stock_level: '10'
  });
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    orderId: string | null;
    orderNumber: string;
  }>({
    isOpen: false,
    orderId: null,
    orderNumber: ''
  });
  const [infoDialog, setInfoDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('supplier_orders')
        .select(`
          *,
          user_profiles (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      showAlert({ title: 'Error', message: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  const fetchProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, current_stock, min_stock_level')
        .order('name');

      if (error) throw error;
      setAllProducts(data || []);
    } catch (error: any) {
      showAlert({ title: 'Error', message: error.message, type: 'error' });
    }
  }, [showAlert]);

  usePageRefresh('orders', {
    refreshOnMount: true,
    staleTime: 30000
  });

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, [fetchOrders, fetchProducts]);

  const loadLowStockItems = async () => {
    try {
      await fetchProducts();

      const { data, error } = await supabase
        .from('products')
        .select('id, name, current_stock, min_stock_level')
        .order('name');

      if (error) throw error;

      const products = data || [];
      const lowStock = products.filter(p => p.current_stock <= p.min_stock_level);
      const items: OrderItem[] = lowStock.map(product => ({
        product_id: product.id,
        product_name: product.name,
        current_quantity: product.current_stock,
        order_quantity: Math.max(1, product.min_stock_level * 2 - product.current_stock)
      }));
      setOrderItems(items);
    } catch (error: any) {
      showAlert({ title: 'Error', message: error.message, type: 'error' });
    }
  };

  const handleCreateOrder = async () => {
    setEditingOrder(null);
    setOrderItems([]);
    setNotes('');
    setSearchProduct('');
    setShowCreateModal(true);
    await loadLowStockItems();
  };

  const handleEditOrder = async (order: Order) => {
    try {
      const { data, error } = await supabase
        .from('supplier_order_items')
        .select('*')
        .eq('order_id', order.id);

      if (error) throw error;

      setEditingOrder(order);
      setOrderItems(data || []);
      setNotes(order.notes || '');
      setShowCreateModal(true);
    } catch (error: any) {
      showAlert({ title: 'Error', message: error.message, type: 'error' });
    }
  };

  const handleAddItem = (product: Product) => {
    if (orderItems.some(item => item.product_id === product.id)) {
      showAlert({ title: 'Warning', message: 'Item already added to order', type: 'warning' });
      return;
    }

    setOrderItems([{
      product_id: product.id,
      product_name: product.name,
      current_quantity: product.current_stock,
      order_quantity: product.min_stock_level
    }, ...orderItems]);
    setSearchProduct('');
  };

  const handleRemoveItem = (productId: string) => {
    setOrderItems(orderItems.filter(item => item.product_id !== productId));
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    setOrderItems(orderItems.map(item =>
      item.product_id === productId
        ? { ...item, order_quantity: Math.max(1, quantity) }
        : item
    ));
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const inputs = document.querySelectorAll('input[data-quantity-input]');
      const nextIndex = currentIndex + 1;
      if (nextIndex < inputs.length) {
        const nextInput = inputs[nextIndex] as HTMLInputElement;
        nextInput.focus();
        nextInput.select();
      }
    }
  };

  const handleAddNewProduct = () => {
    setNewProduct({
      name: searchProduct,
      min_stock_level: '10'
    });
    setShowAddProductModal(true);
  };

  const handleSaveNewProduct = async () => {
    if (!newProduct.name.trim()) {
      showAlert({ title: 'Error', message: 'Please enter a product name', type: 'error' });
      return;
    }

    try {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);

      const { data, error } = await supabase
        .from('products')
        .insert({
          name: newProduct.name.trim(),
          current_stock: 0,
          min_stock_level: parseInt(newProduct.min_stock_level) || 10,
          category: 'General',
          supplier: 'To Be Determined',
          batch_number: 'TBD',
          expiry_date: futureDate.toISOString().split('T')[0],
          barcode: `TBD-${Date.now()}`,
          cost_price: 0,
          selling_price: 0
        })
        .select()
        .single();

      if (error) throw error;

      const newOrderItem: OrderItem = {
        product_id: data.id,
        product_name: data.name,
        current_quantity: 0,
        order_quantity: parseInt(newProduct.min_stock_level) || 10
      };

      setOrderItems([newOrderItem, ...orderItems]);
      await fetchProducts();
      setShowAddProductModal(false);
      setSearchProduct('');
      setNewProduct({ name: '', min_stock_level: '10' });
      showAlert({ title: 'Success', message: 'Product added successfully', type: 'success' });
    } catch (error: any) {
      showAlert({ title: 'Error', message: error.message, type: 'error' });
    }
  };

  const handleSaveOrder = async () => {
    if (orderItems.length === 0) {
      showAlert({ title: 'Error', message: 'Please add at least one item to the order', type: 'error' });
      return;
    }

    try {
      if (editingOrder) {
        const { error: updateError } = await supabase
          .from('supplier_orders')
          .update({
            notes,
            total_items: orderItems.reduce((sum, item) => sum + item.order_quantity, 0)
          })
          .eq('id', editingOrder.id);

        if (updateError) throw updateError;

        const { error: deleteError } = await supabase
          .from('supplier_order_items')
          .delete()
          .eq('order_id', editingOrder.id);

        if (deleteError) throw deleteError;

        const { error: insertError } = await supabase
          .from('supplier_order_items')
          .insert(orderItems.map(item => ({
            order_id: editingOrder.id,
            product_id: item.product_id,
            product_name: item.product_name,
            current_quantity: item.current_quantity,
            order_quantity: item.order_quantity
          })));

        if (insertError) throw insertError;

        showAlert({ title: 'Success', message: 'Order updated successfully', type: 'success' });
      } else {
        const { data: funcData, error: funcError } = await supabase
          .rpc('generate_order_number');

        if (funcError) throw funcError;

        const orderNumber = funcData;

        const { data: orderData, error: orderError } = await supabase
          .from('supplier_orders')
          .insert({
            order_number: orderNumber,
            created_by: user?.user_id,
            notes,
            total_items: orderItems.reduce((sum, item) => sum + item.order_quantity, 0)
          })
          .select()
          .single();

        if (orderError) throw orderError;

        const { error: itemsError } = await supabase
          .from('supplier_order_items')
          .insert(orderItems.map(item => ({
            order_id: orderData.id,
            product_id: item.product_id,
            product_name: item.product_name,
            current_quantity: item.current_quantity,
            order_quantity: item.order_quantity
          })));

        if (itemsError) throw itemsError;

        showAlert({ title: 'Success', message: 'Order created successfully', type: 'success' });
      }

      setShowCreateModal(false);
      fetchOrders();
    } catch (error: any) {
      showAlert({ title: 'Error', message: error.message, type: 'error' });
    }
  };

  const handleDeleteOrder = async () => {
    if (!deleteDialog.orderId) return;

    try {
      const { error } = await supabase
        .from('supplier_orders')
        .delete()
        .eq('id', deleteDialog.orderId);

      if (error) throw error;

      setInfoDialog({
        isOpen: true,
        title: 'Success',
        message: 'Order deleted successfully',
        type: 'success'
      });
      fetchOrders();
    } catch (error: any) {
      setInfoDialog({
        isOpen: true,
        title: 'Error',
        message: error.message || 'Failed to delete order',
        type: 'error'
      });
    } finally {
      setDeleteDialog({ isOpen: false, orderId: null, orderNumber: '' });
    }
  };

  const showDeleteConfirmation = (orderId: string, orderNumber: string) => {
    setDeleteDialog({
      isOpen: true,
      orderId,
      orderNumber
    });
  };

  const exportToPDF = async (order: Order) => {
    try {
      const { data: items, error } = await supabase
        .from('supplier_order_items')
        .select('*')
        .eq('order_id', order.id);

      if (error) throw error;

      const pdf = generatePDF(order, items || []);
      pdf.save(`Order_${order.order_number}.pdf`);

      setInfoDialog({
        isOpen: true,
        title: 'Success',
        message: 'Order exported successfully as PDF',
        type: 'success'
      });
    } catch (error: any) {
      setInfoDialog({
        isOpen: true,
        title: 'Error',
        message: error.message || 'Failed to export order',
        type: 'error'
      });
    }
  };

  const generatePDF = (order: Order, items: OrderItem[]) => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('SUPPLIER ORDER', 105, 20, { align: 'center' });

    doc.setDrawColor(200);
    doc.line(15, 25, 195, 25);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Order Number:', 15, 35);
    doc.setFont('helvetica', 'normal');
    doc.text(order.order_number, 55, 35);

    doc.setFont('helvetica', 'bold');
    doc.text('Date:', 15, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(order.created_at).toLocaleDateString(), 55, 42);

    doc.setFont('helvetica', 'bold');
    doc.text('Created By:', 15, 49);
    doc.setFont('helvetica', 'normal');
    doc.text(order.user_profiles?.name || 'Unknown', 55, 49);

    doc.setFont('helvetica', 'bold');
    doc.text('Status:', 15, 56);
    doc.setFont('helvetica', 'normal');
    doc.text(order.status.toUpperCase(), 55, 56);

    doc.line(15, 60, 195, 60);

    const tableData = items.map((item, index) => [
      (index + 1).toString(),
      item.product_name,
      item.order_quantity.toString()
    ]);

    autoTable(doc, {
      startY: 68,
      head: [['#', 'Product Name', 'Order Quantity']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 130 },
        2: { cellWidth: 40, halign: 'center' }
      },
      margin: { left: 15, right: 15 },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          doc.setFontSize(20);
          doc.setFont('helvetica', 'bold');
          doc.text('SUPPLIER ORDER (Continued)', 105, 20, { align: 'center' });
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 68;

    doc.setDrawColor(200);
    doc.line(15, finalY + 5, 195, finalY + 5);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Items to Order: ${items.reduce((sum, item) => sum + item.order_quantity, 0)}`, 15, finalY + 13);

    if (order.notes) {
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', 15, finalY + 23);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const splitNotes = doc.splitTextToSize(order.notes, 180);
      doc.text(splitNotes, 15, finalY + 30);
    }

    return doc;
  };

  const revertOrderStatus = async (order: Order) => {
    try {
      const { error } = await supabase
        .from('supplier_orders')
        .update({ status: 'pending' })
        .eq('id', order.id);

      if (error) throw error;

      showAlert({ title: 'Success', message: `Order ${order.order_number} reverted to pending status`, type: 'success' });
      fetchOrders();
    } catch (error: any) {
      showAlert({ title: 'Error', message: error.message || 'Failed to revert order status', type: 'error' });
    }
  };

  const markAsCompleted = async (order: Order) => {
    try {
      const { error } = await supabase
        .from('supplier_orders')
        .update({ status: 'completed' })
        .eq('id', order.id);

      if (error) throw error;

      showAlert({ title: 'Success', message: `Order ${order.order_number} marked as completed`, type: 'success' });
      fetchOrders();
    } catch (error: any) {
      showAlert({ title: 'Error', message: error.message || 'Failed to mark order as completed', type: 'error' });
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user_profiles?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  const {
    currentPage,
    paginatedItems: paginatedOrders,
    goToPage,
    itemsPerPage
  } = usePagination({ items: sortedOrders, itemsPerPage: 15 });

  const filteredProducts = allProducts.filter(product =>
    product.name.toLowerCase().includes(searchProduct.toLowerCase())
  );

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Supplier Orders</h2>
        <button
          onClick={handleCreateOrder}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Order
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="relative">
            <Filter className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg appearance-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No orders found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                    onClick={toggleSortOrder}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Date</span>
                      {sortOrder === 'desc' ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUp className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {order.order_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {order.user_profiles?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {order.total_items}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        {order.status !== 'completed' && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEditOrder(order);
                            }}
                            className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                            title="Edit"
                            type="button"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            exportToPDF(order);
                          }}
                          className="text-green-600 hover:text-green-800 transition-colors p-1"
                          title="Export PDF"
                          type="button"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        {order.status !== 'completed' && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              markAsCompleted(order);
                            }}
                            className="text-emerald-600 hover:text-emerald-800 transition-colors p-1"
                            title="Mark as Completed"
                            type="button"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}
                        {order.status === 'completed' && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              revertOrderStatus(order);
                            }}
                            className="text-orange-600 hover:text-orange-800 transition-colors p-1"
                            title="Revert to Pending"
                            type="button"
                          >
                            <RotateCcw className="w-5 h-5" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              showDeleteConfirmation(order.id, order.order_number);
                            }}
                            className="text-red-600 hover:text-red-800 transition-colors p-1"
                            title="Delete"
                            type="button"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Pagination
              currentPage={currentPage}
              totalItems={sortedOrders.length}
              itemsPerPage={itemsPerPage}
              onPageChange={goToPage}
              itemName="orders"
            />
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-xl font-semibold">
                {editingOrder ? 'Edit Order' : 'Create New Order'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="block text-sm font-semibold text-blue-900 mb-2">
                  Search & Add Products to Order
                </label>
                <p className="text-xs text-blue-700 mb-3">
                  {orderItems.length > 0
                    ? `${orderItems.length} low-stock item(s) auto-added. Search below to add more products.`
                    : 'No low-stock items found. Search below to add products to your order.'}
                </p>
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Type product name to search and add..."
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {searchProduct && (
                  <div className="mt-2 border border-gray-300 rounded-lg max-h-48 overflow-y-auto bg-white shadow-md">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.slice(0, 10).map(product => (
                        <button
                          key={product.id}
                          onClick={() => handleAddItem(product)}
                          className="w-full px-4 py-2.5 text-left hover:bg-blue-50 flex justify-between items-center border-b last:border-b-0"
                        >
                          <span className="font-medium">{product.name}</span>
                          <span className={`text-sm px-2 py-1 rounded ${
                            product.current_stock <= product.min_stock_level
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            Stock: {product.current_stock}
                          </span>
                        </button>
                      ))
                    ) : (
                      <button
                        onClick={handleAddNewProduct}
                        className="w-full px-4 py-3 text-left hover:bg-green-50 flex items-center gap-2 text-green-700 font-medium"
                      >
                        <Plus className="w-5 h-5" />
                        <span>Add "{searchProduct}" as a new product</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Items
                </label>
                {orderItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border border-gray-300 rounded-lg">
                    No items added yet. Search and add products above.
                  </div>
                ) : (
                  <div className="border border-gray-300 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order Quantity</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {orderItems.map((item, index) => (
                          <tr key={item.product_id}>
                            <td className="px-4 py-2">{item.product_name}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 rounded text-sm ${
                                item.current_quantity <= 0
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {item.current_quantity}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                value={item.order_quantity}
                                onChange={(e) => handleUpdateQuantity(item.product_id, parseInt(e.target.value) || 0)}
                                onKeyDown={(e) => handleQuantityKeyDown(e, index)}
                                onFocus={(e) => e.target.select()}
                                data-quantity-input
                                className="w-24 px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                min="1"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <button
                                onClick={() => handleRemoveItem(item.product_id)}
                                className="text-red-600 hover:text-red-800"
                                title="Remove item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Add any additional notes..."
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleSaveOrder}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  {editingOrder ? 'Update Order' : 'Create Order'}
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Add New Product</h3>
              <button
                onClick={() => {
                  setShowAddProductModal(false);
                  setNewProduct({ name: '', min_stock_level: '10' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter product name"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Stock Level
                </label>
                <input
                  type="number"
                  value={newProduct.min_stock_level}
                  onChange={(e) => setNewProduct({ ...newProduct, min_stock_level: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter minimum stock level"
                  min="1"
                />
              </div>

              <p className="text-sm text-gray-600">
                This product will be created with 0 current stock and can be updated later from the Inventory page.
              </p>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleSaveNewProduct}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium"
                >
                  Add Product
                </button>
                <button
                  onClick={() => {
                    setShowAddProductModal(false);
                    setNewProduct({ name: '', min_stock_level: '10' });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        isOpen={deleteDialog.isOpen}
        title="Confirm Deletion"
        message={`Are you sure you want to delete order ${deleteDialog.orderNumber}? This action cannot be undone.`}
        type="confirm"
        onClose={() => setDeleteDialog({ isOpen: false, orderId: null, orderNumber: '' })}
        onConfirm={handleDeleteOrder}
        confirmText="Delete Order"
      />

      <AlertDialog
        isOpen={infoDialog.isOpen}
        title={infoDialog.title}
        message={infoDialog.message}
        type={infoDialog.type}
        onClose={() => setInfoDialog({ isOpen: false, title: '', message: '', type: 'info' })}
      />
    </div>
  );
}