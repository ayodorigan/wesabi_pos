import React from 'react';
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  Calendar,
  ShoppingCart,
  DollarSign
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatKES } from '../utils/currency';

const Dashboard: React.FC = () => {
  const { products, sales, getStockAlerts, salesHistory } = useApp();
  const alerts = getStockAlerts();

  // Calculate dashboard statistics
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaySales = sales.filter(sale => {
    const saleDate = new Date(sale.createdAt);
    saleDate.setHours(0, 0, 0, 0);
    return saleDate.getTime() === today.getTime();
  });

  const totalSalesToday = todaySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalSalesAllTime = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);

  const lowStockAlerts = alerts.filter(alert => alert.alertType === 'low_stock');
  const expiryAlerts = alerts.filter(alert => alert.alertType === 'expiry_warning');

  // Top selling products
  const productSales = salesHistory.reduce((acc, item) => {
    if (!acc[item.productId]) {
      acc[item.productId] = {
        name: item.productName,
        quantitySold: 0,
        revenue: 0,
      };
    }
    acc[item.productId].quantitySold += item.quantity;
    acc[item.productId].revenue += item.totalRevenue;
    return acc;
  }, {} as Record<string, { name: string; quantitySold: number; revenue: number }>);

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Wesabi Pharmacy - Management Overview</p>
        </div>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-KE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Sales</p>
              <p className="text-2xl font-bold text-green-600">{formatKES(totalSalesToday)}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">{todaySales.length} transactions</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-blue-600">{formatKES(totalSalesAllTime)}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">{sales.length} total transactions</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-purple-600">{products.length}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">Active inventory</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Alerts</p>
              <p className="text-2xl font-bold text-red-600">{alerts.length}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">
              {lowStockAlerts.length} low stock, {expiryAlerts.length} expiring
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
              Stock Alerts
            </h2>
          </div>
          <div className="p-6">
            {alerts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No alerts at this time</p>
            ) : (
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{alert.productName}</p>
                      <p className="text-sm text-gray-600">
                        {alert.alertType === 'low_stock' 
                          ? `Stock: ${alert.currentStock} (Min: ${alert.minStockLevel})`
                          : `Expires in ${alert.daysToExpiry} days`
                        }
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      alert.alertType === 'low_stock' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {alert.alertType === 'low_stock' ? 'Low Stock' : 'Expiring Soon'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2 text-green-500" />
              Top Selling Products
            </h2>
          </div>
          <div className="p-6">
            {topProducts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No sales data available</p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-green-800">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-600">{product.quantitySold} units sold</p>
                      </div>
                    </div>
                    <p className="font-bold text-green-600">{formatKES(product.revenue)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;