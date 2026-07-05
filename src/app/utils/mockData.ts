export type InquiryStatus = 'new' | 'in_progress' | 'resolved' | 'archived';
export type ServiceType = 
  | 'immigration'
  | 'caf_patronato'
  | 'insurance'
  | 'business_consultancy'
  | 'training'
  | 'indian_consulate'
  | 'international_visas'
  | 'Other';

export interface Inquiry {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  subject: string;
  objectType: string;
  service: ServiceType;
  contactMethod: 'email' | 'phone' | 'whatsapp' | 'inperson';
  status: InquiryStatus;
  message: string;
  createdDate: string;
  country?: string;
  notes?: string;
  timeline?: TimelineEvent[];
  assignedTo?: { _id: string; admin_name: string; email: string } | null;
}

export interface TimelineEvent {
  id: string;
  action: string;
  user: string;
  timestamp: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin';
  status: 'active' | 'inactive';
  avatar?: string;
  phone?: string;
  lastLogin: string;
  createdDate: string;
}

export interface ActivityLog {
  id: string;
  administrator: string;
  action: string;
  description: string;
  date: string;
}

// Service type labels
export const serviceLabels: Record<ServiceType, string> = {
  immigration: 'Immigration Services',
  caf_patronato: 'CAF & Patronato',
  insurance: 'Insurance',
  business_consultancy: 'Business Consultancy',
  training: 'Training & Courses',
  indian_consulate: 'Indian Consulate Services',
  international_visas: 'International Visas',
  Other: 'Other Services',
};

