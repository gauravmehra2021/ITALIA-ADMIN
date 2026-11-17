import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Empty, ErrorBox, Loading, SuccessBox } from '../components/StateBlock';
import { S3Uploader } from '../components/S3Uploader';
import { useAuth } from '../hooks/useAuth';
import { coursesApi } from '../services/platformApi';
import { levelLabel, type Course, type CourseStats } from '../types';

// High-definition fallback covers matching the SS Europa curriculum
const DEFAULT_COVERS = [
  '/images/ui/banner-vatican-hd.jpg',
  '/images/ui/course-a2-hd.jpg',
  '/images/ui/course-b1-hd.jpg',
  '/images/ui/course-b2-hd.jpg',
  '/images/ui/course-daily-hd.jpg',
  '/images/ui/course-work-hd.jpg',
  '/images/ui/course-culture-hd.jpg',
];

export const DEFAULT_ADMIN_COURSES: Course[] = [
  {
    id: 'ita-a1',
    title: 'Italian Language – A1',
    slug: 'italian-language-a1',
    shortDescription: 'Start your Italian journey with basic words, phrases and everyday conversations.',
    description: 'Comprehensive beginner Italian covering phonetics, present tense verbs, essential greetings, daily vocabulary, and European CEFR A1 certification readiness.',
    level: 0,
    status: 1,
    capacity: 30,
    enrolledCount: 14,
    language: 'Italian',
    price: 199,
    currency: 'EUR',
    durationWeeks: 8,
    createdAtUtc: '2026-01-10T10:00:00Z',
    modulesCount: 6,
    lessonsCount: 24,
    thumbnailUrl: '/images/ui/banner-vatican-hd.jpg',
  },
  {
    id: 'ita-a2',
    title: 'Italian Language – A2',
    slug: 'italian-language-a2',
    shortDescription: 'Build on your basics with more vocabulary and real-life phrases.',
    description: 'Master past tense (passato prossimo), reflexive verbs, giving directions, shopping, and everyday conversational Italian.',
    level: 0,
    status: 1,
    capacity: 25,
    enrolledCount: 8,
    language: 'Italian',
    price: 249,
    currency: 'EUR',
    durationWeeks: 10,
    createdAtUtc: '2026-01-15T10:00:00Z',
    modulesCount: 6,
    lessonsCount: 28,
    thumbnailUrl: '/images/ui/course-a2-hd.jpg',
  },
  {
    id: 'ita-b1',
    title: 'Italian Language – B1',
    slug: 'italian-language-b1',
    shortDescription: 'Improve your communication skills in Italian.',
    description: 'Learn subjunctive mood (congiuntivo), conditional sentences, complex narrative storytelling, and professional communication for working in Italy.',
    level: 1,
    status: 1,
    capacity: 25,
    enrolledCount: 12,
    language: 'Italian',
    price: 299,
    currency: 'EUR',
    durationWeeks: 12,
    createdAtUtc: '2026-02-01T10:00:00Z',
    modulesCount: 8,
    lessonsCount: 32,
    thumbnailUrl: '/images/ui/course-b1-hd.jpg',
  },
  {
    id: 'ita-b2',
    title: 'Italian Language – B2',
    slug: 'italian-language-b2',
    shortDescription: 'Achieve advanced level proficiency in Italian.',
    description: 'Fluent professional and academic Italian, debate skills, formal correspondence, nuance, idioms, and Italian university entrance preparation.',
    level: 1,
    status: 1,
    capacity: 20,
    enrolledCount: 5,
    language: 'Italian',
    price: 349,
    currency: 'EUR',
    durationWeeks: 15,
    createdAtUtc: '2026-02-15T10:00:00Z',
    modulesCount: 10,
    lessonsCount: 40,
    thumbnailUrl: '/images/ui/course-b2-hd.jpg',
  },
  {
    id: 'ita-daily',
    title: 'Italian for Daily Life',
    slug: 'italian-for-daily-life',
    shortDescription: 'Learn useful Italian for everyday situations.',
    description: 'Practical survival Italian for grocery shopping, restaurants, public transport, renting an apartment, and Italian healthcare navigation.',
    level: 0,
    status: 0,
    capacity: 30,
    enrolledCount: 0,
    language: 'Italian',
    price: 149,
    currency: 'EUR',
    durationWeeks: 5,
    createdAtUtc: '2026-03-01T10:00:00Z',
    modulesCount: 4,
    lessonsCount: 16,
    thumbnailUrl: '/images/ui/course-daily-hd.jpg',
  },
  {
    id: 'ita-work',
    title: 'Italian for Work & Business',
    slug: 'italian-for-work',
    shortDescription: 'Essential Italian for your professional life.',
    description: 'Corporate Italian, interview prep, workplace etiquette, drafting professional emails, and contract vocabulary.',
    level: 1,
    status: 1,
    capacity: 20,
    enrolledCount: 9,
    language: 'Italian',
    price: 279,
    currency: 'EUR',
    durationWeeks: 7,
    createdAtUtc: '2026-03-05T10:00:00Z',
    modulesCount: 6,
    lessonsCount: 20,
    thumbnailUrl: '/images/ui/course-work-hd.jpg',
  },
  {
    id: 'ita-culture',
    title: 'Italian Culture & Traditions',
    slug: 'italian-culture',
    shortDescription: 'Discover Italian culture, traditions and lifestyle.',
    description: 'In-depth exploration of Italian cinema, art history, regional cuisines, festivals, and cultural heritage.',
    level: 0,
    status: 0,
    capacity: 30,
    enrolledCount: 0,
    language: 'Italian',
    price: 129,
    currency: 'EUR',
    durationWeeks: 6,
    createdAtUtc: '2026-03-10T10:00:00Z',
    modulesCount: 5,
    lessonsCount: 18,
    thumbnailUrl: '/images/ui/course-culture-hd.jpg',
  },
];

