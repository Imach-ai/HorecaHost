import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Package, FileText, Plus, TrendingUp, DollarSign, Info, ArrowRight, Calendar, TrendingDown, Activity } from 'lucide-react'
import { productsApi, quotationsApi } from '../api'
import { formatCurrency, formatDate } from '../utils/formatters'

function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalQuotations: 0,
    recentQuotations: [],
    totalValue: 0,
    thisMonthValue: 0,
    lastMonthValue: 0,
    thisMonthCount: 0,
    lastMonthCount: 0,
    averageQuotationValue: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Load more quotations to calculate metrics (last 100 for performance)
      const [productsRes, quotationsRes] = await Promise.all([
        productsApi.getAll({ minimal: true, limit: 1 }), // Just get count
        quotationsApi.getAll({ limit: 100, sortBy: 'created_at', sortOrder: 'DESC' })
      ])

      // Handle paginated response
      let allQuotations = Array.isArray(quotationsRes.data) 
        ? quotationsRes.data 
        : (quotationsRes.data.data || [])
      
      // Get total counts from pagination if available
      const productsData = Array.isArray(productsRes.data) 
        ? productsRes.data 
        : (productsRes.data.data || [])
      const totalProducts = productsRes.data.pagination?.total || productsData.length
      const totalQuotations = quotationsRes.data.pagination?.total || allQuotations.length

      // Calculate performance metrics
      const now = new Date()
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

      const thisMonthQuotations = allQuotations.filter(q => {
        const qDate = new Date(q.created_at)
        return qDate >= thisMonthStart
      })

      const lastMonthQuotations = allQuotations.filter(q => {
        const qDate = new Date(q.created_at)
        return qDate >= lastMonthStart && qDate < thisMonthStart
      })

      const thisMonthValue = thisMonthQuotations.reduce((sum, q) => sum + (parseFloat(q.grand_total) || 0), 0)
      const lastMonthValue = lastMonthQuotations.reduce((sum, q) => sum + (parseFloat(q.grand_total) || 0), 0)
      const totalValue = allQuotations.reduce((sum, q) => sum + (parseFloat(q.grand_total) || 0), 0)
      const averageQuotationValue = totalQuotations > 0 ? totalValue / totalQuotations : 0

      setStats({
        totalProducts,
        totalQuotations,
        recentQuotations: allQuotations.slice(0, 5),
        totalValue,
        thisMonthValue,
        lastMonthValue,
        thisMonthCount: thisMonthQuotations.length,
        lastMonthCount: lastMonthQuotations.length,
        averageQuotationValue
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  // Calculate percentage changes
  const valueChangePercent = stats.lastMonthValue > 0 
    ? ((stats.thisMonthValue - stats.lastMonthValue) / stats.lastMonthValue * 100).toFixed(1)
    : stats.thisMonthValue > 0 ? 100 : 0
  
  const countChangePercent = stats.lastMonthCount > 0
    ? ((stats.thisMonthCount - stats.lastMonthCount) / stats.lastMonthCount * 100).toFixed(1)
    : stats.thisMonthCount > 0 ? 100 : 0

  const valueTrendUp = stats.thisMonthValue >= stats.lastMonthValue
  const countTrendUp = stats.thisMonthCount >= stats.lastMonthCount

  return (
    <div className="animate-fadeIn pb-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
            <p className="text-gray-600">Welcome to HORECA Quotation Tool</p>
          </div>
        </div>
      </div>

      {/* Stats Grid - Enhanced Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Products Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-md">
              <Package className="text-white" size={24} />
            </div>
            <Info className="text-gray-400" size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">Total Products</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalProducts.toLocaleString()}</p>
            <p className="text-xs text-gray-400">Active catalog items</p>
          </div>
        </div>

        {/* Total Quotations Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-md">
              <FileText className="text-white" size={24} />
            </div>
            <Info className="text-gray-400" size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">Total Quotations</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalQuotations.toLocaleString()}</p>
            <p className="text-xs text-gray-400">All time quotations</p>
          </div>
        </div>

        {/* Total Value Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-md">
              <DollarSign className="text-white" size={24} />
            </div>
            <Info className="text-gray-400" size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">Total Value</p>
            <p className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(stats.totalValue)}</p>
            <p className="text-xs text-gray-400">Grand total value</p>
          </div>
        </div>

        {/* This Month Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-md">
              <TrendingUp className="text-white" size={24} />
            </div>
            <Info className="text-gray-400" size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">This Month</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">{stats.thisMonthCount}</p>
            <p className="text-xs text-gray-400">Quotations created</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Overview Card - Large */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">Overview</h2>
              <Info className="text-gray-400" size={16} />
            </div>
          </div>
          
          {/* Performance Metrics Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Monthly Value Metric */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">This Month Value</p>
                  <p className="text-2xl font-bold text-blue-900">{formatCurrency(stats.thisMonthValue)}</p>
                </div>
                <div className={`p-2 rounded-lg ${valueTrendUp ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  {valueTrendUp ? (
                    <TrendingUp className={`${valueTrendUp ? 'text-emerald-600' : 'text-red-600'}`} size={20} />
                  ) : (
                    <TrendingDown className="text-red-600" size={20} />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${valueTrendUp ? 'text-emerald-600' : 'text-red-600'}`}>
                  {valueTrendUp ? '+' : ''}{valueChangePercent}%
                </span>
                <span className="text-xs text-blue-600">vs last month</span>
              </div>
            </div>

            {/* Monthly Count Metric */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">This Month Count</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.thisMonthCount}</p>
                </div>
                <div className={`p-2 rounded-lg ${countTrendUp ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  {countTrendUp ? (
                    <TrendingUp className="text-emerald-600" size={20} />
                  ) : (
                    <TrendingDown className="text-red-600" size={20} />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${countTrendUp ? 'text-emerald-600' : 'text-red-600'}`}>
                  {countTrendUp ? '+' : ''}{countChangePercent}%
                </span>
                <span className="text-xs text-purple-600">vs last month</span>
              </div>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-2">Average Value</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.averageQuotationValue)}</p>
              <p className="text-xs text-gray-400 mt-1">Per quotation</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl p-4 border border-emerald-200">
              <p className="text-xs font-medium text-gray-500 mb-2">Total Products</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalProducts.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">In catalog</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-4 border border-amber-200">
              <p className="text-xs font-medium text-gray-500 mb-2">Total Quotations</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalQuotations.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">All time</p>
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
          </div>
          
          <div className="space-y-4">
            <Link 
              to="/quotation/new" 
              className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl hover:from-primary-100 hover:to-primary-200 transition-all duration-200 border border-primary-200 group"
            >
              <div className="p-3 bg-primary-600 rounded-xl shadow-md group-hover:scale-110 transition-transform">
                <Plus className="text-white" size={22} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">New Quotation</p>
                <p className="text-xs text-gray-600 mt-0.5">Create a new quote</p>
              </div>
              <ArrowRight className="text-primary-600 group-hover:translate-x-1 transition-transform" size={20} />
            </Link>

            <Link 
              to="/products" 
              className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl hover:from-emerald-100 hover:to-emerald-200 transition-all duration-200 border border-emerald-200 group"
            >
              <div className="p-3 bg-emerald-600 rounded-xl shadow-md group-hover:scale-110 transition-transform">
                <Package className="text-white" size={22} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Manage Products</p>
                <p className="text-xs text-gray-600 mt-0.5">View & manage catalog</p>
              </div>
              <ArrowRight className="text-emerald-600 group-hover:translate-x-1 transition-transform" size={20} />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Quotations Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">Recent Quotations</h2>
            <Info className="text-gray-400" size={16} />
          </div>
          <Link 
            to="/quotations" 
            className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold text-sm transition-colors"
          >
            View All
            <ArrowRight size={16} />
          </Link>
        </div>
        
        {stats.recentQuotations.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="text-gray-300 mx-auto mb-4" size={48} />
            <p className="text-gray-500 font-medium">No quotations yet</p>
            <p className="text-sm text-gray-400 mt-2">Create your first quotation to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.recentQuotations.map((quotation, index) => (
              <Link 
                key={quotation.id}
                to={`/quotation/${quotation.id}`}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl hover:from-gray-100 hover:to-gray-50 transition-all duration-200 border border-gray-200 hover:border-primary-300 hover:shadow-md group"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary-200 transition-colors">
                    <FileText className="text-primary-600" size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-bold text-gray-900">{quotation.quotation_number}</p>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-md">
                        {quotation.status || 'draft'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span>{quotation.customer_name}</span>
                      <span className="text-gray-300">•</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="text-gray-400" size={14} />
                        <span>{formatDate(quotation.date)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="text-lg font-bold text-gray-900 mb-1">{formatCurrency(quotation.grand_total)}</p>
                  <ArrowRight className="text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all ml-auto" size={18} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard

