import apiClient from './client';

export type Doctor = {
  id: number;
  user_id: number;
  specialty: string;
  qualification?: string;
  experience_years: number;
  bio?: string;
  consultation_fee: number;
  clinic_address?: string;
  city?: string;
  rating_avg: number;
  is_verified: boolean;
  full_name?: string;
  email?: string;
  phone?: string;
};

export type Appointment = {
  id: number;
  patient_id: number;
  doctor_id: number;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  payment_status?: string;
  reason?: string;
  notes?: string;
  patient_name?: string;
  doctor_name?: string;
  specialty?: string;
  token_number?: number;
  qr_token?: string;
  consultation_mode?: string;
  meeting_url?: string;
};

export type Payment = {
  id: number;
  appointment_id: number;
  patient_id: number;
  amount: number;
  currency: string;
  status: string;
  gateway: string;
  gateway_ref?: string;
  payment_mode?: string;
  transaction_id?: string;
  invoice_number?: string;
  paid_at?: string;
  patient_name?: string;
  doctor_name?: string;
  upi_vpa?: string;
  upi_payee_name?: string;
  upi_link?: string;
  upi_qr_data?: string;
  payment_instructions?: string;
};

export type Notification = {
  id: number;
  title: string;
  message: string;
  type: string;
  channel: string;
  is_read: boolean;
  created_at?: string;
};

export type MedicalRecord = {
  id: number;
  appointment_id: number;
  patient_id: number;
  doctor_id: number;
  diagnosis?: string;
  symptoms?: string;
  notes?: string;
  created_at?: string;
  prescriptions: Array<{
    id: number;
    medicines: Array<Record<string, string>>;
    instructions?: string;
  }>;
  patient_name?: string;
  doctor_name?: string;
};

export type Availability = {
  id: number;
  doctor_id: number;
  day_of_week?: number | null;
  specific_date?: string | null;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  is_active: boolean;
};

export type Analytics = {
  users_total: number;
  doctors_total: number;
  patients_total: number;
  appointments_total: number;
  todays_appointments?: number;
  pending_payments?: number;
  appointments_by_status: Record<string, number>;
  payments_total: number;
  payments_success_count: number;
  revenue_by_month: Array<{ month: string; revenue: number }>;
  appointments_by_specialty: Array<{ specialty: string; count: number }>;
  peak_hours?: Array<{ hour: number; count: number }>;
  doctor_performance?: Array<{
    doctor_id: number;
    doctor_name: string;
    completed: number;
    cancelled: number;
    revenue: number;
    rating?: number;
  }>;
  patient_visits?: Array<{ patient_id: number; patient_name: string; visit_count: number }>;
  cancelled_count?: number;
  department_performance?: Array<{ department: string; count: number }>;
  recent_activities?: Array<{
    id: number;
    action: string;
    entity_type: string;
    entity_id?: string | null;
    actor_user_id?: number | null;
    created_at?: string | null;
  }>;
};

export const doctorsApi = {
  list: (params?: Record<string, string | number | boolean>) =>
    apiClient.get<Doctor[]>('/v1/doctors/', { params }).then((r) => r.data),
  get: (id: number) => apiClient.get<Doctor>(`/v1/doctors/${id}`).then((r) => r.data),
  availability: (id: number) =>
    apiClient.get<Availability[]>(`/v1/doctors/${id}/availability`).then((r) => r.data),
  updateProfile: (body: Partial<Doctor>) =>
    apiClient.put<Doctor>('/v1/doctors/me/profile', body).then((r) => r.data),
  createAvailability: (body: Partial<Availability>) =>
    apiClient.post<Availability>('/v1/doctors/me/availability', body).then((r) => r.data),
  deleteAvailability: (id: number) => apiClient.delete(`/v1/doctors/me/availability/${id}`),
};

export const patientsApi = {
  me: () => apiClient.get('/v1/patients/me/profile').then((r) => r.data),
  updateMe: (body: Record<string, unknown>) =>
    apiClient.put('/v1/patients/me/profile', body).then((r) => r.data),
};