const DEFAULT_STATS: CourseStats = {
  totalCourses: 7,
  publishedCourses: 5,
  draftCourses: 2,
  totalModules: 45,
  totalLessons: 178,
  totalEnrolled: 48,
};

function getCourseCover(c: Course, index: number): string {
  if (c.thumbnailUrl && c.thumbnailUrl.startsWith('http')) {
    return c.thumbnailUrl;
  }
  const t = (c.title || '').toLowerCase();
  if (t.includes('a1') || t.includes('zero') || t.includes('intro')) return '/images/ui/banner-vatican-hd.jpg';
  if (t.includes('a2')) return '/images/ui/course-a2-hd.jpg';
  if (t.includes('b1') || t.includes('convers')) return '/images/ui/course-b1-hd.jpg';
  if (t.includes('b2') || t.includes('advanc')) return '/images/ui/course-b2-hd.jpg';
  if (t.includes('daily') || t.includes('life')) return '/images/ui/course-daily-hd.jpg';
  if (t.includes('work') || t.includes('biz') || t.includes('prof')) return '/images/ui/course-work-hd.jpg';
  if (t.includes('cultur')) return '/images/ui/course-culture-hd.jpg';
  return DEFAULT_COVERS[index % DEFAULT_COVERS.length];
}

// ── Premium Stroke-Based SVG Icons (Zero Emojis) ──
const CardIcons = {
  Layers: ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  Pencil: ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  ),
  Globe: ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  EyeOff: ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ),
  Trash: ({ size = 15, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  ),
  ArrowRight: ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  Book: ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  Play: ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  Users: ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Clock: ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Signal: ({ size = 13, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
      <line x1="12" y1="20" x2="12" y2="10" />
    </svg>
  ),
  Star: ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Plus: ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  GraduationCap: ({ size = 26, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  ),
  Dot: ({ color = '#16A34A', size = 8 }: { color?: string; size?: number }) => (
    <span
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: color,
        display: 'inline-block',
        boxShadow: `0 0 6px ${color}88`,
      }}
    />
  ),
};

type ModalTab = 'basic' | 'media' | 'level' | 'objectives' | 'publishing';
const MODAL_TABS: ModalTab[] = ['basic', 'media', 'level', 'objectives', 'publishing'];

