import { ipcMain } from 'electron'
import * as productService from '../services/product.service'
import * as categoryService from '../services/category.service'

export function registerProductIpc(): void {
  // Products
  ipcMain.handle('products:list', async (_event, filters) => {
    try {
      return { success: true, ...productService.getProducts(filters) }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('products:get', async (_event, id: number) => {
    try {
      const product = productService.getProduct(id)
      return product ? { success: true, product } : { success: false, error: 'Product not found' }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('products:create', async (_event, data) => {
    try {
      const product = productService.createProduct(data)
      return { success: true, product }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('products:update', async (_event, id: number, data) => {
    try {
      const product = productService.updateProduct(id, data)
      return { success: true, product }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('products:delete', async (_event, id: number) => {
    try {
      const result = productService.deleteProduct(id)
      return { success: result, error: result ? undefined : 'Product not found' }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('products:search', async (_event, query: string) => {
    try {
      const products = productService.searchProducts(query)
      return { success: true, products }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('products:low-stock', async () => {
    try {
      const products = productService.getLowStockProducts()
      return { success: true, products }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('products:total-count', async () => {
    try {
      const count = productService.getTotalProductCount()
      return { success: true, count }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Categories
  ipcMain.handle('categories:list', async () => {
    try {
      return { success: true, categories: categoryService.getCategories() }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('categories:create', async (_event, name: string, description?: string) => {
    try {
      const category = categoryService.createCategory(name, description)
      return { success: true, category }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('categories:update', async (_event, id: number, name: string, description?: string) => {
    try {
      const category = categoryService.updateCategory(id, name, description)
      return { success: true, category }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('categories:delete', async (_event, id: number) => {
    try {
      const result = categoryService.deleteCategory(id)
      return { success: result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
}
