export type UserRole = 'User' | 'Mentor' | 'Admin' | 'SuperAdmin' | 'Staff';
export type CourseLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type CourseStatus = 'Draft' | 'Published' | 'Archived';
export type EnquiryStatus = 'New' | 'Contacted' | 'Qualified' | 'Enrolled' | 'Closed';

export interface ApiResponse<T> {
  success: boolean;
  message?: string | null;
  data?: T | null;
  errors?: Record<string, string[]> | null;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;
  status: string;
  preferredLanguage: string;
  emailVerified: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAtUtc: string;
  user: User;
  requiresOtp: boolean;
  pendingUserId?: string | null;
  demoOtpHint?: string | null;
  isDemonstrationOnly: boolean;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  level: CourseLevel | number;
  status: CourseStatus | number;
  capacity: number;
  enrolledCount: number;
  mentorId?: string | null;
  mentorName?: string | null;
  language: string;
  price: number;
  currency: string;
  thumbnailUrl?: string | null;
  durationWeeks: number;
  createdAtUtc: string;
}

export interface ClassSession {
  id: string;
  courseId: string;
  courseTitle: string;
  mentorId: string;
  mentorName: string;
  title: string;
  scheduledAtUtc: string;
  durationMinutes: number;
  status: string | number;
  meetingUrl?: string | null;
  meetingProvider?: string | null;
}

export interface Material {
  id: string;
  courseId: string;
  title: string;
  description: string;
  type: string | number;
  isProtected: boolean;
  sortOrder: number;
  accessUrl?: string | null;
}

export interface Assessment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  passingScore: number;
  timeLimitMinutes: number;
  questions: Question[];
}

export interface Question {
  id: string;
  prompt: string;
  options: string[];
  points: number;
}

export interface TestAttempt {
  id: string;
  assessmentId: string;
  userId: string;
  score: number;
  maxScore: number;
  passed: boolean;
  startedAtUtc: string;
  completedAtUtc?: string | null;
}

export interface Progress {
  id: string;
  userId: string;
  courseId: string;
  courseTitle: string;
  completionPercent: number;
  streakDays: number;
  grammarScore: number;
  vocabularyScore: number;
  speakingScore: number;
  lastActivityAtUtc?: string | null;
}

export interface Subscription {
  id: string;
  userId: string;
  courseId: string;
  courseTitle: string;
  planName: string;
  status: string | number;
  payPalSubscriptionId?: string | null;
  startsAtUtc?: string | null;
  endsAtUtc?: string | null;
  isMocked: boolean;
}

export interface Payment {
  id: string;
  userId: string;
  subscriptionId?: string | null;
  amount: number;
  currency: string;
  status: string | number;
  payPalReference?: string | null;
  description: string;
  isMocked: boolean;
}

export interface Certificate {
  id: string;
  userId: string;
  userName: string;
  courseId: string;
  courseTitle: string;
  certificateCode: string;
  issuedAtUtc: string;
  qrVerificationToken: string;
}

export interface NotificationItem {
  id: string;
  userId?: string | null;
  title: string;
  message: string;
  type: string | number;
  isRead: boolean;
  createdAtUtc: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  createdByUserId: string;
  isPublished: boolean;
  createdAtUtc: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  subject: string;
  description: string;
  status: string | number;
  adminResponse?: string | null;
  createdAtUtc: string;
}

export interface AiResponse {
  sessionId: string;
  mode: string;
  prompt: string;
  response: string;
  tokensUsed: number;
  isMocked: boolean;
}

export interface DashboardStats {
  enrolledCourses: number;
  upcomingClasses: number;
  completedTests: number;
  certificates: number;
  averageProgress: number;
  unreadNotifications: number;
}

export interface AdminDashboard {
  totalUsers: number;
  totalCourses: number;
  activeEnrollments: number;
  openTickets: number;
  totalRevenue: number;
  activeSubscriptions: number;
}

export interface MentorDashboard {
  assignedClasses: number;
  assignedStudents: number;
  materials: number;
  pendingAttendance: number;
}

export interface AuditLog {
  id: string;
  actorUserId?: string | null;
  action: string;
  resource: string;
  details: string;
  createdAtUtc: string;
}

export const levelLabel = (level: CourseLevel | number) => {
  if (typeof level === 'string') return level;
  return ['Beginner', 'Intermediate', 'Advanced'][level] ?? String(level);
};

export const statusLabel = (status: CourseStatus | number | string) => {
  if (typeof status === 'string') return status;
  return ['Draft', 'Published', 'Archived'][status] ?? String(status);
};

export const enumLabel = (value: string | number, labels: string[]) =>
  typeof value === 'string' ? value : labels[value] ?? String(value);

export interface Enquiry {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  interestedCourse: string;
  preferredLanguage: string;
  message: string;
  status: EnquiryStatus | number;
  staffNotes?: string | null;
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  convertedUserId?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
}

export interface CreateEnquiryRequest {
  fullName: string;
  email: string;
  phone: string;
  interestedCourse: string;
  preferredLanguage?: string;
  message: string;
}

export interface UpdateEnquiryStatusRequest {
  status: EnquiryStatus;
  staffNotes?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
}