// Mock inquiries
export const mockInquiries: Inquiry[] = [
  {
    id: 'INQ-001',
    fullName: 'Rajesh Kumar',
    email: 'rajesh.kumar@email.com',
    phone: '+39 345 123 4567',
    subject: 'Work Visa Application',
    objectType: 'Request Information',
    service: 'immigration',
    contactMethod: 'email',
    status: 'new',
    message: 'I need assistance with obtaining a work visa for Italy. I have a job offer from a company in Milan.',
    createdDate: '2026-05-30T10:30:00',
    timeline: [
      {
        id: 't1',
        action: 'Inquiry submitted',
        user: 'System',
        timestamp: '2026-05-30T10:30:00',
      },
    ],
  },
  {
    id: 'INQ-002',
    fullName: 'Maria Fernandez',
    email: 'maria.f@email.com',
    phone: '+39 345 234 5678',
    subject: 'CAF Assistance for Tax Declaration',
    objectType: 'Book an Appointment',
    service: 'caf_patronato',
    contactMethod: 'phone',
    status: 'in_progress',
    message: 'I need help with my annual tax declaration. This is my first year filing taxes in Italy.',
    createdDate: '2026-05-29T14:20:00',
    notes: 'Scheduled appointment for June 2nd at 10 AM.',
    timeline: [
      {
        id: 't1',
        action: 'Inquiry submitted',
        user: 'System',
        timestamp: '2026-05-29T14:20:00',
      },
      {
        id: 't2',
        action: 'Status updated to In Progress',
        user: 'Maria Bianchi',
        timestamp: '2026-05-29T15:00:00',
      },
    ],
  },
  {
    id: 'INQ-003',
    fullName: 'John Anderson',
    email: 'john.anderson@email.com',
    phone: '+39 345 345 6789',
    subject: 'Health Insurance Inquiry',
    objectType: 'General Inquiry',
    service: 'insurance',
    contactMethod: 'whatsapp',
    status: 'resolved',
    message: 'Looking for comprehensive health insurance coverage for my family of four.',
    createdDate: '2026-05-28T09:15:00',
    notes: 'Policy purchased - Family Plan Premium.',
    timeline: [
      {
        id: 't1',
        action: 'Inquiry submitted',
        user: 'System',
        timestamp: '2026-05-28T09:15:00',
      },
      {
        id: 't2',
        action: 'Status updated to In Progress',
        user: 'Giovanni Rossi',
        timestamp: '2026-05-28T10:00:00',
      },
      {
        id: 't3',
        action: 'Status updated to Resolved',
        user: 'Giovanni Rossi',
        timestamp: '2026-05-29T16:30:00',
      },
    ],
  },
  {
    id: 'INQ-004',
    fullName: 'Priya Sharma',
    email: 'priya.sharma@email.com',
    phone: '+39 345 456 7890',
    subject: 'Business Setup Consultation',
    objectType: 'Request Information',
    service: 'business_consultancy',
    contactMethod: 'email',
    status: 'in_progress',
    message: 'I want to start a restaurant business in Rome. Need guidance on legal requirements and registration.',
    createdDate: '2026-05-27T11:45:00',
    notes: 'Initial consultation completed. Preparing business plan documentation.',
    timeline: [
      {
        id: 't1',
        action: 'Inquiry submitted',
        user: 'System',
        timestamp: '2026-05-27T11:45:00',
      },
      {
        id: 't2',
        action: 'Status updated to In Progress',
        user: 'Maria Bianchi',
        timestamp: '2026-05-27T14:00:00',
      },
    ],
  },
  {
    id: 'INQ-005',
    fullName: 'Ahmed Hassan',
    email: 'ahmed.hassan@email.com',
    phone: '+39 345 567 8901',
    subject: 'Document Translation',
    objectType: 'Document Assistance',
    service: 'Other',
    contactMethod: 'phone',
    status: 'new',
    message: 'Need certified translation of my educational certificates from Arabic to Italian.',
    createdDate: '2026-05-30T08:00:00',
    timeline: [
      {
        id: 't1',
        action: 'Inquiry submitted',
        user: 'System',
        timestamp: '2026-05-30T08:00:00',
      },
    ],
  },
  {
    id: 'INQ-006',
    fullName: 'Sofia Martinez',
    email: 'sofia.m@email.com',
    phone: '+39 345 678 9012',
    subject: 'Indian Passport Services',
    objectType: 'Document Assistance',
    service: 'indian_consulate',
    contactMethod: 'whatsapp',
    status: 'new',
    message: 'My Indian passport is expiring soon. Need assistance with renewal process.',
    createdDate: '2026-05-30T09:30:00',
    timeline: [
      {
        id: 't1',
        action: 'Inquiry submitted',
        user: 'System',
        timestamp: '2026-05-30T09:30:00',
      },
    ],
  },
  {
    id: 'INQ-007',
    fullName: 'Marco Rossi',
    email: 'marco.rossi@email.com',
    phone: '+39 345 789 0123',
    subject: 'Italian Language Course',
    objectType: 'Request Information',
    service: 'training',
    contactMethod: 'email',
    status: 'in_progress',
    message: 'Interested in enrolling in intermediate level Italian language course.',
    createdDate: '2026-05-26T15:30:00',
    notes: 'Enrolled in June batch - starts June 5th.',
    timeline: [
      {
        id: 't1',
        action: 'Inquiry submitted',
        user: 'System',
        timestamp: '2026-05-26T15:30:00',
      },
      {
        id: 't2',
        action: 'Status updated to In Progress',
        user: 'Giovanni Rossi',
        timestamp: '2026-05-27T09:00:00',
      },
    ],
  },
  {
    id: 'INQ-008',
    fullName: 'Li Wei',
    email: 'li.wei@email.com',
    phone: '+39 345 890 1234',
    subject: 'Schengen Visa Application',
    objectType: 'Application Status',
    service: 'international_visas',
    contactMethod: 'email',
    status: 'resolved',
    message: 'Need help with Schengen visa application for tourist visit to France.',
    createdDate: '2026-05-25T10:00:00',
    notes: 'Visa approved and issued.',
    timeline: [
      {
        id: 't1',
        action: 'Inquiry submitted',
        user: 'System',
        timestamp: '2026-05-25T10:00:00',
      },
      {
        id: 't2',
        action: 'Status updated to In Progress',
        user: 'Maria Bianchi',
        timestamp: '2026-05-25T11:00:00',
      },
      {
        id: 't3',
        action: 'Status updated to Resolved',
        user: 'Maria Bianchi',
        timestamp: '2026-05-28T14:00:00',
      },
    ],
  },
  {
    id: 'INQ-009',
    fullName: 'Elena Popescu',
    email: 'elena.p@email.com',
    phone: '+39 345 901 2345',
    subject: 'Residence Permit Renewal',
    objectType: 'Application Status',
    service: 'immigration',
    contactMethod: 'phone',
    status: 'in_progress',
    message: 'My residence permit expires next month. Need assistance with renewal process.',
    createdDate: '2026-05-28T13:20:00',
    notes: 'Documents under review.',
    timeline: [
      {
        id: 't1',
        action: 'Inquiry submitted',
        user: 'System',
        timestamp: '2026-05-28T13:20:00',
      },
      {
        id: 't2',
        action: 'Status updated to In Progress',
        user: 'Giovanni Rossi',
        timestamp: '2026-05-28T14:00:00',
      },
    ],
  },
  {
    id: 'INQ-010',
    fullName: 'David Thompson',
    email: 'david.t@email.com',
    phone: '+39 345 012 3456',
    subject: 'Car Insurance Quote',
    objectType: 'General Inquiry',
    service: 'insurance',
    contactMethod: 'email',
    status: 'new',
    message: 'Looking for competitive car insurance rates for my new vehicle.',
    createdDate: '2026-05-30T11:00:00',
    timeline: [
      {
        id: 't1',
        action: 'Inquiry submitted',
        user: 'System',
        timestamp: '2026-05-30T11:00:00',
      },
    ],
  },
];

