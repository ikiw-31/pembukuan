export type Category = 'material' | 'konsumsi' | 'lainnya'

export interface Settings {
  project_name: string
  location: string
  description: string
  updated_at: string
}

export interface Income {
  id: string
  date: string
  source: string
  amount: number
  note: string
  created_at: string
}

export interface Expense {
  id: string
  date: string
  category: Category
  item: string
  qty: number
  unit: string
  unit_price: number
  amount: number
  note: string
  receipt_url: string | null
  created_at: string
}

export interface Worker {
  id: string
  name: string
  daily_wage: number
  phone: string
  active: boolean
  created_at: string
}

export interface Attendance {
  id: string
  worker_id: string
  date: string
  /** 1 = sehari penuh, 0.5 = setengah hari */
  portion: number
  /** upah sehari penuh saat dicatat */
  wage: number
  /** upah yang didapat hari itu */
  amount: number
  payment_id: string | null
  note: string
  created_at: string
}

export interface WagePayment {
  id: string
  worker_id: string
  date: string
  amount: number
  note: string
  created_at: string
}

export interface DataSet {
  settings: Settings
  incomes: Income[]
  expenses: Expense[]
  workers: Worker[]
  attendance: Attendance[]
  payments: WagePayment[]
}

export type IncomeInput = Omit<Income, 'id' | 'created_at'> & { id?: string }
export type ExpenseInput = Omit<Expense, 'id' | 'created_at'> & { id?: string }
export type WorkerInput = Omit<Worker, 'id' | 'created_at'> & { id?: string }
export interface AttendanceEntry {
  worker_id: string
  portion: number
  wage: number
}
