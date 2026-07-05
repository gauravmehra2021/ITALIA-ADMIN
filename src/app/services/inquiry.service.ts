import axiosInstance from './axios';
import type { Inquiry, ServiceType, InquiryStatus } from '../utils/mockData';

export interface GetInquiriesParams {
  page?: number;
  limit?: number;
  search?: string;
  country?: string;
}

interface ContactUsSubmission {
  _id: string;
  name?: string;
  surname?: string;
  email: string;
  telephone_number?: string;
  object_type?: number;
  service_of_interest?: number;
  preferred_contact_method?: number;
  message?: string;
  status?: number;
  is_read?: number;
  createdAt?: string;
  updatedAt?: string;
  assigned_employee?: { _id: string; admin_name: string; email: string } | null;
  country?: string;
}

interface ContactUsResponsePayload {
  count?: number;
  total?: number;
  page?: number;
  limit?: number;
  data?: ContactUsSubmission[];
}

interface ContactUsApiResponse {
  success: boolean;
  status: number;
  message: string;
  data?: ContactUsResponsePayload;
}

const serviceInterestMap: Record<number, ServiceType> = {
  0: 'immigration',
  1: 'caf_patronato',
  2: 'training',
  3: 'business_consultancy',
  4: 'insurance',
  5: 'indian_consulate',
  6: 'international_visas',
  7: 'Other',
};

const objectTypeMap: Record<number, string> = {
  0: 'Book an Appointment',
  1: 'Request Information',
  2: 'Document Assistance',
  3: 'Application Status',
  4: 'General Inquiry',
  5: 'Other',
};

const contactMethodMap: Record<number, Inquiry['contactMethod']> = {
  0: 'email',
  1: 'phone',
  2: 'whatsapp',
  3: 'inperson',
};

const statusFromNumber: Record<number, InquiryStatus> = {
  0: 'new',
  1: 'in_progress',
  2: 'resolved',
  3: 'archived',
};

const normalizeStatus = (status?: number): InquiryStatus => {
  return statusFromNumber[status ?? 0] ?? 'new';
};

const unwrapApiData = (payload: unknown): unknown => {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (record.data !== undefined) {
      return unwrapApiData(record.data);
    }
  }

  return payload;
};

