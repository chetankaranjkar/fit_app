import { api } from '../lib/api'
import type {
  ProductCategory,
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
  Product,
  CreateProductDto,
  UpdateProductDto,
  ProductSearchFilter,
  InventoryTransaction,
  CreateStockInwardDto,
  CreateStockAdjustmentDto,
  InventoryAlert,
  PosOrder,
  CreatePosOrderDto,
  PosDashboard,
} from '../types/retail'

export const retailCategoriesService = {
  getTree: () => api.get<ProductCategory[]>('/retail/categories/tree'),
  getFlat: () => api.get<ProductCategory[]>('/retail/categories'),
  getById: (id: number) => api.get<ProductCategory>(`/retail/categories/${id}`),
  create: (dto: CreateProductCategoryDto) => api.post<ProductCategory>('/retail/categories', dto),
  update: (id: number, dto: UpdateProductCategoryDto) => api.put<ProductCategory>(`/retail/categories/${id}`, dto),
  delete: (id: number) => api.delete(`/retail/categories/${id}`),
}

export const retailProductsService = {
  search: (filter: ProductSearchFilter = {}) => api.get<Product[]>('/retail/products', { params: filter }),
  getById: (id: number) => api.get<Product>(`/retail/products/${id}`),
  getBySku: (sku: string) => api.get<Product>(`/retail/products/by-sku/${encodeURIComponent(sku)}`),
  getByBarcode: (barcode: string) => api.get<Product>(`/retail/products/by-barcode/${encodeURIComponent(barcode)}`),
  create: (dto: CreateProductDto) => api.post<Product>('/retail/products', dto),
  update: (id: number, dto: UpdateProductDto) => api.put<Product>(`/retail/products/${id}`, dto),
  delete: (id: number) => api.delete(`/retail/products/${id}`),
}

export const retailInventoryService = {
  recordInward: (dto: CreateStockInwardDto) => api.post<InventoryTransaction>('/retail/inventory/inward', dto),
  recordAdjustment: (dto: CreateStockAdjustmentDto) => api.post<InventoryTransaction>('/retail/inventory/adjust', dto),
  getTransactions: (productId: number) => api.get<InventoryTransaction[]>(`/retail/inventory/transactions/${productId}`),
  getLowStockAlerts: () => api.get<InventoryAlert[]>('/retail/inventory/alerts/low-stock'),
  getExpiryAlerts: (daysAhead = 30) => api.get<InventoryAlert[]>('/retail/inventory/alerts/expiry', { params: { daysAhead } }),
}

export const retailPosService = {
  getOrders: (params?: { from?: string; to?: string }) => api.get<PosOrder[]>('/retail/pos/orders', { params }),
  getOrderById: (id: number) => api.get<PosOrder>(`/retail/pos/orders/${id}`),
  createOrder: (dto: CreatePosOrderDto) => api.post<PosOrder>('/retail/pos/orders', dto),
  cancelOrder: (id: number) => api.post(`/retail/pos/orders/${id}/cancel`),
  dashboard: () => api.get<PosDashboard>('/retail/pos/dashboard'),
}
