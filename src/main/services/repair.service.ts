import { getDatabase } from '../database/connection'
import { updateStock } from './product.service'

export interface RepairJob {
  id: number
  job_number: string
  customer_id: number | null
  customer_name: string
  bike_model: string | null
  registration_number: string | null
  problem_description: string | null
  assigned_mechanic: string | null
  labor_charges: number
  parts_total: number
  total_charges: number
  status: string
  estimated_delivery: string | null
  notes: string | null
  created_at: string
  updated_at: string
  parts?: RepairPart[]
}

export interface RepairPart {
  id: number
  repair_job_id: number
  product_id: number | null
  product_name: string
  quantity: number
  unit_price: number
  total: number
}

export interface CreateRepairData {
  customer_id?: number
  customer_name: string
  bike_model?: string
  registration_number?: string
  problem_description?: string
  assigned_mechanic?: string
  labor_charges?: number
  estimated_delivery?: string
  notes?: string
  parts?: { product_id: number; product_name: string; quantity: number; unit_price: number }[]
}

function generateJobNumber(db: any): string {
  const settingsRow = db.prepare("SELECT value FROM settings WHERE key = 'repair_prefix'").get() as { value: string } | undefined
  const prefix = settingsRow?.value || 'REP'
  const today = new Date()
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`

  const last = db.prepare(
    "SELECT job_number FROM repair_jobs WHERE job_number LIKE ? ORDER BY id DESC LIMIT 1"
  ).get(`${prefix}-${dateStr}-%`) as { job_number: string } | undefined

  let seq = 1
  if (last) {
    const parts = last.job_number.split('-')
    seq = parseInt(parts[parts.length - 1]) + 1
  }

  return `${prefix}-${dateStr}-${String(seq).padStart(4, '0')}`
}

export function createRepairJob(data: CreateRepairData): RepairJob {
  const db = getDatabase()

  return db.transaction(() => {
    const jobNumber = generateJobNumber(db)
    let partsTotal = 0

    if (data.parts) {
      for (const part of data.parts) {
        partsTotal += part.quantity * part.unit_price
      }
    }

    const totalCharges = (data.labor_charges || 0) + partsTotal

    const result = db.prepare(`
      INSERT INTO repair_jobs (job_number, customer_id, customer_name, bike_model, registration_number, problem_description, assigned_mechanic, labor_charges, parts_total, total_charges, estimated_delivery, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      jobNumber, data.customer_id || null, data.customer_name,
      data.bike_model || null, data.registration_number || null,
      data.problem_description || null, data.assigned_mechanic || null,
      data.labor_charges || 0, partsTotal, totalCharges,
      data.estimated_delivery || null, data.notes || null
    )

    const jobId = result.lastInsertRowid as number

    if (data.parts) {
      const insertPart = db.prepare(`
        INSERT INTO repair_parts (repair_job_id, product_id, product_name, quantity, unit_price, total)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      for (const part of data.parts) {
        const total = part.quantity * part.unit_price
        insertPart.run(jobId, part.product_id, part.product_name, part.quantity, part.unit_price, total)
        updateStock(part.product_id, -part.quantity)
      }
    }

    return getRepairJob(jobId)!
  })()
}

export function getRepairJob(id: number): RepairJob | null {
  const db = getDatabase()
  const job = db.prepare('SELECT * FROM repair_jobs WHERE id = ?').get(id) as RepairJob | undefined
  if (!job) return null
  job.parts = db.prepare('SELECT * FROM repair_parts WHERE repair_job_id = ?').all(id) as RepairPart[]
  return job
}

export function getRepairJobs(filters: { status?: string; search?: string; page?: number; limit?: number } = {}): { jobs: RepairJob[]; total: number } {
  const db = getDatabase()
  const conditions: string[] = []
  const params: any[] = []

  if (filters.status) {
    conditions.push('status = ?')
    params.push(filters.status)
  }
  if (filters.search) {
    conditions.push('(job_number LIKE ? OR customer_name LIKE ? OR bike_model LIKE ? OR registration_number LIKE ?)')
    const s = `%${filters.search}%`
    params.push(s, s, s, s)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = filters.limit || 50
  const offset = ((filters.page || 1) - 1) * limit

  const total = db.prepare(`SELECT COUNT(*) as count FROM repair_jobs ${where}`).get(...params) as { count: number }
  const jobs = db.prepare(`SELECT * FROM repair_jobs ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, limit, offset) as RepairJob[]

  return { jobs, total: total.count }
}

export function updateRepairJob(id: number, data: Partial<RepairJob>): RepairJob {
  const db = getDatabase()
  const fields: string[] = []
  const params: any[] = []

  const allowed = ['customer_name', 'bike_model', 'registration_number', 'problem_description', 'assigned_mechanic', 'labor_charges', 'estimated_delivery', 'notes']
  for (const field of allowed) {
    if (field in data) {
      fields.push(`${field} = ?`)
      params.push((data as any)[field])
    }
  }

  if (fields.length > 0) {
    // Recalculate total
    const job = getRepairJob(id)!
    const laborCharges = data.labor_charges !== undefined ? data.labor_charges : job.labor_charges
    const totalCharges = (laborCharges as number) + job.parts_total
    fields.push('total_charges = ?')
    params.push(totalCharges)

    fields.push('updated_at = datetime(\'now\', \'localtime\')')
    params.push(id)
    db.prepare(`UPDATE repair_jobs SET ${fields.join(', ')} WHERE id = ?`).run(...params)
  }
  return getRepairJob(id)!
}

export function updateRepairStatus(id: number, status: string): RepairJob {
  const db = getDatabase()
  db.prepare('UPDATE repair_jobs SET status = ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?').run(status, id)
  return getRepairJob(id)!
}

export function deleteRepairJob(id: number): boolean {
  const db = getDatabase()
  return db.transaction(() => {
    // Restore stock for parts
    const parts = db.prepare('SELECT * FROM repair_parts WHERE repair_job_id = ?').all(id) as RepairPart[]
    for (const part of parts) {
      if (part.product_id) {
        updateStock(part.product_id, part.quantity)
      }
    }
    return db.prepare('DELETE FROM repair_jobs WHERE id = ?').run(id).changes > 0
  })()
}

export function getRepairSummary(): { pending: number; in_progress: number; completed: number; delivered: number } {
  const db = getDatabase()
  const rows = db.prepare('SELECT status, COUNT(*) as count FROM repair_jobs GROUP BY status').all() as { status: string; count: number }[]
  const summary = { pending: 0, in_progress: 0, completed: 0, delivered: 0 }
  for (const row of rows) {
    (summary as any)[row.status] = row.count
  }
  return summary
}
