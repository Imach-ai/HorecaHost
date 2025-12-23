import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Eye, Edit, Trash2, FileDown, FileText, Calendar, User } from 'lucide-react'
import { quotationsApi } from '../api'

function QuotationsPage() {
  const [quotations, setQuotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    loadQuotations()
  }, [searchTerm, statusFilter])

  const loadQuotations = async () => {
    try {
      const response = await quotationsApi.getAll({ 
        search: searchTerm, 
        status: statusFilter 
      })
      setQuotations(response.data)
    } catch (error) {
      console.error('Error loading quotations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, quotationNumber) => {
    if (!window.confirm(`Are you sure you want to delete quotation ${quotationNumber}?`)) return

    try {
      await quotationsApi.delete(id)
      loadQuotations()
    } catch (error) {
      console.error('Error deleting quotation:', error)
      alert('Failed to delete quotation')
    }
  }

  const downloadPdf = (id) => {
    const url = quotationsApi.getPdfUrl(id)
    window.open(url, '_blank')
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

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-amber-100 text-amber-700 border-amber-200',
      sent: 'bg-blue-100 text-blue-700 border-blue-200',
      accepted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      rejected: 'bg-red-100 text-red-700 border-red-200'
    }
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${styles[status] || styles.draft}`}>
        {status || 'draft'}
      </span>
    )
  }

  const stats = {
    total: quotations.length,
    draft: quotations.filter(q => q.status === 'draft').length,
    sent: quotations.filter(q => q.status === 'sent').length,
    accepted: quotations.filter(q => q.status === 'accepted').length,
    totalValue: quotations.reduce((sum, q) => sum + (q.grand_total || 0), 0)
  }

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Quotations</h1>
          <p className="text-gray-500 mt-1">Manage your quotations</p>
        </div>
        <Link to="/quotation/new" className="btn-primary flex items-center gap-2">
          <Plus size={20} />
          New Quotation
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
          <div className="text-sm text-gray-500">Total</div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <div className="text-2xl font-bold text-amber-700">{stats.draft}</div>
          <div className="text-sm text-amber-600">Drafts</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="text-2xl font-bold text-blue-700">{stats.sent}</div>
          <div className="text-sm text-blue-600">Sent</div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
          <div className="text-2xl font-bold text-emerald-700">{stats.accepted}</div>
          <div className="text-sm text-emerald-600">Accepted</div>
        </div>
        <div className="bg-primary-50 rounded-xl p-4 border border-primary-200 col-span-2 md:col-span-1">
          <div className="text-xl font-bold text-primary-700 truncate">{formatCurrency(stats.totalValue)}</div>
          <div className="text-sm text-primary-600">Total Value</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by customer or quotation number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="w-40">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quotations List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
        </div>
      ) : quotations.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="mx-auto text-gray-300 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Quotations Found</h3>
          <p className="text-gray-400 mb-6">
            {searchTerm || statusFilter 
              ? 'Try adjusting your search or filters' 
              : 'Create your first quotation to get started'}
          </p>
          {!searchTerm && !statusFilter && (
            <Link to="/quotation/new" className="btn-primary inline-flex items-center gap-2">
              <Plus size={20} />
              New Quotation
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 text-left font-semibold">Quotation No.</th>
                  <th className="px-6 py-4 text-left font-semibold">Customer</th>
                  <th className="px-6 py-4 text-left font-semibold">Date</th>
                  <th className="px-6 py-4 text-right font-semibold">Amount</th>
                  <th className="px-6 py-4 text-center font-semibold">Status</th>
                  <th className="px-6 py-4 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotations.map(quotation => (
                  <tr key={quotation.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <Link 
                        to={`/quotation/${quotation.id}`}
                        className="font-mono font-semibold text-primary-600 hover:text-primary-700 hover:underline"
                      >
                        {quotation.quotation_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User size={18} className="text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{quotation.customer_name}</p>
                          {quotation.customer_email && (
                            <p className="text-sm text-gray-500 truncate max-w-[200px]">{quotation.customer_email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar size={16} className="text-gray-400" />
                        {formatDate(quotation.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-gray-800">{formatCurrency(quotation.grand_total)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(quotation.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <Link
                          to={`/quotation/${quotation.id}`}
                          className="p-2 text-gray-600 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye size={18} />
                        </Link>
                        <Link
                          to={`/quotation/${quotation.id}/edit`}
                          className="p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </Link>
                        <button
                          onClick={() => downloadPdf(quotation.id)}
                          className="p-2 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors"
                          title="Download PDF"
                        >
                          <FileDown size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(quotation.id, quotation.quotation_number)}
                          className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {quotations.map(quotation => (
              <div key={quotation.id} className="card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Link 
                      to={`/quotation/${quotation.id}`}
                      className="font-mono font-bold text-primary-600 hover:text-primary-700"
                    >
                      {quotation.quotation_number}
                    </Link>
                    <p className="text-gray-500 text-sm mt-1">{formatDate(quotation.date)}</p>
                  </div>
                  {getStatusBadge(quotation.status)}
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  <User size={16} className="text-gray-400" />
                  <span className="font-medium text-gray-800">{quotation.customer_name}</span>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="font-bold text-lg text-gray-800">{formatCurrency(quotation.grand_total)}</span>
                  <div className="flex gap-1">
                    <Link
                      to={`/quotation/${quotation.id}`}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      <Eye size={18} />
                    </Link>
                    <button
                      onClick={() => downloadPdf(quotation.id)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      <FileDown size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(quotation.id, quotation.quotation_number)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default QuotationsPage
