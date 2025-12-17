import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Scan,
  Plus,
  Minus,
  Trash2,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  Shield,
  History,
  Check,
  Edit
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { Product, SaleItem } from '../types';
import { formatKES, getMinimumSellingPrice, validateSellingPrice, enforceMinimumSellingPrice } from '../utils/currency';
import { getErrorMessage } from '../utils/errorMessages';
import { retryDatabaseOperation } from '../utils/retry';
import { usePageRefresh } from '../hooks/usePageRefresh';

const POS: React.FC = () => {
  const { products, addSale, getLastSoldPrice } = useApp();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  usePageRefresh('pos', { refreshOnMount: true, staleTime: 30000 });
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'card' | 'insurance'>('mpesa');
  const [customerName, setCustomerName] = useState('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<string | null>(null);
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [mpesaPaymentDetails, setMpesaPaymentDetails] = useState<{
    phoneNumber: string;
    receiptNumber: string;
    amount: number;
  } | null>(null);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState('');
  const [showPriceHistory, setShowPriceHistory] = useState<string | null>(null);
  const [useLastPrice, setUseLastPrice] = useState<Record<string, boolean>>({});
  const [lastSoldPrices, setLastSoldPrices] = useState<Record<string, number | null>>({});
  const [mpesaTimeoutReached, setMpesaTimeoutReached] = useState(false);
  const [mpesaTimeoutId, setMpesaTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const filteredProducts = products.filter(product => 
    product.currentStock > 0 && (
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.includes(searchTerm)
    )
  );

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.productId === product.id);
    
    if (existingItem) {
      // Don't add duplicate products, just show a message
      showAlert({ title: 'Point of Sale', message: 'Product already in cart. Adjust quantity if needed.', type: 'warning' });
      return;
    } else {
      const newItem: SaleItem = {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.sellingPrice,
        totalPrice: product.sellingPrice,
        originalPrice: product.sellingPrice,
        priceAdjusted: false,
        batchNumber: product.batchNumber,
      };
      setCart(prev => [newItem, ...prev]);
      
      // Fetch last sold price when adding to cart
      getLastSoldPrice(product.id).then(lastPrice => {
        setLastSoldPrices(prev => ({
          ...prev,
          [product.id]: lastPrice
        }));
      });
    }
    setSearchTerm('');
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQuantity > product.currentStock) return;

    setCart(cart.map(item =>
      item.productId === productId
        ? { ...item, quantity: newQuantity, totalPrice: newQuantity * item.unitPrice }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const startPriceEdit = (productId: string, currentPrice: number) => {
    setEditingPrice(productId);
    setTempPrice(currentPrice.toString());
  };

  const savePriceEdit = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const newPrice = parseFloat(tempPrice);
    const minPrice = getMinimumSellingPrice(product.costPrice);

    if (newPrice < minPrice) {
      showAlert({ title: 'Point of Sale', message: `Price cannot be less than minimum selling price: ${formatKES(minPrice)}`, type: 'error' });
      return;
    }

    setCart(cart.map(item =>
      item.productId === productId
        ? { 
            ...item, 
            unitPrice: newPrice, 
            totalPrice: item.quantity * newPrice,
            priceAdjusted: newPrice !== product.sellingPrice
          }
        : item
    ));
    setEditingPrice(null);
  };

  const cancelPriceEdit = () => {
    setEditingPrice(null);
    setTempPrice('');
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + item.totalPrice, 0);
  };

  const processSale = async () => {
    if (cart.length === 0 || !user) return;

    // Validate all prices against minimum selling price (cost * 1.33)
    for (const item of cart) {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        const minPrice = getMinimumSellingPrice(product.costPrice);
        if (item.unitPrice < minPrice) {
          showAlert({ title: 'Point of Sale', message: `Price for ${item.productName} cannot be less than minimum selling price: ${formatKES(minPrice)}`, type: 'error' });
          return;
        }
      }
    }

    if (paymentMethod === 'mpesa') {
      setShowMpesaModal(true);
      return;
    }

    await completeSale();
  };

  const completeSale = async () => {
    if (cart.length === 0 || !user) return;

    setIsProcessing(true);

    try {
      const receiptNumber = await retryDatabaseOperation(
        () => addSale({
          items: cart,
          totalAmount: getTotalAmount(),
          paymentMethod,
          customerName: customerName || undefined,
          salesPersonId: user.user_id,
          salesPersonName: user.name,
        }),
        'Complete sale'
      );

      setLastReceipt(receiptNumber);
      setCart([]);
      setCustomerName('');
      setMpesaPhone('');
      setPaymentMethod('mpesa');
      setShowMpesaModal(false);
      setMpesaPaymentDetails(null);
      setCheckoutRequestId(null);

      showAlert({ title: 'Point of Sale', message: `Sale completed! Receipt #${receiptNumber} - Wesabi Pharmacy`, type: 'success' });
    } catch (error) {
      showAlert({ title: 'Point of Sale', message: getErrorMessage(error), type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMpesaPayment = async () => {
    console.log('=== M-Pesa Payment Started ===');
    console.log('Phone:', mpesaPhone);
    console.log('Amount:', getTotalAmount());

    if (!mpesaPhone.trim()) {
      showAlert({ title: 'Point of Sale', message: 'Please enter M-Pesa phone number', type: 'warning' });
      return;
    }

    setIsProcessing(true);
    setMpesaTimeoutReached(false);
    console.log('Processing set to true');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mpesa-stkpush`;
      console.log('Calling STK Push API:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: mpesaPhone,
          amount: getTotalAmount(),
          accountReference: `SALE-${Date.now()}`,
          transactionDesc: 'Wesabi Pharmacy Payment',
        }),
      });

      const data = await response.json();
      console.log('STK Push Response:', data);

      if (!response.ok) {
        if (data.error && data.error.includes('credentials not configured')) {
          showAlert({ title: 'Point of Sale', message: 'M-Pesa is not configured. Please configure M-Pesa credentials in Supabase Edge Function secrets to enable mobile payments.', type: 'error' });
          setIsProcessing(false);
          return;
        }
        throw new Error(data.error || 'Failed to initiate M-Pesa payment');
      }

      // Store the CheckoutRequestID to poll for status (note: case-sensitive property name)
      const checkoutId = data.CheckoutRequestID || data.checkoutRequestID;
      if (checkoutId) {
        console.log('Got CheckoutRequestID:', checkoutId);
        setCheckoutRequestId(checkoutId);
        startPollingTransactionStatus(checkoutId);

        // Start timeout timer (30 seconds)
        const timeoutId = setTimeout(() => {
          console.log('M-Pesa payment timeout reached');
          setMpesaTimeoutReached(true);
        }, 30000); // 30 seconds
        setMpesaTimeoutId(timeoutId);
      } else {
        console.error('No CheckoutRequestID in response!', data);
      }

      showAlert({ title: 'Point of Sale', message: 'M-Pesa prompt sent! Please check your phone and enter your PIN. You can also complete the sale manually if needed.', type: 'info' });
    } catch (error: any) {
      console.error('M-Pesa payment error:', error);
      showAlert({ title: 'Point of Sale', message: getErrorMessage(error), type: 'error' });
      setIsProcessing(false);
    }
  };

  const startPollingTransactionStatus = (checkoutId: string) => {
    let pollCount = 0;
    const maxPolls = 120; // Poll for 120 seconds (2 minutes)
    let timeoutId: NodeJS.Timeout | null = null;

    console.log('Starting polling for checkout:', checkoutId);

    const checkTransaction = async () => {
      try {
        const { supabase } = await import('../lib/supabase');
        if (!supabase) return;

        console.log(`Polling attempt ${pollCount + 1}/${maxPolls} for checkout:`, checkoutId);

        const { data, error } = await supabase
          .from('mpesa_transactions')
          .select('*')
          .eq('checkout_request_id', checkoutId)
          .maybeSingle();

        if (error) {
          console.error('Error polling M-Pesa status:', error);
        }

        console.log('Polling result:', data);

        if (data) {
          // Transaction response received
          if (timeoutId) clearTimeout(timeoutId);
          setPollingInterval(null);

          // Clear the M-Pesa timeout as we got a response
          if (mpesaTimeoutId) {
            clearTimeout(mpesaTimeoutId);
            setMpesaTimeoutId(null);
          }

          console.log('Transaction found with result code:', data.result_code);

          if (data.result_code === 0) {
            // Success - store payment details and enable complete button
            setMpesaPaymentDetails({
              phoneNumber: data.phone_number || '',
              receiptNumber: data.mpesa_receipt_number || '',
              amount: data.amount || 0,
            });
            setIsProcessing(false);
            console.log('Payment successful, details saved');
          } else {
            // Failed or cancelled
            showAlert({ title: 'Point of Sale', message: `M-Pesa payment ${data.result_description}. You can try again or complete manually.`, type: 'warning' });
            setIsProcessing(false);
            console.log('Payment failed:', data.result_description);
          }
          return; // Stop polling
        }

        pollCount++;
        if (pollCount < maxPolls) {
          // Continue polling
          timeoutId = setTimeout(checkTransaction, 2000); // Poll every 2 seconds
          setPollingInterval(timeoutId);
        } else {
          // Timeout - stop polling
          setPollingInterval(null);
          showAlert({ title: 'Point of Sale', message: 'M-Pesa payment timeout. You can complete the sale manually.', type: 'warning' });
          setIsProcessing(false);
          console.log('Polling timeout reached');
        }
      } catch (error) {
        console.error('Error in polling:', error);
        pollCount++;
        if (pollCount < maxPolls) {
          timeoutId = setTimeout(checkTransaction, 2000);
          setPollingInterval(timeoutId);
        } else {
          setPollingInterval(null);
          setIsProcessing(false);
        }
      }
    };

    // Start the first check immediately
    checkTransaction();
  };

  const stopPolling = () => {
    if (pollingInterval) {
      clearTimeout(pollingInterval);
      setPollingInterval(null);
      console.log('Polling stopped');
    }
    if (mpesaTimeoutId) {
      clearTimeout(mpesaTimeoutId);
      setMpesaTimeoutId(null);
      console.log('M-Pesa timeout cleared');
    }
  };

  // Debug state changes
  useEffect(() => {
    console.log('=== M-Pesa State ===', {
      isProcessing,
      checkoutRequestId,
      hasPaymentDetails: !!mpesaPaymentDetails,
      showMpesaModal,
      shouldShowButton: isProcessing && checkoutRequestId
    });
  }, [isProcessing, checkoutRequestId, mpesaPaymentDetails, showMpesaModal]);

  // Cleanup polling on unmount or modal close
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  useEffect(() => {
    if (!showMpesaModal) {
      stopPolling();
      setIsProcessing(false);
      setCheckoutRequestId(null);
      setMpesaPaymentDetails(null);
      setMpesaTimeoutReached(false);
    }
  }, [showMpesaModal]);

  const toggleLastPrice = (productId: string) => {
    setUseLastPrice(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const paymentMethods = [
    { id: 'mpesa', label: 'M-Pesa', icon: Smartphone, color: 'green' },
    { id: 'cash', label: 'Cash', icon: Banknote, color: 'green' },
    { id: 'card', label: 'Card', icon: CreditCard, color: 'blue' },
    { id: 'insurance', label: 'Insurance', icon: Shield, color: 'purple' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Product Selection */}
      <div className="lg:col-span-2 space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Point of Sale</h1>

        {/* Search Bar */}
        <div className="relative">
          <Scan className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by product name or scan barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-lg"
          />
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[calc(100vh-16rem)] overflow-y-auto">
          {filteredProducts.map(product => (
            <div 
              key={product.id} 
              className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => addToCart(product)}
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-gray-900 text-sm">{product.name}</h3>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {product.category}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <p className="text-lg font-bold text-green-600">{formatKES(product.sellingPrice)}</p>
                  {product.priceHistory.length > 1 && (
                    <p className="text-xs text-gray-500">
                      Last sold: {formatKES(product.priceHistory[product.priceHistory.length - 2]?.sellingPrice || product.sellingPrice)}
                    </p>
                  )}
                  <p className="text-sm text-gray-600">Stock: {product.currentStock}</p>
                  <p className="text-xs text-gray-500">Batch: {product.batchNumber}</p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  {product.priceHistory.length > 1 && (
                    <label className="flex items-center text-xs">
                      <input
                        type="checkbox"
                        checked={useLastPrice[product.id] || false}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleLastPrice(product.id);
                        }}
                        className="mr-1"
                      />
                      Use last price
                    </label>
                  )}
                  
                  <div className="flex space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPriceHistory(product.id);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Price History"
                    >
                      <History className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product);
                      }}
                      className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && searchTerm && (
          <div className="text-center py-8">
            <p className="text-gray-500">No products found matching "{searchTerm}"</p>
          </div>
        )}
      </div>

      {/* Cart and Checkout */}
      <div className="bg-white p-6 rounded-lg shadow-sm border h-fit">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Cart
          </h2>
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
            {cart.length} items
          </span>
        </div>

        {/* Cart Items */}
        <div className="space-y-2 mb-4 max-h-[400px] overflow-y-auto">
          {cart.map(item => (
            <div key={item.productId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                <div className="space-y-1">
                  {editingPrice === item.productId ? (
                    <div className="flex items-center space-x-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9.]*"
                        step="0.01"
                        value={tempPrice}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.]/g, '');
                          setTempPrice(value);
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            savePriceEdit(item.productId);
                          }
                        }}
                        className="w-24 px-2 py-1 text-xs border rounded appearance-none"
                        style={{ MozAppearance: 'textfield' }}
                      />
                      <button
                        onClick={() => savePriceEdit(item.productId)}
                        className="p-1 text-green-600 hover:text-green-800"
                        title="Confirm price"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        onClick={cancelPriceEdit}
                        className="p-1 text-red-600 hover:text-red-800"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div>
                      <button
                        onClick={() => startPriceEdit(item.productId, item.unitPrice)}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        {formatKES(item.unitPrice)} each
                        {item.priceAdjusted && <span className="text-orange-500 ml-1">*</span>}
                        <Edit className="h-3 w-3 ml-1" />
                      </button>
                      {lastSoldPrices[item.productId] && lastSoldPrices[item.productId] !== item.unitPrice && (
                        <div className="mt-1 space-y-1">
                          <div className="text-xs text-gray-500">
                            Last sold: {formatKES(lastSoldPrices[item.productId]!)}
                          </div>
                          <label className="flex items-center text-xs">
                            <input
                              type="checkbox"
                              checked={useLastPrice[item.productId] || false}
                              onChange={() => {
                                const newUseLastPrice = !useLastPrice[item.productId];
                                const product = products.find(p => p.id === item.productId);
                                if (!product) return;
                                
                                setUseLastPrice(prev => ({
                                  ...prev,
                                  [item.productId]: newUseLastPrice
                                }));
                                
                                let priceToUse = newUseLastPrice 
                                  ? lastSoldPrices[item.productId]! 
                                  : product.sellingPrice;
                                
                                // Enforce minimum selling price
                                const minPrice = getMinimumSellingPrice(product.costPrice);
                                if (priceToUse < minPrice) {
                                  priceToUse = minPrice;
                                  showAlert({ title: 'Point of Sale', message: `Price adjusted to minimum selling price: ${formatKES(minPrice)}`, type: 'info' });
                                }
                                
                                setCart(cart.map(cartItem =>
                                  cartItem.productId === item.productId
                                    ? { 
                                        ...cartItem, 
                                        unitPrice: priceToUse, 
                                        totalPrice: cartItem.quantity * priceToUse,
                                        priceAdjusted: priceToUse !== product.sellingPrice
                                      }
                                    : cartItem
                                ));
                              }}
                              className="mr-1"
                            />
                            Use last price
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="1"
                  max={products.find(p => p.id === item.productId)?.currentStock || 999}
                  value={item.quantity}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    const newQty = parseInt(value) || 1;
                    const product = products.find(p => p.id === item.productId);
                    if (product && newQty <= product.currentStock) {
                      updateQuantity(item.productId, newQty);
                    }
                  }}
                  className="w-12 text-center font-medium border rounded px-1 appearance-none"
                  style={{ MozAppearance: 'textfield' }}
                />
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => removeFromCart(item.productId)}
                  className="p-1 text-red-400 hover:text-red-600 ml-2"
                  title="Remove from cart"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {cart.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Your cart is empty</p>
            <p className="text-sm">Add products to start a sale</p>
          </div>
        )}

        {cart.length > 0 && (
          <>
            {/* Customer Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name (Optional)
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Payment Method */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map(method => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id as any)}
                      className={`flex items-center justify-center space-x-2 p-2 rounded-lg border-2 transition-colors ${
                        paymentMethod === method.id
                          ? `border-${method.color}-500 bg-${method.color}-50 text-${method.color}-700`
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{method.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Total */}
            <div className="border-t pt-4 mb-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total:</span>
                <span className="text-green-600">{formatKES(getTotalAmount())}</span>
              </div>
            </div>

            {/* Process Sale Button */}
            <button
              onClick={processSale}
              disabled={isProcessing}
              className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Receipt className="h-5 w-5" />
              <span>{isProcessing ? 'Processing...' : 'Complete Sale'}</span>
            </button>
          </>
        )}
      </div>

      {/* M-Pesa Payment Modal */}
      {showMpesaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">M-Pesa Payment</h3>

            <div className="mb-4 p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total Amount</p>
              <p className="text-2xl font-bold text-green-600">{formatKES(getTotalAmount())}</p>
            </div>

            {mpesaPaymentDetails ? (
              <div className="mb-4">
                <div className="p-4 bg-green-100 border border-green-300 rounded-lg mb-4">
                  <div className="flex items-center mb-2">
                    <Check className="h-5 w-5 text-green-600 mr-2" />
                    <p className="text-green-800 font-semibold">Payment Received!</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">From:</span>
                      <span className="font-medium">{mpesaPaymentDetails.phoneNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Receipt:</span>
                      <span className="font-medium">{mpesaPaymentDetails.receiptNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium text-green-600">{formatKES(mpesaPaymentDetails.amount)}</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 text-center mb-4">
                  Click "Complete & Close" to finalize the sale
                </p>
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Phone Number
                </label>
                <input
                  type="tel"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  placeholder="0712345678 or 254712345678"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={isProcessing}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {isProcessing ? (mpesaTimeoutReached ? 'Payment timeout reached. You can now complete manually.' : 'Waiting for payment confirmation...') : 'Enter the phone number registered with M-Pesa'}
                </p>
                {(() => {
                  console.log('Button render check:', { isProcessing, checkoutRequestId, shouldRender: isProcessing && checkoutRequestId });
                  return isProcessing && checkoutRequestId && (
                    <button
                      onClick={async () => {
                        console.log('Manual check triggered for:', checkoutRequestId);
                        const { supabase } = await import('../lib/supabase');
                        if (!supabase) return;

                        const { data, error } = await supabase
                          .from('mpesa_transactions')
                          .select('*')
                          .eq('checkout_request_id', checkoutRequestId)
                          .maybeSingle();

                        console.log('Manual check result:', { data, error });

                        if (data) {
                          if (data.result_code === 0) {
                            setMpesaPaymentDetails({
                              phoneNumber: data.phone_number || '',
                              receiptNumber: data.mpesa_receipt_number || '',
                              amount: data.amount || 0,
                            });
                            setIsProcessing(false);
                            stopPolling();
                          } else {
                            showAlert({ title: 'Point of Sale', message: `Payment ${data.result_description}`, type: 'warning' });
                            setIsProcessing(false);
                            stopPolling();
                          }
                        } else {
                          showAlert({ title: 'Point of Sale', message: 'No payment found yet. Please wait or complete manually.', type: 'info' });
                        }
                      }}
                      className="mt-2 w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Check Payment Status Now
                    </button>
                  );
                })()}
              </div>
            )}

            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setShowMpesaModal(false);
                  setMpesaPhone('');
                  setMpesaPaymentDetails(null);
                }}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>
              {!mpesaPaymentDetails && (
                <button
                  onClick={handleMpesaPayment}
                  disabled={isProcessing || !mpesaPhone.trim()}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing...' : 'Send STK Push'}
                </button>
              )}
              <button
                onClick={completeSale}
                disabled={isProcessing && !mpesaTimeoutReached}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing && !mpesaTimeoutReached ? 'Processing...' : (mpesaPaymentDetails ? 'Complete & Close' : 'Complete Manually')}
              </button>
            </div>

            {!mpesaPaymentDetails && (
              <p className="text-xs text-gray-500 mt-3 text-center">
                Customer will receive a prompt on their phone to enter M-Pesa PIN
              </p>
            )}
          </div>
        </div>
      )}

      {/* Price History Modal */}
      {showPriceHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            {(() => {
              const product = products.find(p => p.id === showPriceHistory);
              return product ? (
                <>
                  <h3 className="text-lg font-semibold mb-4">Price History - {product.name}</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {product.priceHistory.slice().reverse().map((history, index) => (
                      <div key={history.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <p className="text-sm font-medium">{formatKES(history.sellingPrice)}</p>
                          <p className="text-xs text-gray-500">
                            {history.date.toLocaleDateString()} by {history.userName}
                          </p>
                        </div>
                        {index === 0 && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Current
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end pt-4">
                    <button
                      onClick={() => setShowPriceHistory(null)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : null;
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;