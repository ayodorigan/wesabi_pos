import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CreditNote, CreditNoteItem, Product } from '../types';
import { formatKES } from '../utils/currency';
import AutocompleteInput from './AutocompleteInput';
import { useApp } from '../contexts/AppContext';

const CreditNotes: React.FC = () => {
  const { user } = useAuth();
  const { suppliers, products, refreshData } = useApp();
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

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

  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);

  useEffect(() => {
    loadCreditNotes();
  }, []);

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
      alert('Failed to load credit notes');
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
    if (!currentItem.productId || !currentItem.quantity || !currentItem.costPrice || !currentItem.reason) {
      alert('Please fill in all required fields for the item including the reason');
      return;
    }

    const quantity = parseInt(currentItem.quantity);
    const costPrice = parseFloat(currentItem.costPrice);
    const totalCredit = quantity * costPrice;

    const newItem: CreditNoteItem = {
      productId: currentItem.productId,
      productName: currentItem.productName,
      batchNumber: currentItem.batchNumber,
      quantity,
      costPrice,
      totalCredit,
      reason: currentItem.reason,
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
  };

  const removeItemFromCreditNote = (index: number) => {
    setCreditNoteItems(creditNoteItems.filter((_, i) => i !== index));
  };

  const saveCreditNote = async () => {
    if (!creditNoteData.invoiceNumber || !creditNoteData.supplier) {
      alert('Please fill in all required fields');
      return;
    }

    if (creditNoteItems.length === 0) {
      alert('Please add at least one item to the credit note');
      return;
    }

    if (!user || !supabase) return;

    setLoading(true);
    try {
      const totalAmount = creditNoteItems.reduce((sum, item) => sum + item.totalCredit, 0);
      const autoGeneratedNumber = `CN-${Date.now()}`;
      const mainReason = creditNoteItems.map(item => item.reason).filter(Boolean).join(', ') || 'Return';

      const { data: creditNote, error: creditNoteError } = await supabase
        .from('credit_notes')
        .insert({
          credit_note_number: autoGeneratedNumber,
          invoice_number: creditNoteData.invoiceNumber,
          supplier: creditNoteData.supplier,
          return_date: creditNoteData.returnDate,
          total_amount: totalAmount,
          reason: mainReason,
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

      await loadCreditNotes();
      await refreshData();
      setShowAddForm(false);
      resetForm();
      alert('Credit note saved successfully!');
    } catch (error: any) {
      console.error('Error saving credit note:', error);
      alert(`Failed to save credit note: ${error.message}`);
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
  };

  const filteredCreditNotes = creditNotes.filter(creditNote =>
    creditNote.creditNoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    creditNote.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    creditNote.supplier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const productNames = products.map(p => p.name);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Credit Notes</h1>
          <p className="text-gray-600">Manage drug returns and credit notes</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <Plus className="h-4 w-4" />
          <span>New Credit Note</span>
        </button>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Credit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCreditNotes.map((creditNote) => (
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
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{creditNote.reason}</td>
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
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
                      Reason <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={currentItem.reason}
                      onChange={(e) => setCurrentItem({ ...currentItem, reason: e.target.value })}
                      placeholder="e.g., Damaged, Expired"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

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
    </div>
  );
};

export default CreditNotes;
