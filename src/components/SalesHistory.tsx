import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Download,
  Filter,
  Search,
  Calendar,
  TrendingUp,
  Package,
  DollarSign,
  ShoppingCart,
  CreditCard
} from 'lucide-react';
import { useAlert } from '../contexts/AlertContext';
import { formatKES } from '../utils/currency';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Pagination from './Pagination';
import { useAutoRefresh } from '../contexts/DataRefreshContext';

interface SaleData {
  id: string;
  receipt_number: string;
  customer_name: string | null;
  total_amount: number;
  payment_method: 'cash' | 'mpesa' | 'card' | 'insurance';
  sales_person_name: string;
  created_at: string;
  sale_items: {
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
}

interface PaymentMethodStats {
  cash: number;
  mpesa: number;
  card: number;
  insurance: number;
}

const SalesHistory: React.FC = () => {
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [salesData, setSalesData] = useState<SaleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'day' | 'week' | 'month' | 'year' | 'custom'>('day');
  const [paymentFilter, setPaymentFilter] = useState('all');

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const fetchSalesDataCallback = useCallback(() => {
    fetchSalesData();
  }, []);

  useEffect(() => {
    fetchSalesData();
  }, []);

  useAutoRefresh('sales', fetchSalesDataCallback);

  const fetchSalesData = async () => {
    try {
      setLoading(true);

      const { data: sales, error } = await supabase
        .from('sales')
        .select(`
          id,
          receipt_number,
          customer_name,
          total_amount,
          payment_method,
          sales_person_name,
          created_at,
          sale_items (
            product_name,
            quantity,
            unit_price,
            total_price
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSalesData(sales || []);
    } catch (error) {
      console.error('Error fetching sales data:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to load sales data',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const getWeeksInMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const days = lastDay.getDate();
    return Math.ceil(days / 7);
  };

  const getWeekDateRange = (year: number, month: number, week: number) => {
    const startDay = (week - 1) * 7 + 1;
    const endDay = Math.min(week * 7, new Date(year, month, 0).getDate());
    const startDate = new Date(year, month - 1, startDay);
    const endDate = new Date(year, month - 1, endDay, 23, 59, 59, 999);
    return { startDate, endDate };
  };

  const filteredSales = useMemo(() => {
    let filtered = [...salesData];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(sale =>
        sale.receipt_number.toLowerCase().includes(term) ||
        sale.customer_name?.toLowerCase().includes(term) ||
        sale.sales_person_name.toLowerCase().includes(term) ||
        sale.sale_items.some(item => item.product_name.toLowerCase().includes(term))
      );
    }

    if (paymentFilter !== 'all') {
      filtered = filtered.filter(sale => sale.payment_method === paymentFilter);
    }

    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    switch (filterType) {
      case 'day': {
        const selected = new Date(selectedDate);
        startDate = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());
        endDate = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 23, 59, 59, 999);
        break;
      }
      case 'week': {
        const range = getWeekDateRange(selectedYear, selectedMonth, selectedWeek);
        startDate = range.startDate;
        endDate = range.endDate;
        break;
      }
      case 'month': {
        startDate = new Date(selectedYear, selectedMonth - 1, 1);
        endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);
        break;
      }
      case 'year': {
        startDate = new Date(selectedYear, 0, 1);
        endDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
        break;
      }
      case 'custom': {
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
        }
        break;
      }
    }

    if (startDate && endDate) {
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.created_at);
        return saleDate >= startDate! && saleDate <= endDate!;
      });
    }

    return filtered;
  }, [salesData, searchTerm, paymentFilter, filterType, selectedDate, selectedYear, selectedMonth, selectedWeek, customStartDate, customEndDate]);

  const statistics = useMemo(() => {
    const uniqueTransactions = filteredSales.length;
    const totalSales = filteredSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);

    const paymentMethodTotals: PaymentMethodStats = {
      cash: 0,
      mpesa: 0,
      card: 0,
      insurance: 0
    };

    filteredSales.forEach(sale => {
      paymentMethodTotals[sale.payment_method] += Number(sale.total_amount);
    });

    const totalDrugsSold = filteredSales.reduce((sum, sale) => {
      return sum + sale.sale_items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);

    const uniqueProducts = new Set(
      filteredSales.flatMap(sale => sale.sale_items.map(item => item.product_name))
    ).size;

    return {
      uniqueTransactions,
      totalSales,
      paymentMethodTotals,
      totalDrugsSold,
      uniqueProducts
    };
  }, [filteredSales]);

  const paginatedSales = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredSales.slice(startIndex, endIndex);
  }, [filteredSales, currentPage]);

  const exportReport = () => {
    try {
      if (filteredSales.length === 0) {
        showAlert({ title: 'Sales Report', message: 'No sales data to export', type: 'warning' });
        return;
      }

      const content = `<!DOCTYPE html>
<html>
<head>
  <title>Sales Report - ${new Date().toLocaleDateString('en-KE')}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 8px 4px; text-align: left; border: 1px solid #333; font-size: 10px; }
    th { background-color: #f0f0f0; font-weight: bold; }
    h1 { color: #333; text-align: center; margin-bottom: 30px; }
    .summary { margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .stat-box { padding: 10px; border: 1px solid #ddd; }
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>WESABI PHARMACY - SALES REPORT</h1>
  <div class="summary">
    <div class="stat-box">
      <strong>Generated:</strong> ${new Date().toLocaleDateString('en-KE')} at ${new Date().toLocaleTimeString('en-KE')}
    </div>
    <div class="stat-box">
      <strong>Total Transactions:</strong> ${statistics.uniqueTransactions}
    </div>
    <div class="stat-box">
      <strong>Total Sales:</strong> ${formatKES(statistics.totalSales)}
    </div>
    <div class="stat-box">
      <strong>Total Drugs Sold:</strong> ${statistics.totalDrugsSold} units
    </div>
    <div class="stat-box">
      <strong>Cash:</strong> ${formatKES(statistics.paymentMethodTotals.cash)}
    </div>
    <div class="stat-box">
      <strong>M-Pesa:</strong> ${formatKES(statistics.paymentMethodTotals.mpesa)}
    </div>
    <div class="stat-box">
      <strong>Card:</strong> ${formatKES(statistics.paymentMethodTotals.card)}
    </div>
    <div class="stat-box">
      <strong>Insurance:</strong> ${formatKES(statistics.paymentMethodTotals.insurance)}
    </div>
  </div>

  <table>
    <tr>
      <th>Date</th>
      <th>Receipt</th>
      <th>Customer</th>
      <th>Items</th>
      <th>Total Amount</th>
      <th>Payment</th>
      <th>Sales Person</th>
    </tr>
    ${filteredSales.map(sale => `
    <tr>
      <td>${new Date(sale.created_at).toLocaleDateString('en-KE')} ${new Date(sale.created_at).toLocaleTimeString('en-KE')}</td>
      <td>${sale.receipt_number}</td>
      <td>${sale.customer_name || 'N/A'}</td>
      <td>${sale.sale_items.map(item => `${item.product_name} (${item.quantity})`).join(', ')}</td>
      <td>${formatKES(sale.total_amount)}</td>
      <td>${sale.payment_method.toUpperCase()}</td>
      <td>${sale.sales_person_name}</td>
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
        showAlert({ title: 'Sales Report', message: 'Please allow popups to export PDF reports', type: 'warning' });
      }
    } catch (error) {
      console.error('Error exporting sales report:', error);
      showAlert({ title: 'Sales Report', message: 'Error generating PDF report. Please try again.', type: 'error' });
    }
  };

  const getFilterDescription = () => {
    switch (filterType) {
      case 'day':
        return new Date(selectedDate).toLocaleDateString('en-KE');
      case 'week':
        const { startDate, endDate } = getWeekDateRange(selectedYear, selectedMonth, selectedWeek);
        return `Week ${selectedWeek} of ${new Date(selectedYear, selectedMonth - 1).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })} (${startDate.toLocaleDateString('en-KE')} - ${endDate.toLocaleDateString('en-KE')})`;
      case 'month':
        return new Date(selectedYear, selectedMonth - 1).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
      case 'year':
        return selectedYear.toString();
      case 'custom':
        if (customStartDate && customEndDate) {
          return `${new Date(customStartDate).toLocaleDateString('en-KE')} - ${new Date(customEndDate).toLocaleDateString('en-KE')}`;
        }
        return 'Select date range';
      default:
        return '';
    }
  };

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
        <button
          onClick={exportReport}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Export PDF</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.uniqueTransactions}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">{formatKES(statistics.totalSales)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Drugs Sold</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.totalDrugsSold}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Package className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unique Products</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.uniqueProducts}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Cash</p>
            <p className="text-lg font-bold text-gray-900">{formatKES(statistics.paymentMethodTotals.cash)}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">M-Pesa</p>
            <p className="text-lg font-bold text-gray-900">{formatKES(statistics.paymentMethodTotals.mpesa)}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Card</p>
            <p className="text-lg font-bold text-gray-900">{formatKES(statistics.paymentMethodTotals.card)}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Insurance</p>
            <p className="text-lg font-bold text-gray-900">{formatKES(statistics.paymentMethodTotals.insurance)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search receipts, products, customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-gray-400" />
              <select
                value={paymentFilter}
                onChange={(e) => {
                  setPaymentFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Payments</option>
                <option value="cash">Cash</option>
                <option value="mpesa">M-Pesa</option>
                <option value="card">Card</option>
                <option value="insurance">Insurance</option>
              </select>
            </div>
          </div>

          {filterType === 'day' && (
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          )}

          {filterType === 'week' && (
            <div className="grid grid-cols-3 gap-4">
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(Number(e.target.value));
                  setSelectedWeek(1);
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {months.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
              <select
                value={selectedWeek}
                onChange={(e) => {
                  setSelectedWeek(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {Array.from({ length: getWeeksInMonth(selectedYear, selectedMonth) }, (_, i) => i + 1).map(week => (
                  <option key={week} value={week}>Week {week}</option>
                ))}
              </select>
            </div>
          )}

          {filterType === 'month' && (
            <div className="grid grid-cols-2 gap-4">
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {months.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>
          )}

          {filterType === 'year' && (
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          )}

          {filterType === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Start Date"
              />
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="End Date"
              />
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Loading sales data...
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales Person</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedSales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        No sales found for the selected period
                      </td>
                    </tr>
                  ) : (
                    paginatedSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(sale.created_at).toLocaleDateString('en-KE')}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(sale.created_at).toLocaleTimeString('en-KE')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {sale.receipt_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {sale.customer_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs">
                            {sale.sale_items.map((item, idx) => (
                              <div key={idx} className="truncate">
                                {item.product_name} x{item.quantity}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                          {formatKES(sale.total_amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            sale.payment_method === 'cash' ? 'bg-green-100 text-green-800' :
                            sale.payment_method === 'mpesa' ? 'bg-blue-100 text-blue-800' :
                            sale.payment_method === 'card' ? 'bg-purple-100 text-purple-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {sale.payment_method.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {sale.sales_person_name}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={filteredSales.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              itemName="sales"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default SalesHistory;
