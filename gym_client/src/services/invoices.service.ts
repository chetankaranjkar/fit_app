import { api } from '../lib/api'

export interface InvoiceItem {
  id: number
  invoiceId: number
  description: string
  quantity: number
  unit: string
  unitPrice: number
  total: number
  notes?: string | null
}

export interface Invoice {
  id: number
  invoiceNumber: string
  userMembershipId: number
  customerName?: string
  customerEmail?: string
  issueDate: string
  dueDate: string
  paidDate?: string
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  currency: string
  notes?: string
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled' | 'Refunded'
  billingAddress?: string
  billingCity?: string
  billingState?: string
  billingZip?: string
  billingCountry?: string
  paymentId?: number
  items: InvoiceItem[]
  createdAt: string
  updatedAt?: string
}

export interface CreateInvoiceItemDto {
  description: string
  quantity: number
  unit: string
  unitPrice: number
  notes?: string
}

export interface CreateInvoiceDto {
  userMembershipId: number
  issueDate: string
  dueDate: string
  items: CreateInvoiceItemDto[]
  taxRate: number
  discountAmount?: number
  notes?: string
  billingAddress?: string
  billingCity?: string
  billingState?: string
  billingZip?: string
  billingCountry?: string
}

export interface UpdateInvoiceDto {
  issueDate?: string
  dueDate?: string
  paidDate?: string
  status?: Invoice['status']
  discountAmount?: number
  notes?: string
  billingAddress?: string
  billingCity?: string
  billingState?: string
  billingZip?: string
  billingCountry?: string
  paymentId?: number
}

/** Paths are relative to axios baseURL (`/api`), matching ASP.NET `api/[controller]` routes. */
export class InvoicesService {
  static async getAll(): Promise<Invoice[]> {
    const response = await api.get('/Invoices')
    return response.data
  }

  static async getByMembership(membershipId: number): Promise<Invoice[]> {
    const response = await api.get(`/Invoices/by-membership/${membershipId}`)
    return response.data
  }

  static async getByUser(userId: number): Promise<Invoice[]> {
    const response = await api.get(`/Invoices/by-user/${userId}`)
    return response.data
  }

  static async getById(id: number): Promise<Invoice> {
    const response = await api.get(`/Invoices/${id}`)
    return response.data
  }

  static async getByNumber(invoiceNumber: string): Promise<Invoice> {
    const response = await api.get(`/Invoices/number/${invoiceNumber}`)
    return response.data
  }

  static async create(dto: CreateInvoiceDto): Promise<Invoice> {
    const response = await api.post('/Invoices', dto)
    return response.data
  }

  static async update(id: number, dto: UpdateInvoiceDto): Promise<Invoice> {
    const response = await api.put(`/Invoices/${id}`, dto)
    return response.data
  }

  static async delete(id: number): Promise<void> {
    await api.delete(`/Invoices/${id}`)
  }

  static async markAsPaid(id: number, paymentId: number): Promise<void> {
    await api.post(`/Invoices/${id}/mark-paid`, { paymentId })
  }

  static async exportPdf(id: number): Promise<Blob> {
    const response = await api.get(`/Invoices/${id}/pdf`, {
      responseType: 'blob',
    })
    return response.data
  }

  static async generateFromMembership(membershipId: number, includeUnpaidOnly: boolean = true): Promise<Invoice> {
    const response = await api.post(
      `/Invoices/generate-from-membership/${membershipId}?includeUnpaidOnly=${includeUnpaidOnly}`
    )
    return response.data
  }
}
