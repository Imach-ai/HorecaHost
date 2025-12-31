// Currency formatting
export function formatCurrency(amount) {
  return `AED ${parseFloat(amount || 0).toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`
}

// Date formatting
export function formatDate(dateStr, format = 'display') {
  if (!dateStr) return ''
  
  const date = new Date(dateStr)
  if (format === 'display') {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }
  return date.toISOString().split('T')[0]
}

// Status badge styles
export function getStatusBadgeStyles(status) {
  const styles = {
    draft: 'bg-amber-100 text-amber-700 border-amber-200',
    sent: 'bg-blue-100 text-blue-700 border-blue-200',
    accepted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-100 text-red-700 border-red-200'
  }
  return styles[status] || styles.draft
}

