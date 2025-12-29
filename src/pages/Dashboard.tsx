import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ChartBarIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface DashboardStats {
  todaySales: number;
  todayRevenue: number;
  lowStockCount: number;
  totalProducts: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayRevenue: 0,
    lowStockCount: 0,
    totalProducts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [salesStats, lowStockProducts, allProducts] = await Promise.all([
        window.electronAPI.sales.getStats(),
        window.electronAPI.products.getLowStock(),
        window.electronAPI.products.getAll(),
      ]);

      setStats({
        todaySales: salesStats.total_transactions || 0,
        todayRevenue: salesStats.total_revenue || 0,
        lowStockCount: lowStockProducts.length,
        totalProducts: allProducts.length,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      name: "Today's Sales",
      value: stats.todaySales,
      icon: ShoppingCartIcon,
      color: 'bg-blue-500',
    },
    {
      name: "Today's Revenue",
      value: `$${stats.todayRevenue.toFixed(2)}`,
      icon: CurrencyDollarIcon,
      color: 'bg-green-500',
    },
    {
      name: 'Total Products',
      value: stats.totalProducts,
      icon: ChartBarIcon,
      color: 'bg-purple-500',
    },
    {
      name: 'Low Stock Items',
      value: stats.lowStockCount,
      icon: ExclamationTriangleIcon,
      color: 'bg-red-500',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back, {user?.full_name}!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            New Sale
          </button>
          <button className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors">
            Add Product
          </button>
          <button className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors">
            View Reports
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