export const appointmentsApi = {
  list: (params?: Record<string, string>) =>
    apiClient.get<Appointment[]>('/v1/appointments/', { params }).then((r) => r.data),
  book: (body: {
    doctor_id: number;
    scheduled_at: string;
    reason?: string;
    duration_minutes?: number;
    consultation_mode?: string;
  }) => apiClient.post<Appointment>('/v1/appointments/', body).then((r) => r.data),
  approve: (id: number) => apiClient.post<Appointment>(`/v1/appointments/${id}/approve`).then((r) => r.data),
  reject: (id: number, notes?: string) =>
    apiClient.post<Appointment>(`/v1/appointments/${id}/reject`, { notes }).then((r) => r.data),
  cancel: (id: number, cancel_reason?: string) =>
    apiClient.post<Appointment>(`/v1/appointments/${id}/cancel`, { cancel_reason }).then((r) => r.data),
  reschedule: (id: number, scheduled_at: string) =>
    apiClient.post<Appointment>(`/v1/appointments/${id}/reschedule`, { scheduled_at }).then((r) => r.data),
  complete: (id: number, notes?: string) =>
    apiClient.post<Appointment>(`/v1/appointments/${id}/complete`, { notes }).then((r) => r.data),
  noShow: (id: number) => apiClient.post<Appointment>(`/v1/appointments/${id}/no-show`).then((r) => r.data),
  qr: (id: number) => apiClient.get(`/v1/appointments/${id}/qr`).then((r) => r.data),
  checkIn: (qr_token: string) => apiClient.post('/v1/appointments/check-in', { qr_token }).then((r) => r.data),
};

export const paymentsApi = {
  list: () => apiClient.get<Payment[]>('/v1/payments/').then((r) => r.data),
  checkout: (appointment_id: number) =>
    apiClient.post<Payment>('/v1/payments/checkout', { appointment_id }).then((r) => r.data),
  confirm: (payment_id: number, upi_reference?: string) =>
    apiClient
      .post<Payment>('/v1/payments/confirm', { payment_id, upi_reference })
      .then((r) => r.data),
  refund: (payment_id: number) =>
    apiClient.post<Payment>(`/v1/payments/${payment_id}/refund`).then((r) => r.data),
  invoiceUrl: (id: number) => `/api/v1/payments/${id}/invoice.pdf`,
};

export const modulesApi = {
  waitingList: () => apiClient.get('/v1/waiting-list/').then((r) => r.data),
  joinWaiting: (body: { doctor_id: number; preferred_date?: string; notes?: string }) =>
    apiClient.post('/v1/waiting-list/', body).then((r) => r.data),
  cancelWaiting: (id: number) => apiClient.post(`/v1/waiting-list/${id}/cancel`).then((r) => r.data),
  departments: () => apiClient.get('/v1/departments/').then((r) => r.data),
  createDepartment: (body: { name: string; description?: string }) =>
    apiClient.post('/v1/departments/', body).then((r) => r.data),
  branches: () => apiClient.get('/v1/branches/').then((r) => r.data),
  createBranch: (body: { name: string; address?: string; city?: string; phone?: string }) =>
    apiClient.post('/v1/branches/', body).then((r) => r.data),
  permissions: () => apiClient.get('/v1/permissions/').then((r) => r.data),
  allergies: () => apiClient.get('/v1/allergies/').then((r) => r.data),
  addAllergy: (body: { name: string; severity?: string; notes?: string }) =>
    apiClient.post('/v1/allergies/', body).then((r) => r.data),
  vaccinations: () => apiClient.get('/v1/vaccinations/').then((r) => r.data),
  addVaccination: (body: { vaccine_name: string; dose?: string; administered_on?: string }) =>
    apiClient.post('/v1/vaccinations/', body).then((r) => r.data),
  labReports: () => apiClient.get('/v1/lab-reports/').then((r) => r.data),
};

export const notificationsApi = {
  list: () => apiClient.get<Notification[]>('/v1/notifications/').then((r) => r.data),
  markRead: (id: number) => apiClient.patch(`/v1/notifications/${id}/read`).then((r) => r.data),
  readAll: () => apiClient.post('/v1/notifications/read-all').then((r) => r.data),
};

export const recordsApi = {
  list: () => apiClient.get<MedicalRecord[]>('/v1/medical-records/').then((r) => r.data),
  create: (body: { appointment_id: number; diagnosis?: string; symptoms?: string; notes?: string }) =>
    apiClient.post<MedicalRecord>('/v1/medical-records/', body).then((r) => r.data),
  addPrescription: (
    recordId: number,
    body: { medicines: Array<Record<string, string>>; instructions?: string },
  ) => apiClient.post<MedicalRecord>(`/v1/medical-records/${recordId}/prescriptions`, body).then((r) => r.data),
};

export const adminApi = {
  analytics: () => apiClient.get<Analytics>('/v1/admin/analytics').then((r) => r.data),
  users: () => apiClient.get('/v1/admin/users').then((r) => r.data),
  audit: () => apiClient.get('/v1/admin/audit-logs').then((r) => r.data),
  verifyDoctor: (id: number, is_verified = true) =>
    apiClient.patch(`/v1/admin/doctors/${id}/verify`, { is_verified }).then((r) => r.data),
  exportUrl: (resource: string, format: string) => `/api/v1/admin/export/${resource}?format=${format}`,
};

