"use strict";
const electron = require("electron");
const path = require("path");
const Database = require("better-sqlite3");
const fs = require("fs");
const crypto = require("crypto");
const is = {
  dev: !electron.app.isPackaged
};
const platform = {
  isWindows: process.platform === "win32",
  isMacOS: process.platform === "darwin",
  isLinux: process.platform === "linux"
};
const electronApp = {
  setAppUserModelId(id) {
    if (platform.isWindows)
      electron.app.setAppUserModelId(is.dev ? process.execPath : id);
  },
  setAutoLaunch(auto) {
    if (platform.isLinux)
      return false;
    const isOpenAtLogin = () => {
      return electron.app.getLoginItemSettings().openAtLogin;
    };
    if (isOpenAtLogin() !== auto) {
      electron.app.setLoginItemSettings({
        openAtLogin: auto,
        path: process.execPath
      });
      return isOpenAtLogin() === auto;
    } else {
      return true;
    }
  },
  skipProxy() {
    return electron.session.defaultSession.setProxy({ mode: "direct" });
  }
};
const optimizer = {
  watchWindowShortcuts(window, shortcutOptions) {
    if (!window)
      return;
    const { webContents } = window;
    const { escToCloseWindow = false, zoom = false } = shortcutOptions || {};
    webContents.on("before-input-event", (event, input) => {
      if (input.type === "keyDown") {
        if (!is.dev) {
          if (input.code === "KeyR" && (input.control || input.meta))
            event.preventDefault();
        } else {
          if (input.code === "F12") {
            if (webContents.isDevToolsOpened()) {
              webContents.closeDevTools();
            } else {
              webContents.openDevTools({ mode: "undocked" });
              console.log("Open dev tool...");
            }
          }
        }
        if (escToCloseWindow) {
          if (input.code === "Escape" && input.key !== "Process") {
            window.close();
            event.preventDefault();
          }
        }
        if (!zoom) {
          if (input.code === "Minus" && (input.control || input.meta))
            event.preventDefault();
          if (input.code === "Equal" && input.shift && (input.control || input.meta))
            event.preventDefault();
        }
      }
    });
  },
  registerFramelessWindowIpc() {
    electron.ipcMain.on("win:invoke", (event, action) => {
      const win = electron.BrowserWindow.fromWebContents(event.sender);
      if (win) {
        if (action === "show") {
          win.show();
        } else if (action === "showInactive") {
          win.showInactive();
        } else if (action === "min") {
          win.minimize();
        } else if (action === "max") {
          const isMaximized = win.isMaximized();
          if (isMaximized) {
            win.unmaximize();
          } else {
            win.maximize();
          }
        } else if (action === "close") {
          win.close();
        }
      }
    });
  }
};
let db = null;
function getDbPath() {
  if (electron.app.isPackaged) {
    const userDataPath = electron.app.getPath("userData");
    return path.join(userDataPath, "shop.db");
  }
  return path.join(__dirname, "../../database/shop.db");
}
function getDatabase() {
  if (db) return db;
  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  return db;
}
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
function backupDatabase(destinationPath) {
  const database = getDatabase();
  database.backup(destinationPath);
}
function runMigrations() {
  const db2 = getDatabase();
  db2.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin' CHECK(role IN ('admin', 'staff')),
      full_name TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      company TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      brand TEXT,
      quantity INTEGER NOT NULL DEFAULT 0,
      cost_price REAL NOT NULL DEFAULT 0,
      sale_price REAL NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      bike_model TEXT,
      notes TEXT,
      total_due REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      customer_name TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      amount_paid REAL NOT NULL DEFAULT 0,
      payment_method TEXT DEFAULT 'cash',
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('draft', 'completed', 'cancelled')),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS repair_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_number TEXT NOT NULL UNIQUE,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL,
      bike_model TEXT,
      registration_number TEXT,
      problem_description TEXT,
      assigned_mechanic TEXT,
      labor_charges REAL NOT NULL DEFAULT 0,
      parts_total REAL NOT NULL DEFAULT 0,
      total_charges REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending', 'in_progress', 'completed', 'delivered')),
      estimated_delivery TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS repair_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repair_job_id INTEGER NOT NULL REFERENCES repair_jobs(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_products_code ON products(product_code);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(created_at);
    CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_repair_jobs_status ON repair_jobs(status);
    CREATE INDEX IF NOT EXISTS idx_repair_jobs_customer ON repair_jobs(customer_id);
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
  `);
}
function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}
function login(username, password) {
  const db2 = getDatabase();
  const hash = hashPassword(password);
  const user = db2.prepare("SELECT id, username, role, full_name, is_active, created_at FROM users WHERE username = ? AND password_hash = ? AND is_active = 1").get(username, hash);
  return user || null;
}
function changePassword(userId, oldPassword, newPassword) {
  const db2 = getDatabase();
  const oldHash = hashPassword(oldPassword);
  const user = db2.prepare("SELECT id FROM users WHERE id = ? AND password_hash = ?").get(userId, oldHash);
  if (!user) return false;
  const newHash = hashPassword(newPassword);
  db2.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now', 'localtime') WHERE id = ?").run(newHash, userId);
  return true;
}
function getUsers() {
  const db2 = getDatabase();
  return db2.prepare("SELECT id, username, role, full_name, is_active, created_at FROM users").all();
}
function createUser(username, password, role, fullName) {
  const db2 = getDatabase();
  const hash = hashPassword(password);
  const result = db2.prepare("INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)").run(username, hash, role, fullName);
  return db2.prepare("SELECT id, username, role, full_name, is_active, created_at FROM users WHERE id = ?").get(result.lastInsertRowid);
}
function registerAuthIpc() {
  electron.ipcMain.handle("auth:login", async (_event, username, password) => {
    try {
      const user = login(username, password);
      if (!user) return { success: false, error: "Invalid username or password" };
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("auth:change-password", async (_event, userId, oldPassword, newPassword) => {
    try {
      const result = changePassword(userId, oldPassword, newPassword);
      if (!result) return { success: false, error: "Current password is incorrect" };
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("auth:get-users", async () => {
    try {
      return { success: true, users: getUsers() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("auth:create-user", async (_event, username, password, role, fullName) => {
    try {
      const user = createUser(username, password, role, fullName);
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}
function getProducts(filters = {}) {
  const db2 = getDatabase();
  const conditions = [];
  const params = [];
  if (filters.search) {
    conditions.push("(p.name LIKE ? OR p.product_code LIKE ? OR p.brand LIKE ?)");
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  if (filters.category_id) {
    conditions.push("p.category_id = ?");
    params.push(filters.category_id);
  }
  if (filters.supplier_id) {
    conditions.push("p.supplier_id = ?");
    params.push(filters.supplier_id);
  }
  if (filters.low_stock) {
    conditions.push("p.quantity <= p.low_stock_threshold");
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filters.limit || 50;
  const offset = ((filters.page || 1) - 1) * limit;
  const total = db2.prepare(`SELECT COUNT(*) as count FROM products p ${where}`).get(...params);
  const products = db2.prepare(`
    SELECT p.*, 
           c.name as category_name, 
           s.name as supplier_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    LEFT JOIN suppliers s ON p.supplier_id = s.id 
    ${where} 
    ORDER BY p.name ASC 
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
  return { products, total: total.count };
}
function getProduct(id) {
  const db2 = getDatabase();
  const product = db2.prepare(`
    SELECT p.*, c.name as category_name, s.name as supplier_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    LEFT JOIN suppliers s ON p.supplier_id = s.id 
    WHERE p.id = ?
  `).get(id);
  return product || null;
}
function createProduct(data) {
  const db2 = getDatabase();
  const result = db2.prepare(`
    INSERT INTO products (product_code, name, category_id, brand, quantity, cost_price, sale_price, low_stock_threshold, supplier_id, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.product_code,
    data.name,
    data.category_id,
    data.brand,
    data.quantity,
    data.cost_price,
    data.sale_price,
    data.low_stock_threshold,
    data.supplier_id,
    data.description
  );
  return getProduct(result.lastInsertRowid);
}
function updateProduct(id, data) {
  const db2 = getDatabase();
  const fields = [];
  const params = [];
  const allowedFields = ["product_code", "name", "category_id", "brand", "quantity", "cost_price", "sale_price", "low_stock_threshold", "supplier_id", "description"];
  for (const field of allowedFields) {
    if (field in data) {
      fields.push(`${field} = ?`);
      params.push(data[field]);
    }
  }
  if (fields.length > 0) {
    fields.push("updated_at = datetime('now', 'localtime')");
    params.push(id);
    db2.prepare(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`).run(...params);
  }
  return getProduct(id);
}
function deleteProduct(id) {
  const db2 = getDatabase();
  const result = db2.prepare("DELETE FROM products WHERE id = ?").run(id);
  return result.changes > 0;
}
function getLowStockProducts() {
  const db2 = getDatabase();
  return db2.prepare(`
    SELECT p.*, c.name as category_name, s.name as supplier_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    LEFT JOIN suppliers s ON p.supplier_id = s.id 
    WHERE p.quantity <= p.low_stock_threshold 
    ORDER BY p.quantity ASC
  `).all();
}
function searchProducts(query) {
  const db2 = getDatabase();
  const searchTerm = `%${query}%`;
  return db2.prepare(`
    SELECT p.*, c.name as category_name, s.name as supplier_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    LEFT JOIN suppliers s ON p.supplier_id = s.id 
    WHERE p.name LIKE ? OR p.product_code LIKE ? OR p.brand LIKE ?
    ORDER BY p.name ASC 
    LIMIT 20
  `).all(searchTerm, searchTerm, searchTerm);
}
function updateStock(productId, quantityChange) {
  const db2 = getDatabase();
  db2.prepare("UPDATE products SET quantity = quantity + ?, updated_at = datetime('now', 'localtime') WHERE id = ?").run(quantityChange, productId);
}
function getTotalProductCount() {
  const db2 = getDatabase();
  const result = db2.prepare("SELECT COUNT(*) as count FROM products").get();
  return result.count;
}
function getCategories() {
  const db2 = getDatabase();
  return db2.prepare(`
    SELECT c.*, COUNT(p.id) as product_count 
    FROM categories c 
    LEFT JOIN products p ON p.category_id = c.id 
    GROUP BY c.id 
    ORDER BY c.name
  `).all();
}
function createCategory(name, description) {
  const db2 = getDatabase();
  const result = db2.prepare("INSERT INTO categories (name, description) VALUES (?, ?)").run(name, description || null);
  return db2.prepare("SELECT * FROM categories WHERE id = ?").get(result.lastInsertRowid);
}
function updateCategory(id, name, description) {
  const db2 = getDatabase();
  db2.prepare("UPDATE categories SET name = ?, description = ? WHERE id = ?").run(name, description || null, id);
  return db2.prepare("SELECT * FROM categories WHERE id = ?").get(id);
}
function deleteCategory(id) {
  const db2 = getDatabase();
  const result = db2.prepare("DELETE FROM categories WHERE id = ?").run(id);
  return result.changes > 0;
}
function registerProductIpc() {
  electron.ipcMain.handle("products:list", async (_event, filters) => {
    try {
      return { success: true, ...getProducts(filters) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("products:get", async (_event, id) => {
    try {
      const product = getProduct(id);
      return product ? { success: true, product } : { success: false, error: "Product not found" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("products:create", async (_event, data) => {
    try {
      const product = createProduct(data);
      return { success: true, product };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("products:update", async (_event, id, data) => {
    try {
      const product = updateProduct(id, data);
      return { success: true, product };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("products:delete", async (_event, id) => {
    try {
      const result = deleteProduct(id);
      return { success: result, error: result ? void 0 : "Product not found" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("products:search", async (_event, query) => {
    try {
      const products = searchProducts(query);
      return { success: true, products };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("products:low-stock", async () => {
    try {
      const products = getLowStockProducts();
      return { success: true, products };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("products:total-count", async () => {
    try {
      const count = getTotalProductCount();
      return { success: true, count };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("categories:list", async () => {
    try {
      return { success: true, categories: getCategories() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("categories:create", async (_event, name, description) => {
    try {
      const category = createCategory(name, description);
      return { success: true, category };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("categories:update", async (_event, id, name, description) => {
    try {
      const category = updateCategory(id, name, description);
      return { success: true, category };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("categories:delete", async (_event, id) => {
    try {
      const result = deleteCategory(id);
      return { success: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}
function generateInvoiceNumber(db2) {
  const settingsRow = db2.prepare("SELECT value FROM settings WHERE key = 'invoice_prefix'").get();
  const prefix = settingsRow?.value || "INV";
  const today = /* @__PURE__ */ new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const lastInvoice = db2.prepare(
    "SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1"
  ).get(`${prefix}-${dateStr}-%`);
  let seq = 1;
  if (lastInvoice) {
    const parts = lastInvoice.invoice_number.split("-");
    seq = parseInt(parts[parts.length - 1]) + 1;
  }
  return `${prefix}-${dateStr}-${String(seq).padStart(4, "0")}`;
}
function createInvoice(data) {
  const db2 = getDatabase();
  const result = db2.transaction(() => {
    const invoiceNumber = generateInvoiceNumber(db2);
    let subtotal = 0;
    for (const item of data.items) {
      subtotal += item.quantity * item.unit_price;
    }
    const discount = data.discount || 0;
    const total = subtotal - discount;
    const amountPaid = data.amount_paid !== void 0 ? data.amount_paid : total;
    const invoiceResult = db2.prepare(`
      INSERT INTO invoices (invoice_number, customer_id, customer_name, subtotal, discount, total, amount_paid, payment_method, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
    `).run(
      invoiceNumber,
      data.customer_id || null,
      data.customer_name || "Walk-in Customer",
      subtotal,
      discount,
      total,
      amountPaid,
      data.payment_method || "cash",
      data.notes || null
    );
    const invoiceId = invoiceResult.lastInsertRowid;
    const insertItem = db2.prepare(`
      INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price, total)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const item of data.items) {
      const itemTotal = item.quantity * item.unit_price;
      insertItem.run(invoiceId, item.product_id, item.product_name, item.quantity, item.unit_price, itemTotal);
      updateStock(item.product_id, -item.quantity);
    }
    if (data.customer_id && amountPaid < total) {
      const due = total - amountPaid;
      db2.prepare("UPDATE customers SET total_due = total_due + ?, updated_at = datetime('now', 'localtime') WHERE id = ?").run(due, data.customer_id);
    }
    return invoiceId;
  })();
  return getInvoice(result);
}
function getInvoice(id) {
  const db2 = getDatabase();
  const invoice = db2.prepare("SELECT * FROM invoices WHERE id = ?").get(id);
  if (!invoice) return null;
  invoice.items = db2.prepare("SELECT * FROM invoice_items WHERE invoice_id = ?").all(id);
  return invoice;
}
function getInvoices(filters = {}) {
  const db2 = getDatabase();
  const conditions = [];
  const params = [];
  if (filters.status) {
    conditions.push("status = ?");
    params.push(filters.status);
  }
  if (filters.search) {
    conditions.push("(invoice_number LIKE ? OR customer_name LIKE ?)");
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters.date_from) {
    conditions.push("created_at >= ?");
    params.push(filters.date_from);
  }
  if (filters.date_to) {
    conditions.push("created_at <= ?");
    params.push(filters.date_to + " 23:59:59");
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filters.limit || 50;
  const offset = ((filters.page || 1) - 1) * limit;
  const total = db2.prepare(`SELECT COUNT(*) as count FROM invoices ${where}`).get(...params);
  const invoices = db2.prepare(`SELECT * FROM invoices ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
  return { invoices, total: total.count };
}
function cancelInvoice(id) {
  const db2 = getDatabase();
  return db2.transaction(() => {
    const invoice = db2.prepare('SELECT * FROM invoices WHERE id = ? AND status = "completed"').get(id);
    if (!invoice) return false;
    const items = db2.prepare("SELECT * FROM invoice_items WHERE invoice_id = ?").all(id);
    for (const item of items) {
      if (item.product_id) {
        updateStock(item.product_id, item.quantity);
      }
    }
    if (invoice.customer_id && invoice.amount_paid < invoice.total) {
      const due = invoice.total - invoice.amount_paid;
      db2.prepare("UPDATE customers SET total_due = total_due - ?, updated_at = datetime('now', 'localtime') WHERE id = ?").run(due, invoice.customer_id);
    }
    db2.prepare('UPDATE invoices SET status = "cancelled" WHERE id = ?').run(id);
    return true;
  })();
}
function getTodaySales() {
  const db2 = getDatabase();
  const result = db2.prepare(`
    SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count 
    FROM invoices 
    WHERE status = 'completed' AND date(created_at) = date('now', 'localtime')
  `).get();
  return result;
}
function getMonthlySales() {
  const db2 = getDatabase();
  const result = db2.prepare(`
    SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count 
    FROM invoices 
    WHERE status = 'completed' 
    AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')
  `).get();
  return result;
}
function registerInvoiceIpc() {
  electron.ipcMain.handle("invoices:list", async (_event, filters) => {
    try {
      return { success: true, ...getInvoices(filters) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("invoices:get", async (_event, id) => {
    try {
      const invoice = getInvoice(id);
      return invoice ? { success: true, invoice } : { success: false, error: "Invoice not found" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("invoices:create", async (_event, data) => {
    try {
      const invoice = createInvoice(data);
      return { success: true, invoice };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("invoices:cancel", async (_event, id) => {
    try {
      const result = cancelInvoice(id);
      return { success: result, error: result ? void 0 : "Invoice not found or already cancelled" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("invoices:today-sales", async () => {
    try {
      return { success: true, ...getTodaySales() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("invoices:monthly-sales", async () => {
    try {
      return { success: true, ...getMonthlySales() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}
function getCustomers(filters = {}) {
  const db2 = getDatabase();
  const conditions = [];
  const params = [];
  if (filters.search) {
    conditions.push("(name LIKE ? OR phone LIKE ? OR bike_model LIKE ?)");
    const s = `%${filters.search}%`;
    params.push(s, s, s);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filters.limit || 50;
  const offset = ((filters.page || 1) - 1) * limit;
  const total = db2.prepare(`SELECT COUNT(*) as count FROM customers ${where}`).get(...params);
  const customers = db2.prepare(`SELECT * FROM customers ${where} ORDER BY name ASC LIMIT ? OFFSET ?`).all(...params, limit, offset);
  return { customers, total: total.count };
}
function getCustomer(id) {
  const db2 = getDatabase();
  return db2.prepare("SELECT * FROM customers WHERE id = ?").get(id) || null;
}
function createCustomer(data) {
  const db2 = getDatabase();
  const result = db2.prepare(
    "INSERT INTO customers (name, phone, address, bike_model, notes) VALUES (?, ?, ?, ?, ?)"
  ).run(data.name, data.phone, data.address, data.bike_model, data.notes);
  return getCustomer(result.lastInsertRowid);
}
function updateCustomer(id, data) {
  const db2 = getDatabase();
  const fields = [];
  const params = [];
  for (const field of ["name", "phone", "address", "bike_model", "notes"]) {
    if (field in data) {
      fields.push(`${field} = ?`);
      params.push(data[field]);
    }
  }
  if (fields.length > 0) {
    fields.push("updated_at = datetime('now', 'localtime')");
    params.push(id);
    db2.prepare(`UPDATE customers SET ${fields.join(", ")} WHERE id = ?`).run(...params);
  }
  return getCustomer(id);
}
function deleteCustomer(id) {
  const db2 = getDatabase();
  return db2.prepare("DELETE FROM customers WHERE id = ?").run(id).changes > 0;
}
function getCustomerHistory(customerId) {
  const db2 = getDatabase();
  const invoices = db2.prepare(`
    SELECT id, invoice_number, total, amount_paid, status, created_at 
    FROM invoices WHERE customer_id = ? ORDER BY id DESC
  `).all(customerId);
  const repairs = db2.prepare(`
    SELECT id, job_number, total_charges, status, created_at 
    FROM repair_jobs WHERE customer_id = ? ORDER BY id DESC
  `).all(customerId);
  return [...invoices.map((i) => ({ ...i, type: "invoice" })), ...repairs.map((r) => ({ ...r, type: "repair" }))].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
function getAllCustomers() {
  const db2 = getDatabase();
  return db2.prepare("SELECT * FROM customers ORDER BY name ASC").all();
}
function registerCustomerIpc() {
  electron.ipcMain.handle("customers:list", async (_event, filters) => {
    try {
      return { success: true, ...getCustomers(filters) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("customers:all", async () => {
    try {
      return { success: true, customers: getAllCustomers() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("customers:get", async (_event, id) => {
    try {
      const customer = getCustomer(id);
      return customer ? { success: true, customer } : { success: false, error: "Customer not found" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("customers:create", async (_event, data) => {
    try {
      const customer = createCustomer(data);
      return { success: true, customer };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("customers:update", async (_event, id, data) => {
    try {
      const customer = updateCustomer(id, data);
      return { success: true, customer };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("customers:delete", async (_event, id) => {
    try {
      const result = deleteCustomer(id);
      return { success: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("customers:history", async (_event, id) => {
    try {
      const history = getCustomerHistory(id);
      return { success: true, history };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}
function getSuppliers(filters = {}) {
  const db2 = getDatabase();
  const conditions = [];
  const params = [];
  if (filters.search) {
    conditions.push("(s.name LIKE ? OR s.company LIKE ? OR s.phone LIKE ?)");
    const t = `%${filters.search}%`;
    params.push(t, t, t);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filters.limit || 50;
  const offset = ((filters.page || 1) - 1) * limit;
  const total = db2.prepare(`SELECT COUNT(*) as count FROM suppliers s ${where}`).get(...params);
  const suppliers = db2.prepare(`
    SELECT s.*, COUNT(p.id) as product_count 
    FROM suppliers s 
    LEFT JOIN products p ON p.supplier_id = s.id 
    ${where} 
    GROUP BY s.id 
    ORDER BY s.name ASC 
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
  return { suppliers, total: total.count };
}
function getSupplier(id) {
  const db2 = getDatabase();
  return db2.prepare("SELECT * FROM suppliers WHERE id = ?").get(id) || null;
}
function createSupplier(data) {
  const db2 = getDatabase();
  const result = db2.prepare(
    "INSERT INTO suppliers (name, phone, email, address, company, notes) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(data.name, data.phone, data.email, data.address, data.company, data.notes);
  return getSupplier(result.lastInsertRowid);
}
function updateSupplier(id, data) {
  const db2 = getDatabase();
  const fields = [];
  const params = [];
  for (const field of ["name", "phone", "email", "address", "company", "notes"]) {
    if (field in data) {
      fields.push(`${field} = ?`);
      params.push(data[field]);
    }
  }
  if (fields.length > 0) {
    fields.push("updated_at = datetime('now', 'localtime')");
    params.push(id);
    db2.prepare(`UPDATE suppliers SET ${fields.join(", ")} WHERE id = ?`).run(...params);
  }
  return getSupplier(id);
}
function deleteSupplier(id) {
  const db2 = getDatabase();
  return db2.prepare("DELETE FROM suppliers WHERE id = ?").run(id).changes > 0;
}
function getAllSuppliers() {
  const db2 = getDatabase();
  return db2.prepare("SELECT * FROM suppliers ORDER BY name ASC").all();
}
function registerSupplierIpc() {
  electron.ipcMain.handle("suppliers:list", async (_event, filters) => {
    try {
      return { success: true, ...getSuppliers(filters) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("suppliers:all", async () => {
    try {
      return { success: true, suppliers: getAllSuppliers() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("suppliers:get", async (_event, id) => {
    try {
      const supplier = getSupplier(id);
      return supplier ? { success: true, supplier } : { success: false, error: "Supplier not found" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("suppliers:create", async (_event, data) => {
    try {
      const supplier = createSupplier(data);
      return { success: true, supplier };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("suppliers:update", async (_event, id, data) => {
    try {
      const supplier = updateSupplier(id, data);
      return { success: true, supplier };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("suppliers:delete", async (_event, id) => {
    try {
      const result = deleteSupplier(id);
      return { success: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}
function generateJobNumber(db2) {
  const settingsRow = db2.prepare("SELECT value FROM settings WHERE key = 'repair_prefix'").get();
  const prefix = settingsRow?.value || "REP";
  const today = /* @__PURE__ */ new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const last = db2.prepare(
    "SELECT job_number FROM repair_jobs WHERE job_number LIKE ? ORDER BY id DESC LIMIT 1"
  ).get(`${prefix}-${dateStr}-%`);
  let seq = 1;
  if (last) {
    const parts = last.job_number.split("-");
    seq = parseInt(parts[parts.length - 1]) + 1;
  }
  return `${prefix}-${dateStr}-${String(seq).padStart(4, "0")}`;
}
function createRepairJob(data) {
  const db2 = getDatabase();
  return db2.transaction(() => {
    const jobNumber = generateJobNumber(db2);
    let partsTotal = 0;
    if (data.parts) {
      for (const part of data.parts) {
        partsTotal += part.quantity * part.unit_price;
      }
    }
    const totalCharges = (data.labor_charges || 0) + partsTotal;
    const result = db2.prepare(`
      INSERT INTO repair_jobs (job_number, customer_id, customer_name, bike_model, registration_number, problem_description, assigned_mechanic, labor_charges, parts_total, total_charges, estimated_delivery, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      jobNumber,
      data.customer_id || null,
      data.customer_name,
      data.bike_model || null,
      data.registration_number || null,
      data.problem_description || null,
      data.assigned_mechanic || null,
      data.labor_charges || 0,
      partsTotal,
      totalCharges,
      data.estimated_delivery || null,
      data.notes || null
    );
    const jobId = result.lastInsertRowid;
    if (data.parts) {
      const insertPart = db2.prepare(`
        INSERT INTO repair_parts (repair_job_id, product_id, product_name, quantity, unit_price, total)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const part of data.parts) {
        const total = part.quantity * part.unit_price;
        insertPart.run(jobId, part.product_id, part.product_name, part.quantity, part.unit_price, total);
        updateStock(part.product_id, -part.quantity);
      }
    }
    return getRepairJob(jobId);
  })();
}
function getRepairJob(id) {
  const db2 = getDatabase();
  const job = db2.prepare("SELECT * FROM repair_jobs WHERE id = ?").get(id);
  if (!job) return null;
  job.parts = db2.prepare("SELECT * FROM repair_parts WHERE repair_job_id = ?").all(id);
  return job;
}
function getRepairJobs(filters = {}) {
  const db2 = getDatabase();
  const conditions = [];
  const params = [];
  if (filters.status) {
    conditions.push("status = ?");
    params.push(filters.status);
  }
  if (filters.search) {
    conditions.push("(job_number LIKE ? OR customer_name LIKE ? OR bike_model LIKE ? OR registration_number LIKE ?)");
    const s = `%${filters.search}%`;
    params.push(s, s, s, s);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filters.limit || 50;
  const offset = ((filters.page || 1) - 1) * limit;
  const total = db2.prepare(`SELECT COUNT(*) as count FROM repair_jobs ${where}`).get(...params);
  const jobs = db2.prepare(`SELECT * FROM repair_jobs ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
  return { jobs, total: total.count };
}
function updateRepairJob(id, data) {
  const db2 = getDatabase();
  const fields = [];
  const params = [];
  const allowed = ["customer_name", "bike_model", "registration_number", "problem_description", "assigned_mechanic", "labor_charges", "estimated_delivery", "notes"];
  for (const field of allowed) {
    if (field in data) {
      fields.push(`${field} = ?`);
      params.push(data[field]);
    }
  }
  if (fields.length > 0) {
    const job = getRepairJob(id);
    const laborCharges = data.labor_charges !== void 0 ? data.labor_charges : job.labor_charges;
    const totalCharges = laborCharges + job.parts_total;
    fields.push("total_charges = ?");
    params.push(totalCharges);
    fields.push("updated_at = datetime('now', 'localtime')");
    params.push(id);
    db2.prepare(`UPDATE repair_jobs SET ${fields.join(", ")} WHERE id = ?`).run(...params);
  }
  return getRepairJob(id);
}
function updateRepairStatus(id, status) {
  const db2 = getDatabase();
  db2.prepare("UPDATE repair_jobs SET status = ?, updated_at = datetime('now', 'localtime') WHERE id = ?").run(status, id);
  return getRepairJob(id);
}
function deleteRepairJob(id) {
  const db2 = getDatabase();
  return db2.transaction(() => {
    const parts = db2.prepare("SELECT * FROM repair_parts WHERE repair_job_id = ?").all(id);
    for (const part of parts) {
      if (part.product_id) {
        updateStock(part.product_id, part.quantity);
      }
    }
    return db2.prepare("DELETE FROM repair_jobs WHERE id = ?").run(id).changes > 0;
  })();
}
function getRepairSummary() {
  const db2 = getDatabase();
  const rows = db2.prepare("SELECT status, COUNT(*) as count FROM repair_jobs GROUP BY status").all();
  const summary = { pending: 0, in_progress: 0, completed: 0, delivered: 0 };
  for (const row of rows) {
    summary[row.status] = row.count;
  }
  return summary;
}
function registerRepairIpc() {
  electron.ipcMain.handle("repairs:list", async (_event, filters) => {
    try {
      return { success: true, ...getRepairJobs(filters) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("repairs:get", async (_event, id) => {
    try {
      const job = getRepairJob(id);
      return job ? { success: true, job } : { success: false, error: "Repair job not found" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("repairs:create", async (_event, data) => {
    try {
      const job = createRepairJob(data);
      return { success: true, job };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("repairs:update", async (_event, id, data) => {
    try {
      const job = updateRepairJob(id, data);
      return { success: true, job };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("repairs:update-status", async (_event, id, status) => {
    try {
      const job = updateRepairStatus(id, status);
      return { success: true, job };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("repairs:delete", async (_event, id) => {
    try {
      const result = deleteRepairJob(id);
      return { success: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("repairs:summary", async () => {
    try {
      return { success: true, summary: getRepairSummary() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}
function getDailySalesReport(dateFrom, dateTo) {
  const db2 = getDatabase();
  return db2.prepare(`
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
  `).all(dateFrom, dateTo);
}
function getMonthlySalesReport(year) {
  const db2 = getDatabase();
  return db2.prepare(`
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
  `).all(String(year));
}
function getStockReport() {
  const db2 = getDatabase();
  const result = db2.prepare(`
    SELECT 
      COUNT(*) as total_products,
      COALESCE(SUM(quantity * cost_price), 0) as total_stock_value,
      COALESCE(SUM(quantity * sale_price), 0) as total_retail_value,
      SUM(CASE WHEN quantity <= low_stock_threshold AND quantity > 0 THEN 1 ELSE 0 END) as low_stock_count,
      SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count
    FROM products
  `).get();
  return result;
}
function getRepairsReport(dateFrom, dateTo) {
  const db2 = getDatabase();
  return db2.prepare(`
    SELECT 
      status,
      COUNT(*) as count,
      SUM(labor_charges) as total_labor,
      SUM(parts_total) as total_parts,
      SUM(total_charges) as total_charges
    FROM repair_jobs
    WHERE date(created_at) >= ? AND date(created_at) <= ?
    GROUP BY status
  `).all(dateFrom, dateTo);
}
function getProfitReport(dateFrom, dateTo) {
  const db2 = getDatabase();
  const sales = db2.prepare(`
    SELECT 
      COALESCE(SUM(i.total), 0) as total_revenue,
      COUNT(i.id) as total_invoices
    FROM invoices i
    WHERE i.status = 'completed' 
      AND date(i.created_at) >= ? 
      AND date(i.created_at) <= ?
  `).get(dateFrom, dateTo);
  const costs = db2.prepare(`
    SELECT COALESCE(SUM(ii.quantity * p.cost_price), 0) as total_cost
    FROM invoice_items ii
    JOIN invoices i ON ii.invoice_id = i.id
    LEFT JOIN products p ON ii.product_id = p.id
    WHERE i.status = 'completed'
      AND date(i.created_at) >= ?
      AND date(i.created_at) <= ?
  `).get(dateFrom, dateTo);
  const repairIncome = db2.prepare(`
    SELECT COALESCE(SUM(total_charges), 0) as total
    FROM repair_jobs
    WHERE status IN ('completed', 'delivered')
      AND date(created_at) >= ?
      AND date(created_at) <= ?
  `).get(dateFrom, dateTo);
  return {
    total_revenue: sales.total_revenue,
    total_cost: costs.total_cost,
    gross_profit: sales.total_revenue - costs.total_cost,
    repair_income: repairIncome.total,
    total_invoices: sales.total_invoices,
    net_income: sales.total_revenue - costs.total_cost + repairIncome.total
  };
}
function registerReportIpc() {
  electron.ipcMain.handle("reports:daily-sales", async (_event, dateFrom, dateTo) => {
    try {
      const report = getDailySalesReport(dateFrom, dateTo);
      return { success: true, report };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("reports:monthly-sales", async (_event, year) => {
    try {
      const report = getMonthlySalesReport(year);
      return { success: true, report };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("reports:stock", async () => {
    try {
      const report = getStockReport();
      return { success: true, report };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("reports:profit", async (_event, dateFrom, dateTo) => {
    try {
      const report = getProfitReport(dateFrom, dateTo);
      return { success: true, report };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("reports:repairs", async (_event, dateFrom, dateTo) => {
    try {
      const report = getRepairsReport(dateFrom, dateTo);
      return { success: true, report };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}
function getSettings() {
  const db2 = getDatabase();
  const rows = db2.prepare("SELECT key, value FROM settings").all();
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}
function updateSettings(settings) {
  const db2 = getDatabase();
  const upsert = db2.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
  db2.transaction(() => {
    for (const [key, value] of Object.entries(settings)) {
      upsert.run(key, value);
    }
  })();
  return getSettings();
}
async function backupDatabaseDialog() {
  try {
    const result = await electron.dialog.showSaveDialog({
      title: "Backup Database",
      defaultPath: path.join(electron.app.getPath("desktop"), `workshop-backup-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.db`),
      filters: [{ name: "SQLite Database", extensions: ["db"] }]
    });
    if (result.canceled || !result.filePath) {
      return { success: false, error: "Cancelled" };
    }
    backupDatabase(result.filePath);
    return { success: true, path: result.filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function restoreDatabaseDialog() {
  try {
    const result = await electron.dialog.showOpenDialog({
      title: "Restore Database",
      filters: [{ name: "SQLite Database", extensions: ["db"] }],
      properties: ["openFile"]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: "Cancelled" };
    }
    const sourcePath = result.filePaths[0];
    const destPath = getDbPath();
    const backupPath = destPath + ".bak";
    if (fs.existsSync(destPath)) {
      fs.copyFileSync(destPath, backupPath);
    }
    fs.copyFileSync(sourcePath, destPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
function registerSettingsIpc() {
  electron.ipcMain.handle("settings:get", async () => {
    try {
      const settings = getSettings();
      return { success: true, settings };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("settings:update", async (_event, settings) => {
    try {
      const updated = updateSettings(settings);
      return { success: true, settings: updated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("settings:backup", async () => {
    try {
      return await backupDatabaseDialog();
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("settings:restore", async () => {
    try {
      return await restoreDatabaseDialog();
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    title: "Workshop POS - Motor Bike Spare Parts",
    icon: path.join(__dirname, "../../resources/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
    mainWindow.maximize();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.workshop.pos");
  console.log("Initializing database...");
  runMigrations();
  console.log("Database ready.");
  registerAuthIpc();
  registerProductIpc();
  registerInvoiceIpc();
  registerCustomerIpc();
  registerSupplierIpc();
  registerRepairIpc();
  registerReportIpc();
  registerSettingsIpc();
  electron.app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  closeDatabase();
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
