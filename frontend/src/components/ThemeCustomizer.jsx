import { useState } from 'react'
import { Palette, Moon, Sun, Monitor, Layout, Type, RotateCcw, Check } from 'lucide-react'
import { useTheme, COLOR_SCHEMES, THEMES } from '../contexts/ThemeContext'

function ThemeCustomizer() {
  const { theme, updateTheme, resetTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('colors')

  const colorSchemes = Object.entries(COLOR_SCHEMES)

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('colors')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'colors'
              ? 'text-[var(--color-primary-600)] border-b-2 border-[var(--color-primary-600)]'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Palette size={16} />
            Colors
          </div>
        </button>
        <button
          onClick={() => setActiveTab('appearance')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'appearance'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layout size={16} />
            Appearance
          </div>
        </button>
        <button
          onClick={() => setActiveTab('advanced')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'advanced'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Type size={16} />
            Advanced
          </div>
        </button>
      </div>

      {/* Colors Tab */}
      {activeTab === 'colors' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Palette size={16} />
              Color Scheme
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {colorSchemes.map(([key, scheme]) => (
                <button
                  key={key}
                  onClick={() => updateTheme({ colorScheme: key })}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    theme.colorScheme === key
                      ? 'border-[var(--color-primary-600)] shadow-lg scale-105'
                      : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-8 h-8 rounded-lg shadow-sm"
                      style={{ backgroundColor: scheme.primary[600] }}
                    />
                    <span className="font-medium text-sm text-gray-700 dark:text-slate-300">{scheme.name}</span>
                  </div>
                  <div className="flex gap-1">
                    {[500, 600, 700].map((shade) => (
                      <div
                        key={shade}
                        className="flex-1 h-3 rounded"
                        style={{ backgroundColor: scheme.primary[shade] }}
                      />
                    ))}
                  </div>
                  {theme.colorScheme === key && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-[var(--color-primary-600)] rounded-full p-1">
                        <Check className="text-white" size={12} />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          {/* Theme Mode */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Monitor size={16} />
              Theme Mode
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => updateTheme({ mode: THEMES.light })}
                className={`p-4 rounded-xl border-2 transition-all ${
                  theme.mode === THEMES.light
                    ? 'border-[var(--color-primary-600)] bg-[var(--color-primary-50)] shadow-lg'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Sun className="mx-auto mb-2 text-yellow-500" size={24} />
                <div className="text-sm font-medium text-gray-700 dark:text-slate-300">Light</div>
                {theme.mode === THEMES.light && (
                  <Check className="mx-auto mt-2 text-[var(--color-primary-600)]" size={16} />
                )}
              </button>
              <button
                onClick={() => updateTheme({ mode: THEMES.dark })}
                className={`p-4 rounded-xl border-2 transition-all ${
                  theme.mode === THEMES.dark
                    ? 'border-primary-600 bg-primary-50 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Moon className="mx-auto mb-2 text-indigo-500" size={24} />
                <div className="text-sm font-medium text-gray-700 dark:text-slate-300">Dark</div>
                {theme.mode === THEMES.dark && (
                  <Check className="mx-auto mt-2 text-primary-600" size={16} />
                )}
              </button>
              <button
                onClick={() => updateTheme({ mode: THEMES.auto })}
                className={`p-4 rounded-xl border-2 transition-all ${
                  theme.mode === THEMES.auto
                    ? 'border-primary-600 bg-primary-50 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Monitor className="mx-auto mb-2 text-gray-500" size={24} />
                <div className="text-sm font-medium text-gray-700 dark:text-slate-300">Auto</div>
                {theme.mode === THEMES.auto && (
                  <Check className="mx-auto mt-2 text-primary-600" size={16} />
                )}
              </button>
            </div>
          </div>

          {/* Sidebar Style */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Layout size={16} />
              Sidebar Style
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => updateTheme({ sidebarStyle: 'gradient' })}
                className={`p-4 rounded-xl border-2 transition-all ${
                  theme.sidebarStyle === 'gradient'
                    ? 'border-primary-600 bg-primary-50 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="h-12 rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 mb-2" />
                <div className="text-sm font-medium text-gray-700">Gradient</div>
                {theme.sidebarStyle === 'gradient' && (
                  <Check className="mx-auto mt-2 text-primary-600" size={16} />
                )}
              </button>
              <button
                onClick={() => updateTheme({ sidebarStyle: 'solid' })}
                className={`p-4 rounded-xl border-2 transition-all ${
                  theme.sidebarStyle === 'solid'
                    ? 'border-primary-600 bg-primary-50 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="h-12 rounded-lg bg-slate-900 mb-2" />
                <div className="text-sm font-medium text-gray-700">Solid</div>
                {theme.sidebarStyle === 'solid' && (
                  <Check className="mx-auto mt-2 text-primary-600" size={16} />
                )}
              </button>
            </div>
          </div>

          {/* Border Radius */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Border Radius</h3>
            <div className="grid grid-cols-3 gap-3">
              {['small', 'medium', 'large'].map((size) => (
                <button
                  key={size}
                  onClick={() => updateTheme({ borderRadius: size })}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    theme.borderRadius === size
                      ? 'border-primary-600 bg-primary-50 shadow-lg'
                      : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div
                    className={`mx-auto mb-2 bg-[var(--color-primary-600)] ${
                      size === 'small' ? 'rounded' :
                      size === 'medium' ? 'rounded-lg' : 'rounded-xl'
                    }`}
                    style={{ width: '40px', height: '40px' }}
                  />
                  <div className="text-sm font-medium text-gray-700 dark:text-slate-300 capitalize">{size}</div>
                  {theme.borderRadius === size && (
                    <Check className="mx-auto mt-2 text-primary-600" size={16} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Advanced Tab */}
      {activeTab === 'advanced' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Type size={16} />
              Font Family
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'default', name: 'Default', font: 'Plus Jakarta Sans' },
                { key: 'modern', name: 'Modern', font: 'Inter' },
                { key: 'classic', name: 'Classic', font: 'Georgia' }
              ].map((fontOption) => (
                <button
                  key={fontOption.key}
                  onClick={() => updateTheme({ fontFamily: fontOption.key })}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    theme.fontFamily === fontOption.key
                      ? 'border-primary-600 bg-primary-50 shadow-lg'
                      : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                  }`}
                  style={{ fontFamily: fontOption.font }}
                >
                  <div className="text-lg font-medium mb-1">Aa</div>
                  <div className="text-xs text-gray-600 dark:text-slate-400">{fontOption.name}</div>
                  {theme.fontFamily === fontOption.key && (
                    <Check className="mx-auto mt-2 text-primary-600" size={16} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Reset Button */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={resetTheme}
              className="w-full btn-secondary flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} />
              Reset to Default
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ThemeCustomizer

