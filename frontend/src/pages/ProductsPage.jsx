import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, X, Upload, Package, Filter, Image as ImageIcon, Globe, Tag, Building2, Grid3x3, List, ChevronLeft, ChevronRight } from 'lucide-react'
import { productsApi } from '../api'
import { useDebounce } from '../hooks/useDebounce'
import { SEARCH_DEBOUNCE_MS } from '../utils/constants'
import Loading from '../components/Loading'

function ProductsPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [subcategoryFilter, setSubcategoryFilter] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasMore: false
  })
  const [formData, setFormData] = useState({
    name_en: '',
    name_ar: '',
    brand_id: '',
    category_id: '',
    subcategory_id: '',
    model: '',
    slug: '',
    price: '',
    discount_price: '',
    currency: 'AED',
    description_en: '',
    description_ar: '',
    specifications: {},
    active: true,
    image: null
  })
  const [imagePreviews, setImagePreviews] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Debounce search
  const debouncedSearch = useDebounce(searchTerm, SEARCH_DEBOUNCE_MS)
  
  // Reset to first page when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [debouncedSearch, categoryFilter, subcategoryFilter, brandFilter, activeFilter])

  useEffect(() => {
    loadProducts()
  }, [debouncedSearch, categoryFilter, subcategoryFilter, brandFilter, activeFilter, pagination.page])

  useEffect(() => {
    // Load categories and brands once on mount (they're cached)
    loadCategories()
    loadBrands()
  }, [])

  useEffect(() => {
    if (formData.category_id) {
      loadSubcategories(formData.category_id)
    } else {
      setSubcategories([])
    }
  }, [formData.category_id])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const params = {
        page: pagination.page,
        limit: pagination.limit
      }
      if (debouncedSearch) params.search = debouncedSearch
      if (categoryFilter) params.category_id = categoryFilter
      if (subcategoryFilter) params.subcategory_id = subcategoryFilter
      if (brandFilter) params.brand_id = brandFilter
      if (activeFilter !== '') params.active = activeFilter === 'true'
      
      const response = await productsApi.getAll(params)
      
      // Handle both old format (array) and new format (object with data and pagination)
      if (Array.isArray(response.data)) {
        setProducts(response.data)
        // If old format, set default pagination
        setPagination(prev => ({
          ...prev,
          total: response.data.length,
          totalPages: 1,
          hasMore: false
        }))
      } else {
        setProducts(response.data.data || [])
        setPagination(prev => ({
          ...prev,
          ...(response.data.pagination || {})
        }))
      }
    } catch (error) {
      console.error('Error loading products:', error.response?.data || error.message || error)
      setProducts([])
      setPagination(prev => ({
        ...prev,
        total: 0,
        totalPages: 0,
        hasMore: false
      }))
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await productsApi.getCategories()
      setCategories(response.data)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadSubcategories = async (categoryId) => {
    try {
      const response = await productsApi.getSubcategories(categoryId)
      setSubcategories(response.data)
    } catch (error) {
      console.error('Error loading subcategories:', error)
      setSubcategories([])
    }
  }

  const loadBrands = async () => {
    try {
      const response = await productsApi.getBrands()
      setBrands(response.data)
    } catch (error) {
      console.error('Error loading brands:', error)
    }
  }

  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product)
      // Parse images JSONB
      let images = []
      if (product.images) {
        try {
          images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images
        } catch (e) {
          images = []
        }
      }
      
      // Parse specifications JSONB
      let specs = {}
      if (product.specifications) {
        try {
          specs = typeof product.specifications === 'string' ? JSON.parse(product.specifications) : product.specifications
        } catch (e) {
          specs = {}
        }
      }

      // Extract currency from specifications or default to AED
      const currency = specs.currency || 'AED'

      setFormData({
        name_en: product.name_en || '',
        name_ar: product.name_ar || '',
        brand_id: product.brand_id || '',
        category_id: product.category_id || '',
        subcategory_id: product.subcategory_id || '',
        model: product.model || '',
        slug: product.slug || '',
        price: product.price ? product.price.toString() : '',
        discount_price: product.discount_price ? product.discount_price.toString() : '',
        currency: currency,
        description_en: product.description_en || '',
        description_ar: product.description_ar || '',
        specifications: specs,
        active: product.active !== undefined ? product.active : true,
        image: null
      })
      setImagePreviews(images)
    } else {
      setEditingProduct(null)
      setFormData({
        name_en: '',
        name_ar: '',
        brand_id: '',
        category_id: '',
        subcategory_id: '',
        model: '',
        slug: '',
        price: '',
        discount_price: '',
        currency: 'AED',
        description_en: '',
        description_ar: '',
        specifications: {},
        active: true,
        image: null
      })
      setImagePreviews([])
    }
    setError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingProduct(null)
    setError('')
    setImagePreviews([])
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSpecChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [key]: value
      }
    }))
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData(prev => ({ ...prev, image: file }))
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result])
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = (index) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const data = { ...formData }
      // Store currency in specifications JSONB
      const specs = { ...data.specifications, currency: data.currency }
      data.specifications = JSON.stringify(specs)
      // Remove currency from top level (it's now in specifications)
      delete data.currency
      
      if (editingProduct) {
        await productsApi.update(editingProduct.id, data)
      } else {
        await productsApi.create(data)
      }
      closeModal()
      loadProducts()
    } catch (error) {
      console.error('Error saving product:', error)
      setError(error.response?.data?.error || 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return

    try {
      await productsApi.delete(id)
      // Reload products after deletion
      loadProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Failed to delete product')
    }
  }

  const formatCurrency = (amount, currency = 'AED') => {
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
    if (!product.specifications) return 'AED'
    try {
      const specs = typeof product.specifications === 'string' 
        ? JSON.parse(product.specifications) 
        : product.specifications
      return specs.currency || 'AED'
    } catch {
      return 'AED'
    }
  }

  const getProductImage = (product) => {
    if (!product.images || !product.id) return null
    try {
      const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images
      if (!Array.isArray(images) || images.length === 0) return null
      
      // Use backend proxy endpoint to fetch from FTP
      // This endpoint fetches images directly from FTP server
      return `/api/images/product/${product.id}`
    } catch {
      return null
    }
  }

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Products</h1>
          <p className="text-gray-600">Manage your product catalog with brands, categories, and bilingual support</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2 shadow-lg hover:shadow-xl">
          <Plus size={20} />
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 ${showFilters ? 'bg-primary-50 border-primary-300' : ''}`}
          >
            <Filter size={18} />
            Filters
          </button>

          <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-1 bg-white">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Grid3x3 size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value)
                  setSubcategoryFilter('')
                }}
                className="input-field"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name_en}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
              <select
                value={subcategoryFilter}
                onChange={(e) => setSubcategoryFilter(e.target.value)}
                className="input-field"
                disabled={!categoryFilter}
              >
                <option value="">All Subcategories</option>
                {subcategories.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name_en}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="input-field"
              >
                <option value="">All Brands</option>
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>{brand.name_en}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="input-field"
              >
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Products Display */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loading size="large" />
        </div>
      ) : products.length === 0 ? (
        <div className="card p-12 text-center">
          <Package className="mx-auto text-gray-300 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Products Found</h3>
          <p className="text-gray-400 mb-6">Get started by adding your first product</p>
          <button onClick={() => openModal()} className="btn-primary">
            <Plus size={20} className="inline mr-2" />
            Add Product
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map(product => {
              const imageUrl = getProductImage(product)
              return (
                <div key={product.id} className="card hover:shadow-xl transition-all duration-300 group overflow-hidden">
                  <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden relative">
                    {imageUrl ? (
                      <img 
                        src={imageUrl} 
                        alt={product.name_en}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <Package className="text-gray-300" size={48} />
                    )}
                    {!product.active && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        Inactive
                      </div>
                    )}
                    {product.discount_price && parseFloat(product.discount_price) < parseFloat(product.price) && (
                      <div className="absolute top-2 left-2 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        Sale
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{product.name_en}</h3>
                        {product.name_ar && (
                          <p className="text-sm text-gray-500 mb-1" dir="rtl">{product.name_ar}</p>
                        )}
                      </div>
                    </div>
                    
                    {product.brand_name_en && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                        <Building2 size={12} />
                        <span>{product.brand_name_en}</span>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-1 mb-3">
                      {product.category_name_en && (
                        <span className="text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded">
                          {product.category_name_en}
                        </span>
                      )}
                      {product.subcategory_name_en && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {product.subcategory_name_en}
                        </span>
                      )}
                    </div>

                    {product.model && (
                      <p className="text-xs text-gray-500 mb-2">Model: {product.model}</p>
                    )}

                    <div className="flex items-baseline gap-2 mb-4">
                      {(() => {
                        const currency = getProductCurrency(product)
                        return product.discount_price && parseFloat(product.discount_price) < parseFloat(product.price) ? (
                          <>
                            <span className="text-lg font-bold text-emerald-600">
                              {formatCurrency(product.discount_price, currency)}
                            </span>
                            <span className="text-sm text-gray-400 line-through">
                              {formatCurrency(product.price, currency)}
                            </span>
                          </>
                        ) : (
                          <span className="text-lg font-bold text-primary-600">
                            {formatCurrency(product.price, currency)}
                          </span>
                        )
                      })()}
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => openModal(product)}
                        className="flex-1 btn-secondary py-2 text-sm flex items-center justify-center gap-1"
                      >
                        <Edit size={16} />
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Pagination for Grid View */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 px-2">
              <div className="text-sm text-gray-600">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} products
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm text-gray-600 px-3">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={!pagination.hasMore}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header px-6 py-3 text-left">Image</th>
                  <th className="table-header px-6 py-3 text-left">Product</th>
                  <th className="table-header px-6 py-3 text-left">Brand</th>
                  <th className="table-header px-6 py-3 text-left">Category</th>
                  <th className="table-header px-6 py-3 text-left">Price</th>
                  <th className="table-header px-6 py-3 text-left">Status</th>
                  <th className="table-header px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map(product => {
                  const imageUrl = getProductImage(product)
                  return (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        {imageUrl ? (
                          <img src={imageUrl} alt={product.name_en} className="w-16 h-16 object-cover rounded-lg" />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Package className="text-gray-300" size={24} />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{product.name_en}</div>
                        {product.name_ar && (
                          <div className="text-sm text-gray-500 mt-1" dir="rtl">{product.name_ar}</div>
                        )}
                        {product.model && (
                          <div className="text-xs text-gray-400 mt-1">Model: {product.model}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {product.brand_name_en || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">{product.category_name_en || '-'}</div>
                        {product.subcategory_name_en && (
                          <div className="text-xs text-gray-400">{product.subcategory_name_en}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const currency = getProductCurrency(product)
                          return product.discount_price && parseFloat(product.discount_price) < parseFloat(product.price) ? (
                            <div>
                              <div className="font-semibold text-emerald-600">{formatCurrency(product.discount_price, currency)}</div>
                              <div className="text-xs text-gray-400 line-through">{formatCurrency(product.price, currency)}</div>
                            </div>
                          ) : (
                            <div className="font-semibold text-primary-600">{formatCurrency(product.price, currency)}</div>
                          )
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${product.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {product.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => openModal(product)}
                            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(product.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination for List View */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} products
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm text-gray-600 px-3">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={!pagination.hasMore}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name (English) *
                    </label>
                    <input
                      type="text"
                      name="name_en"
                      value={formData.name_en}
                      onChange={handleInputChange}
                      required
                      className="input-field"
                      placeholder="Enter product name in English"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name (Arabic) *
                    </label>
                    <input
                      type="text"
                      name="name_ar"
                      value={formData.name_ar}
                      onChange={handleInputChange}
                      required
                      className="input-field"
                      placeholder="أدخل اسم المنتج بالعربية"
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brand *
                    </label>
                    <select
                      name="brand_id"
                      value={formData.brand_id}
                      onChange={handleInputChange}
                      required
                      className="input-field"
                    >
                      <option value="">Select Brand</option>
                      {brands.map(brand => (
                        <option key={brand.id} value={brand.id}>{brand.name_en}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <select
                      name="category_id"
                      value={formData.category_id}
                      onChange={handleInputChange}
                      required
                      className="input-field"
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name_en}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subcategory
                    </label>
                    <select
                      name="subcategory_id"
                      value={formData.subcategory_id}
                      onChange={handleInputChange}
                      className="input-field"
                      disabled={!formData.category_id}
                    >
                      <option value="">Select Subcategory</option>
                      {subcategories.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name_en}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model
                    </label>
                    <input
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="e.g., GR-4B-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Slug
                    </label>
                    <input
                      type="text"
                      name="slug"
                      value={formData.slug}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="product-slug"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Pricing</h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency *
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                  >
                    <option value="AED">AED - UAE Dirham</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="EUR">EUR - Euro</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price ({formData.currency}) *
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="0.01"
                      className="input-field"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Price ({formData.currency})
                    </label>
                    <input
                      type="number"
                      name="discount_price"
                      value={formData.discount_price}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="input-field"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Descriptions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Descriptions</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (English)
                  </label>
                  <textarea
                    name="description_en"
                    value={formData.description_en}
                    onChange={handleInputChange}
                    rows={4}
                    className="input-field resize-none"
                    placeholder="Enter detailed product description in English..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Arabic)
                  </label>
                  <textarea
                    name="description_ar"
                    value={formData.description_ar}
                    onChange={handleInputChange}
                    rows={4}
                    className="input-field resize-none"
                    placeholder="أدخل وصف المنتج التفصيلي بالعربية..."
                    dir="rtl"
                  />
                </div>
              </div>

              {/* Images */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Images</h3>
                
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={preview} 
                          alt={`Preview ${index + 1}`} 
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-400 transition-colors bg-gray-50">
                  <Upload className="text-gray-400 mb-2" size={32} />
                  <span className="text-sm text-gray-600 font-medium">
                    Click to upload image
                  </span>
                  <span className="text-xs text-gray-400 mt-1">
                    PNG, JPG, GIF up to 5MB
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="active"
                  id="active"
                  checked={formData.active}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="active" className="text-sm font-medium text-gray-700">
                  Product is active
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button type="button" onClick={closeModal} className="flex-1 btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary">
                  {saving ? 'Saving...' : (editingProduct ? 'Update Product' : 'Add Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductsPage
