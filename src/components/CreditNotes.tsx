import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, FileText, Download, Eye, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { supabase } from '../lib/supabase';
import { CreditNote, CreditNoteItem, Product, RETURN_REASONS, ReturnReasonCode } from '../types';
import { formatKES } from '../utils/currency';
import { getErrorMessage } from '../utils/errorMessages';
import AutocompleteInput from './AutocompleteInput';
import { useApp } from '../contexts/AppContext';
import { usePagination } from '../hooks/usePagination';
import Pagination from './Pagination';
import { useAutoRefresh } from '../contexts/DataRefreshContext';

const CreditNotes: React.FC = () => {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { suppliers, products, refreshData, logActivity } = useApp();
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCreditNote, setSelectedCreditNote] = useState<CreditNote | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [creditNoteData, setCreditNoteData] = useState({
    invoiceNumber: '',
    supplier: '',
    returnDate: new Date().toISOString().split('T')[0],
  });

  const [creditNoteItems, setCreditNoteItems] = useState<CreditNoteItem[]>([]);
  const [currentItem, setCurrentItem] = useState({
    productId: '',
    productName: '',
    batchNumber: '',
    quantity: '',
    costPrice: '',
    reason: '',
  });

  const [returnReasonCode, setReturnReasonCode] = useState<ReturnReasonCode>('other');
  const [customReason, setCustomReason] = useState('');

  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);

  const loadCreditNotesCallback = useCallback(() => {
    if (user) {
      loadCreditNotes();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadCreditNotes();
    }
  }, [user]);

  useAutoRefresh('credit_notes', loadCreditNotesCallback);

  const loadCreditNotes = async () => {
    setLoading(true);
    try {
      if (!supabase) return;

      const { data: creditNotesData, error: creditNotesError } = await supabase
        .from('credit_notes')
        .select('*')
        .order('return_date', { ascending: false });

      if (creditNotesError) throw creditNotesError;

      const creditNotesWithItems = await Promise.all(
        (creditNotesData || []).map(async (creditNote) => {
          const { data: items } = await supabase
            .from('credit_note_items')
            .select('*')
            .eq('credit_note_id', creditNote.id);

          return {
            ...creditNote,
            id: creditNote.id,
            creditNoteNumber: creditNote.credit_note_number,
            invoiceId: creditNote.invoice_id,
            invoiceNumber: creditNote.invoice_number,
            supplier: creditNote.supplier,
            returnDate: new Date(creditNote.return_date),
            totalAmount: parseFloat(creditNote.total_amount),
            reason: creditNote.reason,
            userId: creditNote.user_id,
            userName: creditNote.user_name,
            items: (items || []).map((item: any) => ({
              id: item.id,
              productId: item.product_id,
              productName: item.product_name,
              batchNumber: item.batch_number,
              quantity: item.quantity,
              costPrice: parseFloat(item.cost_price),
              totalCredit: parseFloat(item.total_credit),
              reason: item.reason,
            })),
            createdAt: new Date(creditNote.created_at),
            updatedAt: new Date(creditNote.updated_at),
          };
        })
      );

      setCreditNotes(creditNotesWithItems);
    } catch (error) {
      console.error('Error loading credit notes:', error);
      showAlert({ title: 'Credit Notes', message: 'Failed to load credit notes', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (productName: string) => {
    const product = products.find(p => p.name === productName);
    if (product) {
      setCurrentItem({
        ...currentItem,
        productId: product.id,
        productName: product.name,
        batchNumber: product.batchNumber,
        costPrice: product.costPrice.toString(),
      });
    }
  };

  const addItemToCreditNote = () => {
    if (!currentItem.productId || !currentItem.quantity || !currentItem.costPrice) {
      showAlert({ title: 'Credit Notes', message: 'Please fill in all required fields for the item', type: 'error' });
      return;
    }

    if (returnReasonCode === 'other' && !customReason.trim()) {
      showAlert({ title: 'Credit Notes', message: 'Please specify a custom reason', type: 'error' });
      return;
    }

    const quantity = parseInt(currentItem.quantity);
    const costPrice = parseFloat(currentItem.costPrice);
    const totalCredit = quantity * costPrice;

    const finalReason = returnReasonCode === 'other' ? customReason : RETURN_REASONS[returnReasonCode];

    const newItem: CreditNoteItem = {
      productId: currentItem.productId,
      productName: currentItem.productName,
      batchNumber: currentItem.batchNumber,
      quantity,
      costPrice,
      totalCredit,
      reason: finalReason,
    };

    setCreditNoteItems([...creditNoteItems, newItem]);

    setCurrentItem({
      productId: '',
      productName: '',
      batchNumber: '',
      quantity: '',
      costPrice: '',
      reason: '',
    });
    setReturnReasonCode('other');
    setCustomReason('');
  };

  const removeItemFromCreditNote = (index: number) => {
    setCreditNoteItems(creditNoteItems.filter((_, i) => i !== index));
  };

  const saveCreditNote = async () => {
    if (!creditNoteData.invoiceNumber || !creditNoteData.supplier) {
      showAlert({ title: 'Credit Notes', message: 'Please fill in all required fields', type: 'error' });
      return;
    }

    if (creditNoteItems.length === 0) {
      showAlert({ title: 'Credit Notes', message: 'Please add at least one item to the credit note', type: 'error' });
      return;
    }

    if (!user || !supabase) return;

    setLoading(true);
    try {
      const totalAmount = creditNoteItems.reduce((sum, item) => sum + item.totalCredit, 0);
      const autoGeneratedNumber = `CN-${Date.now()}`;
      const mainReason = creditNoteItems.map(item => item.reason).filter(Boolean).join(', ') || 'Return';
      const reasonCode = creditNoteItems.length > 0 ? returnReasonCode : 'other';

      const { data: creditNote, error: creditNoteError } = await supabase
        .from('credit_notes')
        .insert({
          credit_note_number: autoGeneratedNumber,
          invoice_number: creditNoteData.invoiceNumber,
          supplier: creditNoteData.supplier,
          return_date: creditNoteData.returnDate,
          total_amount: totalAmount,
          reason: mainReason,
          return_reason_code: reasonCode,
          user_id: user.user_id,
          user_name: user.name,
        })
        .select()
        .single();

      if (creditNoteError) throw creditNoteError;

      for (const item of creditNoteItems) {
        const { data: product } = await supabase
          .from('products')
          .select('*')
          .eq('id', item.productId)
          .single();

        if (product) {
          const newStock = product.current_stock - item.quantity;
          if (newStock < 0) {
            throw new Error(`Insufficient stock for ${item.productName}. Available: ${product.current_stock}, Returning: ${item.quantity}`);
          }

          const { error: updateError } = await supabase
            .from('products')
            .update({
              current_stock: newStock,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.productId);

          if (updateError) throw updateError;
        }

        const { error: itemError } = await supabase
          .from('credit_note_items')
          .insert({
            credit_note_id: creditNote.id,
            product_id: item.productId,
            product_name: item.productName,
            batch_number: item.batchNumber,
            quantity: item.quantity,
            cost_price: item.costPrice,
            total_credit: item.totalCredit,
            reason: item.reason,
          });

        if (itemError) throw itemError;
      }

      setLoading(false);
      await loadCreditNotes();
      await refreshData();

      // Log activity
      await logActivity(
        'CREDIT_NOTE_CREATED',
        `Created credit note ${autoGeneratedNumber} for supplier ${creditNoteData.supplier} - Total: ${formatKES(totalAmount)}`
      );

      resetForm();
      setShowAddForm(false);
      showAlert({ title: 'Credit Notes', message: 'Credit note saved successfully!', type: 'success' });
    } catch (error: any) {
      console.error('Error saving credit note:', error);
      showAlert({ title: 'Credit Notes', message: getErrorMessage(error), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCreditNoteData({
      invoiceNumber: '',
      supplier: '',
      returnDate: new Date().toISOString().split('T')[0],
    });
    setCreditNoteItems([]);
    setCurrentItem({
      productId: '',
      productName: '',
      batchNumber: '',
      quantity: '',
      costPrice: '',
      reason: '',
    });
    setIsEditing(false);
    setSelectedCreditNote(null);
  };

  const viewCreditNote = (creditNote: CreditNote) => {
    setSelectedCreditNote(creditNote);
    setShowViewModal(true);
  };


  const exportCreditNotesToPDF = () => {
    try {
      if (filteredCreditNotes.length === 0) {
        showAlert({ title: 'Credit Notes', message: 'No credit notes to export', type: 'warning' });
        return;
      }

      const content = `<!DOCTYPE html>
<html>
<head>
  <title>Credit Notes Report - ${new Date().toLocaleDateString('en-KE')}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px 6px; text-align: left; border: 1px solid #333; font-size: 12px; }
    th { background-color: #f0f0f0; font-weight: bold; }
    h1 { color: #333; text-align: center; margin-bottom: 30px; }
    .summary { margin-bottom: 20px; }
    @media print { body { margin: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>WESABI PHARMACY - CREDIT NOTES REPORT</h1>
  <div class="summary">
    <p><strong>Generated:</strong> ${new Date().toLocaleDateString('en-KE')} at ${new Date().toLocaleTimeString('en-KE')}</p>
    <p><strong>Total Credit Notes:</strong> ${filteredCreditNotes.length}</p>
    <p><strong>Total Credit Amount:</strong> ${formatKES(filteredCreditNotes.reduce((sum, cn) => sum + cn.totalAmount, 0))}</p>
  </div>

  <table>
    <tr>
      <th>Credit Note #</th>
      <th>Invoice #</th>
      <th>Supplier</th>
      <th>Return Date</th>
      <th>Items</th>
      <th>Total Credit</th>
    </tr>
    ${filteredCreditNotes.map(cn => `
    <tr>
      <td>${cn.creditNoteNumber}</td>
      <td>${cn.invoiceNumber}</td>
      <td>${cn.supplier}</td>
      <td>${cn.returnDate.toLocaleDateString('en-KE')}</td>
      <td>${cn.items.length} items</td>
      <td>${formatKES(cn.totalAmount)}</td>
    </tr>
    `).join('')}
  </table>
</body>
</html>`;

      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(content);
        printWindow.document.close();
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
      } else {
        showAlert({ title: 'Credit Notes', message: 'Please allow popups to export PDF reports', type: 'warning' });
      }
    } catch (error) {
      console.error('Error exporting credit notes:', error);
      showAlert({ title: 'Credit Notes', message: 'Error generating PDF report. Please try again.', type: 'error' });
    }
  };

  const exportSingleCreditNote = (creditNote: CreditNote) => {
    try {
      const content = `<!DOCTYPE html>
<html>
<head>
  <title>Credit Note ${creditNote.creditNoteNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px 6px; text-align: left; border: 1px solid #333; font-size: 12px; }
    th { background-color: #f0f0f0; font-weight: bold; }
    h1 { color: #333; text-align: center; margin-bottom: 30px; }
    .info { margin-bottom: 20px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
    .info-item { padding: 8px; background: #f9f9f9; }
    .info-label { font-weight: bold; font-size: 12px; color: #666; }
    .info-value { font-size: 14px; color: #333; margin-top: 4px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>WESABI PHARMACY - CREDIT NOTE</h1>
  <div class="info-grid">
    <div class="info-item">
      <div class="info-label">Credit Note #</div>
      <div class="info-value">${creditNote.creditNoteNumber}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Invoice #</div>
      <div class="info-value">${creditNote.invoiceNumber}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Supplier</div>
      <div class="info-value">${creditNote.supplier}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Return Date</div>
      <div class="info-value">${creditNote.returnDate.toLocaleDateString('en-KE')}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Created By</div>
      <div class="info-value">${creditNote.userName}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Total Credit</div>
      <div class="info-value" style="color: #dc2626; font-weight: bold;">${formatKES(creditNote.totalAmount)}</div>
    </div>
  </div>

  <h3>Items Returned</h3>
  <table>
    <tr>
      <th>Product</th>
      <th>Batch</th>
      <th>Quantity</th>
      <th>Cost Price</th>
      <th>Total Credit</th>
      <th>Reason</th>
    </tr>
    ${creditNote.items.map(item => `
    <tr>
      <td>${item.productName}</td>
      <td>${item.batchNumber}</td>
      <td>${item.quantity}</td>
      <td>${formatKES(item.costPrice)}</td>
      <td style="font-weight: bold; color: #dc2626;">${formatKES(item.totalCredit)}</td>
      <td>${item.reason || '-'}</td>
    </tr>
    `).join('')}
    <tr style="background: #f9f9f9; font-weight: bold;">
      <td colspan="4" style="text-align: right;">Total:</td>
      <td style="color: #dc2626;">${formatKES(creditNote.totalAmount)}</td>
      <td></td>
    </tr>
  </table>
</body>
</html>`;

      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(content);
        printWindow.document.close();
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
      } else {
        showAlert({ title: 'Credit Notes', message: 'Please allow popups to export PDF reports', type: 'warning' });
      }
    } catch (error) {
      console.error('Error exporting credit note:', error);
      showAlert({ title: 'Credit Notes', message: 'Error generating PDF report. Please try again.', type: 'error' });
    }
  };

  const getCreditNoteShareText = (creditNote: CreditNote): string => {
    let text = `WESABI PHARMACY - CREDIT NOTE\n\n`;
    text += `Credit Note #: ${creditNote.creditNoteNumber}\n`;
    text += `Invoice #: ${creditNote.invoiceNumber}\n`;
    text += `Supplier: ${creditNote.supplier}\n`;
    text += `Return Date: ${creditNote.returnDate.toLocaleDateString('en-KE')}\n`;
    text += `Created By: ${creditNote.userName}\n\n`;
    text += `Items Returned:\n`;
    creditNote.items.forEach((item, index) => {
      text += `${index + 1}. ${item.productName}\n`;
      text += `   Batch: ${item.batchNumber}, Qty: ${item.quantity}\n`;
      text += `   Cost: ${formatKES(item.costPrice)}, Credit: ${formatKES(item.totalCredit)}\n`;
      text += `   Reason: ${item.reason || '-'}\n`;
    });
    text += `\nTotal Credit Amount: ${formatKES(creditNote.totalAmount)}`;
    return text;
  };

  const filteredCreditNotes = creditNotes.filter(creditNote =>
    creditNote.creditNoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    creditNote.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    creditNote.supplier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedCreditNotes = [...filteredCreditNotes].sort((a, b) => {
    const dateA = new Date(a.returnDate).getTime();
    const dateB = new Date(b.returnDate).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  const {
    currentPage,
    paginatedItems,
    goToPage,
    itemsPerPage
  } = usePagination({ items: sortedCreditNotes, itemsPerPage: 20 });

  const productNames = products.map(p => p.name);

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center">
        <div className="flex space-x-2">
          <button
            onClick={exportCreditNotesToPDF}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Plus className="h-4 w-4" />
            <span>New Credit Note</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search credit notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit Note #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                  onClick={toggleSortOrder}
                >
                  <div className="flex items-center space-x-1">
                    <span>Return Date</span>
                    {sortOrder === 'desc' ? (
                      <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUp className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Credit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedItems.map((creditNote) => (
                <tr key={creditNote.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 text-red-400 mr-2" />
                      <span className="font-medium">{creditNote.creditNoteNumber}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{creditNote.invoiceNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{creditNote.supplier}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{creditNote.returnDate.toLocaleDateString('en-KE')}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{creditNote.items.length} items</td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-red-600">{formatKES(creditNote.totalAmount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => viewCreditNote(creditNote)}
                        className="text-blue-600 hover:text-blue-800"
                        title="View Credit Note"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCreditNotes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No credit notes found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={sortedCreditNotes.length}
          itemsPerPage={itemsPerPage}
          onPageChange={goToPage}
          itemName="credit notes"
        />
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto relative" style={{ zIndex: 10000 }}>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Create Credit Note</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Original Invoice Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={creditNoteData.invoiceNumber}
                    onChange={(e) => setCreditNoteData({ ...creditNoteData, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <AutocompleteInput
                  value={creditNoteData.supplier}
                  onChange={(value) => setCreditNoteData({ ...creditNoteData, supplier: value })}
                  options={suppliers}
                  placeholder="Select supplier"
                  label="Supplier"
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Return Date</label>
                  <input
                    type="date"
                    value={creditNoteData.returnDate}
                    onChange={(e) => setCreditNoteData({ ...creditNoteData, returnDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="border-t pt-4 mb-4">
                <h4 className="font-semibold mb-3">Add Items to Return</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <AutocompleteInput
                    value={currentItem.productName}
                    onChange={handleProductSelect}
                    options={productNames}
                    placeholder="Select product"
                    label="Product"
                    required
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
                    <input
                      type="text"
                      value={currentItem.batchNumber}
                      onChange={(e) => setCurrentItem({ ...currentItem, batchNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (KES)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentItem.costPrice}
                      onChange={(e) => setCurrentItem({ ...currentItem, costPrice: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Return Reason <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={returnReasonCode}
                      onChange={(e) => setReturnReasonCode(e.target.value as ReturnReasonCode)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      {(Object.keys(RETURN_REASONS) as ReturnReasonCode[]).map((code) => (
                        <option key={code} value={code}>
                          {RETURN_REASONS[code]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {returnReasonCode === 'other' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Custom Reason <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        placeholder="Specify reason"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  )}

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={addItemToCreditNote}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add Item
                    </button>
                  </div>
                </div>
              </div>

              {creditNoteItems.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">Items to Return ({creditNoteItems.length})</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Batch</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Cost</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Total Credit</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Reason</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {creditNoteItems.map((item, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm">{item.productName}</td>
                            <td className="px-3 py-2 text-sm">{item.batchNumber}</td>
                            <td className="px-3 py-2 text-sm">{item.quantity}</td>
                            <td className="px-3 py-2 text-sm">{formatKES(item.costPrice)}</td>
                            <td className="px-3 py-2 text-sm font-medium text-red-600">{formatKES(item.totalCredit)}</td>
                            <td className="px-3 py-2 text-sm">{item.reason || '-'}</td>
                            <td className="px-3 py-2 text-sm">
                              <button
                                onClick={() => removeItemFromCreditNote(index)}
                                className="text-red-600 hover:text-red-800"
                                title="Remove item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-semibold">
                          <td colSpan={4} className="px-3 py-2 text-right">Total Credit:</td>
                          <td className="px-3 py-2 text-red-600">
                            {formatKES(creditNoteItems.reduce((sum, item) => sum + item.totalCredit, 0))}
                          </td>
                          <td colSpan={2}></td>
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
                  onClick={saveCreditNote}
                  disabled={loading || creditNoteItems.length === 0}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Credit Note'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Credit Note Modal */}
      {showViewModal && selectedCreditNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Credit Note Details</h3>

              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Credit Note Number</p>
                  <p className="font-semibold">{selectedCreditNote.creditNoteNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Invoice Number</p>
                  <p className="font-semibold">{selectedCreditNote.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Supplier</p>
                  <p className="font-semibold">{selectedCreditNote.supplier}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Return Date</p>
                  <p className="font-semibold">{selectedCreditNote.returnDate.toLocaleDateString('en-KE')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Credit</p>
                  <p className="font-semibold text-red-600">{formatKES(selectedCreditNote.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created By</p>
                  <p className="font-semibold">{selectedCreditNote.userName}</p>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-semibold mb-2">Items Returned</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Batch</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Cost</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Total Credit</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedCreditNote.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 text-sm">{item.productName}</td>
                          <td className="px-3 py-2 text-sm">{item.batchNumber}</td>
                          <td className="px-3 py-2 text-sm">{item.quantity}</td>
                          <td className="px-3 py-2 text-sm">{formatKES(item.costPrice)}</td>
                          <td className="px-3 py-2 text-sm font-medium text-red-600">{formatKES(item.totalCredit)}</td>
                          <td className="px-3 py-2 text-sm">{item.reason || '-'}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-semibold">
                        <td colSpan={4} className="px-3 py-2 text-right">Total:</td>
                        <td className="px-3 py-2 text-red-600">{formatKES(selectedCreditNote.totalAmount)}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedCreditNote(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
                <button
                  onClick={() => exportSingleCreditNote(selectedCreditNote)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Download className="h-4 w-4" />
                  <span>Export PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditNotes;
