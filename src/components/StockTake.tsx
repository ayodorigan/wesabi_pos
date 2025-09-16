import React, { useState } from 'react';
import { useEffect } from 'react';
import { Package, Save, AlertTriangle, CheckCircle, History, Calendar, Download } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatKES } from '../utils/currency';

const StockTake: React.FC = () => {
  const { user, products, stockTakes, addStockTake } = useApp();
  const [selectedProducts, setSelectedProducts] = useState<Record<string, { actualStock: number; reason: string }>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);

  // Auto-save every 20 seconds
  useEffect(() => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    
    const timer = setTimeout(() => {
      if (Object.keys(selectedProducts).length > 0) {
        localStorage.setItem('stockTakeData', JSON.stringify(selectedProducts));
        console.log('Stock take auto-saved at', new Date().toLocaleTimeString());
      }
    }, 20000); // 20 seconds
    
    setAutoSaveTimer(timer);
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [selectedProducts]);

  // Load saved data on component mount
  useEffect(() => {
    const savedData = localStorage.getItem('stockTakeData');
    if (savedData) {
      try {
        setSelectedProducts(JSON.parse(savedData));
      } catch (error) {
        console.error('Error loading saved stock take data:', error);
      }
    }
  }, []);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode.includes(searchTerm)
  );

  const handleStockChange = (productId: string, actualStock: number, reason: string = '') => {
    setSelectedProducts(prev => ({
      ...prev,
      [productId]: { actualStock, reason }
    }));
  };

  const submitStockTake = () => {
    if (!user) return;

    Object.entries(selectedProducts).forEach(([productId, data]) => {
      const product = products.find(p => p.id === productId);
      if (!product) return;

      const difference = data.actualStock - product.currentStock;
      
      if (difference !== 0) {
        addStockTake({
          productId,
          productName: product.name,
          expectedStock: product.currentStock,
          actualStock: data.actualStock,
          difference,
          reason: data.reason,
          userId: user.id,
          userName: user.name,
        });
      }
    });

    setSelectedProducts({});
    alert('Stock take completed successfully!');
  };

  const getTotalDiscrepancies = () => {
    return Object.entries(selectedProducts).reduce((total, [productId, data]) => {
      const product = products.find(p => p.id === productId);
      if (!product) return total;
      
      const difference = Math.abs(data.actualStock - product.currentStock);
      return total + difference;
    }, 0);
  };

  const getTotalValueDifference = () => {
    return Object.entries(selectedProducts).reduce((total, [productId, data]) => {
      const product = products.find(p => p.id === productId);
      if (!product) return total;
      
      const difference = data.actualStock - product.currentStock;
      const valueDifference = difference * product.costPrice;
      return total + valueDifference;
    }, 0);
  };

  // Group stock takes by date
  const getGroupedStockTakes = () => {
    const grouped: Record<string, Array<{
      id: string;
      productName: string;
      expectedStock: number;
      actualStock: number;
      difference: number;
      reason?: string;
      userName: string;
    }>> = {};

    stockTakes.forEach(stockTake => {
      const dateKey = stockTake.createdAt.toDateString();
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }

      grouped[dateKey].push({
        id: stockTake.id,
        productName: stockTake.productName,
        expectedStock: stockTake.expectedStock,
        actualStock: stockTake.actualStock,
        difference: stockTake.difference,
        reason: stockTake.reason,
        userName: stockTake.userName,
      });
    });

    return Object.entries(grouped)
      .map(([date, items]) => ({
        date,
        items,
        totalDiscrepancies: items.reduce((sum, item) => sum + Math.abs(item.difference), 0),
        userName: items[0]?.userName || '',
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const exportHistoryToPDF = (date: string, items: any[]) => {
    try {
      const content = `
        <html>
          <head>
            <title>Stock Take Report - ${new Date(date).toLocaleDateString('en-KE')}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { padding: 10px 8px; text-align: left; border: 1px solid #333; }
              th { background-color: #f0f0f0; font-weight: bold; }
              h1 { color: #333; text-align: center; margin-bottom: 30px; }
              .summary { margin-bottom: 20px; }
              .positive { color: #0066cc; }
              .negative { color: #cc0000; }
              @media print { 
                body { margin: 0; } 
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <h1>WESABI PHARMACY - STOCK TAKE REPORT</h1>
            <div class="summary">
              <p><strong>Generated:</strong> ${new Date().toLocaleDateString('en-KE')} at ${new Date().toLocaleTimeString('en-KE')}</p>
              <p><strong>Stock Take Date:</strong> ${new Date(date).toLocaleDateString('en-KE')}</p>
              <p><strong>Conducted by:</strong> ${items[0]?.userName || 'Unknown'}</p>
              <p><strong>Products Checked:</strong> ${items.length}</p>
            </div>
            
            <table>
              <tr>
                <th>Product</th>
                <th>Expected</th>
                <th>Actual</th>
                <th>Difference</th>
                <th>Reason</th>
              </tr>
              ${items.map(item => `
                <tr>
                  <td>${item.productName}</td>
                  <td>${item.expectedStock}</td>
                  <td>${item.actualStock}</td>
                  <td class="${item.difference >= 0 ? 'positive' : 'negative'}">${item.difference > 0 ? '+' : ''}${item.difference}</td>
                  <td>${item.reason || '-'}</td>
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
      console.error('Error exporting stock take report:', error);
      alert('Error generating PDF report. Please try again.');
    }
  };

  const groupedStockTakes = getGroupedStockTakes();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Take</h1>
          <p className="text-gray-600">Wesabi Pharmacy - Physical Stock Verification</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <History className="h-4 w-4" />
            <span>View History</span>
          </button>
          <button
            onClick={submitStockTake}
            disabled={Object.keys(selectedProducts).length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>Submit Stock Take</span>
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Products Checked</p>
              <p className="text-2xl font-bold text-blue-600">{Object.keys(selectedProducts).length}</p>
            </div>
            <Package className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Discrepancies</p>
              <p className="text-2xl font-bold text-red-600">{getTotalDiscrepancies()}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Value Difference</p>
              <p className={`text-2xl font-bold ${getTotalValueDifference() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatKES(getTotalValueDifference())}
              </p>
            </div>
            <CheckCircle className={`h-8 w-8 ${getTotalValueDifference() >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </div>
        </div>
      </div>

      {showHistory ? (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <History className="h-5 w-5 mr-2" />
                Stock Take History
              </h2>
            </div>
            <div className="p-6">
              {groupedStockTakes.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Stock Take History</h3>
                  <p className="text-gray-600">No stock take sessions found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedStockTakes.map((session, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {new Date(session.date).toLocaleDateString('en-KE', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </h3>
                          <p className="text-sm text-gray-600">
                            <span className="inline-flex items-center space-x-4">
                              <span>{session.items.length} products checked</span>
                              <span>•</span>
                              <span>{session.totalDiscrepancies} discrepancies</span>
                              <span>•</span>
                              <span className={`font-medium ${
                                session.items.reduce((sum, item) => sum + (item.difference * (products.find(p => p.name === item.productName)?.costPrice || 0)), 0) >= 0 
                                  ? 'text-green-600' 
                                  : 'text-red-600'
                              }`}>
                                {formatKES(session.items.reduce((sum, item) => {
                                  const product = products.find(p => p.name === item.productName);
                                  return sum + (item.difference * (product?.costPrice || 0));
                                }, 0))} value impact
                              </span>
                            </span>
                          </p>
                          <p className="text-sm text-gray-500">Conducted by: {session.userName}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedHistoryDate(selectedHistoryDate === session.date ? null : session.date)}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            {selectedHistoryDate === session.date ? 'Hide Details' : 'View Details'}
                          </button>
                          <button
                            onClick={() => exportHistoryToPDF(session.date, session.items)}
                            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center space-x-1"
                          >
                            <Download className="h-3 w-3" />
                            <span>PDF</span>
                          </button>
                        </div>
                      </div>
                      
                      {selectedHistoryDate === session.date && (
                        <div className="mt-4 overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left">Product</th>
                                <th className="px-3 py-2 text-left">Expected</th>
                                <th className="px-3 py-2 text-left">Actual</th>
                                <th className="px-3 py-2 text-left">Difference</th>
                                <th className="px-3 py-2 text-left">Reason</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {session.items.map((item) => (
                                <tr key={item.id}>
                                  <td className="px-3 py-2">{item.productName}</td>
                                  <td className="px-3 py-2">{item.expectedStock}</td>
                                  <td className="px-3 py-2">{item.actualStock}</td>
                                  <td className="px-3 py-2">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      item.difference === 0 
                                        ? 'bg-green-100 text-green-800' 
                                        : item.difference > 0 
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {item.difference > 0 ? '+' : ''}{item.difference}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">{item.reason || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <input
              type="text"
              placeholder="Search products by name or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difference</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value Impact</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => {
                    const stockData = selectedProducts[product.id];
                    const actualStock = stockData?.actualStock ?? product.currentStock;
                    const difference = actualStock - product.currentStock;
                    const valueImpact = difference * product.costPrice;

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
                          <div className="text-sm text-gray-900">{product.currentStock}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={stockData?.actualStock !== undefined ? stockData.actualStock : ''}
                            placeholder={product.currentStock.toString()}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              const numValue = parseInt(value) || 0;
                              handleStockChange(product.id, numValue, stockData?.reason || '');
                            }}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                const value = e.currentTarget.value.replace(/[^0-9]/g, '');
                                const numValue = parseInt(value) || 0;
                                if (numValue !== product.currentStock) {
                                  // Save to database immediately
                                  const difference = numValue - product.currentStock;
                                  addStockTake({
                                    productId: product.id,
                                    productName: product.name,
                                    expectedStock: product.currentStock,
                                    actualStock: numValue,
                                    difference,
                                    reason: stockData?.reason || '',
                                    userId: user.id,
                                    userName: user.name,
                                  });
                                  
                                  // Update local state
                                  handleStockChange(product.id, numValue, stockData?.reason || '');
                                    // Clear the input after successful save
                                    setSelectedProducts(prev => {
                                      const updated = { ...prev };
                                      delete updated[product.id];
                                      return updated;
                                    });
                                  if (nextInput) {
                                    nextInput.focus();
                                  }
                                } else {
                                  // If no difference, just move to next field
                                  const nextInput = e.currentTarget.closest('tr')?.nextElementSibling?.querySelector('input[type="text"]') as HTMLInputElement;
                                  if (nextInput) {
                                    nextInput.focus();
                                  }
                                }
                              }
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {stockData && difference !== 0 && (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              difference === 0 
                                ? 'bg-green-100 text-green-800' 
                                : difference > 0 
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {difference > 0 ? '+' : ''}{difference}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {stockData && difference !== 0 && (
                            <input
                              type="text"
                              value={stockData?.reason || ''}
                              placeholder="Enter reason..."
                              onChange={(e) => {
                                handleStockChange(product.id, actualStock, e.target.value);
                              }}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {stockData && difference !== 0 && (
                            <span className={`text-sm font-medium ${
                              valueImpact >= 0 ? 'text-blue-600' : 'text-red-600'
                            }`}>
                              {valueImpact >= 0 ? '+' : ''}{formatKES(valueImpact)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default StockTake;