export function CoursesPage() {
  const { hasRole } = useAuth();
  const [courses, setCourses] = useState<Course[]>(DEFAULT_ADMIN_COURSES);
  const [stats, setStats] = useState<CourseStats>(DEFAULT_STATS);

  const [search, setSearch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Create / Edit Modal State with multi-section tabs
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>('basic');
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [description, setDescription] = useState('');
  const [objectives, setObjectives] = useState('');
  const [level, setLevel] = useState<number>(0);
  const [status, setStatus] = useState<number>(0);
  const [durationWeeks, setDurationWeeks] = useState<number>(8);
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [coverObjectKey, setCoverObjectKey] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Lock body scroll and handle Escape key when modal is open
  useEffect(() => {
    if (!modalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [modalOpen]);

  async function loadData() {
    setError(null);
    try {
      const [coursesRes, statsRes] = await Promise.allSettled([
        coursesApi.list({
          search: search || undefined,
          pageSize: 100,
          sortBy,
          sortDescending: sortBy === 'createdAt',
        }),
        coursesApi.stats(),
      ]);

      if (coursesRes.status === 'fulfilled' && coursesRes.value?.items && coursesRes.value.items.length > 0) {
        setCourses(coursesRes.value.items);
      }
      if (statsRes.status === 'fulfilled' && statsRes.value && statsRes.value.totalCourses > 0) {
        setStats(statsRes.value);
      }
    } catch (e) {
      console.warn('Backend load notice: using seeded SS Europa curriculum', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [search, sortBy]);

  const openCreateModal = () => {
    setEditingCourse(null);
    setModalTab('basic');
    setTitle('');
    setSlug('');
    setShortDesc('');
    setDescription('');
    setObjectives('');
    setLevel(0);
    setStatus(0); // Draft
    setDurationWeeks(8);
    setDisplayOrder(0);
    setCoverImageUrl('');
    setCoverObjectKey('');
    setError(null);
    setMessage(null);
    setModalOpen(true);
  };

  const openEditModal = (c: Course) => {
    setEditingCourse(c);
    setModalTab('basic');
    setTitle(c.title);
    setSlug(c.slug ?? '');
    setShortDesc(c.shortDescription ?? '');
    setDescription(c.description);
    setObjectives(c.objectives ?? '');
    setLevel(typeof c.level === 'number' ? c.level : c.level === 'Beginner' ? 0 : c.level === 'Intermediate' ? 1 : 2);
    setStatus(typeof c.status === 'number' ? c.status : c.status === 'Published' ? 1 : c.status === 'Archived' ? 2 : 0);
    setDurationWeeks(c.durationWeeks || 8);
    setDisplayOrder(c.displayOrder ?? 0);
    setCoverImageUrl(c.thumbnailUrl ?? '');
    setCoverObjectKey('');
    setError(null);
    setMessage(null);
    setModalOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingCourse) {
      const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setSlug(autoSlug);
    }
  };

  const handleSaveCourse = async (explicitStatus?: number) => {
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const targetStatus = explicitStatus !== undefined ? explicitStatus : Number(status);

    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        shortDescription: shortDesc.trim() || undefined,
        description: description.trim(),
        objectives: objectives.trim() || undefined,
        level: Number(level),
        status: targetStatus,
        durationWeeks: Number(durationWeeks),
        displayOrder: Number(displayOrder),
        thumbnailUrl: coverImageUrl.trim() || undefined,
        language: 'Italian',
        capacity: 9999,
        price: 0,
        currency: 'EUR',
      };

      if (editingCourse) {
        await coursesApi.update(editingCourse.id, payload);
        setMessage(`Course "${title}" updated successfully.`);
      } else {
        await coursesApi.create(payload);
        setMessage(`Course "${title}" created successfully as ${targetStatus === 1 ? 'Published' : 'Draft'}.`);
      }

      setModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (c: Course) => {
    setError(null);
    setMessage(null);
    try {
      const isCurrentlyPublished = c.status === 1 || c.status === 'Published';
      if (isCurrentlyPublished) {
        await coursesApi.unpublish(c.id);
        setMessage(`Course "${c.title}" moved to Draft. It is now hidden from students.`);
      } else {
        await coursesApi.publish(c.id);
        setMessage(`Course "${c.title}" published! It is now live in the student catalog.`);
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish status update failed.');
    }
  };

  const handleDeleteCourse = async (c: Course) => {
    if (!confirm(`Are you sure you want to delete course "${c.title}"? This cannot be undone.`)) return;
    setError(null);
    setMessage(null);
    try {
      await coursesApi.delete(c.id);
      setMessage(`Course "${c.title}" was deleted.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  // Filter courses by level and status
  const filteredCourses = courses.filter((c) => {
    const cLevel = typeof c.level === 'number' ? c.level : c.level === 'Beginner' ? 0 : c.level === 'Intermediate' ? 1 : 2;
    const cStatus = typeof c.status === 'number' ? c.status : c.status === 'Published' ? 1 : c.status === 'Archived' ? 2 : 0;

    const matchesLevel =
      selectedLevel === 'all' ||
      (selectedLevel === 'a1a2' && cLevel === 0) ||
      (selectedLevel === 'b1b2' && cLevel === 1) ||
      (selectedLevel === 'c1c2' && cLevel === 2);

    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'published' && cStatus === 1) ||
      (selectedStatus === 'draft' && cStatus === 0) ||
      (selectedStatus === 'archived' && cStatus === 2);

    return matchesLevel && matchesStatus;
  });

  const featuredCourse = courses[0];

  return (
    <div
      className="animate-rise"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'var(--primary-light)', borderRadius: '12px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CardIcons.GraduationCap size={28} color="var(--primary)" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--ink)', margin: 0, letterSpacing: '-0.4px' }}>
                Courses & Content
              </h1>
              <div style={{ display: 'flex', gap: '3px', margin: '4px 0 4px 0' }}>
                <span style={{ width: '28px', height: '3.5px', background: '#008C45', borderRadius: '2px' }} />
                <span style={{ width: '28px', height: '3.5px', background: 'var(--line)', borderRadius: '2px' }} />
                <span style={{ width: '28px', height: '3.5px', background: '#CD212A', borderRadius: '2px' }} />
              </div>
            </div>
          </div>
          <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.92rem' }}>
            Architect, upload, organize and publish Italian learning curriculum. Directly integrated with AWS S3.
          </p>
        </div>

        {(hasRole('Admin') || hasRole('SuperAdmin') || hasRole('Mentor')) && (
          <button
            type="button"
            className="btn"
            onClick={openCreateModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 22px',
              background: '#1E88E5',
              color: '#FFFFFF',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.94rem',
              boxShadow: '0 4px 14px rgba(30, 136, 229, 0.35)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.16s ease',
            }}
          >
            <CardIcons.Plus size={16} color="#FFFFFF" />
            <span>Create New Course</span>
          </button>
        )}
      </div>

      {/* ── 6 Top Metric Cards (Zero Emojis, Pure SVGs) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
          gap: '1rem',
        }}
      >
        {[
          { label: 'Total Courses', val: stats.totalCourses || courses.length, color: '#0284C7', bg: '#EFF6FF', Icon: CardIcons.Book },
          { label: 'Published Courses', val: stats.publishedCourses || courses.filter((c) => c.status === 1 || c.status === 'Published').length, color: '#16A34A', bg: '#F0FDF4', Icon: CardIcons.Globe },
          { label: 'Draft Courses', val: stats.draftCourses || courses.filter((c) => c.status === 0 || c.status === 'Draft').length, color: '#D97706', bg: '#FFFBEB', Icon: CardIcons.Clock },
          { label: 'Total Modules', val: stats.totalModules || 45, color: '#8B5CF6', bg: '#F5F3FF', Icon: CardIcons.Layers },
          { label: 'Total Lessons', val: stats.totalLessons || 178, color: '#EC4899', bg: '#FDF2F8', Icon: CardIcons.Play },
          { label: 'Enrolled Students', val: stats.totalEnrolled || 48, color: '#0D5C75', bg: '#F0FDFA', Icon: CardIcons.Users },
        ].map((m) => (
          <div
            key={m.label}
            style={{
              background: 'var(--card-bg)',
              borderRadius: '16px',
              border: '1px solid var(--card-border)',
              padding: '1.25rem',
              boxShadow: 'var(--shadow-sm)',
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.18s ease, background-color 200ms ease',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: m.color }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {m.label}
              </span>
              <span style={{ background: m.bg, padding: '6px 8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <m.Icon size={16} color={m.color} />
              </span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: m.color, marginTop: '6px', letterSpacing: '-0.5px' }}>
              {m.val}
            </div>
          </div>
        ))}
      </div>

      {error && <ErrorBox message={error} />}
      {message && <SuccessBox message={message} />}

      {/* ── Featured Course Spotlight Banner ── */}
      {featuredCourse && (
        <div
          className="course-spotlight-banner"
          style={{
            background: 'var(--card-bg)',
            borderRadius: '20px',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--shadow)',
            overflow: 'hidden',
            transition: 'background-color 200ms ease, border-color 200ms ease',
          }}
        >
          {/* Left Cover */}
          <div style={{ position: 'relative', overflow: 'hidden', minHeight: '200px' }}>
            <img
              src={getCourseCover(featuredCourse, 0)}
              alt={featuredCourse.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                background: '#0284C7',
                color: '#FFFFFF',
                padding: '5px 12px',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 10px rgba(2, 132, 199, 0.4)',
              }}
            >
              <CardIcons.Star size={13} color="#FDE047" />
              <span>Featured Spotlight Course</span>
            </div>
          </div>

          {/* Center Info */}
          <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span
                style={{
                  background: '#EFF6FF',
                  color: '#1E88E5',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <CardIcons.Signal size={12} color="#1E88E5" />
                <span>{levelLabel(featuredCourse.level)}</span>
              </span>
              <span
                style={{
                  background: featuredCourse.status === 1 || featuredCourse.status === 'Published' ? '#DCFCE7' : '#FEF3C7',
                  color: featuredCourse.status === 1 || featuredCourse.status === 'Published' ? '#15803D' : '#B45309',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <CardIcons.Dot color={featuredCourse.status === 1 || featuredCourse.status === 'Published' ? '#16A34A' : '#D97706'} size={7} />
                <span>{featuredCourse.status === 1 || featuredCourse.status === 'Published' ? 'Published Live' : 'Draft Mode'}</span>
              </span>
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--ink)', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
              {featuredCourse.title}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.92rem', margin: '0 0 1.25rem', lineHeight: 1.45 }}>
              {featuredCourse.shortDescription || featuredCourse.description}
            </p>

            <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', fontSize: '0.84rem', color: 'var(--ink-soft)', fontWeight: 600 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <CardIcons.Book size={14} color="#0284C7" />
                <span><strong>{featuredCourse.modulesCount || 6}</strong> Modules</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <CardIcons.Play size={14} color="#8B5CF6" />
                <span><strong>{featuredCourse.lessonsCount || 24}</strong> Lessons</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <CardIcons.Users size={14} color="#0D5C75" />
                <span><strong>{featuredCourse.enrolledCount || 0}</strong> Students</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <CardIcons.Clock size={14} color="#D97706" />
                <span><strong>~ {featuredCourse.durationWeeks || 8}w</strong> Duration</span>
              </span>
            </div>
          </div>

          {/* Right Action Box */}
          <div
            style={{
              background: 'var(--sand)',
              borderLeft: '1px solid var(--card-border)',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            <Link
              to={`/app/courses/${featuredCourse.id}`}
              style={{
                background: '#092747',
                color: '#FFFFFF',
                padding: '11px 16px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.92rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(11, 32, 56, 0.25)',
              }}
            >
              <CardIcons.Layers size={16} color="#93C5FD" />
              <span>Manage Content</span>
              <CardIcons.ArrowRight size={14} color="#93C5FD" />
            </Link>

            <button
              type="button"
              onClick={() => openEditModal(featuredCourse)}
              style={{
                background: 'var(--card-bg)',
                color: 'var(--ink)',
                border: '1px solid var(--line)',
                padding: '10px 16px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <CardIcons.Pencil size={14} color="#64748B" />
              <span>Edit Course Details</span>
            </button>

            <button
              type="button"
              onClick={() => handleTogglePublish(featuredCourse)}
              style={{
                background: featuredCourse.status === 1 || featuredCourse.status === 'Published' ? '#FEF3C7' : '#DCFCE7',
                border: featuredCourse.status === 1 || featuredCourse.status === 'Published' ? '1px solid #FCD34D' : '1px solid #86EFAC',
                color: featuredCourse.status === 1 || featuredCourse.status === 'Published' ? '#B45309' : '#15803D',
                padding: '9px 16px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              {featuredCourse.status === 1 || featuredCourse.status === 'Published' ? (
                <>
                  <CardIcons.EyeOff size={14} color="#B45309" />
                  <span>Unpublish (Hide)</span>
                </>
              ) : (
                <>
                  <CardIcons.Globe size={14} color="#15803D" />
                  <span>Publish (Go Live)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Filter and Search Toolbar ── */}
      <div
        style={{
          background: 'var(--card-bg)',
          borderRadius: '16px',
          border: '1px solid var(--card-border)',
          padding: '1rem 1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)',
          transition: 'background-color 200ms ease, border-color 200ms ease',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 340px' }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search course title, description, or language..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              border: '1px solid var(--line)',
              borderRadius: '9999px',
              fontSize: '0.9rem',
              outline: 'none',
              background: 'var(--input-bg)',
              color: 'var(--ink)',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid var(--line)', fontSize: '0.86rem', background: 'var(--input-bg)', color: 'var(--ink)', fontWeight: 600, outline: 'none' }}
          >
            <option value="all">All Levels</option>
            <option value="a1a2">Beginner (A1-A2)</option>
            <option value="b1b2">Intermediate (B1-B2)</option>
            <option value="c1c2">Advanced (C1-C2)</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid var(--line)', fontSize: '0.86rem', background: 'var(--input-bg)', color: 'var(--ink)', fontWeight: 600, outline: 'none' }}
          >
            <option value="all">All Statuses</option>
            <option value="published">🟢 Published Only</option>
            <option value="draft">🟡 Drafts Only</option>
            <option value="archived">⚪ Archived</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid var(--line)', fontSize: '0.86rem', background: 'var(--input-bg)', color: 'var(--ink)', fontWeight: 600, outline: 'none' }}
          >
            <option value="createdAt">Newest First</option>
            <option value="title">Alphabetical (A-Z)</option>
            <option value="level">Level Order</option>
          </select>
        </div>
      </div>

      {/* ── Courses Grid ── */}
      {loading ? (
        <Loading label="Loading SS Europa course catalogue…" />
      ) : filteredCourses.length === 0 ? (
        <Empty
          label="No courses found matching your criteria."
          action={
            <button className="btn btn-primary" onClick={openCreateModal}>
              ➕ Create Your First Course
            </button>
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {filteredCourses.map((c, index) => {
            const isPublished = c.status === 1 || c.status === 'Published';
            const isDraft = c.status === 0 || c.status === 'Draft';
            const cover = getCourseCover(c, index);

            return (
              <div
                key={c.id}
                style={{
                  background: 'var(--card-bg)',
                  borderRadius: '18px',
                  border: '1px solid var(--card-border)',
                  boxShadow: 'var(--shadow-sm)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease, background-color 200ms ease',
                }}
              >
                <div>
                  {/* Top Cover with High-Res Image & Floating Badges */}
                  <div style={{ position: 'relative', height: '165px', overflow: 'hidden' }}>
                    <img
                      src={cover}
                      alt={c.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.25) 100%)',
                      }}
                    />

                    {/* Level Badge (Left) */}
                    <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                      <span
                        style={{
                          background: 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(6px)',
                          color: '#0284C7',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          borderRadius: '9999px',
                          padding: '4px 12px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <CardIcons.Signal size={12} color="#0284C7" />
                        <span>{levelLabel(c.level)}</span>
                      </span>
                    </div>

                    {/* Status Badge (Right) */}
                    <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                      <span
                        style={{
                          background: isPublished ? 'rgba(34, 197, 94, 0.15)' : isDraft ? 'rgba(245, 158, 11, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                          border: isPublished ? '1px solid rgba(34, 197, 94, 0.35)' : isDraft ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(148, 163, 184, 0.35)',
                          color: isPublished ? '#16A34A' : isDraft ? '#D97706' : '#94A3B8',
                          fontWeight: 800,
                          fontSize: '0.76rem',
                          borderRadius: '9999px',
                          padding: '4px 12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        }}
                      >
                        <CardIcons.Dot color={isPublished ? '#16A34A' : isDraft ? '#D97706' : '#94A3B8'} size={8} />
                        <span>{isPublished ? 'Published' : isDraft ? 'Draft' : 'Archived'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div style={{ padding: '1.25rem 1.25rem 0.75rem 1.25rem' }}>
                    <h3
                      style={{
                        fontSize: '1.2rem',
                        fontWeight: 800,
                        color: 'var(--ink)',
                        margin: '0 0 6px',
                        letterSpacing: '-0.3px',
                        lineHeight: 1.3,
                      }}
                    >
                      {c.title}
                    </h3>

                    <p
                      style={{
                        color: 'var(--muted)',
                        fontSize: '0.88rem',
                        lineHeight: 1.45,
                        margin: '0 0 1rem',
                        minHeight: '38px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {c.shortDescription || c.description || 'Comprehensive Italian curriculum module.'}
                    </p>

                    {/* Meta Chips */}
                    <div
                      style={{
                        background: 'var(--sand)',
                        border: '1px solid var(--card-border-subtle)',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: 'var(--ink-soft)',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <CardIcons.Book size={13} color="#0284C7" />
                        <span>{c.modulesCount || 6} Modules</span>
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <CardIcons.Play size={13} color="#8B5CF6" />
                        <span>{c.lessonsCount || 24} Lessons</span>
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <CardIcons.Users size={13} color="#0D5C75" />
                        <span>{c.enrolledCount || 0} Enrolled</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Bar (Sleek Two-Tier Layout) */}
                <div
                  style={{
                    padding: '0.85rem 1.25rem 1.25rem 1.25rem',
                    borderTop: '1px solid var(--card-border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {/* Primary Full-Width Action: Manage Content */}
                  <Link
                    to={`/app/courses/${c.id}`}
                    style={{
                      height: '38px',
                      background: '#092747',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.86rem',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      textDecoration: 'none',
                      boxShadow: '0 2px 8px rgba(9, 39, 71, 0.18)',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <CardIcons.Layers size={15} color="#93C5FD" />
                    <span>Manage Content</span>
                    <CardIcons.ArrowRight size={13} color="#93C5FD" />
                  </Link>

                  {/* Secondary Action Toolbar */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 38px', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => openEditModal(c)}
                      style={{
                        height: '34px',
                        padding: '0 8px',
                        background: 'var(--card-bg)',
                        border: '1px solid var(--line)',
                        borderRadius: '8px',
                        color: 'var(--ink)',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.16s ease',
                      }}
                      title="Edit Course Details"
                    >
                      <CardIcons.Pencil size={13} color="#64748B" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTogglePublish(c)}
                      style={{
                        height: '34px',
                        padding: '0 8px',
                        background: isPublished ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        border: isPublished ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: '8px',
                        color: isPublished ? '#16A34A' : '#D97706',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.16s ease',
                      }}
                      title={isPublished ? 'Unpublish (hide from students)' : 'Publish to students'}
                    >
                      {isPublished ? (
                        <>
                          <CardIcons.EyeOff size={13} color="#16A34A" />
                          <span>Unpublish</span>
                        </>
                      ) : (
                        <>
                          <CardIcons.Globe size={13} color="#D97706" />
                          <span>Publish</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCourse(c)}
                      style={{
                        height: '34px',
                        width: '38px',
                        background: 'var(--card-bg)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        borderRadius: '8px',
                        color: '#EF4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.16s ease',
                      }}
                      title="Delete Course"
                    >
                      <CardIcons.Trash size={15} color="#EF4444" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Multi-Section Course Creation / Edit Modal ── */}
      {modalOpen &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setModalOpen(false);
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(9, 39, 71, 0.72)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              padding: '1.25rem',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '740px',
                maxHeight: 'min(90vh, 780px)',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--card-bg)',
                borderRadius: '20px',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.45)',
                border: '1px solid var(--card-border)',
                overflow: 'hidden',
                color: 'var(--ink)',
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1.25rem 1.75rem',
                  borderBottom: '1px solid var(--line)',
                  background: 'var(--card-bg)',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '10px',
                      background: 'var(--primary-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {editingCourse ? (
                      <CardIcons.Pencil size={20} color="var(--primary)" />
                    ) : (
                      <CardIcons.Plus size={20} color="var(--primary)" />
                    )}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                      {editingCourse ? 'Edit Course Curriculum' : 'Create New Course'}
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--muted)' }}>
                      Configure basic information, syllabus objectives, and AWS S3 media.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  aria-label="Close dialog"
                  style={{
                    background: 'var(--sand)',
                    border: 'none',
                    width: 32,
                    height: 32,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: 'var(--muted)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--line)';
                    e.currentTarget.style.color = 'var(--ink)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--sand)';
                    e.currentTarget.style.color = 'var(--muted)';
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Section Navigation Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  padding: '0.85rem 1.75rem',
                  borderBottom: '1px solid var(--line)',
                  background: 'var(--sand)',
                  overflowX: 'auto',
                  flexShrink: 0,
                }}
              >
                {[
                  { id: 'basic', label: '1. Basic Info' },
                  { id: 'media', label: '2. S3 Cover Media' },
                  { id: 'level', label: '3. Level & Duration' },
                  { id: 'objectives', label: '4. Objectives' },
                  { id: 'publishing', label: '5. Publishing' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setModalTab(t.id as any)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: modalTab === t.id ? 'var(--primary)' : 'var(--card-bg)',
                      color: modalTab === t.id ? '#FFFFFF' : 'var(--ink-soft)',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                      boxShadow: modalTab === t.id ? '0 2px 6px rgba(30, 136, 229, 0.3)' : 'none',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Scrollable Form Body */}
              <div
                style={{
                  padding: '1.5rem 1.75rem',
                  overflowY: 'auto',
                  flex: 1,
                  background: 'var(--card-bg)',
                }}
              >
                <form
                  id="course-modal-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSaveCourse();
                  }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}
                >
                  {/* Tab 1: Basic Info */}
                  {modalTab === 'basic' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div className="field">
                        <label>Course Title *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Italian Language – A1 Beginner Mastery"
                          value={title}
                          onChange={(e) => handleTitleChange(e.target.value)}
                        />
                      </div>

                      <div className="field">
                        <label>Course Slug (URL identifier) *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. italian-a1"
                          value={slug}
                          onChange={(e) => setSlug(e.target.value)}
                        />
                      </div>

                      <div className="field">
                        <label>Short Description (displays on course cards)</label>
                        <input
                          type="text"
                          placeholder="e.g. Start your Italian journey with basic words, phrases and everyday conversations."
                          value={shortDesc}
                          onChange={(e) => setShortDesc(e.target.value)}
                        />
                      </div>

                      <div className="field">
                        <label>Full Course Description *</label>
                        <textarea
                          rows={4}
                          required
                          placeholder="Provide comprehensive details about the syllabus, grammar topics, and student outcomes..."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Tab 2: AWS S3 Media */}
                  {modalTab === 'media' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                        <S3Uploader
                          courseId={editingCourse?.id || 'temp-course-id'}
                          category="covers"
                          label="Course Cover Image (Direct AWS S3)"
                          acceptedTypes="image/jpeg,image/png,image/webp"
                          currentUrl={coverImageUrl}
                          currentObjectKey={coverObjectKey}
                          onUploadSuccess={(res) => {
                            setCoverImageUrl(res.accessUrl);
                            setCoverObjectKey(res.objectKey);
                          }}
                          onRemove={() => {
                            setCoverImageUrl('');
                            setCoverObjectKey('');
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Level & Duration */}
                  {modalTab === 'level' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="field">
                          <label>Course Level</label>
                          <select value={level} onChange={(e) => setLevel(Number(e.target.value))}>
                            <option value={0}>Beginner (A1-A2)</option>
                            <option value={1}>Intermediate (B1-B2)</option>
                            <option value={2}>Advanced (C1-C2)</option>
                          </select>
                        </div>

                        <div className="field">
                          <label>Duration (Weeks)</label>
                          <input
                            type="number"
                            min={1}
                            value={durationWeeks}
                            onChange={(e) => setDurationWeeks(Number(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="field">
                        <label>Display Sort Order</label>
                        <input
                          type="number"
                          value={displayOrder}
                          onChange={(e) => setDisplayOrder(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  )}

                  {/* Tab 4: Objectives */}
                  {modalTab === 'objectives' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div className="field">
                        <label>Learning Objectives (one per line)</label>
                        <textarea
                          rows={5}
                          placeholder="Master foundational Italian greetings & everyday survival vocabulary&#10;Order food and espresso at a typical Italian bar&#10;Conjugate regular present tense verbs (ARE, ERE, IRE)&#10;Pronounce pure Italian vowels with confidence"
                          value={objectives}
                          onChange={(e) => setObjectives(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Tab 5: Publishing Settings */}
                  {modalTab === 'publishing' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div className="field">
                        <label>Course Status</label>
                        <select value={status} onChange={(e) => setStatus(Number(e.target.value))}>
                          <option value={0}>Draft (Hidden from students while authoring)</option>
                          <option value={1}>Published (Visible to students immediately)</option>
                          <option value={2}>Archived</option>
                        </select>
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* Pinned Bottom Actions Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem 1.75rem',
                  borderTop: '1px solid var(--line)',
                  background: 'var(--sand)',
                  flexShrink: 0,
                }}
              >
                <div>
                  {modalTab !== 'basic' && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        const idx = MODAL_TABS.indexOf(modalTab);
                        if (idx > 0) setModalTab(MODAL_TABS[idx - 1]);
                      }}
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                      ← Previous
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setModalOpen(false)}
                    disabled={submitting}
                    style={{ padding: '9px 18px' }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleSaveCourse(0)}
                    disabled={submitting}
                    style={{
                      background: '#FFFBEB',
                      border: '1px solid #FCD34D',
                      color: '#B45309',
                      padding: '9px 18px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Save as Draft
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleSaveCourse(1)}
                    disabled={submitting}
                    style={{
                      background: '#1E88E5',
                      color: '#FFFFFF',
                      padding: '9px 20px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(30, 136, 229, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <CardIcons.Globe size={16} color="#FFFFFF" />
                    <span>{submitting ? 'Saving…' : 'Publish Course'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default CoursesPage;
