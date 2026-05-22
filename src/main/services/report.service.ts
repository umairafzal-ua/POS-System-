import { getDatabase } from '../database/connection'

export interface DailySalesReport {
  date: string
  total_sales: number
  invoice_count: number
  total_cost: number
  profit: number
}

export interface MonthlySalesReport {
  month: string
  total_sales: number
  invoice_count: number
  total_cost: number
  profit: number
}

export interface StockReport {
  total_products: number
  total_stock_value: number
  total_retail_value: number
  low_stock_count: number
  out_of_stock_count: number
}

export function getDailySalesReport(dateFrom: string, dateTo: string): DailySalesReport[] {
  const db = getDatabase()
  return db.prepare(`
    SELECT 
      date(i.created_at) as date,
      SUM(i.total) as total_sales,
      COUNT(i.id) as invoice_count,
      SUM(
        (SELECT COALESCE(SUM(ii.quantity * p.cost_price), 0) 
         FROM invoice_items ii 
         LEFT JOIN products p ON ii.product_id = p.id 
         WHERE ii.invoice_id = i.id)
      ) as total_cost,
      SUM(i.total) - SUM(
        (SELECT COALESCE(SUM(ii.quantity * p.cost_price), 0) 
         FROM invoice_items ii 
         LEFT JOIN products p ON ii.product_id = p.id 
         WHERE ii.invoice_id = i.id)
      ) as profit
    FROM invoices i
    WHERE i.status = 'completed' 
      AND date(i.created_at) >= ? 
      AND date(i.created_at) <= ?
    GROUP BY date(i.created_at)
    ORDER BY date(i.created_at) DESC
  `).all(dateFrom, dateTo) as DailySalesReport[]
}

export function getMonthlySalesReport(year: number): MonthlySalesReport[] {
  const db = getDatabase()
  return db.prepare(`
    SELECT 
      strftime('%Y-%m', created_at) as month,
      SUM(total) as total_sales,
      COUNT(id) as invoice_count,
      0 as total_cost,
      0 as profit
    FROM invoices
    WHERE status = 'completed' AND strftime('%Y', created_at) = ?
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month ASC
  `).all(String(year)) as MonthlySalesReport[]
}

export function getStockReport(): StockReport {
  const db = getDatabase()
  const result = db.prepare(`
    SELECT 
      COUNT(*) as total_products,
      COALESCE(SUM(quantity * cost_price), 0) as total_stock_value,
      COALESCE(SUM(quantity * sale_price), 0) as total_retail_value,
      SUM(CASE WHEN quantity <= low_stock_threshold AND quantity > 0 THEN 1 ELSE 0 END) as low_stock_count,
      SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count
    FROM products
  `).get() as StockReport
  return result
}

export function getRepairsReport(dateFrom: string, dateTo: string): any[] {
  const db = getDatabase()
  return db.prepare(`
    SELECT 
      status,
      COUNT(*) as count,
      SUM(labor_charges) as total_labor,
      SUM(parts_total) as total_parts,
      SUM(total_charges) as total_charges
    FROM repair_jobs
    WHERE date(created_at) >= ? AND date(created_at) <= ?
    GROUP BY status
  `).all(dateFrom, dateTo)
}

export function getProfitReport(dateFrom: string, dateTo: string): any {
  const db = getDatabase()

  const sales = db.prepare(`
    SELECT 
      COALESCE(SUM(i.total), 0) as total_revenue,
      COUNT(i.id) as total_invoices
    FROM invoices i
    WHERE i.status = 'completed' 
      AND date(i.created_at) >= ? 
      AND date(i.created_at) <= ?
  `).get(dateFrom, dateTo) as any

  const costs = db.prepare(`
    SELECT COALESCE(SUM(ii.quantity * p.cost_price), 0) as total_cost
    FROM invoice_items ii
    JOIN invoices i ON ii.invoice_id = i.id
    LEFT JOIN products p ON ii.product_id = p.id
    WHERE i.status = 'completed'
      AND date(i.created_at) >= ?
      AND date(i.created_at) <= ?
  `).get(dateFrom, dateTo) as any

  const repairIncome = db.prepare(`
    SELECT COALESCE(SUM(total_charges), 0) as total
    FROM repair_jobs
    WHERE status IN ('completed', 'delivered')
      AND date(created_at) >= ?
      AND date(created_at) <= ?
  `).get(dateFrom, dateTo) as any

  return {
    total_revenue: sales.total_revenue,
    total_cost: costs.total_cost,
    gross_profit: sales.total_revenue - costs.total_cost,
    repair_income: repairIncome.total,
    total_invoices: sales.total_invoices,
    net_income: sales.total_revenue - costs.total_cost + repairIncome.total
  }
}
