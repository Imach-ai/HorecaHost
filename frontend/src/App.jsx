import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Package, FileText, Settings, Home, Database, LogOut } from 'lucide-react'
import { useTheme } from './contexts/ThemeContext'
import { useAuth } from './contexts/AuthContext'
import Loading from './components/Loading'

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ProductsPage = lazy(() => import('./pages/ProductsPage'))
const QuotationsPage = lazy(() => import('./pages/QuotationsPage'))
const QuotationNew = lazy(() => import('./pages/QuotationNew'))
const QuotationEdit = lazy(() => import('./pages/QuotationEdit'))
const QuotationView = lazy(() => import('./pages/QuotationView'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ManagePage = lazy(() => import('./pages/ManagePage'))

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loading size="large" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  const { theme } = useTheme()
  const { isAuthenticated, user, logout, loading } = useAuth()
  const sidebarClass = theme.sidebarStyle === 'gradient' 
    ? 'bg-gradient-to-b from-slate-900 to-slate-800'
    : 'bg-slate-900'

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loading size="large" />
      </div>
    )
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen">
          <Loading size="large" />
        </div>
      }>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    )
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`w-64 ${sidebarClass} text-white flex flex-col fixed h-full shadow-xl`}>
        <div className="p-4 border-b border-slate-700/50">
          <div className="bg-white rounded-lg overflow-hidden p-3 flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="HORECA HOST" 
              className="h-12 w-auto object-contain"
            />
          </div>
          <p className="text-slate-400 text-xs text-center mt-3 tracking-wide uppercase font-semibold">Quotation System</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <NavLink 
            to="/"
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-[var(--color-primary-600)] text-white shadow-lg' 
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
                  ? 'bg-[var(--color-primary-600)] text-white shadow-lg' 
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
                  ? 'bg-[var(--color-primary-600)] text-white shadow-lg' 
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`
            }
          >
            <FileText size={20} />
            <span className="font-medium">Quotations</span>
          </NavLink>
          
          <NavLink 
            to="/manage"
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-[var(--color-primary-600)] text-white shadow-lg' 
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`
            }
          >
            <Database size={20} />
            <span className="font-medium">Manage Data</span>
          </NavLink>
          
          <NavLink 
            to="/settings"
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-[var(--color-primary-600)] text-white shadow-lg' 
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`
            }
          >
            <Settings size={20} />
            <span className="font-medium">Settings</span>
          </NavLink>
        </nav>
        
        <div className="p-4 border-t border-slate-700/50 space-y-3">
          {/* User Info */}
          <div className="px-3 py-2 bg-slate-800/50 rounded-lg">
            <p className="text-xs text-slate-400 mb-1">Logged in as</p>
            <p className="text-sm font-semibold text-white">{user?.username || 'Admin'}</p>
          </div>
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-slate-300 hover:bg-red-600 hover:text-white"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>

          <p className="text-xs text-slate-500 text-center">
            Version 1.0.0
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 p-8">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <Loading size="large" />
          </div>
        }>
          <Routes>
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
            <Route path="/quotations" element={<ProtectedRoute><QuotationsPage /></ProtectedRoute>} />
            <Route path="/quotation/new" element={<ProtectedRoute><QuotationNew /></ProtectedRoute>} />
            <Route path="/quotation/:id" element={<ProtectedRoute><QuotationView /></ProtectedRoute>} />
            <Route path="/quotation/:id/edit" element={<ProtectedRoute><QuotationEdit /></ProtectedRoute>} />
            <Route path="/manage" element={<ProtectedRoute><ManagePage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}

export default App

