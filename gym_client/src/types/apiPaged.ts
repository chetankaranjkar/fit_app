export interface ApiPagedResponse<T> {
  data: T[]
  page: number
  pageSize: number
  totalRecords: number
  totalPages: number
}