export const advancedApi = {
  checkSymptoms: (symptoms: string) =>
    apiClient.post('/v1/advanced/symptoms/check', { symptoms }).then((r) => r.data),
  assistant: (message: string) =>
    apiClient.post('/v1/advanced/assistant/chat', { message }).then((r) => r.data),
  voiceParse: (transcript: string) =>
    apiClient.post('/v1/advanced/voice/parse', { transcript }).then((r) => r.data),
  recommend: (body: { symptoms?: string; city?: string; limit?: number }) =>
    apiClient.post('/v1/advanced/recommendations', body).then((r) => r.data),
  enrollFace: (image_b64: string) =>
    apiClient.post('/v1/advanced/face/enroll', { image_b64 }).then((r) => r.data),
  faceLogin: (image_b64: string) =>
    apiClient.post('/v1/advanced/face/login', { image_b64 }).then((r) => r.data),
  videoRoom: (appointmentId: number) =>
    apiClient.post(`/v1/advanced/video/${appointmentId}/room`).then((r) => r.data),
  hospitals: () => apiClient.get('/v1/advanced/hospitals').then((r) => r.data),
  createHospital: (body: { name: string; code: string; city?: string; address?: string }) =>
    apiClient.post('/v1/advanced/hospitals', body).then((r) => r.data),
  attachBranch: (branch_id: number, hospital_id: number) =>
    apiClient.post('/v1/advanced/hospitals/attach-branch', { branch_id, hospital_id }).then((r) => r.data),
  submitReview: (body: { doctor_id: number; rating: number; comment?: string; appointment_id?: number }) =>
    apiClient.post('/v1/advanced/reviews', body).then((r) => r.data),
  reviews: (doctorId: number) => apiClient.get(`/v1/advanced/reviews/${doctorId}`).then((r) => r.data),
  chatThreads: () => apiClient.get('/v1/advanced/chat/threads').then((r) => r.data),
  openThread: (doctor_id: number, appointment_id?: number) =>
    apiClient.post('/v1/advanced/chat/threads', { doctor_id, appointment_id }).then((r) => r.data),
  chatMessages: (threadId: number) =>
    apiClient.get(`/v1/advanced/chat/threads/${threadId}/messages`).then((r) => r.data),
  postChat: (threadId: number, body: string) =>
    apiClient.post(`/v1/advanced/chat/threads/${threadId}/messages`, { body }).then((r) => r.data),
  reminders: () => apiClient.get('/v1/advanced/reminders').then((r) => r.data),
  createReminder: (body: {
    medicine_name: string;
    schedule_time: string;
    dosage?: string;
    days_of_week?: string;
    notes?: string;
  }) => apiClient.post('/v1/advanced/reminders', body).then((r) => r.data),
  policies: () => apiClient.get('/v1/advanced/insurance/policies').then((r) => r.data),
  addPolicy: (body: {
    provider: string;
    policy_number: string;
    coverage_percent?: number;
    valid_until?: string;
  }) => apiClient.post('/v1/advanced/insurance/policies', body).then((r) => r.data),
  submitClaim: (body: { policy_id: number; amount: number; appointment_id?: number; notes?: string }) =>
    apiClient.post('/v1/advanced/insurance/claims', body).then((r) => r.data),
  connectCalendar: () => apiClient.post('/v1/advanced/calendar/google/connect').then((r) => r.data),
  calendarStatus: () => apiClient.get('/v1/advanced/calendar/status').then((r) => r.data),
  calendarIcsUrl: () => '/api/v1/advanced/calendar/export.ics',
  sign: (body: { entity_type: string; entity_id: number; signature_data: string }) =>
    apiClient.post('/v1/advanced/signatures', body).then((r) => r.data),
  createCertificate: (body: Record<string, unknown>) =>
    apiClient.post('/v1/advanced/certificates', body).then((r) => r.data),
  certificatePdfUrl: (id: number) => `/api/v1/advanced/certificates/${id}.pdf`,
  ocrScan: (filename: string, raw_text?: string) =>
    apiClient.post('/v1/advanced/ocr/scan', { filename, raw_text }).then((r) => r.data),
  erxBundle: (prescriptionId: number, signature_data?: string) =>
    apiClient.post(`/v1/advanced/eprescription/${prescriptionId}/bundle`, { signature_data }).then((r) => r.data),
};