// Mock admin users
export const mockAdmins: AdminUser[] = [
  {
    id: '1',
    name: 'Giovanni Rossi',
    email: 'admin@amei.it',
    role: 'super_admin',
    status: 'active',
    phone: '+39 345 678 9012',
    lastLogin: '2026-05-30T09:15:00',
    createdDate: '2025-01-15T10:00:00',
  },
  {
    id: '2',
    name: 'Maria Bianchi',
    email: 'staff@amei.it',
    role: 'admin',
    status: 'active',
    phone: '+39 345 678 9013',
    lastLogin: '2026-05-30T08:30:00',
    createdDate: '2025-03-20T14:00:00',
  },
  {
    id: '3',
    name: 'Luca Ferrari',
    email: 'luca.ferrari@amei.it',
    role: 'admin',
    status: 'active',
    phone: '+39 345 678 9014',
    lastLogin: '2026-05-29T16:45:00',
    createdDate: '2025-06-10T09:30:00',
  },
  {
    id: '4',
    name: 'Sofia Romano',
    email: 'sofia.romano@amei.it',
    role: 'admin',
    status: 'inactive',
    phone: '+39 345 678 9015',
    lastLogin: '2026-05-15T12:00:00',
    createdDate: '2025-08-05T11:00:00',
  },
];

// Mock activity logs
export const mockActivityLogs: ActivityLog[] = [
  {
    id: 'LOG-001',
    administrator: 'Giovanni Rossi',
    action: 'inquiry_updated',
    description: 'Updated inquiry INQ-003 status to Resolved',
    date: '2026-05-29T16:30:00',
  },
  {
    id: 'LOG-002',
    administrator: 'Maria Bianchi',
    action: 'inquiry_updated',
    description: 'Updated inquiry INQ-002 status to In Progress',
    date: '2026-05-29T15:00:00',
  },
  {
    id: 'LOG-003',
    administrator: 'Giovanni Rossi',
    action: 'user_created',
    description: 'Created new admin user: Luca Ferrari',
    date: '2026-05-29T10:00:00',
  },
  {
    id: 'LOG-004',
    administrator: 'Maria Bianchi',
    action: 'inquiry_updated',
    description: 'Updated inquiry INQ-008 status to Resolved',
    date: '2026-05-28T14:00:00',
  },
  {
    id: 'LOG-005',
    administrator: 'Giovanni Rossi',
    action: 'inquiry_updated',
    description: 'Updated inquiry INQ-009 status to In Progress',
    date: '2026-05-28T14:00:00',
  },
  {
    id: 'LOG-006',
    administrator: 'Giovanni Rossi',
    action: 'inquiry_updated',
    description: 'Updated inquiry INQ-003 status to In Progress',
    date: '2026-05-28T10:00:00',
  },
  {
    id: 'LOG-007',
    administrator: 'Giovanni Rossi',
    action: 'user_updated',
    description: 'Updated user status for Sofia Romano to Inactive',
    date: '2026-05-27T15:30:00',
  },
  {
    id: 'LOG-008',
    administrator: 'Maria Bianchi',
    action: 'inquiry_updated',
    description: 'Updated inquiry INQ-004 status to In Progress',
    date: '2026-05-27T14:00:00',
  },
  {
    id: 'LOG-009',
    administrator: 'Giovanni Rossi',
    action: 'inquiry_updated',
    description: 'Updated inquiry INQ-007 status to In Progress',
    date: '2026-05-27T09:00:00',
  },
  {
    id: 'LOG-010',
    administrator: 'Maria Bianchi',
    action: 'inquiry_updated',
    description: 'Updated inquiry INQ-008 status to In Progress',
    date: '2026-05-25T11:00:00',
  },
];

// Dashboard statistics
export const getDashboardStats = () => {
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().getMonth();
  
  const todayInquiries = mockInquiries.filter(
    (inq) => inq.createdDate.split('T')[0] === today
  ).length;
  
  const thisMonthInquiries = mockInquiries.filter((inq) => {
    const inquiryMonth = new Date(inq.createdDate).getMonth();
    return inquiryMonth === currentMonth;
  }).length;

  return {
    total: mockInquiries.length,
    new: mockInquiries.filter((inq) => inq.status === 'new').length,
    inProgress: mockInquiries.filter((inq) => inq.status === 'in_progress').length,
    resolved: mockInquiries.filter((inq) => inq.status === 'resolved').length,
    today: todayInquiries,
    thisMonth: thisMonthInquiries,
  };
};

// Monthly inquiry data for charts
export const getMonthlyInquiryData = () => {
  return [
    { month: 'Jan', inquiries: 45 },
    { month: 'Feb', inquiries: 52 },
    { month: 'Mar', inquiries: 48 },
    { month: 'Apr', inquiries: 61 },
    { month: 'May', inquiries: 55 },
    { month: 'Jun', inquiries: 0 },
  ];
};

// Service distribution data for charts
export const getServiceDistribution = () => {
  const distribution: Record<ServiceType, number> = {
    immigration: 0,
    caf_patronato: 0,
    insurance: 0,
    business_consultancy: 0,
    training: 0,
    indian_consulate: 0,
    international_visas: 0,
    Other: 0,
  };

  mockInquiries.forEach((inquiry) => {
    distribution[inquiry.service]++;
  });

  return Object.entries(distribution).map(([service, count]) => ({
    name: serviceLabels[service as ServiceType],
    value: count,
  }));
};
