import React, { useState, useEffect } from 'react';
import { generateSalesReport } from '../utils/pdfGenerator';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';

interface Sale {
  id: number;
  total_amount: number;
  payment_method: string;
  created_at: string;
  items?: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
}

interface DailySales {
  date: string;
  total: number;
  count: number;
}

interface TopProduct {
  product_name: string;
  total_quantity: number;
  total_revenue: number;
}

const Reports: React.FC = () => {
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sales, setSales] = useState<Sale[]>([]);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [avgSale, setAvgSale] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    loadReportData();
  }, [dateRange, startDate, endDate]);

  const getDateFilter = () => {
    const now = new Date();
    let start = new Date();

    switch (dateRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
      case 'custom':
        if (startDate && endDate) {
          return { start: new Date(startDate), end: new Date(endDate) };
        }
        break;
    }

    return { start, end: now };
  };

  const loadReportData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateFilter();
      if (!start || !end) return;

      // Get all sales in range
      const allSales = await window.electronAPI.sales.getAll();
      const filteredSales = allSales.filter((sale: Sale) => {
        const saleDate = new Date(sale.created_at);
        return saleDate >= start && saleDate <= end;
      });

      setSales(filteredSales);

      // Calculate stats
      const revenue = filteredSales.reduce((sum: number, sale: Sale) => sum + sale.total_amount, 0);
      setTotalRevenue(revenue);
      setTotalSales(filteredSales.length);
      setAvgSale(filteredSales.length > 0 ? revenue / filteredSales.length : 0);

      // Count total items sold
      const itemCount = filteredSales.reduce((sum: number, sale: Sale) => {
        return sum + (sale.items?.reduce((s, item) => s + item.quantity, 0) || 0);
      }, 0);
      setTotalItems(itemCount);

      // Group by date
      const dailyMap = new Map<string, { total: number; count: number }>();
      filteredSales.forEach((sale: Sale) => {
        const date = new Date(sale.created_at).toISOString().split('T')[0];
        const existing = dailyMap.get(date) || { total: 0, count: 0 };
        dailyMap.set(date, {
          total: existing.total + sale.total_amount,
          count: existing.count + 1,
        });
      });

      const daily = Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));
      setDailySales(daily);

      // Calculate top products
      const productMap = new Map<string, { quantity: number; revenue: number }>();
      filteredSales.forEach((sale: Sale) => {
        sale.items?.forEach(item => {
          const existing = productMap.get(item.product_name) || { quantity: 0, revenue: 0 };
          productMap.set(item.product_name, {
            quantity: existing.quantity + item.quantity,
            revenue: existing.revenue + (item.unit_price * item.quantity),
          });
        });
      });

      const top = Array.from(productMap.entries())
        .map(([name, data]) => ({
          product_name: name,
          total_quantity: data.quantity,
          total_revenue: data.revenue,
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 10);
      setTopProducts(top);

    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Sale ID', 'Total Amount', 'Payment Method', 'Items'];
    const rows = sales.map(sale => [
      new Date(sale.created_at).toLocaleString(),
      sale.id,
      sale.total_amount.toFixed(2),
      sale.payment_method,
      sale.items?.length || 0,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportToPDF = () => {
    const data = sales.map(sale => [
      new Date(sale.created_at).toLocaleString(),
      `#${sale.id}`,
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Sales Reports</h1>
        
        <div className="flex gap-3">
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            Export PDF
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            Export CSV
          </button>
        </div>
      </div>SalesReport({
      title: 'Sales Report',
      dateRange: rangeText,
      columns: ['Date', 'Sale ID', 'Total', 'Payment', 'Items'],
      data,
      summary: {
        'Total Sales': totalSales,
        'Total Revenue': `$${totalRevenue.toFixed(2)}`,
        'Average Sale': `$${avgSale.toFixed(2)}`,
        'Items Sold': totalItems,
      },
    });
  };

  const maxDailySale = Math.max(...dailySales.map(d => d.total), 1);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Sales Reports</h1>
        
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <CalendarIcon className="w-5 h-5 text-gray-500" />
          
          <div className="flex gap-2">
            {['today', 'week', 'month', 'year', 'custom'].map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range as any)}
                className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                  dateRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2"
              />
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
            <CurrencyDollarIcon className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-800">
            ${totalRevenue.toFixed(2)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Total Sales</h3>
            <ShoppingBagIcon className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{totalSales}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Avg Sale</h3>
            <ArrowTrendingUpIcon className="w-8 h-8 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-gray-800">
            ${avgSale.toFixed(2)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Items Sold</h3>
            <ChartBarIcon className="w-8 h-8 text-orange-500" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{totalItems}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Daily Sales</h2>
          
          {loading ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Loading...
            </div>
          ) : dailySales.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No sales data
            </div>
          ) : (
            <div className="space-y-3">
              {dailySales.map(day => (
                <div key={day.date} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {new Date(day.date).toLocaleDateString()}
                    </span>
                    <span className="font-semibold text-gray-800">
                      ${day.total.toFixed(2)} ({day.count} sales)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${(day.total / maxDailySale) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Top Products</h2>
          
          {loading ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Loading...
            </div>
          ) : topProducts.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No product data
            </div>
          ) : (
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.product_name} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">
                      {product.product_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {product.total_quantity} units sold
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      ${product.total_revenue.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment Methods Breakdown */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Payment Methods</h2>
        
        {loading ? (
          <div className="h-32 flex items-center justify-center text-gray-500">
            Loading...
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {['cash', 'card', 'mobile'].map(method => {
              const methodSales = sales.filter(s => s.payment_method === method);
              const methodTotal = methodSales.reduce((sum, s) => sum + s.total_amount, 0);
              const percentage = totalRevenue > 0 ? (methodTotal / totalRevenue) * 100 : 0;

              return (
                <div key={method} className="text-center">
                  <p className="text-sm font-medium text-gray-500 capitalize mb-2">{method}</p>
                  <p className="text-2xl font-bold text-gray-800 mb-1">
                    ${methodTotal.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {methodSales.length} sales ({percentage.toFixed(1)}%)
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
