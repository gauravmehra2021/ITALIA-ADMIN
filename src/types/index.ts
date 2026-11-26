export type UserRole = 'User' | 'Mentor' | 'Admin' | 'SuperAdmin' | 'Staff';
export type CourseLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type CourseStatus = 'Draft' | 'Published' | 'Archived';
export type EnquiryStatus = 'New' | 'Contacted' | 'Qualified' | 'Enrolled' | 'Paid' | 'Closed';

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
  isDeleted?: boolean;
  isProtectedSuperAdmin?: boolean;
  phoneNumber?: string | null;
  lastLoginAtUtc?: string | null;
  createdAtUtc?: string | null;
  mustChangePassword?: boolean;
  /** Team members: what they can do in each admin module (already capped by their role). */
  permissions?: Partial<Record<PermissionModule, AccessLevel>> | null;
  hasCustomPermissions?: boolean;
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
  paymentUrl?: string | null;
  durationWeeks: number;
  createdAtUtc: string;
  slug?: string;
  shortDescription?: string;
  objectives?: string;
  displayOrder?: number;
  modulesCount?: number;
  lessonsCount?: number;
  cefrLevel?: string;
  category?: string;
  /** Every student may join it, even without a batch. */
  openToAll?: boolean;
}

export interface CourseStats {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalModules: number;
  totalLessons: number;
  totalEnrolled: number;
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  objectKey: string;
  bucketName: string;
  region: string;
  expiresAtUtc: string;
  isDirectUpload: boolean;
  uploadId?: string | null;
}

export interface ConfirmUploadResponse {
  resourceId: string;
  objectKey: string;
  accessUrl: string;
  message: string;
}

export interface ModuleItem {
  id: string;
  title: string;
  number: number;
  chapters: ChapterItem[];
}

export interface ChapterItem {
  id: string;
  title: string;
  number: number;
  lessons: Material[];
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
  /** The batch this class is for (older classes have none and go to the course's students). */
  batchId?: string | null;
  batchName?: string | null;
  batchStudentCount?: number;
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
  chapterTitle?: string;
  chapterNumber?: number;
  videoUrl?: string | null;
  audioUrl?: string | null;
  pdfUrl?: string | null;
  contentText?: string | null;
  practicalTask?: string | null;
  durationMinutes?: number;
}

export interface Assignment {
  id: string;
  courseId: string;
  chapterTitle: string;
  title: string;
  description: string;
  referenceFileUrl?: string | null;
  dueDateUtc?: string | null;
  totalMarks: number;
  isActive: boolean;
  createdAtUtc: string;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  submissionText?: string | null;
  submissionFileUrl?: string | null;
  submittedAtUtc: string;
  marksObtained?: number | null;
  teacherFeedback?: string | null;
  gradedAtUtc?: string | null;
  status: string;
}

