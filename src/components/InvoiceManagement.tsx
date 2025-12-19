import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, FileText, Eye, Package, Upload, ArrowUp, ArrowDown, RotateCcw, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { supabase } from '../lib/supabase';
import { Invoice, InvoiceItem } from '../types';
import { formatKES, calculateSellingPrice, calculateNetCost } from '../utils/currency';
import { getErrorMessage } from '../utils/errorMessages';
import AutocompleteInput from './AutocompleteInput';
import VATRateInput from './VATRateInput';
import { useApp } from '../contexts/AppContext';
import { usePagination } from '../hooks/usePagination';
import Pagination from './Pagination';
import { useAutoRefresh } from '../contexts/DataRefreshContext';
import { usePricing } from '../hooks/usePricing';
import { calculateProductPricing } from '../utils/pricing';

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
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: '',
    supplier: '',
    invoiceDate: new Date().toISOString().split('T')[0],
  });

  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [savingProgress, setSavingProgress] = useState<{ current: number; total: number; message: string } | null>(null);
  const [currentItem, setCurrentItem] = useState({
    productName: '',
    category: '',
    batchNumber: '',
    expiryDate: '',
    quantity: '',
    costPrice: '',
    supplierDiscountPercent: '0',
    vatRate: '16',
    discountedCostPrice: '',
    sellingPrice: '',
    discountedSellingPrice: '',
    vat: '',
    grossProfitMargin: '',
    barcode: '',
  });

  const medicineNames = medicineTemplates.map(med => med.name);

  const loadInvoicesCallback = useCallback(() => {
    loadInvoices();
  }, [user]);

  useEffect(() => {
    loadInvoices();
  }, [user]);

  useAutoRefresh('invoices', loadInvoicesCallback);

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
              costPrice: parseFloat(item.cost_price) || 0,
              discountedCostPrice: item.discounted_cost_price ? parseFloat(item.discounted_cost_price) : undefined,
              sellingPrice: parseFloat(item.selling_price) || 0,
              discountedSellingPrice: item.discounted_selling_price ? parseFloat(item.discounted_selling_price) : undefined,
              vat: item.vat ? parseFloat(item.vat) : undefined,
              grossProfitMargin: item.gross_profit_margin ? parseFloat(item.gross_profit_margin) : undefined,
              supplierDiscountPercent: item.supplier_discount_percent ? parseFloat(item.supplier_discount_percent) : undefined,
              vatRate: item.vat_rate ? parseFloat(item.vat_rate) : undefined,
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

  const handlePricingChange = (field: string, value: string) => {
    setCurrentItem((prev: any) => {
      const updated = { ...prev, [field]: value };

      const costPrice = parseFloat(updated.costPrice) || 0;
      const supplierDiscountPercent = parseFloat(updated.supplierDiscountPercent) || 0;
      const vatRate = parseFloat(updated.vatRate) || 16;

      if (costPrice > 0) {
        const discountedCostPrice = supplierDiscountPercent > 0
          ? costPrice * (1 - supplierDiscountPercent / 100)
          : costPrice;

        const MARKUP_MULTIPLIER = 1.33;
        const sellingPriceBeforeVAT = discountedCostPrice * MARKUP_MULTIPLIER;

        const roundUpToNearest5Or10 = (price: number) => {
          const ones = price % 10;
          if (ones <= 5) {
            return Math.ceil(price / 5) * 5;
          } else {
            return Math.ceil(price / 10) * 10;
          }
        };

        const sellingPrice = roundUpToNearest5Or10(sellingPriceBeforeVAT);
        const discountedSellingPrice = sellingPrice;
        const vat = vatRate > 0 ? (discountedSellingPrice * vatRate / 100) : 0;
        const grossProfitMargin = discountedCostPrice > 0
          ? ((discountedSellingPrice - discountedCostPrice) / discountedCostPrice * 100)
          : 0;

        return {
          ...updated,
          discountedCostPrice: discountedCostPrice.toFixed(2),
          sellingPrice: sellingPrice.toFixed(2),
          discountedSellingPrice: discountedSellingPrice.toFixed(2),
          vat: vat.toFixed(2),
          grossProfitMargin: grossProfitMargin.toFixed(2)
        };
      }

      return updated;
    });
  };

  const addItemToInvoice = () => {
    if (!currentItem.productName || !currentItem.quantity) {
      showAlert({ title: 'Invoice Management', message: 'Please fill in product name and quantity', type: 'error' });
      return;
    }

    if (!currentItem.costPrice) {
      showAlert({ title: 'Invoice Management', message: 'Please fill in Cost Price', type: 'error' });
      return;
    }

    const quantity = parseInt(currentItem.quantity);
    const costPrice = parseFloat(currentItem.costPrice);
    const discountedCostPrice = parseFloat(currentItem.discountedCostPrice) || costPrice;
    const sellingPrice = parseFloat(currentItem.sellingPrice);
    const discountedSellingPrice = parseFloat(currentItem.discountedSellingPrice) || sellingPrice;
    const totalCost = quantity * discountedCostPrice;

    const newItem: InvoiceItem = {
      productName: currentItem.productName,
      category: currentItem.category || 'General',
      batchNumber: currentItem.batchNumber || '',
      expiryDate: currentItem.expiryDate ? new Date(currentItem.expiryDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      quantity,
      costPrice,
      discountedCostPrice: currentItem.discountedCostPrice ? parseFloat(currentItem.discountedCostPrice) : undefined,
      sellingPrice,
      discountedSellingPrice: currentItem.discountedSellingPrice ? parseFloat(currentItem.discountedSellingPrice) : undefined,
      vat: currentItem.vat ? parseFloat(currentItem.vat) : undefined,
      grossProfitMargin: currentItem.grossProfitMargin ? parseFloat(currentItem.grossProfitMargin) : undefined,
      supplierDiscountPercent: parseFloat(currentItem.supplierDiscountPercent) || undefined,
      vatRate: parseFloat(currentItem.vatRate) || undefined,
      totalCost,
      barcode: currentItem.barcode || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    setInvoiceItems([newItem, ...invoiceItems]);

    setCurrentItem({
      productName: '',
      category: '',
      batchNumber: '',
      expiryDate: '',
      quantity: '',
      costPrice: '',
      supplierDiscountPercent: '0',
      vatRate: '16',
      discountedCostPrice: '',
      sellingPrice: '',
      discountedSellingPrice: '',
      vat: '',
      grossProfitMargin: '',
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
    setSavingProgress({ current: 0, total: invoiceItems.length + 2, message: 'Creating invoice...' });

    let invoiceId: string | null = null;
    const processedProducts: Array<{ id: string; originalStock: number }> = [];

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
      invoiceId = invoice.id;

      setSavingProgress({ current: 1, total: invoiceItems.length + 2, message: 'Processing products...' });

      const invoiceItemsToInsert: Array<any> = [];
      let processedCount = 0;

      for (const item of invoiceItems) {
        processedCount++;
        setSavingProgress({
          current: processedCount + 1,
          total: invoiceItems.length + 2,
          message: `Processing ${item.productName} (${processedCount}/${invoiceItems.length})...`
        });

        const { data: existingProduct } = await supabase
          .from('products')
          .select('*')
          .eq('name', item.productName)
          .eq('batch_number', item.batchNumber)
          .maybeSingle();

        let productId = existingProduct?.id;

        if (existingProduct) {
          processedProducts.push({
            id: existingProduct.id,
            originalStock: existingProduct.current_stock
          });

          const updateData: any = {
            current_stock: existingProduct.current_stock + item.quantity,
            cost_price: item.costPrice,
            discounted_cost_price: item.discountedCostPrice,
            selling_price: item.sellingPrice,
            discounted_selling_price: item.discountedSellingPrice,
            vat: item.vat,
            gross_profit_margin: item.grossProfitMargin,
            supplier_discount_percent: item.supplierDiscountPercent,
            vat_rate: item.vatRate,
            has_vat: item.vatRate !== undefined && item.vatRate !== null && item.vatRate > 0,
            updated_at: new Date().toISOString(),
          };

          const { error: updateError } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', existingProduct.id);

          if (updateError) {
            console.error(`Error updating product ${item.productName}:`, updateError);
            throw new Error(`Failed to update product ${item.productName}: ${updateError.message}`);
          }
        } else {
          let expiryDateStr: string;
          try {
            const expiryDate = item.expiryDate instanceof Date ? item.expiryDate : new Date(item.expiryDate);
            if (isNaN(expiryDate.getTime())) {
              expiryDateStr = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            } else {
              expiryDateStr = expiryDate.toISOString().split('T')[0];
            }
          } catch (e) {
            expiryDateStr = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          }

          const insertData: any = {
            name: item.productName,
            category: item.category,
            supplier: invoiceData.supplier,
            batch_number: item.batchNumber,
            expiry_date: expiryDateStr,
            cost_price: item.costPrice,
            discounted_cost_price: item.discountedCostPrice,
            selling_price: item.sellingPrice,
            discounted_selling_price: item.discountedSellingPrice,
            vat: item.vat,
            gross_profit_margin: item.grossProfitMargin,
            supplier_discount_percent: item.supplierDiscountPercent,
            vat_rate: item.vatRate,
            has_vat: item.vatRate !== undefined && item.vatRate !== null && item.vatRate > 0,
            current_stock: item.quantity,
            min_stock_level: 10,
            barcode: item.barcode,
            invoice_number: invoiceData.invoiceNumber,
          };

          const { data: newProduct, error: productError } = await supabase
            .from('products')
            .insert(insertData)
            .select()
            .single();

          if (productError) {
            console.error(`Error creating product ${item.productName}:`, productError);
            throw new Error(`Failed to create product ${item.productName}: ${productError.message}`);
          }

          productId = newProduct.id;
          processedProducts.push({ id: newProduct.id, originalStock: 0 });
        }

        let invoiceItemExpiryDate: string;
        try {
          const expiryDate = item.expiryDate instanceof Date ? item.expiryDate : new Date(item.expiryDate);
          if (isNaN(expiryDate.getTime())) {
            invoiceItemExpiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          } else {
            invoiceItemExpiryDate = expiryDate.toISOString().split('T')[0];
          }
        } catch (e) {
          invoiceItemExpiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }

        const invoiceItemData: any = {
          invoice_id: invoiceId,
          product_id: productId,
          product_name: item.productName,
          category: item.category,
          batch_number: item.batchNumber,
          expiry_date: invoiceItemExpiryDate,
          quantity: item.quantity,
          cost_price: item.costPrice,
          discounted_cost_price: item.discountedCostPrice,
          selling_price: item.sellingPrice,
          discounted_selling_price: item.discountedSellingPrice,
          vat: item.vat,
          gross_profit_margin: item.grossProfitMargin,
          supplier_discount_percent: item.supplierDiscountPercent,
          vat_rate: item.vatRate,
          total_cost: item.totalCost,
          barcode: item.barcode,
        };

        invoiceItemsToInsert.push(invoiceItemData);
      }

      setSavingProgress({
        current: invoiceItems.length + 1,
        total: invoiceItems.length + 2,
        message: 'Saving invoice items...'
      });

      const { error: batchInsertError } = await supabase
        .from('invoice_items')
        .insert(invoiceItemsToInsert);

      if (batchInsertError) {
        console.error('Error batch inserting invoice items:', batchInsertError);
        throw new Error(`Failed to save invoice items: ${batchInsertError.message}`);
      }

      setSavingProgress({
        current: invoiceItems.length + 2,
        total: invoiceItems.length + 2,
        message: 'Finalizing...'
      });

      await refreshData();
      await loadInvoices();

      await logActivity(
        'INVOICE_CREATED',
        `Created invoice ${invoiceData.invoiceNumber} for supplier ${invoiceData.supplier} - Total: ${formatKES(totalAmount)}, Items: ${invoiceItems.length}`
      );

      resetForm();
      setShowAddForm(false);
      setSavingProgress(null);
      showAlert({ title: 'Invoice Management', message: 'Invoice saved successfully! Inventory updated.', type: 'success' });
    } catch (error: any) {
      console.error('Error saving invoice:', error);

      setSavingProgress({ current: 0, total: 1, message: 'Rolling back changes...' });

      if (invoiceId) {
        try {
          await supabase.from('invoices').delete().eq('id', invoiceId);
        } catch (cleanupError) {
          console.error('Error cleaning up invoice:', cleanupError);
        }
      }

      for (const product of processedProducts) {
        try {
          await supabase
            .from('products')
            .update({ current_stock: product.originalStock })
            .eq('id', product.id);
        } catch (rollbackError) {
          console.error('Error rolling back product stock:', rollbackError);
        }
      }

      setSavingProgress(null);
      showAlert({
        title: 'Invoice Management',
        message: getErrorMessage(error) || 'Failed to save invoice. Changes have been rolled back.',
        type: 'error'
      });
    } finally {
      setLoading(false);
      setSavingProgress(null);
    }
  };

  const createReversal = async (invoice: Invoice) => {
    showAlert({
      title: 'Create Invoice Reversal',
      message: `Create a reversal for invoice ${invoice.invoiceNumber}? This will remove the items from inventory and create an audit record.`,
      type: 'confirm',
      confirmText: 'Create Reversal',
      onConfirm: async () => {
        setLoading(true);
        try {
          if (!supabase || !user) return;

          const reversalNumber = `REV-${invoice.invoiceNumber}-${Date.now()}`;

          const { data: reversal, error: reversalError } = await supabase
            .from('invoice_reversals')
            .insert({
              original_invoice_id: invoice.id,
              reversal_number: reversalNumber,
              reversal_type: 'purchase',
              reversal_date: new Date().toISOString().split('T')[0],
              total_amount: invoice.totalAmount,
              reason: 'Invoice reversal',
              user_id: user.user_id,
              user_name: user.name,
            })
            .select()
            .single();

          if (reversalError) throw reversalError;

          for (const item of invoice.items) {
            const { data: product } = await supabase
              .from('products')
              .select('*')
              .eq('name', item.productName)
              .eq('batch_number', item.batchNumber)
              .maybeSingle();

            if (product) {
              const newStock = product.current_stock - item.quantity;
              if (newStock < 0) {
                throw new Error(`Insufficient stock for ${item.productName}. Available: ${product.current_stock}, Required: ${item.quantity}`);
              }

              const { error: updateError } = await supabase
                .from('products')
                .update({
                  current_stock: newStock,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', product.id);

              if (updateError) throw updateError;
            }

            const { error: itemError } = await supabase
              .from('invoice_reversal_items')
              .insert({
                reversal_id: reversal.id,
                original_invoice_item_id: item.id,
                product_name: item.productName,
                category: item.category,
                batch_number: item.batchNumber,
                expiry_date: item.expiryDate.toISOString().split('T')[0],
                quantity: item.quantity,
                invoice_price: item.invoicePrice,
                supplier_discount_percent: item.supplierDiscountPercent,
                vat_rate: item.vatRate,
                other_charges: item.otherCharges,
                cost_price: item.costPrice,
                selling_price: item.sellingPrice,
                total_cost: item.totalCost,
                barcode: item.barcode,
              });

            if (itemError) throw itemError;
          }

          await logActivity(
            'INVOICE_REVERSED',
            `Created reversal ${reversalNumber} for invoice ${invoice.invoiceNumber} - Total: ${formatKES(invoice.totalAmount)}`
          );

          await refreshData();
          await loadInvoices();
          showAlert({ title: 'Invoice Management', message: 'Invoice reversal created successfully! Inventory has been adjusted.', type: 'success' });
        } catch (error: any) {
          console.error('Error creating reversal:', error);
          showAlert({ title: 'Invoice Management', message: getErrorMessage(error), type: 'error' });
        } finally {
          setLoading(false);
        }
      }
    });
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

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, ''));

      const requiredHeaders = ['productname', 'category', 'batchnumber', 'expirydate', 'quantity'];
      const hasAllHeaders = requiredHeaders.every(h => headers.includes(h));

      if (!hasAllHeaders) {
        showAlert({ title: 'Invoice Management', message: 'CSV must have columns: ProductName, Category, BatchNumber, ExpiryDate, Quantity, and either InvoicePrice or CostPrice. Optional: InvoiceNumber, Supplier, InvoiceDate', type: 'error' });
        return;
      }

      const items: InvoiceItem[] = [];
      let extractedInvoiceNumber = '';
      let extractedSupplier = '';
      let extractedInvoiceDate = '';

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};

        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        if (!row.productname || !row.quantity) continue;
        if (!row.costprice) continue;

        if (i === 1) {
          extractedInvoiceNumber = row.invoicenumber || row.invoice_number || '';
          extractedSupplier = row.supplier || '';
          extractedInvoiceDate = row.invoicedate || row.invoice_date || '';
        }

        const costPrice = parseFloat(row.costprice) || 0;
        const supplierDiscountPercent = parseFloat(row.supplierdiscountpercent) || 0;
        const vatRate = parseFloat(row.vatrate) || 16;

        const discountedCostPrice = supplierDiscountPercent > 0
          ? costPrice * (1 - supplierDiscountPercent / 100)
          : costPrice;

        const MARKUP_MULTIPLIER = 1.33;
        const sellingPriceBeforeVAT = discountedCostPrice * MARKUP_MULTIPLIER;

        const roundUpToNearest5Or10 = (price: number) => {
          const ones = price % 10;
          if (ones <= 5) {
            return Math.ceil(price / 5) * 5;
          } else {
            return Math.ceil(price / 10) * 10;
          }
        };

        const sellingPrice = roundUpToNearest5Or10(sellingPriceBeforeVAT);
        const discountedSellingPrice = sellingPrice;
        const vat = vatRate > 0 ? (discountedSellingPrice * vatRate / 100) : 0;
        const grossProfitMargin = discountedCostPrice > 0
          ? ((discountedSellingPrice - discountedCostPrice) / discountedCostPrice * 100)
          : 0;

        items.push({
          productName: row.productname,
          category: row.category || 'General',
          batchNumber: row.batchnumber || '',
          expiryDate: row.expirydate ? new Date(row.expirydate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          quantity: parseInt(row.quantity) || 0,
          costPrice,
          discountedCostPrice,
          sellingPrice,
          discountedSellingPrice,
          vat,
          grossProfitMargin,
          supplierDiscountPercent: supplierDiscountPercent || undefined,
          vatRate: vatRate || undefined,
          totalCost: (parseInt(row.quantity) || 0) * discountedCostPrice,
          barcode: row.barcode || `${Date.now()}-${i}`,
        });
      }

      setInvoiceItems(items);

      if (extractedInvoiceNumber) {
        setInvoiceData(prev => ({
          ...prev,
          invoiceNumber: extractedInvoiceNumber
        }));
      }

      if (extractedSupplier) {
        setInvoiceData(prev => ({
          ...prev,
          supplier: extractedSupplier
        }));
      }

      if (extractedInvoiceDate) {
        try {
          const parsedDate = new Date(extractedInvoiceDate);
          if (!isNaN(parsedDate.getTime())) {
            setInvoiceData(prev => ({
              ...prev,
              invoiceDate: parsedDate.toISOString().split('T')[0]
            }));
          }
        } catch (err) {
          console.error('Invalid date format in CSV:', extractedInvoiceDate);
        }
      }

      const metadataInfo = [];
      if (extractedInvoiceNumber) metadataInfo.push(`Invoice #${extractedInvoiceNumber}`);
      if (extractedSupplier) metadataInfo.push(`Supplier: ${extractedSupplier}`);
      if (extractedInvoiceDate) metadataInfo.push(`Date: ${extractedInvoiceDate}`);

      const message = metadataInfo.length > 0
        ? `Imported ${items.length} items. Auto-filled: ${metadataInfo.join(', ')}`
        : `Imported ${items.length} items from CSV`;

      showAlert({ title: 'Invoice Management', message, type: 'success' });
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
      invoicePrice: '',
      supplierDiscountPercent: '0',
      vatRate: '0',
      otherCharges: '0',
      costPrice: '',
      sellingPrice: '',
      barcode: '',
      discountedCost: '',
      discountedPrice: '',
      targetPrice: '',
    });
  };

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.supplier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    const dateA = new Date(a.invoiceDate).getTime();
    const dateB = new Date(b.invoiceDate).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  const {
    currentPage,
    paginatedItems: paginatedInvoices,
    goToPage,
    itemsPerPage
  } = usePagination({ items: sortedInvoices, itemsPerPage: 15 });

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center">
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Added By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedInvoices.map((invoice) => (
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
                        title="View Invoice"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {canDeleteProducts() && (
                        <button
                          onClick={() => createReversal(invoice)}
                          className="text-orange-600 hover:text-orange-800"
                          title="Create Reversal"
                        >
                          <RotateCcw className="h-4 w-4" />
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

          <Pagination
            currentPage={currentPage}
            totalItems={sortedInvoices.length}
            itemsPerPage={itemsPerPage}
            onPageChange={goToPage}
            itemName="invoices"
          />
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
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Batch</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Cost Price</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Disc %</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Final Cost</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Selling Price</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">VAT</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Profit %</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedInvoice.items.map((item, index) => {
                        const discountedCost = item.discountedCostPrice || item.costPrice;
                        const profitMargin = item.grossProfitMargin || 0;

                        return (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm">{item.productName}</td>
                            <td className="px-3 py-2 text-sm">{item.batchNumber}</td>
                            <td className="px-3 py-2 text-sm">{item.quantity}</td>
                            <td className="px-3 py-2 text-sm">{formatKES(item.costPrice)}</td>
                            <td className="px-3 py-2 text-sm">
                              {item.supplierDiscountPercent || '0'}%
                              {item.supplierDiscountPercent && item.supplierDiscountPercent > 0 && (
                                <span className="ml-1 text-green-600 font-semibold">✓</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-sm font-medium">
                              {formatKES(discountedCost)}
                              {item.discountedCostPrice && item.discountedCostPrice < item.costPrice && (
                                <div className="text-xs text-gray-500 line-through">
                                  {formatKES(item.costPrice)}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-sm font-medium text-green-600">
                              {formatKES(item.sellingPrice)}
                            </td>
                            <td className="px-3 py-2 text-sm">
                              {item.vat ? formatKES(item.vat) : '-'}
                            </td>
                            <td className="px-3 py-2 text-sm">
                              <span className={`font-semibold ${profitMargin >= 25 ? 'text-green-600' : 'text-yellow-600'}`}>
                                {profitMargin.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm font-medium">{formatKES(item.totalCost)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Summary Section for View Modal */}
                <div className="bg-blue-50 border-t-2 border-blue-200 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 uppercase">Total Investment</p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatKES(selectedInvoice.items.reduce((sum, item) => sum + item.totalCost, 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase">Expected Revenue</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatKES(selectedInvoice.items.reduce((sum, item) => {
                          const typedItem = item as any;
                          const targetPrice = typedItem.targetPrice || item.sellingPrice;
                          return sum + (targetPrice * item.quantity);
                        }, 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase">Expected Profit</p>
                      <p className="text-lg font-bold text-blue-600">
                        {formatKES(selectedInvoice.items.reduce((sum, item) => {
                          const typedItem = item as any;
                          const targetPrice = typedItem.targetPrice || item.sellingPrice;
                          const actualCost = typedItem.discountedCost || item.costPrice;
                          return sum + ((targetPrice - actualCost) * item.quantity);
                        }, 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase">Avg Margin</p>
                      <p className="text-lg font-bold text-purple-600">
                        {(() => {
                          const totalRevenue = selectedInvoice.items.reduce((sum, item) => {
                            const typedItem = item as any;
                            const targetPrice = typedItem.targetPrice || item.sellingPrice;
                            return sum + (targetPrice * item.quantity);
                          }, 0);
                          const totalActualCost = selectedInvoice.items.reduce((sum, item) => {
                            const typedItem = item as any;
                            const actualCost = typedItem.discountedCost || item.costPrice;
                            return sum + (actualCost * item.quantity);
                          }, 0);
                          const margin = totalActualCost > 0 ? ((totalRevenue - totalActualCost) / totalActualCost * 100) : 0;
                          return `${margin.toFixed(1)}%`;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
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
                  CSV format: InvoiceNumber, Supplier, InvoiceDate, ProductName, Category, BatchNumber, ExpiryDate, Quantity, InvoicePrice (or CostPrice), SupplierDiscountPercent, VATRate, OtherCharges. Metadata auto-filled from first row.
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
                    <p className="text-xs text-gray-500 mb-1">Original price paid to supplier before discount</p>
                    <input
                      type="number"
                      step="0.01"
                      value={currentItem.costPrice}
                      onChange={(e) => handlePricingChange('costPrice', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Enter supplier price"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Discount %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentItem.supplierDiscountPercent}
                      onChange={(e) => handlePricingChange('supplierDiscountPercent', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="0"
                    />
                  </div>

                  <VATRateInput
                    value={currentItem.vatRate}
                    onChange={(value) => handlePricingChange('vatRate', value)}
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discounted Cost Price (KES)</label>
                    <p className="text-xs text-gray-500 mb-1">Actual buying price after supplier discount</p>
                    <input
                      type="text"
                      value={currentItem.discountedCostPrice}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                      placeholder="Auto-calculated"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (KES)</label>
                    <p className="text-xs text-gray-500 mb-1">Price offered to customer</p>
                    <input
                      type="text"
                      value={currentItem.sellingPrice}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                      placeholder="Auto-calculated"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">VAT Amount (KES)</label>
                    <input
                      type="text"
                      value={currentItem.vat}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                      placeholder="Auto-calculated"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gross Profit Margin %</label>
                    <input
                      type="text"
                      value={currentItem.grossProfitMargin}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                      placeholder="Auto-calculated"
                    />
                  </div>
                </div>

                {/* Pricing Summary */}
                {currentItem.sellingPrice && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h5 className="text-sm font-semibold text-green-900 mb-2">Pricing Summary</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-gray-600">Final Cost</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {currentItem.discountedCostPrice ? formatKES(parseFloat(currentItem.discountedCostPrice)) : formatKES(parseFloat(currentItem.costPrice) || 0)}
                        </p>
                        {currentItem.supplierDiscountPercent && parseFloat(currentItem.supplierDiscountPercent) > 0 && (
                          <p className="text-xs text-gray-500">
                            {currentItem.supplierDiscountPercent}% discount applied
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Selling Price</p>
                        <p className="text-sm font-semibold text-green-600">{formatKES(parseFloat(currentItem.sellingPrice))}</p>
                        <p className="text-xs text-gray-500">Customer price (ex-VAT)</p>
                      </div>
                      {currentItem.grossProfitMargin && (
                        <div>
                          <p className="text-xs text-gray-600">Profit Margin</p>
                          <p className="text-sm font-semibold text-blue-600">{parseFloat(currentItem.grossProfitMargin).toFixed(1)}%</p>
                          <p className="text-xs text-gray-500">Gross profit</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-end mt-3">
                  <button
                    type="button"
                    onClick={addItemToInvoice}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Item
                  </button>
                </div>
              </div>

              {invoiceItems.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">Invoice Items ({invoiceItems.length})</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Batch</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Cost Price</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Disc %</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Final Cost</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Selling Price</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">VAT</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Profit %</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Total Cost</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {invoiceItems.map((item, index) => {
                            const discountedCost = item.discountedCostPrice || item.costPrice;
                            const profitMargin = item.grossProfitMargin || 0;

                            return (
                              <tr key={index}>
                                <td className="px-3 py-2 text-sm">{item.productName}</td>
                                <td className="px-3 py-2 text-sm">{item.batchNumber}</td>
                                <td className="px-3 py-2 text-sm">{item.quantity}</td>
                                <td className="px-3 py-2 text-sm">{formatKES(item.costPrice)}</td>
                                <td className="px-3 py-2 text-sm">
                                  {item.supplierDiscountPercent || '0'}%
                                  {item.supplierDiscountPercent && item.supplierDiscountPercent > 0 && (
                                    <span className="ml-1 text-green-600 font-semibold">✓</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-sm font-medium">
                                  {formatKES(discountedCost)}
                                  {item.discountedCostPrice && item.discountedCostPrice < item.costPrice && (
                                    <div className="text-xs text-gray-500 line-through">
                                      {formatKES(item.costPrice)}
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-sm font-medium text-green-600">
                                  {formatKES(item.sellingPrice)}
                                </td>
                                <td className="px-3 py-2 text-sm">
                                  {item.vat ? formatKES(item.vat) : '-'}
                                </td>
                                <td className="px-3 py-2 text-sm">
                                  <span className={`font-semibold ${profitMargin >= 25 ? 'text-green-600' : 'text-yellow-600'}`}>
                                    {profitMargin.toFixed(1)}%
                                  </span>
                                </td>
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
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Summary Section */}
                    <div className="bg-blue-50 border-t-2 border-blue-200 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-600 uppercase">Total Investment</p>
                          <p className="text-lg font-bold text-gray-900">
                            {formatKES(invoiceItems.reduce((sum, item) => sum + item.totalCost, 0))}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 uppercase">Expected Revenue (Target)</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatKES(invoiceItems.reduce((sum, item) => {
                              const typedItem = item as any;
                              const targetPrice = typedItem.sellingPrice || item.sellingPrice;
                              return sum + (targetPrice * item.quantity);
                            }, 0))}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 uppercase">Expected Profit</p>
                          <p className="text-lg font-bold text-blue-600">
                            {formatKES(invoiceItems.reduce((sum, item) => {
                              const typedItem = item as any;
                              const targetPrice = typedItem.sellingPrice || item.sellingPrice;
                              const actualCost = typedItem.discountedCost || item.costPrice;
                              return sum + ((targetPrice - actualCost) * item.quantity);
                            }, 0))}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 uppercase">Avg Profit Margin</p>
                          <p className="text-lg font-bold text-purple-600">
                            {(() => {
                              const totalRevenue = invoiceItems.reduce((sum, item) => {
                                const typedItem = item as any;
                                const targetPrice = typedItem.sellingPrice || item.sellingPrice;
                                return sum + (targetPrice * item.quantity);
                              }, 0);
                              const totalCost = invoiceItems.reduce((sum, item) => sum + item.totalCost, 0);
                              const margin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100) : 0;
                              return `${margin.toFixed(1)}%`;
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {savingProgress && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">{savingProgress.message}</span>
                    <span className="text-sm text-blue-700">
                      {savingProgress.current}/{savingProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(savingProgress.current / savingProgress.total) * 100}%` }}
                    ></div>
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
