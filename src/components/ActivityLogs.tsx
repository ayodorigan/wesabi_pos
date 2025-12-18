import React, { useState, useMemo } from 'react';
import {
  Clock,
  User,
  Filter,
  Download,
  Search
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAlert } from '../contexts/AlertContext';
import { usePagination } from '../hooks/usePagination';
import Pagination from './Pagination';

const ActivityLogs: React.FC = () => {
  const { activityLogs } = useApp();
  const { showAlert } = useAlert();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');

  // Get unique actions and users for filters
  const uniqueActions = useMemo(() =>
    Array.from(new Set((activityLogs || []).map(log => log.action))).sort(),
    [activityLogs]
  );
  const uniqueUsers = useMemo(() =>
    Array.from(new Set((activityLogs || []).map(log => log.userName))).sort(),
    [activityLogs]
  );

  // Filter logs
  const filteredLogs = useMemo(() => {
    return (activityLogs || []).filter(log => {
      const matchesSearch = log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           log.action.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAction = actionFilter === 'all' || log.action === actionFilter;
      const matchesUser = userFilter === 'all' || log.userName === userFilter;

      return matchesSearch && matchesAction && matchesUser;
    });
  }, [activityLogs, searchTerm, actionFilter, userFilter]);

  const {
    currentPage,
    paginatedItems,
    goToPage,
    itemsPerPage
  } = usePagination({ items: filteredLogs, itemsPerPage: 50 });

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'ADD_PRODUCT': return 'Product Added';
      case 'UPDATE_PRODUCT': return 'Product Updated';
      case 'DELETE_PRODUCT': return 'Product Deleted';
      case 'SALE': return 'Sale Completed';
      case 'STOCK_TAKE': return 'Stock Take';
      case 'IMPORT_PRODUCTS': return 'Products Imported';
      case 'ADD_CATEGORY': return 'Category Added';
      case 'ADD_SUPPLIER': return 'Supplier Added';
      case 'UPDATE_USERS': return 'Users Updated';
      default: return action.replace(/_/g, ' ');
    }
  };

  const exportLogs = () => {
    try {
      if (filteredLogs.length === 0) {
        showAlert({ title: 'Activity Logs', message: 'No activity logs to export', type: 'warning' });
        return;
      }

      const content = `<!DOCTYPE html>
<html>
<head>
  <title>Activity Logs - ${new Date().toLocaleDateString('en-KE')}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px 6px; text-align: left; border: 1px solid #333; font-size: 12px; }
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
  <h1>WESABI PHARMACY - ACTIVITY LOGS</h1>
  <div class="summary">
    <p><strong>Generated:</strong> ${new Date().toLocaleDateString('en-KE')} at ${new Date().toLocaleTimeString('en-KE')}</p>
    <p><strong>Total Activities:</strong> ${filteredLogs.length}</p>
  </div>
  
  <table>
    <tr>
      <th>Timestamp</th>
      <th>User</th>
      <th>Action</th>
      <th>Details</th>
    </tr>
    ${filteredLogs.map(log => `
    <tr>
      <td>${log.timestamp.toLocaleDateString('en-KE')} ${log.timestamp.toLocaleTimeString('en-KE')}</td>
      <td>${log.userName}</td>
      <td>${getActionLabel(log.action)}</td>
      <td>${log.details}</td>
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
        showAlert({ title: 'Activity Logs', message: 'Please allow popups to export PDF reports', type: 'warning' });
      }
    } catch (error) {
      console.error('Error exporting activity logs:', error);
      showAlert({ title: 'Activity Logs', message: 'Error generating PDF report. Please try again.', type: 'error' });
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'ADD_PRODUCT':
      case 'SALE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE_PRODUCT':
      case 'UPDATE_USERS':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE_PRODUCT':
        return 'bg-red-100 text-red-800';
      case 'STOCK_TAKE':
        return 'bg-purple-100 text-purple-800';
      case 'IMPORT_PRODUCTS':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
        <button
          onClick={exportLogs}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Export Logs</span>
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Activities</p>
              <p className="text-2xl font-bold text-blue-600">{activityLogs.length}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Activities</p>
              <p className="text-2xl font-bold text-green-600">
                {activityLogs.filter(log => {
                  const today = new Date();
                  const logDate = new Date(log.timestamp);
                  return logDate.toDateString() === today.toDateString();
                }).length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-purple-600">{uniqueUsers.length}</p>
            </div>
            <User className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Activity Types</p>
              <p className="text-2xl font-bold text-orange-600">{uniqueActions.length}</p>
            </div>
            <Filter className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">All Actions</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{getActionLabel(action)}</option>
            ))}
          </select>

          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">All Users</option>
            {uniqueUsers.map(user => (
              <option key={user} value={user}>{user}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Activity Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No activity logs found
                  </td>
                </tr>
              ) : (
                paginatedItems.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {log.timestamp.toLocaleDateString('en-KE')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {log.timestamp.toLocaleTimeString('en-KE')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {log.userName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{log.userName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-md truncate" title={log.details}>
                        {log.details}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={filteredLogs.length}
          itemsPerPage={itemsPerPage}
          onPageChange={goToPage}
          itemName="activity logs"
        />
      </div>
    </div>
  );
};

export default ActivityLogs;