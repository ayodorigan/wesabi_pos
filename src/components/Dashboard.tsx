import React, { useState } from 'react';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  Calendar,
  ShoppingCart,
  DollarSign,
  X,
  Download
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatKES } from '../utils/currency';
import SalesChart from './SalesChart';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { usePageRefresh } from '../hooks/usePageRefresh';

const Dashboard: React.FC = () => {
  const { products, sales, getStockAlerts, salesHistory } = useApp();
  usePageRefresh('dashboard', { refreshOnMount: true, staleTime: 30000 });
  const alerts = getStockAlerts();
  const [salesPeriod, setSalesPeriod] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [showAllAlertsDialog, setShowAllAlertsDialog] = useState(false);

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

  // Generate sales chart data based on selected period
  const getSalesChartData = () => {
    const now = new Date();
    const data: { label: string; value: number }[] = [];

    switch (salesPeriod) {
      case 'day': {
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          const nextDay = new Date(date);
          nextDay.setDate(nextDay.getDate() + 1);

          const daySales = sales.filter(sale => {
            const saleDate = new Date(sale.createdAt);
            return saleDate >= date && saleDate < nextDay;
          });

          const total = daySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
          data.push({
            label: date.toLocaleDateString('en-KE', { weekday: 'short' }),
            value: total
          });
        }
        break;
      }
      case 'week': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        let weekNumber = 1;
        let currentWeekStart = new Date(monthStart);
        currentWeekStart.setHours(0, 0, 0, 0);

        while (currentWeekStart <= monthEnd) {
          const weekEnd = new Date(currentWeekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          weekEnd.setHours(23, 59, 59, 999);

          const actualWeekEnd = weekEnd > monthEnd ? monthEnd : weekEnd;

          const weekSales = sales.filter(sale => {
            const saleDate = new Date(sale.createdAt);
            return saleDate >= currentWeekStart && saleDate <= actualWeekEnd;
          });

          const total = weekSales.reduce((sum, sale) => sum + sale.totalAmount, 0);

          data.push({
            label: `Week ${weekNumber}`,
            value: total
          });

          currentWeekStart = new Date(weekEnd);
          currentWeekStart.setDate(currentWeekStart.getDate() + 1);
          currentWeekStart.setHours(0, 0, 0, 0);
          weekNumber++;

          if (weekNumber > 6) break;
        }
        break;
      }
      case 'month': {
        for (let i = 5; i >= 0; i--) {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

          const monthSales = sales.filter(sale => {
            const saleDate = new Date(sale.createdAt);
            return saleDate >= monthStart && saleDate < monthEnd;
          });

          const total = monthSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
          data.push({
            label: monthStart.toLocaleDateString('en-KE', { month: 'short' }),
            value: total
          });
        }
        break;
      }
      case 'year': {
        for (let i = 4; i >= 0; i--) {
          const year = now.getFullYear() - i;
          const yearStart = new Date(year, 0, 1);
          const yearEnd = new Date(year + 1, 0, 1);

          const yearSales = sales.filter(sale => {
            const saleDate = new Date(sale.createdAt);
            return saleDate >= yearStart && saleDate < yearEnd;
          });

          const total = yearSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
          data.push({
            label: year.toString(),
            value: total
          });
        }
        break;
      }
    }

    return data;
  };

  const salesChartData = getSalesChartData();

  const exportLowStockList = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Low Stock Alert Report', 14, 20);

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString('en-KE')}`, 14, 28);
    doc.text('Wesabi Pharmacy', 14, 34);

    const tableData = lowStockAlerts.map(alert => [
      alert.productName,
      alert.currentStock.toString(),
      alert.minStockLevel.toString(),
      (alert.minStockLevel - alert.currentStock).toString()
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Product Name', 'Current Stock', 'Min Stock Level', 'Stock Needed']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] },
      styles: { fontSize: 9 }
    });

    doc.save(`Low_Stock_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

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

      {/* Sales Graph */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Sales Trends</h2>
          <div className="flex space-x-2">
            {(['day', 'week', 'month', 'year'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSalesPeriod(period)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  salesPeriod === period
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <SalesChart
          data={salesChartData}
          title={`Sales by ${salesPeriod.charAt(0).toUpperCase() + salesPeriod.slice(1)}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
              Stock Alerts
            </h2>
            {lowStockAlerts.length > 0 && (
              <button
                onClick={() => setShowAllAlertsDialog(true)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                See All
              </button>
            )}
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

      {/* All Low Stock Alerts Dialog */}
      {showAllAlertsDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <AlertTriangle className="h-6 w-6 mr-2 text-red-500" />
                All Low Stock Items ({lowStockAlerts.length})
              </h2>
              <button
                onClick={() => setShowAllAlertsDialog(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {lowStockAlerts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No low stock items at this time</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Current Stock
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Min Stock Level
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stock Needed
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {lowStockAlerts.map((alert) => (
                        <tr key={alert.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{alert.productName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{alert.currentStock}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{alert.minStockLevel}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-red-600">
                              {alert.minStockLevel - alert.currentStock}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Low Stock
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowAllAlertsDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              {lowStockAlerts.length > 0 && (
                <button
                  onClick={exportLowStockList}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export to PDF
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;