const toNumber = (value: unknown): number => {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const getRecordValue = (record: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return undefined;
};

const mapSubmissionToInquiry = (submission: ContactUsSubmission): Inquiry => {
  const fullName = [submission.name, submission.surname].filter(Boolean).join(' ').trim();

  return {
    id: submission._id,
    fullName: fullName || submission.email,
    email: submission.email || '',
    phone: submission.telephone_number || '',
    subject: submission.message
      ? submission.message.slice(0, 60)
      : `Service request #${submission._id}`,
    objectType: objectTypeMap[submission.object_type ?? -1] ?? '—',
    service: serviceInterestMap[submission.service_of_interest ?? 0] ?? 'immigration',
    contactMethod:
      contactMethodMap[submission.preferred_contact_method ?? 0] ?? 'email',
    status: normalizeStatus(submission.status),
    message: submission.message || '',
    createdDate: submission.createdAt || submission.updatedAt || new Date().toISOString(),
    assignedTo: submission.assigned_employee ?? null,
    country: submission.country || '',
  };
};

export interface GetInquiriesResponse {
  data: Inquiry[];
  total: number;
  page: number;
  limit: number;
  count: number;
}

export interface DashboardStatsResponse {
  total: number;
  new: number;
  inProgress: number;
  resolved: number;
  today: number;
  thisMonth: number;
}

export interface MonthlyChartPoint {
  month: string;
  inquiries: number;
}

export interface EnquiryTypeChartPoint {
  name: string;
  value: number;
}

export interface InquiryActionResponse {
  success: boolean;
  message: string;
  inquiryId: string;
  status?: InquiryStatus;
}

export interface TopCountryPoint {
  country: string;
  count: number;
}

export const getTopCountriesApi = async (): Promise<TopCountryPoint[]> => {
  try {
    const response = await axiosInstance.get('/admin/contact-us/top-countries');
    const payload = unwrapApiData(response.data);
    const list = Array.isArray(payload) ? payload : Array.isArray((payload as any)?.data) ? (payload as any).data : [];
    return list.map((item: any) => ({
      country: String(item.country ?? item.name ?? item.label ?? 'Unknown'),
      count: toNumber(item.count ?? item.value ?? item.total ?? 0),
    }));
  } catch (error) {
    console.error('Failed to fetch top countries', error);
    return [];
  }
};

export const getInquiriesApi = async ({
  page = 1,
  limit = 10,
  search = '',
  country = '',
}: GetInquiriesParams): Promise<GetInquiriesResponse> => {
  const response = await axiosInstance.get<ContactUsApiResponse>('/admin/contact-us', {
    params: {
      page,
      limit,
      search,
      ...(country && { country }),
    },
  });

  // Handle both { success, data: { data: [...] } } and { count, total, data: [...] } shapes
  const raw = response.data as unknown as Record<string, unknown>;
  const payload: ContactUsResponsePayload =
    (raw?.data && typeof raw.data === 'object' && !Array.isArray(raw.data) && 'data' in (raw.data as object)
      ? raw.data
      : raw) as ContactUsResponsePayload;
  const submissions = Array.isArray(payload?.data) ? payload.data : [];

  return {
    data: submissions.map(mapSubmissionToInquiry),
    total: payload?.total ?? submissions.length,
    page: payload?.page ?? page,
    limit: payload?.limit ?? limit,
    count: payload?.count ?? submissions.length,
  };
};

export const getDashboardStatsApi = async (): Promise<DashboardStatsResponse> => {
  const response = await axiosInstance.get('/admin/dashboard');
  const payload = unwrapApiData(response.data);
  const record = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {};

  return {
    total: toNumber(getRecordValue(record, ['total_enquiries', 'total', 'totalInquiries', 'total_inquiries', 'count'])),
    new: toNumber(getRecordValue(record, ['new_enquiries', 'new', 'newInquiries', 'new_inquiries'])),
    inProgress: toNumber(getRecordValue(record, ['in_progress_enquiries', 'inProgress', 'in_progress', 'inProgressInquiries', 'in_progress_inquiries'])),
    resolved: toNumber(getRecordValue(record, ['resolved_enquiries', 'resolved', 'resolvedInquiries', 'resolved_inquiries'])),
    today: toNumber(getRecordValue(record, ['today_enquiries', 'today', 'todayInquiries', 'today_inquiries'])),
    thisMonth: toNumber(getRecordValue(record, ['this_month_enquiries', 'thisMonth', 'this_month', 'thisMonthInquiries', 'this_month_inquiries'])),
  };
};

export const getLastSixMonthsChartApi = async (): Promise<MonthlyChartPoint[]> => {
  const response = await axiosInstance.get('/admin/last-six-months-chart');
  const payload = unwrapApiData(response.data);

  if (Array.isArray(payload)) {
    return payload.map((item) => {
      const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      return {
        month: String(getRecordValue(record, ['month', 'label', 'name', 'period', 'date']) ?? 'Unknown'),
        inquiries: toNumber(getRecordValue(record, ['enquiries', 'inquiries', 'count', 'value', 'total', 'totalCount', 'total_count'])),
      };
    });
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const data = Array.isArray(record.data) ? record.data : [];

    return data.map((item) => {
      const entry = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      return {
        month: String(getRecordValue(entry, ['month', 'label', 'name', 'period', 'date']) ?? 'Unknown'),
        inquiries: toNumber(getRecordValue(entry, ['enquiries', 'inquiries', 'count', 'value', 'total', 'totalCount', 'total_count'])),
      };
    });
  }

  return [];
};

export const getEnquiryTypeChartApi = async (): Promise<EnquiryTypeChartPoint[]> => {
  const response = await axiosInstance.get('/admin/enquiry-type-chart');
  const payload = unwrapApiData(response.data);

  if (Array.isArray(payload)) {
    return payload.map((item) => {
      const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      return {
        name: String(getRecordValue(record, ['name', 'label', 'service', 'serviceName', 'service_name', 'type']) ?? 'Unknown'),
        value: toNumber(getRecordValue(record, ['value', 'count', 'total', 'inquiries', 'totalCount', 'total_count'])),
      };
    });
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const data = Array.isArray(record.data) ? record.data : [];

    return data.map((item) => {
      const entry = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      return {
        name: String(getRecordValue(entry, ['name', 'label', 'service', 'serviceName', 'service_name', 'type']) ?? 'Unknown'),
        value: toNumber(getRecordValue(entry, ['value', 'count', 'total', 'inquiries', 'totalCount', 'total_count'])),
      };
    });
  }

  return [];
};

const statusToNumber: Record<InquiryStatus, number> = {
  new: 0,
  in_progress: 1,
  resolved: 2,
  archived: 2,
};

export const updateInquiryStatusApi = async (
  inquiryId: string,
  status: InquiryStatus,
): Promise<InquiryActionResponse> => {
  try {
    const response = await axiosInstance.patch<ContactUsApiResponse>(`/admin/contact-us/${inquiryId}/status`, {
      status: statusToNumber[status],
    });

    return {
      success: response?.data?.success ?? true,
      message: response?.data?.message ?? 'Inquiry status updated',
      inquiryId,
      status,
    };
  } catch (error) {
    console.error('Failed to update inquiry status', error);
    return {
      success: false,
      message: 'Failed to update inquiry status',
      inquiryId,
      status,
    };
  }
};

export interface VisitorCountryStat {
  country: string;
  count: number;
}

export interface GetVisitorStatsParams {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface GetVisitorStatsResponse {
  data: VisitorCountryStat[];
  total: number;
}

export const getVisitorCountryStatsApi = async (params: GetVisitorStatsParams): Promise<GetVisitorStatsResponse> => {
  try {
    const response = await axiosInstance.get('/admin/visitors/country-stats', { params });
    const payload = unwrapApiData(response.data);
    const list = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as any)?.data)
      ? (payload as any).data
      : [];
    const total = toNumber((payload as any)?.total ?? list.length);
    return {
      data: list.map((item: any) => ({
        country: String(item.country ?? item.name ?? item.label ?? 'Unknown'),
        count: toNumber(item.count ?? item.value ?? item.total ?? 0),
      })),
      total,
    };
  } catch (error) {
    console.error('Failed to fetch visitor country stats', error);
    return { data: [], total: 0 };
  }
};

