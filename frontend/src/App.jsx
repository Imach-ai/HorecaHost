import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { Package, FileText, Settings, Home } from 'lucide-react'
import ProductsPage from './pages/ProductsPage'
import QuotationsPage from './pages/QuotationsPage'
import QuotationNew from './pages/QuotationNew'
import QuotationEdit from './pages/QuotationEdit'
import QuotationView from './pages/QuotationView'
import SettingsPage from './pages/SettingsPage'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col fixed h-full shadow-xl">
        <div className="p-3 border-b border-slate-700/50">
          <div className="bg-white rounded-lg overflow-hidden">
            <img 
              src="/logo.svg" 
              alt="HORECA" 
              className="w-full h-auto block"
            />
          </div>
          <p className="text-slate-400 text-xs text-center mt-2 tracking-wide uppercase">Quotation System</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <NavLink 
            to="/"
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`
            }
          >
            <Home size={20} />
            <span className="font-medium">Dashboard</span>
          </NavLink>
          
          <NavLink 
            to="/products"
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`
            }
          >
            <Package size={20} />
            <span className="font-medium">Products</span>
          </NavLink>
          
          <NavLink 
            to="/quotations"
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`
            }
          >
            <FileText size={20} />
            <span className="font-medium">Quotations</span>
          </NavLink>
          
          <NavLink 
            to="/settings"
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`
            }
          >
            <Settings size={20} />
            <span className="font-medium">Settings</span>
          </NavLink>
        </nav>
        
        <div className="p-4 border-t border-slate-700/50">
          <p className="text-xs text-slate-500 text-center">
            Version 1.0.0
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 p-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/quotations" element={<QuotationsPage />} />
          <Route path="/quotation/new" element={<QuotationNew />} />
          <Route path="/quotation/:id" element={<QuotationView />} />
          <Route path="/quotation/:id/edit" element={<QuotationEdit />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App

