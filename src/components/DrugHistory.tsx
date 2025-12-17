import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Package, Calendar, ChevronDown } from 'lucide-react';
import { useAlert } from '../contexts/AlertContext';
import { formatKES } from '../utils/currency';
import { supabase } from '../lib/supabase';
import Pagination from './Pagination';
import { useAutoRefresh } from '../contexts/DataRefreshContext';

interface DrugSale {
  id: string;
  product_name: string;
  batch_number: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  sale_date: string;
  receipt_number: string;
  sales_person_name: string;
  payment_method: string;
}

const DrugHistory: React.FC = () => {
  const { showAlert } = useAlert();
  const [drugSales, setDrugSales] = useState<DrugSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const searchRef = useRef<HTMLDivElement>(null);

  const fetchDrugSalesCallback = useCallback(() => {
    fetchDrugSales();
  }, []);

  useEffect(() => {
    fetchDrugSales();
  }, []);

  useAutoRefresh('sales', fetchDrugSalesCallback);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchDrugSales = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('sale_items')
        .select(`
          id,
          product_name,
          batch_number,
          quantity,
          unit_price,
          total_price,
          sale_id,
          sales!inner (
            receipt_number,
            sales_person_name,
            payment_method,
            created_at
          )
        `)
        .order('sales(created_at)', { ascending: false });

      if (error) throw error;

      const formattedData: DrugSale[] = (data || []).map((item: any) => ({
        id: item.id,
        product_name: item.product_name,
        batch_number: item.batch_number,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        sale_date: item.sales.created_at,
        receipt_number: item.sales.receipt_number,
        sales_person_name: item.sales.sales_person_name,
        payment_method: item.sales.payment_method,
      }));

      setDrugSales(formattedData);
    } catch (error) {
      console.error('Error fetching drug sales:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to load drug sales history',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCurrentPage(1);

    if (value.trim()) {
      const uniqueProducts = Array.from(
        new Set(
          drugSales
            .map(sale => sale.product_name)
            .filter(name => name.toLowerCase().includes(value.toLowerCase()))
        )
      ).slice(0, 10);
      setSuggestions(uniqueProducts);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
    setCurrentPage(1);
  };

  const filteredSales = drugSales.filter(sale =>
    sale.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSales = filteredSales.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading drug history...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Drug History</h2>
        <div className="text-sm text-gray-600">
          Total Records: {filteredSales.length}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4" ref={searchRef}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search by Drug Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={() => {
                if (searchTerm.trim() && suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              placeholder="Type to search for a drug..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <ChevronDown
              className="absolute right-3 top-3 h-4 w-4 text-gray-400 cursor-pointer"
              onClick={() => setShowSuggestions(!showSuggestions)}
            />

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-4 py-2 hover:bg-green-50 cursor-pointer text-sm"
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {filteredSales.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {searchTerm ? 'No sales found for this drug' : 'No sales recorded yet'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Drug Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sale Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Receipt No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sales Person
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {sale.product_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {sale.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatKES(sale.unit_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatKES(sale.total_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {new Date(sale.sale_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {sale.receipt_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {sale.sales_person_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          sale.payment_method === 'cash' ? 'bg-green-100 text-green-800' :
                          sale.payment_method === 'mpesa' ? 'bg-blue-100 text-blue-800' :
                          sale.payment_method === 'card' ? 'bg-orange-100 text-orange-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {sale.payment_method.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DrugHistory;
