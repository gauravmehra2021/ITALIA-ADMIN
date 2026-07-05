import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../components/ui/command';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import {
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  FileText,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Globe,
  Check,
  ChevronsUpDown,
  X,
} from 'lucide-react';
import { assignInquiryApi, deleteInquiryApi, getInquiriesApi, updateInquiryStatusApi } from '../services/inquiry.service';
import { getEmployeesApi } from '../services/auth.service';
import { serviceLabels, type Inquiry, type InquiryStatus } from '../utils/mockData';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Argentina','Armenia','Australia','Austria','Azerbaijan',
  'Bahrain','Bangladesh','Belarus','Belgium','Belize','Benin','Bolivia','Bosnia and Herzegovina','Brazil','Bulgaria',
  'Burkina Faso','Burundi','Cambodia','Cameroon','Canada','Chile','China','Colombia','Congo','Croatia',
  'Cuba','Cyprus','Czech Republic','Denmark','Dominican Republic','Ecuador','Egypt','El Salvador','Estonia','Ethiopia',
  'Finland','France','Georgia','Germany','Ghana','Greece','Guatemala','Guinea','Haiti','Honduras',
  'Hungary','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Ivory Coast','Jamaica',
  'Japan','Jordan','Kazakhstan','Kenya','Kosovo','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon',
  'Libya','Lithuania','Luxembourg','Madagascar','Malaysia','Mali','Malta','Mexico','Moldova','Mongolia',
  'Montenegro','Morocco','Mozambique','Myanmar','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria',
  'North Macedonia','Norway','Pakistan','Palestine','Panama','Paraguay','Peru','Philippines','Poland','Portugal',
  'Qatar','Romania','Russia','Rwanda','Saudi Arabia','Senegal','Serbia','Sierra Leone','Slovakia','Slovenia',
  'Somalia','South Africa','South Korea','Spain','Sri Lanka','Sudan','Sweden','Switzerland','Syria','Taiwan',
  'Tajikistan','Tanzania','Thailand','Togo','Tunisia','Turkey','Turkmenistan','Uganda','Ukraine','United Arab Emirates',
  'United Kingdom','United States','Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe'
];