export const assignInquiryApi = async (inquiryId: string, employee_id: string): Promise<InquiryActionResponse> => {
  try {
    const response = await axiosInstance.patch<ContactUsApiResponse>(`/admin/contact-us/${inquiryId}/assign`, { employee_id });
    return {
      success: response?.data?.success ?? true,
      message: response?.data?.message ?? 'Inquiry assigned successfully',
      inquiryId,
    };
  } catch (error) {
    console.error('Failed to assign inquiry', error);
    return {
      success: false,
      message: 'Failed to assign inquiry',
      inquiryId,
    };
  }
};

export interface HistoryEvent {
  _id: string;
  event_type: string;
  actor_id: { _id: string; admin_name: string; email: string; role: number };
  description: string;
  created_at: string;
}

export interface InquiryNote {
  _id: string;
  contact_us_id: string;
  employee_id: { _id: string; admin_name: string; email: string };
  note: string;
  createdAt: string;
}

export const getInquiryNotesApi = async (inquiryId: string): Promise<InquiryNote[]> => {
  try {
    const response = await axiosInstance.get(`/admin/contact-us/${inquiryId}/notes`);
    return response?.data?.data ?? [];
  } catch (error) {
    console.error('Failed to fetch notes', error);
    return [];
  }
};

export const addInquiryNoteApi = async (contact_us_id: string, employee_id: string, note: string) => {
  const response = await axiosInstance.post('/admin/contact-us/notes', { contact_us_id, employee_id, note });
  return response.data;
};

export const getInquiryHistoryApi = async (inquiryId: string): Promise<HistoryEvent[]> => {
  try {
    const response = await axiosInstance.get(`/admin/contact-us/${inquiryId}/history`);
    return response?.data?.data ?? [];
  } catch (error) {
    console.error('Failed to fetch inquiry history', error);
    return [];
  }
};

export const deleteInquiryApi = async (inquiryId: string): Promise<InquiryActionResponse> => {
  try {
    const response = await axiosInstance.delete<ContactUsApiResponse>(`/admin/contact-us/${inquiryId}`);

    return {
      success: response?.data?.success ?? true,
      message: response?.data?.message ?? 'Inquiry deleted successfully',
      inquiryId,
    };
  } catch (error) {
    console.error('Failed to delete inquiry', error);
    return {
      success: false,
      message: 'Failed to delete inquiry',
      inquiryId,
    };
  }
};