export interface FileUploadResponse {
  url: string;
  fileName: string;
  fileSize: number;
  contentType: string;
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

/** Operations overview for Admins (also embedded in the Super Admin dashboard). */
export interface AdminDashboard {
  totalStudents: number;
  totalCourses: number;
  publishedCourses: number;
  activeEnrollments: number;
  upcomingClasses: number;
  newEnquiries: number;
  inFollowUpEnquiries: number;
  enrolledEnquiries: number;
}

export interface SuperAdminDashboard {
  admins: number;
  staff: number;
  teachers: number;
  students: number;
  suspendedTeamAccounts: number;
  operations: AdminDashboard;
}

/** Teacher dashboard (internal role name: Mentor). */
export interface MentorDashboard {
  assignedClasses: number;
  assignedStudents: number;
  materials: number;
  pendingAttendance: number;
  upcomingClasses: number;
  coursesTaught: number;
}

export interface StaffDashboard {
  totalEnquiries: number;
  newEnquiries: number;
  inFollowUpEnquiries: number;
  enrolledEnquiries: number;
  closedEnquiries: number;
  unreadNotifications: number;
}

/**
 * The admin panel has exactly four roles. "Mentor" is the internal/database name
 * for Teacher (kept so existing accounts keep working); always show ROLE_LABELS in the UI.
 */
export const PANEL_ROLES: UserRole[] = ['SuperAdmin', 'Admin', 'Staff', 'Mentor'];

/** Roles the Super Admin can give to team members. Super Admin itself is never assignable. */
export const TEAM_ROLES = ['Admin', 'Staff', 'Mentor'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  SuperAdmin: 'Super Admin',
  Admin: 'Admin',
  Staff: 'Staff',
  Mentor: 'Teacher',
  User: 'Student',
};

export const roleLabel = (role: UserRole | string | undefined | null) =>
  (role && ROLE_LABELS[role as UserRole]) || 'Team member';

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

// ── Curriculum (course builder) ────────────────────────────────────────────

export type LessonKind = 'Vocabulary' | 'Dialogue' | 'Grammar' | 'Review' | 'Video' | 'Exam' | 'Conversation';
export type LessonStatus = 'Draft' | 'Published';
export type BlockType = 'Text' | 'Vocabulary' | 'Dialogue' | 'Video' | 'Audio' | 'Image' | 'Pdf' | 'Tip' | 'Table' | 'Roleplay';
export type ExerciseType = 'ListenPick' | 'PickTranslation' | 'PickWord' | 'MatchPairs' | 'FillBlank' | 'WordOrder' | 'TrueFalse';

export interface VocabularyItem {
  id?: string;
  italian: string;
  english: string;
  /** Optional Punjabi meaning (romanised). */
  punjabi?: string | null;
  pronunciation?: string | null;
  imageUrl?: string | null;
  audioUrl?: string | null;
  example?: string | null;
  exampleEnglish?: string | null;
}

export interface DialogueLine {
  speaker: string;
  italian: string;
  english: string;
  punjabi?: string | null;
  audioUrl?: string | null;
  /** Role-play: the student's turn. */
  isLearner?: boolean;
  /** Role-play: other accepted answers for this turn. */
  replies?: { italian: string; english: string }[];
}

export interface LessonBlock {
  id?: string;
  type: BlockType;
  title?: string | null;
  body?: string | null;
  mediaUrl?: string | null;
  caption?: string | null;
  items: VocabularyItem[];
  lines: DialogueLine[];
  table: string[][];
}

export interface ExerciseOption {
  text: string;
  imageUrl?: string | null;
}

export interface LessonExercise {
  id?: string;
  type: ExerciseType;
  prompt: string;
  italian?: string | null;
  imageUrl?: string | null;
  options: ExerciseOption[];
  correctIndex: number;
  answer?: string | null;
  pairs: { left: string; right: string }[];
  explanation?: string | null;
}

export interface LessonSummary {
  id: string;
  unitId: string;
  order: number;
  title: string;
  titleIt: string;
  kind: LessonKind;
  summary: string;
  estimatedMinutes: number;
  xpReward: number;
  status: LessonStatus;
  isFreePreview: boolean;
  vocabularyCount: number;
  exerciseCount: number;
  hasVideo: boolean;
  hasAudio: boolean;
  hasPdf: boolean;
  moduleId?: string | null;
  /** The video lesson every module starts with. */
  isModuleVideo?: boolean;
  /** Module video that has no video yet ("coming soon"). */
  videoPending?: boolean;
}

export interface CourseUnit {
  id: string;
  courseId: string;
  order: number;
  title: string;
  titleIt: string;
  description: string;
  canDo: string[];
  imageUrl?: string | null;
  pdfUrl?: string | null;
  liveClassFocus?: string | null;
  status: LessonStatus;
  lessons: LessonSummary[];
  modules?: CourseModule[];
}

export interface CourseOutline {
  course: Course;
  units: CourseUnit[];
  totalLessons: number;
}

export interface LessonDetail {
  id: string;
  courseId: string;
  unitId: string;
  unitTitle: string;
  order: number;
  title: string;
  titleIt: string;
  kind: LessonKind;
  summary: string;
  estimatedMinutes: number;
  xpReward: number;
  status: LessonStatus;
  isFreePreview: boolean;
  blocks: LessonBlock[];
  exercises: LessonExercise[];
  homework?: string | null;
  previousLessonId?: string | null;
  nextLessonId?: string | null;
  moduleId?: string | null;
  moduleTitle?: string | null;
  isModuleVideo?: boolean;
  videoPending?: boolean;
}

export interface SaveUnitRequest {
  title: string;
  titleIt?: string;
  description?: string;
  canDo?: string[];
  imageUrl?: string | null;
  pdfUrl?: string | null;
  liveClassFocus?: string | null;
  status: LessonStatus;
}

export interface SaveLessonRequest {
  title: string;
  titleIt?: string;
  kind: LessonKind;
  summary?: string;
  estimatedMinutes: number;
  xpReward: number;
  status: LessonStatus;
  isFreePreview: boolean;
  blocks: LessonBlock[];
  exercises: LessonExercise[];
  homework?: string | null;
  unitId?: string;
  moduleId?: string;
}

export interface StudentCourseProgress {
  userId: string;
  fullName: string;
  email: string;
  completedLessons: number;
  totalLessons: number;
  completionPercent: number;
  stars: number;
  xpEarned: number;
  averageScorePercent: number;
  lastActivityAtUtc?: string | null;
  enrolledAtUtc?: string | null;
}

export interface Illustration {
  name: string;
  url: string;
}

// ── Content translations (Punjabi / Hindi / Urdu) ─────────────────────────────────

export interface TranslationItem {
  source: string;
  punjabi?: string | null;
  hindi?: string | null;
  urdu?: string | null;
  updatedAtUtc?: string | null;
}

export interface TranslationPage {
  page: PagedResult<TranslationItem>;
  totalTexts: number;
  translatedPunjabi: number;
  translatedHindi: number;
  translatedUrdu: number;
}

/* ── Students & batches ──────────────────────────────────────────────────── */

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  status: string;
  emailVerified: boolean;
  preferredLanguage: string;
  batchId?: string | null;
  batchName?: string | null;
  /** Created by the team (true) or signed up on their own (false). */
  addedByStaff: boolean;
  /** Still using the temporary password. */
  mustChangePassword: boolean;
  createdAtUtc: string;
  lastLoginAtUtc?: string | null;
  activeCourses: number;
  progressPercent: number;
  isDeleted: boolean;
  /** Every batch of the student (a student can be in several, e.g. morning and evening). */
  batches?: StudentBatch[] | null;
  /** Paid enquiry turned into an account; nobody has given access (batch + login) yet. */
  awaitingLogin?: boolean;
}

