import { api } from './api';
import type {
  AdminDashboard,
  AiResponse,
  Announcement,
  Assessment,
  AuditLog,
  AuthResponse,
  Certificate,
  ClassSession,
  Course,
  CreateEnquiryRequest,
  DashboardStats,
  Enquiry,
  Material,
  MentorDashboard,
  NotificationItem,
  PagedResult,
  Payment,
  Progress,
  Subscription,
  SupportTicket,
  TestAttempt,
  UpdateEnquiryStatusRequest,
  User,
} from '../types';

export const authApi = {
  demoLogin: (email: string) =>
    api.post<AuthResponse>('/api/auth/demo-login', {
      email,
      deviceId: localStorage.getItem('sseuropa_device') ?? crypto.randomUUID(),
      deviceName: navigator.userAgent.slice(0, 80),
    }),
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/api/auth/login', {
      email,
      password,
      deviceId: localStorage.getItem('sseuropa_device') ?? crypto.randomUUID(),
      deviceName: navigator.userAgent.slice(0, 80),
    }),
  verifyOtp: (userId: string, code: string) =>
    api.post<AuthResponse>('/api/auth/verify-otp', {
      userId,
      code,
      deviceId: localStorage.getItem('sseuropa_device') ?? crypto.randomUUID(),
      deviceName: navigator.userAgent.slice(0, 80),
    }),
  register: (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => api.post<User>('/api/auth/register', payload),
  logout: () => api.post('/api/auth/logout'),
};

export const coursesApi = {
  list: (params: { page?: number; pageSize?: number; search?: string; sortBy?: string } = {}) => {
    const q = new URLSearchParams();
    q.set('page', String(params.page ?? 1));
    q.set('pageSize', String(params.pageSize ?? 12));
    if (params.search) q.set('search', params.search);
    if (params.sortBy) q.set('sortBy', params.sortBy);
    return api.get<PagedResult<Course>>(`/api/courses?${q}`);
  },
  get: (id: string) => api.get<Course>(`/api/courses/${id}`),
  enroll: (id: string) => api.post(`/api/courses/${id}/enroll`),
  create: (body: unknown) => api.post<Course>('/api/courses', body),
};

export const classesApi = {
  list: () => api.get<ClassSession[]>('/api/classes'),
  meeting: (id: string) => api.get<ClassSession>(`/api/classes/${id}/meeting`),
  create: (body: unknown) => api.post<ClassSession>('/api/classes', body),
  notifyStart: (id: string) => api.post<{ sentCount: number; targetDescription: string }>(`/api/classes/${id}/notify-start`),
};

export const materialsApi = {
  byCourse: (courseId: string) => api.get<Material[]>(`/api/materials/course/${courseId}`),
  create: (body: unknown) => api.post<Material>('/api/materials', body),
  delete: (id: string) => api.delete(`/api/materials/${id}`),
};

export const assessmentsApi = {
  list: () => api.get<Assessment[]>('/api/assessments'),
  get: (id: string) => api.get<Assessment>(`/api/assessments/${id}`),
  submit: (id: string, selectedAnswers: number[]) =>
    api.post<TestAttempt>(`/api/assessments/${id}/attempts`, { selectedAnswers }),
  myAttempts: () => api.get<TestAttempt[]>('/api/assessments/attempts/mine'),
};

export const progressApi = {
  mine: () => api.get<Progress[]>('/api/progress/mine'),
  markAttendance: (classSessionId: string, userId: string, present: boolean) =>
    api.post('/api/progress/attendance', { classSessionId, userId, present }),
};

export const subscriptionsApi = {
  list: () => api.get<Subscription[]>('/api/subscriptions'),
  create: (courseId: string, planName: string) =>
    api.post<Subscription>('/api/subscriptions', { courseId, planName }),
};

export const paymentsApi = {
  list: () => api.get<Payment[]>('/api/payments'),
};

export const certificatesApi = {
  list: () => api.get<Certificate[]>('/api/certificates'),
  verify: (code: string) => api.get<Certificate>(`/api/certificates/verify/${encodeURIComponent(code)}`),
};

export const aiApi = {
  ask: (mode: string, prompt: string) => api.post<AiResponse>('/api/ai', { mode, prompt }),
  history: () => api.get<AiResponse[]>('/api/ai/history'),
};

export const notificationsApi = {
  list: () => api.get<NotificationItem[]>('/api/notifications'),
  markRead: (id: string) => api.post(`/api/notifications/${id}/read`),
  send: (data: {
    title: string;
    message: string;
    type?: number;
    targetUserId?: string | null;
    targetRole?: number | null;
    classSessionId?: string | null;
  }) => api.post<{ sentCount: number; targetDescription: string }>('/api/notifications/send', data),
};

export const announcementsApi = {
  list: () => api.get<Announcement[]>('/api/announcements'),
};

export const supportApi = {
  list: () => api.get<SupportTicket[]>('/api/support'),
  create: (subject: string, description: string) =>
    api.post<SupportTicket>('/api/support', { subject, description }),
};

export const dashboardApi = {
  student: () => api.get<DashboardStats>('/api/dashboard/student'),
  admin: () => api.get<AdminDashboard>('/api/dashboard/admin'),
  mentor: () => api.get<MentorDashboard>('/api/dashboard/mentor'),
};

export const usersApi = {
  list: () => api.get<User[]>('/api/users'),
};

export const auditApi = {
  list: () => api.get<AuditLog[]>('/api/audit'),
};

export const enquiriesApi = {
  submit: (data: CreateEnquiryRequest) => api.post<Enquiry>('/api/enquiries', data),
  list: () => api.get<Enquiry[]>('/api/enquiries'),
  get: (id: string) => api.get<Enquiry>(`/api/enquiries/${id}`),
  updateStatus: (id: string, data: UpdateEnquiryStatusRequest) =>
    api.put<Enquiry>(`/api/enquiries/${id}/status`, data),
};
