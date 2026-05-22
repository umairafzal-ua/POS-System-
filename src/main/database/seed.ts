import { getDatabase } from './connection'
import crypto from 'crypto'

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export function seedDatabase(): void {
  const db = getDatabase()

  // Check if already seeded
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }
  if (userCount.count > 0) return

  console.log('Seeding database with initial data...')

  const insertUser = db.prepare(
    'INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)'
  )
  const insertCategory = db.prepare(
    'INSERT INTO categories (name, description) VALUES (?, ?)'
  )
  const insertSupplier = db.prepare(
    'INSERT INTO suppliers (name, phone, email, address, company) VALUES (?, ?, ?, ?, ?)'
  )
  const insertProduct = db.prepare(
    'INSERT INTO products (product_code, name, category_id, brand, quantity, cost_price, sale_price, low_stock_threshold, supplier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  )
  const insertSetting = db.prepare(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
  )

  const seedAll = db.transaction(() => {
    // Default admin user (password: admin123)
    insertUser.run('admin', hashPassword('admin123'), 'admin', 'Administrator')
    insertUser.run('staff', hashPassword('staff123'), 'staff', 'Staff Member')

    // Categories
    insertCategory.run('Engine Parts', 'Engine components and accessories')
    insertCategory.run('Brake System', 'Brake pads, discs, cables, and related parts')
    insertCategory.run('Electrical', 'Wiring, lights, batteries, and electrical components')
    insertCategory.run('Body Parts', 'Fairings, fenders, mirrors, and body panels')
    insertCategory.run('Suspension', 'Shocks, forks, and suspension components')
    insertCategory.run('Transmission', 'Chain, sprockets, clutch, and gear parts')
    insertCategory.run('Tires & Wheels', 'Tires, tubes, rims, and wheel accessories')
    insertCategory.run('Filters', 'Oil filters, air filters, and fuel filters')
    insertCategory.run('Lubricants', 'Engine oils, chain lubes, and greases')
    insertCategory.run('Accessories', 'Helmets, gloves, covers, and accessories')

    // Suppliers
    insertSupplier.run('Honda Parts Supplier', '0300-1234567', 'honda@parts.com', 'Lahore, Pakistan', 'Honda Genuine Parts')
    insertSupplier.run('Yamaha Distributors', '0321-7654321', 'yamaha@dist.com', 'Karachi, Pakistan', 'Yamaha Parts Co.')
    insertSupplier.run('Universal Auto Parts', '0333-1112233', 'info@universal.com', 'Islamabad, Pakistan', 'Universal Trading')
    insertSupplier.run('Suzuki Parts House', '0345-9876543', 'suzuki@parts.pk', 'Rawalpindi, Pakistan', 'Suzuki Genuine')

    // Sample Products
    insertProduct.run('ENG-001', 'Piston Kit 70cc', 1, 'Honda', 25, 850, 1200, 5, 1)
    insertProduct.run('ENG-002', 'Piston Ring Set 70cc', 1, 'Honda', 40, 250, 400, 10, 1)
    insertProduct.run('ENG-003', 'Cylinder Block 70cc', 1, 'Honda', 8, 2500, 3500, 3, 1)
    insertProduct.run('ENG-004', 'Valve Set', 1, 'Honda', 15, 450, 700, 5, 1)
    insertProduct.run('ENG-005', 'Timing Chain', 1, 'Universal', 30, 180, 300, 10, 3)
    insertProduct.run('BRK-001', 'Front Brake Shoes', 2, 'Honda', 50, 200, 350, 10, 1)
    insertProduct.run('BRK-002', 'Rear Brake Shoes', 2, 'Honda', 45, 200, 350, 10, 1)
    insertProduct.run('BRK-003', 'Brake Cable Front', 2, 'Universal', 30, 120, 200, 8, 3)
    insertProduct.run('BRK-004', 'Disc Brake Pad Set', 2, 'Yamaha', 20, 350, 550, 5, 2)
    insertProduct.run('ELC-001', 'Headlight Bulb 12V', 3, 'Universal', 100, 50, 100, 20, 3)
    insertProduct.run('ELC-002', 'CDI Unit', 3, 'Honda', 10, 800, 1200, 3, 1)
    insertProduct.run('ELC-003', 'Voltage Regulator', 3, 'Universal', 15, 400, 650, 5, 3)
    insertProduct.run('ELC-004', 'Battery 12V 5Ah', 3, 'Universal', 12, 1800, 2500, 3, 3)
    insertProduct.run('BDY-001', 'Side Mirror Pair', 4, 'Universal', 35, 250, 450, 8, 3)
    insertProduct.run('BDY-002', 'Front Mudguard', 4, 'Honda', 10, 600, 900, 3, 1)
    insertProduct.run('SUS-001', 'Rear Shock Absorber', 5, 'Honda', 8, 1500, 2200, 3, 1)
    insertProduct.run('SUS-002', 'Front Fork Oil Seal', 5, 'Universal', 25, 150, 280, 5, 3)
    insertProduct.run('TRN-001', 'Chain Kit 428', 6, 'Honda', 15, 900, 1400, 5, 1)
    insertProduct.run('TRN-002', 'Clutch Plate Set', 6, 'Honda', 12, 600, 950, 4, 1)
    insertProduct.run('TRN-003', 'Sprocket Front 14T', 6, 'Universal', 30, 200, 350, 8, 3)
    insertProduct.run('TIR-001', 'Tire 2.75-17 Front', 7, 'General', 10, 1200, 1800, 3, 3)
    insertProduct.run('TIR-002', 'Tire 3.00-17 Rear', 7, 'General', 10, 1400, 2000, 3, 3)
    insertProduct.run('TIR-003', 'Inner Tube 17"', 7, 'General', 20, 300, 500, 5, 3)
    insertProduct.run('FLT-001', 'Oil Filter', 8, 'Honda', 40, 100, 180, 10, 1)
    insertProduct.run('FLT-002', 'Air Filter', 8, 'Honda', 35, 150, 280, 8, 1)
    insertProduct.run('LUB-001', 'Engine Oil 1L 20W-50', 9, 'Honda', 50, 450, 700, 10, 1)
    insertProduct.run('LUB-002', 'Chain Lubricant', 9, 'Universal', 25, 200, 350, 5, 3)
    insertProduct.run('ACC-001', 'Helmet Full Face', 10, 'Universal', 8, 1500, 2500, 3, 3)
    insertProduct.run('ACC-002', 'Bike Cover', 10, 'Universal', 15, 400, 700, 5, 3)
    insertProduct.run('ACC-003', 'Mobile Holder', 10, 'Universal', 20, 250, 450, 5, 3)

    // Default settings
    insertSetting.run('shop_name', 'Motor Bike Workshop')
    insertSetting.run('shop_address', 'Main Road, Your City')
    insertSetting.run('shop_phone', '0300-0000000')
    insertSetting.run('shop_email', 'info@workshop.com')
    insertSetting.run('currency', 'PKR')
    insertSetting.run('currency_symbol', 'Rs.')
    insertSetting.run('invoice_prefix', 'INV')
    insertSetting.run('repair_prefix', 'REP')
    insertSetting.run('tax_rate', '0')
    insertSetting.run('invoice_footer', 'Thank you for your business!')
  })

  seedAll()
  console.log('Database seeded successfully!')
}
