import { api } from './api';
import type {
  AdminDashboard,
  AiResponse,
  Announcement,
  Assessment,
  Assignment,
  AssignmentSubmission,
  AuditLog,
  AuthResponse,
  Certificate,
  ClassSession,
  ConfirmUploadResponse,
  Course,
  CourseStats,
  CreateEnquiryRequest,
  DashboardStats,
  Enquiry,
  FileUploadResponse,
  Material,
  MentorDashboard,
  NotificationItem,
  PagedResult,
  PresignedUploadResponse,
  Progress,
  StaffDashboard,
  SuperAdminDashboard,
  TeamRole,
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
  forgotPassword: (email: string) =>
    api.post<{ challengeId: string; expiresAt: string }>('/api/auth/forgot-password', { email }),
  resetPassword: (payload: { challengeId: string; code: string; newPassword: string }) =>
    api.post('/api/auth/reset-password', payload),
  logout: () => api.post('/api/auth/logout'),
};

export const coursesApi = {
  list: (params: { page?: number; pageSize?: number; search?: string; sortBy?: string; sortDescending?: boolean } = {}) => {
    const q = new URLSearchParams();
    q.set('page', String(params.page ?? 1));
    q.set('pageSize', String(params.pageSize ?? 50));
    if (params.search) q.set('search', params.search);
    if (params.sortBy) q.set('sortBy', params.sortBy);
    if (params.sortDescending !== undefined) q.set('sortDescending', String(params.sortDescending));
    return api.get<PagedResult<Course>>(`/api/courses?${q}`);
  },
  stats: () => api.get<CourseStats>('/api/courses/stats'),
  get: (id: string) => api.get<Course>(`/api/courses/${id}`),
  enroll: (id: string) => api.post(`/api/courses/${id}/enroll`),
  create: (body: unknown) => api.post<Course>('/api/courses', body),
  update: (id: string, body: unknown) => api.put<Course>(`/api/courses/${id}`, body),
  publish: (id: string) => api.post<Course>(`/api/courses/${id}/publish`),
  unpublish: (id: string) => api.post<Course>(`/api/courses/${id}/unpublish`),
  delete: (id: string) => api.delete(`/api/courses/${id}`),
};

export const s3UploadApi = {
  getPresignedUrl: (data: {
    courseId: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    category?: string;
    moduleId?: string;
    chapterId?: string;
    lessonId?: string;
  }) => api.post<PresignedUploadResponse>('/api/uploads/s3/presigned-url', data),

  confirmUpload: (data: {
    courseId: string;
    fileName: string;
    originalFileName: string;
    objectKey: string;
    mimeType: string;
    fileSize: number;
    fileType: string;
    moduleId?: string;
    chapterId?: string;
    lessonId?: string;
    durationSeconds?: number;
  }) => api.post<ConfirmUploadResponse>('/api/uploads/s3/confirm', data),

  getAccessUrl: (objectKey: string) =>
    api.get<{ objectKey: string; accessUrl: string; expiresAtUtc: string }>(`/api/uploads/s3/access-url?objectKey=${encodeURIComponent(objectKey)}`),
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

export const dashboardApi = {
  student: () => api.get<DashboardStats>('/api/dashboard/student'),
  admin: () => api.get<AdminDashboard>('/api/dashboard/admin'),
  superAdmin: () => api.get<SuperAdminDashboard>('/api/dashboard/superadmin'),
  mentor: () => api.get<MentorDashboard>('/api/dashboard/mentor'),
  staff: () => api.get<StaffDashboard>('/api/dashboard/staff'),
};

export const mediaApi = {
  upload: (file: File, category?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (category) formData.append('category', category);
    return api.postForm<FileUploadResponse>('/api/media/upload', formData);
  },
};

export const assignmentsApi = {
  byCourse: (courseId: string) => api.get<Assignment[]>(`/api/assignments/course/${courseId}`),
  get: (id: string) => api.get<Assignment>(`/api/assignments/${id}`),
  create: (data: {
    courseId: string;
    chapterTitle: string;
    title: string;
    description: string;
    referenceFileUrl?: string;
    dueDateUtc?: string;
    totalMarks: number;
  }) => api.post<Assignment>('/api/assignments', data),
  delete: (id: string) => api.delete(`/api/assignments/${id}`),
  submissions: (id: string) => api.get<AssignmentSubmission[]>(`/api/assignments/${id}/submissions`),
  grade: (submissionId: string, data: { marksObtained: number; teacherFeedback?: string }) =>
    api.post<AssignmentSubmission>(`/api/assignments/submissions/${submissionId}/grade`, data),
};

export const usersApi = {
  list: () => api.get<User[]>('/api/users'),
  updateStatus: (id: string, isActive: boolean) =>
    api.put<User>(`/api/users/${id}/status`, { isActive }),
  /** Role names are sent as text (the backend uses string enums): 'Admin' | 'Staff' | 'Mentor'. */
  updateRole: (id: string, role: TeamRole) =>
    api.put<User>(`/api/users/${id}/role`, { role }),
  create: (data: {
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    role: TeamRole;
    phoneNumber?: string;
  }) => api.post<User>('/api/users', data),
  softDelete: (id: string) => api.delete(`/api/users/${id}`),
  restore: (id: string) => api.post(`/api/users/${id}/restore`),
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

// ── Course builder ─────────────────────────────────────────────────────────

export const curriculumApi = {
  outline: (courseId: string) => api.get<import('../types').CourseOutline>(`/api/curriculum/courses/${courseId}`),
  students: (courseId: string) => api.get<import('../types').StudentCourseProgress[]>(`/api/curriculum/courses/${courseId}/students`),
  publishAll: (courseId: string) => api.post(`/api/curriculum/courses/${courseId}/publish-all`),
  illustrations: () => api.get<import('../types').Illustration[]>('/api/curriculum/illustrations'),

  createUnit: (courseId: string, body: import('../types').SaveUnitRequest) =>
    api.post<import('../types').CourseUnit>(`/api/curriculum/courses/${courseId}/units`, body),
  updateUnit: (unitId: string, body: import('../types').SaveUnitRequest) =>
    api.put<import('../types').CourseUnit>(`/api/curriculum/units/${unitId}`, body),
  moveUnit: (unitId: string, direction: -1 | 1) => api.post(`/api/curriculum/units/${unitId}/move`, { direction }),
  deleteUnit: (unitId: string) => api.delete(`/api/curriculum/units/${unitId}`),

  lesson: (lessonId: string) => api.get<import('../types').LessonDetail>(`/api/curriculum/lessons/${lessonId}`),
  createLesson: (unitId: string, body: import('../types').SaveLessonRequest) =>
    api.post<import('../types').LessonDetail>(`/api/curriculum/units/${unitId}/lessons`, body),
  updateLesson: (lessonId: string, body: import('../types').SaveLessonRequest) =>
    api.put<import('../types').LessonDetail>(`/api/curriculum/lessons/${lessonId}`, body),
  moveLesson: (lessonId: string, direction: -1 | 1) => api.post(`/api/curriculum/lessons/${lessonId}/move`, { direction }),
  deleteLesson: (lessonId: string) => api.delete(`/api/curriculum/lessons/${lessonId}`),
};
