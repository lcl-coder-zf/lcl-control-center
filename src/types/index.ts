export type UserRole = 'admin' | 'consultant'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  created_at: string
}

export interface Company {
  id: string
  name: string
  nit: string
  sector: string
  city: string
  contact_name: string
  contact_email: string
  contact_phone: string
  service_type: string[]
  monthly_hours?: number
  logo_url?: string
  status: 'activo' | 'inactivo' | 'suspendido'
  notes?: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  company_id: string
  company?: Company
  name: string
  type: 'BASC' | 'ISO' | 'SAGRILAFT' | 'PTEE' | 'SG-SST' | 'Otro'
  status: 'activo' | 'pausado' | 'completado' | 'cancelado'
  progress: number
  responsible_id: string
  responsible?: Profile
  start_date: string
  end_date?: string
  value?: number
  paid?: number
  risks?: string
  next_action?: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  project_id?: string
  project?: Project
  company_id?: string
  company?: Company
  title: string
  description?: string
  assigned_to: string
  assignee?: Profile
  priority: 'baja' | 'media' | 'alta' | 'critica'
  status: 'pendiente' | 'en_progreso' | 'completada' | 'vencida'
  due_date: string
  completed_at?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface CalendarEvent {
  id: string
  company_id?: string
  company?: Company
  project_id?: string
  project?: Project
  title: string
  type: 'recertificacion' | 'auditoria' | 'entrega' | 'reporte' | 'vencimiento'
  due_date: string
  alert_15: boolean
  alert_7: boolean
  alert_1: boolean
  status: 'pendiente' | 'completado' | 'vencido'
  notes?: string
  created_at: string
}

export interface Document {
  id: string
  company_id?: string
  project_id?: string
  name: string
  type: string
  status: 'aprobado' | 'pendiente' | 'vencido'
  file_url?: string
  version: string
  expires_at?: string
  uploaded_by: string
  created_at: string
  updated_at: string
}
