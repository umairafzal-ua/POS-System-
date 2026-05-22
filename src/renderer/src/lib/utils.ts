import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, symbol: string = 'Rs.'): string {
  return `${symbol} ${amount.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-PK', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending': return 'bg-warning-bg text-warning'
    case 'in_progress': return 'bg-info-bg text-info'
    case 'completed': return 'bg-success-bg text-success'
    case 'delivered': return 'bg-primary-bg text-primary'
    case 'cancelled': return 'bg-danger-bg text-danger'
    default: return 'bg-muted/20 text-muted'
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending': return 'Pending'
    case 'in_progress': return 'In Progress'
    case 'completed': return 'Completed'
    case 'delivered': return 'Delivered'
    case 'cancelled': return 'Cancelled'
    default: return status
  }
}
