import React, { useState } from 'react';
import { 
  History, 
  Download, 
  Filter,
  Search,
  Calendar,
  TrendingUp,
  Package,
  DollarSign
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatKES } from '../utils/currency';

const SalesHistory: React.FC = () => {
  const { salesHistory, exportToPDF } = useApp();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('7days');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filter sales history
  const getFilteredHistory = () => {
    let filtered = [...salesHistory];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.salesPersonName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Payment method filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(item => item.paymentMethod === paymentFilter);
    }

    // Date range filter
    if (dateRange === 'custom' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.saleDate);
        return itemDate >= start && itemDate <= end;
      });
    } else if (dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateRange) {
        case '1day':
          filterDate.setDate(now.getDate() - 1);
          break;
        case '7days':
          filterDate.setDate(now.getDate() - 7);
          break;
        case '30days':
          filterDate.setDate(now.getDate() - 30);
          break;
        case '90days':
          filterDate.setDate(now.getDate() - 90);
          break;
      }
      
      filtered = filtered.filter(item => new Date(item.saleDate) >= filterDate);
    }

    return filtered;
  };

  const filteredHistory = getFilteredHistory();

  // Calculate summary statistics
  const totalRevenue = filteredHistory.reduce((sum, item) => sum + item.totalRevenue, 0);
  const totalProfit = filteredHistory.reduce((sum, item) => sum + item.profit, 0);
  const totalItems = filteredHistory.reduce((sum, item) => sum + item.quantity, 0);

  const exportReport = () => {
    try {
      if (filteredHistory.length === 0) {
        alert('No sales history to export');
        return;
      }

      const content = `<!DOCTYPE html>
<html>
<head>
  <title>Drug Sales History - ${new Date().toLocaleDateString('en-KE')}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 8px 4px; text-align: left; border: 1px solid #333; font-size: 10px; }
    th { background-color: #f0f0f0; font-weight: bold; }
    h1 { color: #333; text-align: center; margin-bottom: 30px; }
    .summary { margin-bottom: 20px; }
    @media print { 
      body { margin: 0; } 
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>WESABI PHARMACY - DRUG SALES HISTORY</h1>
  <div class="summary">
    <p><strong>Generated:</strong> ${new Date().toLocaleDateString('en-KE')} at ${new Date().toLocaleTimeString('en-KE')}</p>
    <p><strong>Total Records:</strong> ${filteredHistory.length}</p>
    <p><strong>Total Revenue:</strong> ${formatKES(totalRevenue)}</p>
    <p><strong>Total Profit:</strong> ${formatKES(totalProfit)}</p>
  </div>
  
  <table>
    <tr>
      <th>Date</th>
      <th>Product</th>
      <th>Qty</th>
      <th>Cost Price</th>
      <th>Selling Price</th>
      <th>Revenue</th>
      <th>Profit</th>
      <th>Payment</th>
      <th>Receipt</th>
      <th>Sales Person</th>
    </tr>
    ${filteredHistory.map(item => `
    <tr>
      <td>${item.saleDate.toLocaleDateString('en-KE')}</td>
      <td>${item.productName}</td>
      <td>${item.quantity}</td>
      <td>${formatKES(item.costPrice)}</td>
      <td>${formatKES(item.sellingPrice)}</td>
      <td>${formatKES(item.totalRevenue)}</td>
      <td>${formatKES(item.profit)}</td>
      <td>${item.paymentMethod.toUpperCase()}</td>
      <td>${item.receiptNumber}</td>
      <td>${item.salesPersonName}</td>
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
        alert('Please allow popups to export PDF reports');
      }
    } catch (error) {
      console.error('Error exporting drug sales history:', error);
      alert('Error generating PDF report. Please try again.');
    }
  };

  const paymentMethods = ['cash', 'mpesa', 'card', 'insurance'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Drug History</h1>
          <p className="text-gray-600">Wesabi Pharmacy - Drug Sales Tracking</p>
        </div>
        <button
          onClick={exportReport}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Export PDF</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products, receipts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="1day">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Payments</option>
              {paymentMethods.map(method => (
                <option key={method} value={method}>{method.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {dateRange === 'custom' && (
            <div className="flex space-x-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Sales History Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selling Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    No sales history found
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.saleDate.toLocaleDateString('en-KE')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.saleDate.toLocaleTimeString('en-KE')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                      <div className="text-sm text-gray-500">by {item.salesPersonName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatKES(item.costPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatKES(item.sellingPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatKES(item.totalRevenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {formatKES(item.profit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        {item.paymentMethod.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.receiptNumber}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesHistory;