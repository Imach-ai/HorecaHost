import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Package, FileText, Plus, TrendingUp, DollarSign } from 'lucide-react'
import { productsApi, quotationsApi } from '../api'

function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalQuotations: 0,
    recentQuotations: [],
    totalValue: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [productsRes, quotationsRes] = await Promise.all([
        productsApi.getAll(),
        quotationsApi.getAll()
      ])

      const quotations = quotationsRes.data
      const totalValue = quotations.reduce((sum, q) => sum + (q.grand_total || 0), 0)

      setStats({
        totalProducts: productsRes.data.length,
        totalQuotations: quotations.length,
        recentQuotations: quotations.slice(0, 5),
        totalValue
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return `AED ${parseFloat(amount || 0).toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome to HORECA Quotation Tool</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 rounded-xl">
              <Package className="text-primary-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Products</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalProducts}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-xl">
              <FileText className="text-emerald-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Quotations</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalQuotations}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-xl">
              <DollarSign className="text-amber-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Value</p>
              <p className="text-xl font-bold text-gray-800">{formatCurrency(stats.totalValue)}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <TrendingUp className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">This Month</p>
              <p className="text-2xl font-bold text-gray-800">
                {stats.recentQuotations.filter(q => {
                  const qDate = new Date(q.created_at)
                  const now = new Date()
                  return qDate.getMonth() === now.getMonth() && qDate.getFullYear() === now.getFullYear()
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link 
              to="/quotation/new" 
              className="flex items-center gap-3 p-4 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors group"
            >
              <div className="p-2 bg-primary-600 rounded-lg group-hover:scale-110 transition-transform">
                <Plus className="text-white" size={20} />
              </div>
              <div>
                <p className="font-medium text-gray-800">New Quotation</p>
                <p className="text-sm text-gray-500">Create a new quote</p>
              </div>
            </Link>

            <Link 
              to="/products" 
              className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors group"
            >
              <div className="p-2 bg-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
                <Package className="text-white" size={20} />
              </div>
              <div>
                <p className="font-medium text-gray-800">Add Product</p>
                <p className="text-sm text-gray-500">Manage products</p>
              </div>
            </Link>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Recent Quotations</h2>
            <Link to="/quotations" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View All →
            </Link>
          </div>
          
          {stats.recentQuotations.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No quotations yet</p>
          ) : (
            <div className="space-y-3">
              {stats.recentQuotations.map(quotation => (
                <Link 
                  key={quotation.id}
                  to={`/quotation/${quotation.id}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-800">{quotation.quotation_number}</p>
                    <p className="text-sm text-gray-500">{quotation.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-800">{formatCurrency(quotation.grand_total)}</p>
                    <p className="text-xs text-gray-400">{formatDate(quotation.date)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard

