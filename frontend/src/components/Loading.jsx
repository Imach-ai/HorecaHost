export default function Loading({ size = 'large', className = '' }) {
  const sizeClasses = {
    small: 'h-6 w-6',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full border-4 border-primary-600 border-t-transparent ${sizeClasses[size]}`}></div>
    </div>
  )
}

