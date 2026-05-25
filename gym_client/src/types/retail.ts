export type ProductStatus = 'Active' | 'Discontinued' | 'OutOfStock'
export type PosOrderStatus = 'Draft' | 'Completed' | 'Cancelled' | 'Refunded'
export type PosPaymentMethod = 'Cash' | 'Upi' | 'Card' | 'Online' | 'Wallet' | 'Other'
export type InventoryTransactionType = 'Inward' | 'Sale' | 'Outward' | 'Adjustment' | 'Return'

export interface ProductCategory {
  id: number
  name: string
  description?: string | null
  parentCategoryId?: number | null
  parentCategoryName?: string | null
  sortOrder: number
  isActive: boolean
  productCount: number
  subCategories: ProductCategory[]
}

export interface CreateProductCategoryDto {
  name: string
  description?: string
  parentCategoryId?: number | null
  sortOrder?: number
  isActive?: boolean
}

export interface UpdateProductCategoryDto {
  name?: string
  description?: string
  parentCategoryId?: number | null
  sortOrder?: number
  isActive?: boolean
}

export interface Product {
  id: number
  name: string
  description?: string | null
  sku: string
  barcode?: string | null
  categoryId: number
  categoryName?: string | null
  brand?: string | null
  flavor?: string | null
  size?: string | null
  unit?: string | null
  batchNumber?: string | null
  manufacturingDate?: string | null
  expiryDate?: string | null
  gstPercent: number
  mrp: number
  purchasePrice: number
  sellingPrice: number
  stockQuantity: number
  lowStockThreshold: number
  imageUrl?: string | null
  status: ProductStatus
  vendorId?: number | null
  isLowStock: boolean
  isExpired: boolean
  isExpiringSoon: boolean
  createdDate: string
  updatedDate?: string | null
}

export interface CreateProductDto {
  name: string
  description?: string
  sku: string
  barcode?: string
  categoryId: number
  brand?: string
  flavor?: string
  size?: string
  unit?: string
  batchNumber?: string
  manufacturingDate?: string | null
  expiryDate?: string | null
  gstPercent: number
  mrp: number
  purchasePrice: number
  sellingPrice: number
  initialStockQuantity: number
  lowStockThreshold?: number
  imageUrl?: string
  vendorId?: number | null
}

export interface UpdateProductDto {
  name?: string
  description?: string
  barcode?: string
  categoryId?: number
  brand?: string
  flavor?: string
  size?: string
  unit?: string
  batchNumber?: string
  manufacturingDate?: string | null
  expiryDate?: string | null
  gstPercent?: number
  mrp?: number
  purchasePrice?: number
  sellingPrice?: number
  lowStockThreshold?: number
  imageUrl?: string
  status?: ProductStatus
  vendorId?: number | null
}

export interface ProductSearchFilter {
  search?: string
  categoryId?: number
  brand?: string
  status?: ProductStatus
  lowStockOnly?: boolean
  expiringSoonOnly?: boolean
}

export interface InventoryTransaction {
  id: number
  productId: number
  productName?: string | null
  sku?: string | null
  transactionType: InventoryTransactionType
  quantity: number
  balanceAfter: number
  unitPrice: number
  transactionDate: string
  referenceNumber?: string | null
  posOrderId?: number | null
  notes?: string | null
}

export interface CreateStockInwardDto {
  productId: number
  quantity: number
  unitPrice: number
  referenceNumber?: string
  notes?: string
}

export interface CreateStockAdjustmentDto {
  productId: number
  quantity: number
  transactionType: InventoryTransactionType
  unitPrice?: number
  referenceNumber?: string
  notes?: string
}

export interface InventoryAlert {
  productId: number
  productName: string
  sku: string
  stockQuantity: number
  lowStockThreshold: number
  expiryDate?: string | null
  daysToExpiry?: number | null
  alertType: string
}

export interface PosOrderItem {
  id: number
  productId: number
  productName: string
  sku: string
  quantity: number
  unitPrice: number
  gstPercent: number
  discountAmount: number
  subtotal: number
  taxAmount: number
  lineTotal: number
}

export interface PosOrder {
  id: number
  orderNumber: string
  orderDate: string
  customerUserId?: number | null
  customerName?: string | null
  customerPhone?: string | null
  subtotal: number
  taxAmount: number
  discountAmount: number
  couponDiscountAmount: number
  couponCode?: string | null
  totalAmount: number
  paymentMethod: PosPaymentMethod
  paymentReference?: string | null
  status: PosOrderStatus
  notes?: string | null
  cashierUserId?: number | null
  cashierName?: string | null
  items: PosOrderItem[]
}

export interface CreatePosOrderItemDto {
  productId: number
  quantity: number
  unitPrice?: number
  discountAmount?: number
}

export interface CreatePosOrderDto {
  customerUserId?: number | null
  customerName?: string
  customerPhone?: string
  discountAmount?: number
  couponCode?: string
  paymentMethod: PosPaymentMethod
  paymentReference?: string
  notes?: string
  items: CreatePosOrderItemDto[]
}

export interface TopProduct {
  productId: number
  productName: string
  unitsSold: number
  revenue: number
}

export interface PosDashboard {
  todaySales: number
  todayOrders: number
  monthSales: number
  monthOrders: number
  lowStockCount: number
  expiringSoonCount: number
  topProducts: TopProduct[]
}
