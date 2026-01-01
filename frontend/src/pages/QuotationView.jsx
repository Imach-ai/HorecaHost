import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Edit, FileDown, Package, Calendar, User, Phone, Mail, MapPin } from 'lucide-react'
import { quotationsApi, settingsApi } from '../api'
import { getFlagImageUrl } from '../utils/flagUtils'

function QuotationView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quotation, setQuotation] = useState(null)
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadQuotation()
  }, [id])

  const loadQuotation = async () => {
    try {
      const [quotationRes, settingsRes] = await Promise.all([
        quotationsApi.getById(id),
        settingsApi.getAll()
      ])
      setQuotation(quotationRes.data)
      setSettings(settingsRes.data)
    } catch (error) {
      console.error('Error loading quotation:', error)
      alert('Failed to load quotation')
      navigate('/quotations')
    } finally {
      setLoading(false)
    }
  }

  const downloadPdf = () => {
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
      <span className={`px-3 py-1.5 rounded-full text-sm font-semibold capitalize border ${styles[status] || styles.draft}`}>
        {status || 'draft'}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  if (!quotation) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto text-gray-300 mb-4" size={64} />
        <p className="text-gray-500 text-lg">Quotation not found</p>
      </div>
    )
  }

  return (
    <div className="animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/quotations')} 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 font-mono">{quotation.quotation_number}</h1>
              {getStatusBadge(quotation.status)}
            </div>
            <p className="text-gray-500 mt-1 flex items-center gap-2 text-sm">
              <Calendar size={14} />
              {formatDate(quotation.created_at)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadPdf} className="btn-primary flex items-center gap-2">
            <FileDown size={18} />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <Link to={`/quotation/${id}/edit`} className="btn-secondary flex items-center gap-2">
            <Edit size={18} />
            <span className="hidden sm:inline">Edit</span>
          </Link>
        </div>
      </div>

      {/* Quotation Document */}
      <div className="card shadow-lg overflow-hidden">
        {/* Header Section */}
        <div className="p-6 bg-gradient-to-r from-primary-800 to-primary-700 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <h2 className="text-xl font-bold">{settings.company_name || 'HORECA Equipment LLC'}</h2>
              <div className="mt-2 space-y-0.5 text-primary-100 text-sm">
                <p>{settings.company_address}</p>
                <p>Tel: {settings.company_phone}</p>
                <p>Email: {settings.company_email}</p>
              </div>
            </div>
            <div className="text-left md:text-right">
              <div className="text-2xl font-bold">QUOTATION</div>
              <p className="text-primary-200 font-mono mt-1">{quotation.quotation_number}</p>
              <p className="text-primary-200 text-sm mt-1">Date: {formatDate(quotation.date)}</p>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="p-5 bg-gray-50 border-b border-gray-200">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bill To</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <User size={16} className="text-primary-600" />
                {quotation.customer_name}
              </p>
              {quotation.customer_address && (
                <p className="text-gray-600 mt-1 flex items-start gap-2 text-sm">
                  <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  {quotation.customer_address}
                </p>
              )}
            </div>
            <div className="space-y-1">
              {quotation.customer_phone && (
                <p className="text-gray-600 flex items-center gap-2 text-sm">
                  <Phone size={14} className="text-gray-400" />
                  {quotation.customer_phone}
                </p>
              )}
              {quotation.customer_email && (
                <p className="text-gray-600 flex items-center gap-2 text-sm">
                  <Mail size={14} className="text-gray-400" />
                  {quotation.customer_email}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="p-5">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="bg-primary-800 text-white text-xs uppercase tracking-wider">
                  <th className="py-3 px-3 text-center rounded-l-lg w-12">No.</th>
                  <th className="py-3 px-4 text-left">Item Description</th>
                  <th className="py-3 px-3 text-center w-28">Model No.</th>
                  <th className="py-3 px-2 text-center w-14">Qty</th>
                  <th className="py-3 px-3 text-right w-24">Unit Price</th>
                  <th className="py-3 px-3 text-right rounded-r-lg w-24">Total</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items?.map((item, index) => (
                  <tr key={item.id || index} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                    <td className="py-4 px-4 text-center text-gray-500 font-medium">{item.line_number || index + 1}</td>
                    <td className="py-4 px-4">
                      <div className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm max-w-lg">
                        {item.description || '-'}
                        {item.brand_name_en && (
                          <span className="inline-flex items-center gap-1 ml-2 text-[10px] font-semibold bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded align-middle">
                            {(() => {
                              const flagUrl = getFlagImageUrl(item.brand_country_en, item.brand_flag_image);
                              return flagUrl ? (
                                <img 
                                  src={flagUrl} 
                                  alt={item.brand_country_en || ''}
                                  className="w-3 h-3 object-cover rounded-sm"
                                  onError={(e) => { e.target.style.display = 'none' }}
                                />
                              ) : null;
                            })()}
                            {item.brand_name_en}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.model_no ? (
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-700">{item.model_no}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center font-semibold text-gray-800">{item.qty}</td>
                    <td className="py-4 px-4 text-right text-gray-700">{formatCurrency(item.unit_price)}</td>
                    <td className="py-4 px-4 text-right font-bold text-gray-800">{formatCurrency(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {quotation.items?.map((item, index) => (
              <div key={item.id || index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-bold text-gray-400">#{item.line_number || index + 1}</span>
                  {item.model_no && (
                    <span className="font-mono text-xs bg-gray-200 px-2 py-0.5 rounded">{item.model_no}</span>
                  )}
                </div>
                <p className="text-gray-800 text-sm leading-relaxed mb-3">
                  {item.description || '-'}
                  {item.brand_name_en && (
                    <span className="inline-flex items-center gap-1 ml-2 text-[10px] font-semibold bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                      {(() => {
                        const flagUrl = getFlagImageUrl(item.brand_country_en, item.brand_flag_image);
                        return flagUrl ? (
                          <img 
                            src={flagUrl} 
                            alt={item.brand_country_en || ''}
                            className="w-3 h-3 object-cover rounded-sm"
                            onError={(e) => { e.target.style.display = 'none' }}
                          />
                        ) : null;
                      })()}
                      {item.brand_name_en}
                    </span>
                  )}
                </p>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <div className="text-sm text-gray-500">
                    {item.qty} × {formatCurrency(item.unit_price)}
                  </div>
                  <div className="font-bold text-gray-800">{formatCurrency(item.line_total)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="flex justify-end mt-6">
            <div className="w-full md:w-72">
              <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-gray-800">{formatCurrency(quotation.total)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>VAT ({settings.vat_rate || 5}%):</span>
                    <span className="font-semibold text-gray-800">{formatCurrency(quotation.vat)}</span>
                  </div>
                </div>
                <div className="flex justify-between p-4 bg-primary-600 text-white">
                  <span className="font-bold">Grand Total:</span>
                  <span className="font-bold text-lg">{formatCurrency(quotation.grand_total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quotation.notes && (
          <div className="px-5 pb-5">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Notes</div>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{quotation.notes}</p>
            </div>
          </div>
        )}

        {/* Terms & Conditions */}
        <div className="p-5 bg-gray-50 border-t border-gray-200 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {settings.terms_conditions && (
              <div>
                <div className="font-bold text-gray-700 mb-2">Terms & Conditions</div>
                <p className="text-gray-500 whitespace-pre-wrap leading-relaxed text-xs">{settings.terms_conditions}</p>
              </div>
            )}
            {settings.delivery_warranty && (
              <div>
                <div className="font-bold text-gray-700 mb-2">Delivery & Warranty</div>
                <p className="text-gray-500 whitespace-pre-wrap leading-relaxed text-xs">{settings.delivery_warranty}</p>
              </div>
            )}
          </div>
          {settings.bank_details && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="font-bold text-gray-700 mb-2">Bank Details</div>
              <p className="text-gray-500 whitespace-pre-wrap text-xs font-mono">{settings.bank_details}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default QuotationView
