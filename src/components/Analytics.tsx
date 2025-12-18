import React, { useState } from 'react';
import {
  TrendingUp,
  Download,
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  DollarSign
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAlert } from '../contexts/AlertContext';
import { formatKES } from '../utils/currency';
import SalesChart from './SalesChart';
import { usePageRefresh } from '../hooks/usePageRefresh';

const Analytics: React.FC = () => {
  const { sales, products, salesHistory } = useApp();
  const { showAlert } = useAlert();
  usePageRefresh('analytics', { refreshOnMount: true, staleTime: 30000 });
  const [dateRange, setDateRange] = useState('7days');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [salesPeriod, setSalesPeriod] = useState<'day' | 'week' | 'month' | 'year'>('week');

  // Filter sales by date range
  const getFilteredSales = () => {
    const now = new Date();
    const startDate = new Date();
    
    switch (dateRange) {
      case '7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setFullYear(2020); // All time
    }

    return sales.filter(sale => new Date(sale.createdAt) >= startDate);
  };

  const filteredSales = getFilteredSales();
  const categories = Array.from(new Set(products.map(p => p.category)));

  // Calculate analytics data
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalTransactions = filteredSales.length;
  const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // Sales by payment method
  const paymentMethodStats = filteredSales.reduce((acc, sale) => {
    acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.totalAmount;
    return acc;
  }, {} as Record<string, number>);

  // Top selling products
  const productStats = salesHistory
    .filter(item => {
      const now = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '7days':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setFullYear(2020);
      }
      
      return new Date(item.saleDate) >= startDate;
    })
    .reduce((acc, item) => {
      if (!acc[item.productId]) {
        acc[item.productId] = {
          name: item.productName,
          quantity: 0,
          revenue: 0,
          category: products.find(p => p.id === item.productId)?.category || 'Unknown'
        };
      }
      acc[item.productId].quantity += item.quantity;
      acc[item.productId].revenue += item.totalRevenue;
      return acc;
    }, {} as Record<string, { name: string; quantity: number; revenue: number; category: string }>);

  const topProducts = Object.values(productStats)
    .filter(product => selectedCategory === 'all' || product.category === selectedCategory)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Category performance
  const categoryStats = salesHistory
    .filter(item => {
      const now = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '7days':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setFullYear(2020);
      }
      
      return new Date(item.saleDate) >= startDate;
    })
    .reduce((acc, item) => {
      const product = products.find(p => p.id === item.productId);
      const category = product?.category || 'Unknown';
      
      if (!acc[category]) {
        acc[category] = { revenue: 0, quantity: 0 };
      }
      acc[category].revenue += item.totalRevenue;
      acc[category].quantity += item.quantity;
      return acc;
    }, {} as Record<string, { revenue: number; quantity: number }>);

  // Daily sales trend
  const dailySales = salesHistory
    .filter(item => {
      const now = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '7days':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setFullYear(2020);
      }
      
      return new Date(item.saleDate) >= startDate;
    })
    .reduce((acc, item) => {
      const date = new Date(item.saleDate).toDateString();
      acc[date] = (acc[date] || 0) + item.totalRevenue;
      return acc;
    }, {} as Record<string, number>);

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

          const daySales = filteredSales.filter(sale => {
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

          const weekSales = filteredSales.filter(sale => {
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

          const monthSales = filteredSales.filter(sale => {
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

          const yearSales = filteredSales.filter(sale => {
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

  const exportAnalytics = () => {
    try {
      if (filteredSales.length === 0) {
        showAlert({ title: 'Analytics', message: 'No analytics data to export', type: 'warning' });
        return;
      }

      const content = `<!DOCTYPE html>
<html>
<head>
  <title>Analytics Report - ${new Date().toLocaleDateString('en-KE')}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px 8px; text-align: left; border: 1px solid #333; }
    th { background-color: #f0f0f0; font-weight: bold; }
    h1 { color: #333; text-align: center; margin-bottom: 30px; }
    h2 { color: #333; margin-top: 30px; margin-bottom: 15px; }
    .summary { margin-bottom: 20px; }
    @media print { 
      body { margin: 0; } 
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>WESABI PHARMACY - ANALYTICS REPORT</h1>
  <div class="summary">
    <p><strong>Generated:</strong> ${new Date().toLocaleDateString('en-KE')} at ${new Date().toLocaleTimeString('en-KE')}</p>
    <p><strong>Date Range:</strong> ${dateRange}</p>
  </div>
  
  <h2>Summary Statistics</h2>
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Total Revenue</td><td>${formatKES(totalRevenue)}</td></tr>
    <tr><td>Total Transactions</td><td>${totalTransactions}</td></tr>
    <tr><td>Average Transaction</td><td>${formatKES(averageTransaction)}</td></tr>
  </table>
  
  <h2>Top Selling Products</h2>
  <table>
    <tr><th>Product</th><th>Quantity Sold</th><th>Revenue</th></tr>
    ${topProducts.map(product => `
    <tr>
      <td>${product.name}</td>
      <td>${product.quantity}</td>
      <td>${formatKES(product.revenue)}</td>
    </tr>
    `).join('')}
  </table>
  
  <h2>Category Performance</h2>
  <table>
    <tr><th>Category</th><th>Quantity</th><th>Revenue</th></tr>
    ${Object.entries(categoryStats).map(([category, stats]) => `
    <tr>
      <td>${category}</td>
      <td>${stats.quantity}</td>
      <td>${formatKES(stats.revenue)}</td>
    </tr>
    `).join('')}
  </table>
  
  <h2>Payment Methods</h2>
  <table>
    <tr><th>Payment Method</th><th>Amount</th></tr>
    ${Object.entries(paymentMethodStats).map(([method, amount]) => `
    <tr>
      <td>${method.toUpperCase()}</td>
      <td>${formatKES(amount)}</td>
    </tr>
    `).join('')}
  </table>
</body>
</html>`;
      
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
        showAlert({ title: 'Analytics', message: 'Please allow popups to export PDF reports', type: 'warning' });
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
      showAlert({ title: 'Analytics', message: 'Error generating PDF report. Please try again.', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
        <button
          onClick={exportAnalytics}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Export Report</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">{formatKES(totalRevenue)}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-blue-600">{totalTransactions}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Transaction</p>
              <p className="text-2xl font-bold text-purple-600">{formatKES(averageTransaction)}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Top Selling Products</h2>
          </div>
          <div className="p-6">
            {topProducts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No sales data available</p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-green-800">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-600">{product.quantity} units sold</p>
                      </div>
                    </div>
                    <p className="font-bold text-green-600">{formatKES(product.revenue)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Category Performance */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Category Performance</h2>
          </div>
          <div className="p-6">
            {Object.keys(categoryStats).length === 0 ? (
              <p className="text-gray-500 text-center py-4">No category data available</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(categoryStats)
                  .sort(([, a], [, b]) => b.revenue - a.revenue)
                  .map(([category, stats]) => (
                    <div key={category} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{category}</p>
                        <p className="text-sm text-gray-600">{stats.quantity} units sold</p>
                      </div>
                      <p className="font-bold text-blue-600">{formatKES(stats.revenue)}</p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Payment Methods</h2>
          </div>
          <div className="p-6">
            {Object.keys(paymentMethodStats).length === 0 ? (
              <p className="text-gray-500 text-center py-4">No payment data available</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(paymentMethodStats)
                  .sort(([, a], [, b]) => b - a)
                  .map(([method, amount]) => (
                    <div key={method} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <PieChart className="h-5 w-5 text-purple-600" />
                        <p className="font-medium text-gray-900 capitalize">{method}</p>
                      </div>
                      <p className="font-bold text-purple-600">{formatKES(amount)}</p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Daily Sales Trend */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Daily Sales Trend</h2>
          </div>
          <div className="p-6">
            {Object.keys(dailySales).length === 0 ? (
              <p className="text-gray-500 text-center py-4">No daily sales data available</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {Object.entries(dailySales)
                  .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                  .map(([date, amount]) => (
                    <div key={date} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <p className="font-medium text-gray-900">
                        {new Date(date).toLocaleDateString('en-KE', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                      <p className="font-bold text-green-600">{formatKES(amount)}</p>
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

export default Analytics;