export interface StudentPasswordResult {
  student: Student;
  temporaryPassword: string;
}

export interface StudentBatch {
  id: string;
  name: string;
  startTime?: string | null;
  endTime?: string | null;
}

export interface BatchCourse {
  id: string;
  title: string;
  cefrLevel: string;
  status: CourseStatus | number;
}

export interface Batch {
  id: string;
  name: string;
  /** No longer used in the panel (kept for older batches). */
  level?: string;
  description: string;
  mentorId?: string | null;
  mentorName?: string | null;
  courses: BatchCourse[];
  startDateUtc?: string | null;
  studentCount: number;
  /** Usual class time, "HH:mm" 24-hour. */
  startTime?: string | null;
  endTime?: string | null;
  createdAtUtc: string;
}

export interface TeacherOption {
  id: string;
  fullName: string;
  role: UserRole;
}


/** A group of lessons inside a unit. Always starts with its video lesson. */
export interface CourseModule {
  id: string;
  unitId: string;
  order: number;
  title: string;
  titleIt: string;
  description: string;
  imageUrl?: string | null;
  lessons: LessonSummary[];
  totalLessons: number;
  videoReady: boolean;
  /** Test module (e.g. chapter test): no video lesson. */
  isTest?: boolean;
}

export interface SaveModuleRequest {
  title: string;
  titleIt?: string;
  description?: string;
  imageUrl?: string | null;
  isTest?: boolean;
}

// ── Team permissions ─────────────────────────────────────────────────────────
// The role sets the most a member may have; the Super Admin can lower any module per person.

export type AccessLevel = 'None' | 'View' | 'Full';
export type PermissionModule = 'enquiries' | 'students' | 'batches' | 'courses' | 'translations' | 'classes' | 'notifications';

export const ACCESS_RANK: Record<AccessLevel, number> = { None: 0, View: 1, Full: 2 };

export const PERMISSION_MODULES: { key: PermissionModule; label: string; icon: string; view: string; full: string }[] = [
  { key: 'enquiries', label: 'Admissions & Leads', icon: 'Inbox', view: 'See website enquiries', full: 'Update enquiry status' },
  { key: 'students', label: 'Students', icon: 'Users', view: 'See the student list', full: 'Add, edit, move, suspend and reset passwords' },
  { key: 'batches', label: 'Batches', icon: 'Layers', view: 'See batches', full: 'Create, edit and delete batches' },
  { key: 'courses', label: 'Courses & Content', icon: 'Book', view: 'Open courses and lessons', full: 'Build, edit and publish content' },
  { key: 'translations', label: 'Translations', icon: 'Globe', view: 'See translations', full: 'Edit Punjabi, Hindi and Urdu text' },
  { key: 'classes', label: 'Live Classes', icon: 'Video', view: 'See the class timetable', full: 'Schedule classes and send start alerts' },
  { key: 'notifications', label: 'Notifications', icon: 'Bell', view: 'Read own notifications', full: 'Send notifications to students' },
];

export type PermissionMap = Record<PermissionModule, AccessLevel>;

export interface TeamPermissionCatalog {
  modules: PermissionModule[];
  roleDefaults: Record<TeamRole, PermissionMap>;
}

export interface TeamPasswordResult {
  user: User;
  temporaryPassword: string;
}

/** Each role's starting access (same as the server) — used until the server's own answer arrives. */
export const ROLE_DEFAULT_PERMISSIONS: Record<TeamRole, PermissionMap> = {
  Admin: { enquiries: 'Full', students: 'Full', batches: 'Full', courses: 'Full', translations: 'Full', classes: 'Full', notifications: 'Full' },
  Staff: { enquiries: 'Full', students: 'Full', batches: 'View', courses: 'None', translations: 'None', classes: 'None', notifications: 'None' },
  Mentor: { enquiries: 'None', students: 'View', batches: 'View', courses: 'Full', translations: 'Full', classes: 'Full', notifications: 'Full' },
};