export default function Inquiries() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const isEmployee = user?.role === 'employee';
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const prevSearchRef = useRef(searchTerm);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [countryOpen, setCountryOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inquiryToDelete, setInquiryToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalInquiries, setTotalInquiries] = useState(0);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignInquiryId, setAssignInquiryId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<{ _id: string; admin_name: string; email: string }[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [empSearch, setEmpSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    const fetchInquiries = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getInquiriesApi({ page, limit, search: searchTerm.trim(), country: countryFilter });
        setInquiries(response.data);
        setTotalInquiries(response.total);
      } catch (err) {
        console.error(err);
        setError(t('inquiries.failedLoad'));
      } finally {
        setLoading(false);
      }
    };
    fetchInquiries();
  }, [page, limit, searchTerm, countryFilter]);

  useEffect(() => {
    if (prevSearchRef.current !== searchTerm) {
      prevSearchRef.current = searchTerm;
      setPage(1);
    }
  }, [searchTerm]);

  const prevCountryRef = useRef(countryFilter);
  useEffect(() => {
    if (prevCountryRef.current !== countryFilter) {
      prevCountryRef.current = countryFilter;
      setPage(1);
    }
  }, [countryFilter]);

  const totalPages = Math.ceil(totalInquiries / limit);

  const filteredInquiries = inquiries.filter((inquiry) => {
    const matchesSearch =
      inquiry.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inquiry.status === statusFilter;
    const matchesService = serviceFilter === 'all' || inquiry.service === serviceFilter;
    return matchesSearch && matchesStatus && matchesService;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400';
      case 'in_progress': return 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400';
      case 'resolved': return 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400';
      case 'archived': return 'bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400';
    }
  };

  const formatStatus = (status: string) => {
    const map: Record<string, string> = {
      new: t('inquiries.statusNew'),
      in_progress: t('inquiries.statusInProgress'),
      resolved: t('inquiries.statusResolved'),
      archived: t('inquiries.statusArchived'),
    };
    return map[status] ?? status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

  const handleViewDetails = (inquiry: Inquiry) => {
    navigate(`/inquiries/${inquiry.id}`, { state: { inquiry } });
  };

  const handleUpdateStatus = async (inquiryId: string, newStatus: InquiryStatus) => {
    const response = await updateInquiryStatusApi(inquiryId, newStatus);
    if (response.success) {
      setInquiries(prev => prev.map(inq => inq.id === inquiryId ? { ...inq, status: newStatus } : inq));
      toast.success(response.message);
      return;
    }
    toast.error(response.message);
  };

  const handleDeleteClick = (inquiryId: string) => {
    setInquiryToDelete(inquiryId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!inquiryToDelete) return;
    const response = await deleteInquiryApi(inquiryToDelete);
    if (response.success) {
      setInquiries(prev => prev.filter(inq => inq.id !== inquiryToDelete));
      toast.success(response.message);
      setDeleteDialogOpen(false);
      setInquiryToDelete(null);
      return;
    }
    toast.error(response.message);
  };

  const handleOpenAssign = async (inquiryId: string) => {
    setAssignInquiryId(inquiryId);
    setAssignModalOpen(true);
    setEmpSearch('');
    if (employees.length === 0) {
      try {
        setEmployeesLoading(true);
        const res = await getEmployeesApi();
        setEmployees(res?.data || []);
      } catch {
        toast.error(t('inquiries.failedLoadEmployees'));
      } finally {
        setEmployeesLoading(false);
      }
    }
  };

  const handleAssign = async (employeeId: string) => {
    if (!assignInquiryId) return;
    setAssigningId(employeeId);
    const response = await assignInquiryApi(assignInquiryId, employeeId);
    if (response.success) {
      const emp = employees.find((e) => e._id === employeeId);
      setInquiries((prev) =>
        prev.map((inq) =>
          inq.id === assignInquiryId
            ? { ...inq, assignedTo: emp ? { _id: emp._id, admin_name: emp.admin_name, email: emp.email } : inq.assignedTo }
            : inq
        )
      );
      toast.success(response.message);
      setAssignModalOpen(false);
      setAssignInquiryId(null);
    } else {
      toast.error(response.message);
    }
    setAssigningId(null);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl tracking-tight mb-2">{t('inquiries.title')}</h1>
        <p className="text-muted-foreground">{t('inquiries.subtitle')}</p>
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('inquiries.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Popover open={countryOpen} onOpenChange={setCountryOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  role="combobox"
                  aria-expanded={countryOpen}
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <span className={`flex items-center gap-2 ${!countryFilter ? 'text-muted-foreground' : ''}`}>
                    <Globe className="w-4 h-4 shrink-0" />
                    {countryFilter || t('inquiries.filterByCountry')}
                  </span>
                  {countryFilter ? (
                    <X
                      className="w-4 h-4 shrink-0 opacity-50 hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); setCountryFilter(''); }}
                    />
                  ) : (
                    <ChevronsUpDown className="w-4 h-4 shrink-0 opacity-50" />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder={t('inquiries.filterByCountry')} />
                  <CommandList>
                    <CommandEmpty>{t('inquiries.noCountryFound')}</CommandEmpty>
                    <CommandGroup>
                      <CommandItem value="" onSelect={() => { setCountryFilter(''); setCountryOpen(false); }}>
                        <Check className={`w-4 h-4 mr-2 ${!countryFilter ? 'opacity-100' : 'opacity-0'}`} />
                        {t('inquiries.allCountries')}
                      </CommandItem>
                      {COUNTRIES.map((country) => (
                        <CommandItem
                          key={country}
                          value={country}
                          onSelect={() => { setCountryFilter(country === countryFilter ? '' : country); setCountryOpen(false); }}
                        >
                          <Check className={`w-4 h-4 mr-2 ${countryFilter === country ? 'opacity-100' : 'opacity-0'}`} />
                          {country}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          {t('inquiries.showing')} {filteredInquiries.length} {t('inquiries.of')} {totalInquiries} {t('inquiries.inquiriesCount')}
        </p>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">{t('inquiries.loadingInquiries')}</p>
        ) : null}
      </div>

      {/* Inquiries Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-4 px-6 text-sm font-medium">{t('inquiries.name')}</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">{t('inquiries.phone')}</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">{t('inquiries.email')}</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">{t('inquiries.contactVia')}</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">{t('inquiries.country')}</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">{t('inquiries.service')}</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">{t('inquiries.status')}</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">{t('inquiries.assignedTo')}</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">{t('inquiries.date')}</th>
                  <th className="text-right py-4 px-6 text-sm font-medium">{t('inquiries.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredInquiries.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-12 h-12 text-muted-foreground/50" />
                        <p className="text-muted-foreground">{t('inquiries.noInquiries')}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredInquiries.map((inquiry) => (
                    <tr
                      key={inquiry.id}
                      className="border-b border-border last:border-0 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/40"
                    >
                      <td className="py-4 px-6">
                        <div className="font-semibold text-foreground">{inquiry.fullName}</div>
                      </td>
                      <td className="py-4 px-6 text-sm text-muted-foreground">{inquiry.phone || '—'}</td>
                      <td className="py-4 px-6 text-sm text-muted-foreground">{inquiry.email}</td>
                      <td className="py-4 px-6 text-sm capitalize text-foreground">{inquiry.contactMethod}</td>
                      <td className="py-4 px-6 text-sm text-foreground">{inquiry.country || '—'}</td>
                      <td className="py-4 px-6 text-sm text-foreground">{serviceLabels[inquiry.service]}</td>
                      <td className="py-4 px-6">
                        <Badge variant="secondary" className={`${getStatusColor(inquiry.status)} font-medium`}>
                          {formatStatus(inquiry.status)}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-sm">
                        {inquiry.assignedTo ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0">
                              {inquiry.assignedTo.admin_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <span className="truncate max-w-[120px]" title={inquiry.assignedTo.admin_name}>
                              {inquiry.assignedTo.admin_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-sm text-muted-foreground">{formatDate(inquiry.createdDate)}</td>
                      <td className="py-4 px-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-transparent text-muted-foreground transition-all hover:border-border hover:bg-accent hover:text-accent-foreground"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => handleViewDetails(inquiry)} className="cursor-pointer">
                              <Eye className="w-4 h-4 mr-2" />
                              {t('inquiries.viewDetails')}
                            </DropdownMenuItem>
                            {!isEmployee && (
                              <DropdownMenuItem onClick={() => handleOpenAssign(inquiry.id)} className="cursor-pointer">
                                <UserCheck className="w-4 h-4 mr-2" />
                                {t('inquiries.assign')}
                              </DropdownMenuItem>
                            )}
                            {inquiry.status !== 'new' && (
                              <DropdownMenuItem onClick={() => void handleUpdateStatus(inquiry.id, 'new')} className="cursor-pointer text-blue-600 focus:bg-blue-50 focus:text-blue-700 dark:focus:bg-blue-950/40">
                                <Edit className="w-4 h-4 mr-2" />
                                {t('inquiries.markNew')}
                              </DropdownMenuItem>
                            )}
                            {inquiry.status !== 'in_progress' && (
                              <DropdownMenuItem onClick={() => void handleUpdateStatus(inquiry.id, 'in_progress')} className="cursor-pointer text-orange-600 focus:bg-orange-50 focus:text-orange-700 dark:focus:bg-orange-950/40">
                                <Edit className="w-4 h-4 mr-2" />
                                {t('inquiries.markInProgress')}
                              </DropdownMenuItem>
                            )}
                            {inquiry.status !== 'resolved' && (
                              <DropdownMenuItem onClick={() => void handleUpdateStatus(inquiry.id, 'resolved')} className="cursor-pointer text-green-600 focus:bg-green-50 focus:text-green-700 dark:focus:bg-green-950/40">
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                {t('inquiries.markResolved')}
                              </DropdownMenuItem>
                            )}
                            {!isEmployee && (
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(inquiry.id)}
                                className="cursor-pointer text-destructive focus:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t('inquiries.delete')}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t('inquiries.page')} {page} {t('inquiries.of')} {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" />
              {t('inquiries.previous')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
              {t('inquiries.next')}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Assign Employee Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('inquiries.assignInquiry')}</DialogTitle>
            <DialogDescription>{t('inquiries.assignDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('inquiries.searchEmployees')}
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
              {employeesLoading ? (
                <p className="text-center text-sm text-muted-foreground py-6">{t('inquiries.loadingEmployees')}</p>
              ) : employees.filter(
                  (e) =>
                    e.admin_name.toLowerCase().includes(empSearch.toLowerCase()) ||
                    e.email.toLowerCase().includes(empSearch.toLowerCase())
                ).length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">{t('inquiries.noEmployees')}</p>
              ) : (
                employees
                  .filter(
                    (e) =>
                      e.admin_name.toLowerCase().includes(empSearch.toLowerCase()) ||
                      e.email.toLowerCase().includes(empSearch.toLowerCase())
                  )
                  .map((emp) => (
                    <button
                      key={emp._id}
                      onClick={() => handleAssign(emp._id)}
                      disabled={assigningId === emp._id}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left disabled:opacity-60"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0">
                        {emp.admin_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{emp.admin_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                      </div>
                      {assigningId === emp._id && (
                        <span className="text-xs text-muted-foreground">{t('inquiries.assigning')}</span>
                      )}
                    </button>
                  ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inquiries.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('inquiries.deleteConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('inquiries.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('inquiries.confirmDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
