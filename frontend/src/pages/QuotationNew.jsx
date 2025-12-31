import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Save, ArrowLeft, Search, X, Package, ChevronRight, PlusCircle } from 'lucide-react'
import { quotationsApi, productsApi, settingsApi } from '../api'
import { PRODUCTS_INITIAL_LOAD, PRODUCTS_SEARCH_LIMIT } from '../utils/constants'
import { useDebounce } from '../hooks/useDebounce'
import { SEARCH_DEBOUNCE_MS } from '../utils/constants'

function QuotationNew() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [products, setProducts] = useState([])
  const [settings, setSettings] = useState({})
  const [quotationNumber, setQuotationNumber] = useState('')
  const [showProductModal, setShowProductModal] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [currentItemIndex, setCurrentItemIndex] = useState(null)
  const [showNewProductForm, setShowNewProductForm] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    model_no: '',
    unit_price: ''
  })

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_address: '',
    customer_phone: '',
    customer_email: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    status: 'draft',
    items: []
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      // Load only minimal product data initially (faster)
      const [productsRes, settingsRes, nextNumberRes] = await Promise.all([
        productsApi.getAll({ minimal: true, active: true, limit: PRODUCTS_INITIAL_LOAD }),
        settingsApi.getAll(),
        quotationsApi.getNextNumber()
      ])
      
      // Handle both array and paginated response
      const productsData = Array.isArray(productsRes.data) 
        ? productsRes.data 
        : (productsRes.data.data || [])
      
      setProducts(productsData)
      setSettings(settingsRes.data)
      setQuotationNumber(nextNumberRes.data.quotation_number)
    } catch (error) {
      console.error('Error loading initial data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // Debounce product search
  const debouncedProductSearch = useDebounce(productSearch, SEARCH_DEBOUNCE_MS)
  
  // Load products on search
  useEffect(() => {
    if (!debouncedProductSearch.trim()) {
      // Reset to initial products when search is cleared
      loadInitialData()
      return
    }
    
    const loadSearchResults = async () => {
      try {
        const response = await productsApi.getAll({ 
          search: debouncedProductSearch, 
          minimal: true,
          active: true,
          limit: PRODUCTS_SEARCH_LIMIT
        })
        const productsData = Array.isArray(response.data) 
          ? response.data 
          : (response.data.data || [])
        setProducts(productsData)
      } catch (error) {
        console.error('Error searching products:', error)
      }
    }
    
    loadSearchResults()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedProductSearch])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const addProductItem = () => {
    setCurrentItemIndex(formData.items.length)
    setProductSearch('')
    setShowNewProductForm(false)
    setNewProduct({ name: '', description: '', model_no: '', unit_price: '' })
    setShowProductModal(true)
  }

  const updateItem = (index, field, value) => {
    setFormData(prev => {
      const newItems = [...prev.items]
      newItems[index] = { ...newItems[index], [field]: value }
      return { ...prev, items: newItems }
    })
  }

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const getProductImage = (product) => {
    if (!product.images || !product.id) return ''
    try {
      const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images
      if (!Array.isArray(images) || images.length === 0) return ''
      
      // Use backend proxy endpoint to fetch from FTP
      return `/api/images/product/${product.id}`
    } catch {
      return ''
    }
  }

  const selectProduct = (product) => {
    setFormData(prev => {
      const newItems = [...prev.items]
      const imageUrl = getProductImage(product)
      const newItem = {
        product_id: product.id,
        ref_no: product.slug || '',
        name: product.name_en || product.name_ar || '',
        description: product.description_en || product.description_ar || product.name_en || product.name_ar || '',
        model_no: product.model || '',
        image_path: imageUrl,
        qty: 1,
        unit_price: parseFloat(product.price) || 0
      }
      
      if (currentItemIndex !== null && currentItemIndex < newItems.length) {
        newItems[currentItemIndex] = newItem
      } else {
        newItems.push(newItem)
      }
      
      return { ...prev, items: newItems }
    })
    setShowProductModal(false)
    setCurrentItemIndex(null)
  }

  const addCustomProduct = () => {
    if (!newProduct.name.trim()) {
      alert('Please enter product name')
      return
    }

    setFormData(prev => {
      const newItems = [...prev.items]
      const newItem = {
        product_id: null,
        ref_no: '',
        name: newProduct.name,
        description: newProduct.description || newProduct.name,
        model_no: newProduct.model_no || '',
        image_path: '',
        qty: 1,
        unit_price: parseFloat(newProduct.unit_price) || 0
      }
      
      if (currentItemIndex !== null && currentItemIndex < newItems.length) {
        newItems[currentItemIndex] = newItem
      } else {
        newItems.push(newItem)
      }
      
      return { ...prev, items: newItems }
    })
    setShowProductModal(false)
    setShowNewProductForm(false)
    setNewProduct({ name: '', description: '', model_no: '', unit_price: '' })
    setCurrentItemIndex(null)
  }

  const calculateTotals = () => {
    const vatRate = parseFloat(settings.vat_rate || 5) / 100
    const total = formData.items.reduce((sum, item) => {
      return sum + ((parseFloat(item.qty) || 0) * (parseFloat(item.unit_price) || 0))
    }, 0)
    const vat = total * vatRate
    const grandTotal = total + vat
    return { total, vat, grandTotal }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.customer_name.trim()) {
      alert('Please enter customer name')
      return
    }
    
    if (formData.items.length === 0) {
      alert('Please add at least one item')
      return
    }

    setSaving(true)
    try {
      const response = await quotationsApi.create(formData)
      navigate(`/quotation/${response.data.id}`)
    } catch (error) {
      console.error('Error creating quotation:', error)
      alert('Failed to create quotation')
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount, currency = settings.currency || 'AED') => {
    const currencySymbols = {
      'USD': '$',
      'AED': 'AED',
      'GBP': '£',
      'EUR': '€'
    }
    const symbol = currencySymbols[currency] || currency
    return `${symbol} ${parseFloat(amount || 0).toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`
  }

  const getProductCurrency = (product) => {
    if (!product.specifications) return settings.currency || 'AED'
    try {
      const specs = typeof product.specifications === 'string' 
        ? JSON.parse(product.specifications) 
        : product.specifications
      return specs.currency || settings.currency || 'AED'
    } catch {
      return settings.currency || 'AED'
    }
  }

  const filteredProducts = products.filter(p => {
    const search = productSearch.toLowerCase()
    return (
      (p.name_en && p.name_en.toLowerCase().includes(search)) ||
      (p.name_ar && p.name_ar.toLowerCase().includes(search)) ||
      (p.slug && p.slug.toLowerCase().includes(search)) ||
      (p.model && p.model.toLowerCase().includes(search)) ||
      (p.brand_name_en && p.brand_name_en.toLowerCase().includes(search))
    )
  })

  const { total, vat, grandTotal } = calculateTotals()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="animate-fadeIn max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate('/quotations')} 
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">New Quotation</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            <span className="font-mono text-primary-600 font-semibold">{quotationNumber}</span>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Customer Information */}
        <div className="card p-5">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Customer Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleInputChange}
                required
                className="input-field"
                placeholder="Enter customer name"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                name="customer_address"
                value={formData.customer_address}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Enter address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                name="customer_phone"
                value={formData.customer_phone}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Enter phone"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="customer_email"
                value={formData.customer_email}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Enter email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Items</h2>
            <button
              type="button"
              onClick={addProductItem}
              className="btn-primary text-sm py-2 px-4"
            >
              <Plus size={16} className="inline mr-1" />
              Add Item
            </button>
          </div>

          {formData.items.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <Package className="mx-auto text-gray-300 mb-3" size={40} />
              <p className="text-gray-500 mb-1 font-medium">No items yet</p>
              <p className="text-gray-400 text-sm mb-4">Add products to your quotation</p>
              <button
                type="button"
                onClick={addProductItem}
                className="btn-primary text-sm"
              >
                <Plus size={16} className="inline mr-1" />
                Add First Item
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {formData.items.map((item, index) => {
                const lineTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.unit_price) || 0)
                return (
                  <div key={index} className="bg-white rounded-xl p-4 border-2 border-gray-200 hover:border-primary-300 transition-colors shadow-sm">
                    {/* Item Header */}
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {index + 1}
                        </span>
                        <span className="font-semibold text-gray-800">{item.name}</span>
                        {item.model_no && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {item.model_no}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {/* Description - PROMINENT & ADJUSTABLE */}
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                        Description
                      </label>
                      <textarea
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-100 resize-y bg-gray-50 focus:bg-white transition-colors min-h-[100px]"
                        placeholder="Enter detailed item description..."
                        style={{ resize: 'vertical' }}
                      />
                    </div>

                    {/* Model, Qty, Price Row */}
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Model No.</label>
                        <input
                          type="text"
                          value={item.model_no}
                          onChange={(e) => updateItem(index, 'model_no', e.target.value)}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 bg-white"
                          placeholder="Model"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => updateItem(index, 'qty', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2.5 text-sm text-center border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 bg-white font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Unit Price ({settings.currency || 'AED'})
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2.5 text-sm text-right border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Line Total</label>
                        <div className="px-3 py-2.5 text-sm text-right font-bold text-primary-700 bg-primary-50 rounded-lg border-2 border-primary-200">
                          {formatCurrency(lineTotal)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Add More */}
              <button
                type="button"
                onClick={addProductItem}
                className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors font-medium"
              >
                <Plus size={18} className="inline mr-1" />
                Add Another Item
              </button>
            </div>
          )}

          {/* Totals */}
          {formData.items.length > 0 && (
            <div className="mt-6 flex justify-end">
              <div className="w-80 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 space-y-3">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-gray-800">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>VAT ({settings.vat_rate || 5}%):</span>
                    <span className="font-semibold text-gray-800">{formatCurrency(vat)}</span>
                  </div>
                </div>
                <div className="flex justify-between p-4 bg-primary-600 text-white">
                  <span className="font-bold">Grand Total:</span>
                  <span className="font-bold text-xl">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="card p-5">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Notes (Optional)</h2>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows={2}
            className="input-field resize-none text-sm"
            placeholder="Additional notes..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-6">
          <button
            type="button"
            onClick={() => navigate('/quotations')}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || formData.items.length === 0}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {saving ? 'Creating...' : (
              <>
                <Save size={18} />
                Create Quotation
              </>
            )}
          </button>
        </div>
      </form>

      {/* Product Selector Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-fadeIn shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">
                {showNewProductForm ? 'Add New Product' : 'Select Product'}
              </h3>
              <button 
                type="button"
                onClick={() => {
                  setShowProductModal(false)
                  setShowNewProductForm(false)
                  setCurrentItemIndex(null)
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {!showNewProductForm ? (
              <>
                {/* Search & New Product Button */}
                <div className="p-4 bg-gray-50 border-b border-gray-100 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search products..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 bg-white text-sm"
                      autoFocus
                    />
                  </div>
                  
                  {/* NEW PRODUCT BUTTON */}
                  <button
                    type="button"
                    onClick={() => setShowNewProductForm(true)}
                    className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 border-2 border-dashed border-emerald-300 hover:border-emerald-400 rounded-xl text-emerald-700 font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <PlusCircle size={20} />
                    Create New Product for This Quotation
                  </button>
                </div>

                {/* Product List */}
                <div className="overflow-y-auto max-h-[45vh]">
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="mx-auto text-gray-300 mb-3" size={40} />
                      <p className="text-gray-500 mb-2">No products found</p>
                      <button
                        type="button"
                        onClick={() => setShowNewProductForm(true)}
                        className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                      >
                        + Create a new product
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {filteredProducts.map(product => {
                        const imageUrl = getProductImage(product)
                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => selectProduct(product)}
                            className="w-full p-4 text-left hover:bg-primary-50 transition-colors flex items-center gap-4 group"
                          >
                            {imageUrl && (
                              <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                                <img src={imageUrl} alt={product.name_en} className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-800 group-hover:text-primary-700">
                                {product.name_en || product.name_ar}
                              </p>
                              {product.name_ar && product.name_en && (
                                <p className="text-xs text-gray-500 mt-0.5" dir="rtl">{product.name_ar}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {product.brand_name_en && (
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                    {product.brand_name_en}
                                  </span>
                                )}
                                {product.category_name_en && (
                                  <span className="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded">
                                    {product.category_name_en}
                                  </span>
                                )}
                                {product.model && (
                                  <span className="text-xs text-gray-400">Model: {product.model}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              {(() => {
                                const currency = getProductCurrency(product)
                                return product.discount_price && parseFloat(product.discount_price) < parseFloat(product.price) ? (
                                  <div>
                                    <p className="font-bold text-emerald-600">{formatCurrency(product.discount_price, currency)}</p>
                                    <p className="text-xs text-gray-400 line-through">{formatCurrency(product.price, currency)}</p>
                                  </div>
                                ) : (
                                  <p className="font-bold text-primary-600">{formatCurrency(product.price, currency)}</p>
                                )
                              })()}
                            </div>
                            <ChevronRight size={18} className="text-gray-300 group-hover:text-primary-500" />
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* New Product Form */
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                    className="input-field"
                    placeholder="Enter product name"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="input-field resize-y"
                    placeholder="Enter detailed product description..."
                    style={{ resize: 'vertical', minHeight: '100px' }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model No.</label>
                    <input
                      type="text"
                      value={newProduct.model_no}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, model_no: e.target.value }))}
                      className="input-field"
                      placeholder="Model number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Price ({settings.currency || 'AED'})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newProduct.unit_price}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, unit_price: e.target.value }))}
                      className="input-field"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowNewProductForm(false)}
                    className="btn-secondary flex-1"
                  >
                    Back to List
                  </button>
                  <button
                    type="button"
                    onClick={addCustomProduct}
                    className="btn-primary flex-1"
                  >
                    <Plus size={18} className="inline mr-1" />
                    Add to Quotation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default QuotationNew
