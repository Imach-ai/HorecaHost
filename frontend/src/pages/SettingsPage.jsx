import { useState, useEffect } from 'react'
import { Save, Upload, Building2, Palette } from 'lucide-react'
import { settingsApi } from '../api'
import ThemeCustomizer from '../components/ThemeCustomizer'

function SettingsPage() {
  const [settings, setSettings] = useState({
    company_name: '',
    company_address: '',
    company_phone: '',
    company_mobile: '',
    company_email: '',
    company_website: '',
    company_trn: '',
    company_manager: '',
    company_logo: '',
    vat_rate: '5',
    currency: 'AED',
    sales_terms: '',
    vat_note: '',
    quotation_message: '',
    terms_conditions: '',
    delivery_warranty: '',
    bank_details: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoPreview, setLogoPreview] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await settingsApi.getAll()
      setSettings(prev => ({ ...prev, ...response.data }))
      if (response.data.company_logo) {
        setLogoPreview(response.data.company_logo)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setSettings(prev => ({ ...prev, [name]: value }))
  }

  const handleLogoChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const response = await settingsApi.uploadLogo(file)
      setLogoPreview(response.data.logo_path)
      setSettings(prev => ({ ...prev, company_logo: response.data.logo_path }))
      showSuccess('Logo uploaded successfully')
    } catch (error) {
      console.error('Error uploading logo:', error)
      alert('Failed to upload logo')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      await settingsApi.update(settings)
      showSuccess('Settings saved successfully')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const showSuccess = (message) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="animate-fadeIn max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-500 mt-1">Configure your company information, theme, and quotation defaults</p>
      </div>

      {successMessage && (
        <div className="mb-6 bg-green-50 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2 animate-fadeIn">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {successMessage}
        </div>
      )}

      {/* Theme Customization Section */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <Palette className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Theme Customization</h2>
            <p className="text-sm text-gray-500">Personalize the look and feel of your application</p>
          </div>
        </div>
        <ThemeCustomizer />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Building2 className="text-primary-600" size={24} />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Company Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Logo
              </label>
              <div className="flex items-center gap-4">
                {logoPreview && (
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <img 
                      src={logoPreview} 
                      alt="Company Logo" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <label className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary-400 transition-colors">
                  <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                  <span className="text-sm text-gray-500">
                    Click to upload logo (PNG, JPG, max 2MB)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                name="company_name"
                value={settings.company_name}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Your Company Name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                TRN (Tax Registration Number)
              </label>
              <input
                type="text"
                name="company_trn"
                value={settings.company_trn}
                onChange={handleInputChange}
                className="input-field"
                placeholder="TRN: 100XXXXXXXXX"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                name="company_address"
                value={settings.company_address}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Company address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                name="company_phone"
                value={settings.company_phone}
                onChange={handleInputChange}
                className="input-field"
                placeholder="+971 4 XXX XXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile
              </label>
              <input
                type="tel"
                name="company_mobile"
                value={settings.company_mobile}
                onChange={handleInputChange}
                className="input-field"
                placeholder="+971 50 XXX XXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="company_email"
                value={settings.company_email}
                onChange={handleInputChange}
                className="input-field"
                placeholder="info@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                General Manager Name
              </label>
              <input
                type="text"
                name="company_manager"
                value={settings.company_manager}
                onChange={handleInputChange}
                className="input-field"
                placeholder="e.g., Abdul Kabeer – General Manager"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <input
                type="text"
                name="company_website"
                value={settings.company_website}
                onChange={handleInputChange}
                className="input-field"
                placeholder="www.company.com"
              />
            </div>
          </div>
        </div>

        {/* Quotation Settings */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quotation Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                name="currency"
                value={settings.currency}
                onChange={handleInputChange}
                className="input-field"
              >
                <option value="AED">AED - UAE Dirham</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="SAR">SAR - Saudi Riyal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                VAT Rate (%)
              </label>
              <input
                type="number"
                name="vat_rate"
                value={settings.vat_rate}
                onChange={handleInputChange}
                min="0"
                max="100"
                step="0.1"
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Sales Terms & Quotation Message */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Sales Terms & Quotation Message</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sales Terms & Conditions *
              </label>
              <textarea
                name="sales_terms"
                value={settings.sales_terms}
                onChange={handleInputChange}
                rows={4}
                className="input-field resize-none"
                placeholder="Delivery: Delivery available stock now. Available in Dubai.&#10;Note: Any down payment made by the customer prior to order cancellation is not refundable.&#10;Thanks & waiting for your confirmation to enable us to proceed further."
              />
              <p className="text-xs text-gray-500 mt-1">This will appear prominently in the quotation PDF</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                VAT Note
              </label>
              <textarea
                name="vat_note"
                value={settings.vat_note}
                onChange={handleInputChange}
                rows={2}
                className="input-field resize-none"
                placeholder='Value Added Tax (VAT) will be applicable to all taxable transactions as per the UAE law. "Effective from January 2018"'
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quotation Closing Message *
              </label>
              <textarea
                name="quotation_message"
                value={settings.quotation_message}
                onChange={handleInputChange}
                rows={6}
                className="input-field resize-none"
                placeholder="Waiting for your confirmation to enable us to proceed further.&#10;Best Regards,&#10;[Manager Name]&#10;[Company Name]&#10;Tel: +971 XXX | Mobile: +971 XXX&#10;Email: email@company.com | Web: www.company.com | Dubai, U.A.E"
              />
              <p className="text-xs text-gray-500 mt-1">Professional closing message with manager details</p>
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Additional Terms & Conditions</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Terms & Conditions
              </label>
              <textarea
                name="terms_conditions"
                value={settings.terms_conditions}
                onChange={handleInputChange}
                rows={5}
                className="input-field resize-none"
                placeholder="Enter your terms and conditions..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery & Warranty
              </label>
              <textarea
                name="delivery_warranty"
                value={settings.delivery_warranty}
                onChange={handleInputChange}
                rows={4}
                className="input-field resize-none"
                placeholder="Enter delivery and warranty information..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Details
              </label>
              <textarea
                name="bank_details"
                value={settings.bank_details}
                onChange={handleInputChange}
                rows={4}
                className="input-field resize-none"
                placeholder="Enter bank account details..."
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2 px-8"
          >
            <Save size={20} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default SettingsPage

