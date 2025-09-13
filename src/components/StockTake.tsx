import React, { useState } from 'react';
import { useEffect } from 'react';
import { Package, Save, AlertTriangle, CheckCircle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatKES } from '../utils/currency';

const StockTake: React.FC = () => {
  const { user, products, stockTakes, addStockTake } = useApp();
  const [selectedProducts, setSelectedProducts] = useState<Record<string, { actualStock: number; reason: string }>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Take</h1>
          <p className="text-gray-600">Wesabi Pharmacy - Physical Stock Verification</p>
        </div>
        <button
          onClick={submitStockTake}
          disabled={Object.keys(selectedProducts).length === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="h-4 w-4" />
          <span>Submit Stock Take</span>
        </button>
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
                        type="number"
                        value={actualStock}
                        onChange={(e) => handleStockChange(
                          product.id, 
                          parseInt(e.target.value) || 0,
                          stockData?.reason || ''
                        )}
                        className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        difference === 0 
                          ? 'bg-green-100 text-green-800' 
                          : difference > 0 
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {difference > 0 ? '+' : ''}{difference}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {difference !== 0 && (
                        <input
                          type="text"
                          placeholder="Reason for difference"
                          value={stockData?.reason || ''}
                          onChange={(e) => handleStockChange(
                            product.id,
                            actualStock,
                            e.target.value
                          )}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {difference !== 0 && (
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

      {/* Recent Stock Takes */}
      {stockTakes.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Recent Stock Takes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difference</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stockTakes.slice(0, 10).map((stockTake) => (
                  <tr key={stockTake.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stockTake.createdAt.toLocaleDateString('en-KE')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {stockTake.productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stockTake.expectedStock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stockTake.actualStock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        stockTake.difference === 0 
                          ? 'bg-green-100 text-green-800' 
                          : stockTake.difference > 0 
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {stockTake.difference > 0 ? '+' : ''}{stockTake.difference}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stockTake.userName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stockTake.reason || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockTake;