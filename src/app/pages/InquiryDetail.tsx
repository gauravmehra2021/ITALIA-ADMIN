import { useNavigate, useLocation } from 'react-router';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { ArrowLeft, User, FileText, Mail, Phone, Calendar, UserCheck, Clock, StickyNote, Send } from 'lucide-react';
import { serviceLabels, type Inquiry, type InquiryStatus } from '../utils/mockData';
import { getInquiryHistoryApi, getInquiryNotesApi, addInquiryNoteApi, updateInquiryStatusApi, type HistoryEvent, type InquiryNote } from '../services/inquiry.service';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

export default function InquiryDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const inquiry = location.state?.inquiry as Inquiry | undefined;
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [status, setStatus] = useState<InquiryStatus>(inquiry?.status ?? 'new');
  const [notesList, setNotesList] = useState<InquiryNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (!inquiry) return;
    getInquiryNotesApi(inquiry.id).then((data) => {
      setNotesList(data);
      setNotesLoading(false);
    });
    getInquiryHistoryApi(inquiry.id).then((data) => {
      setHistory(data);
      setHistoryLoading(false);
    });
  }, [inquiry?.id]);

  if (!inquiry) {
    return (
      <div className="p-6 lg:p-8">
        <Button variant="outline" onClick={() => navigate('/inquiries')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> {t('inquiryDetail.backToInquiries')}
        </Button>
        <p className="mt-6 text-muted-foreground">{t('inquiryDetail.notFound')}</p>
      </div>
    );
  }

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'new': return 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400';
      case 'in_progress': return 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400';
      case 'resolved': return 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400';
    }
  };

  const formatStatus = (s: string) => {
    const map: Record<string, string> = {
      new: t('inquiryDetail.new'),
      in_progress: t('inquiryDetail.inProgress'),
      resolved: t('inquiryDetail.resolved'),
    };
    return map[s] ?? s.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  const formatHistoryDescription = (description: string) => {
    const statusMap: Record<string, string> = {
      '0': t('inquiryDetail.statusNew'),
      '1': t('inquiryDetail.statusInProgress'),
      '2': t('inquiryDetail.statusResolved'),
      '3': t('inquiryDetail.statusArchived'),
    };
    return description.replace(/Status changed to (\d+)/i, (_, num) =>
      `${t('inquiryDetail.statusChangedTo')} ${statusMap[num] ?? num}`
    );
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return;
    try {
      setAddingNote(true);
      await addInquiryNoteApi(inquiry.id, user.id, newNote.trim());
      setNewNote('');
      const updated = await getInquiryNotesApi(inquiry.id);
      setNotesList(updated);
      toast.success(t('inquiryDetail.toastNoteAdded'));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('inquiryDetail.toastNoteError'));
    } finally {
      setAddingNote(false);
    }
  };

  const handleStatusChange = async (newStatus: InquiryStatus) => {
    const response = await updateInquiryStatusApi(inquiry.id, newStatus);
    if (response.success) {
      setStatus(newStatus);
      toast.success(response.message);
      getInquiryHistoryApi(inquiry.id).then(setHistory);
    } else {
      toast.error(response.message);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/inquiries')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> {t('inquiryDetail.back')}
        </Button>
        <div>
          <h1 className="text-3xl tracking-tight">{t('inquiryDetail.title')}</h1>
          <p className="text-muted-foreground">{t('inquiryDetail.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <Card className="border-border">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> {t('inquiryDetail.customerInfo')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">{t('inquiryDetail.fullName')}</p>
                  <p className="font-medium">{inquiry.fullName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">{t('inquiryDetail.email')}</p>
                  <a href={`mailto:${inquiry.email}`} className="text-primary hover:underline flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {inquiry.email}
                  </a>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">{t('inquiryDetail.phone')}</p>
                  <a href={`tel:${inquiry.phone}`} className="text-primary hover:underline flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {inquiry.phone || '—'}
                  </a>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">{t('inquiryDetail.preferredContact')}</p>
                  <p className="capitalize">{inquiry.contactMethod}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inquiry Details */}
          <Card className="border-border">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> {t('inquiryDetail.inquiryDetails')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">{t('inquiryDetail.service')}</p>
                  <p>{serviceLabels[inquiry.service]}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">{t('inquiryDetail.objectType')}</p>
                  <p>{inquiry.objectType || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">{t('inquiryDetail.submittedOn')}</p>
                  <p className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-muted-foreground" /> {formatDate(inquiry.createdDate)}
                  </p>
                </div>
                {inquiry.assignedTo && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">{t('inquiryDetail.assignedTo')}</p>
                    <p className="flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-muted-foreground" /> {inquiry.assignedTo.admin_name}
                    </p>
                  </div>
                )}
              </div>
              {inquiry.message && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">{t('inquiryDetail.message')}</p>
                  <p className="text-sm leading-relaxed rounded-lg bg-muted/50 p-3">{inquiry.message}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="border-border">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-primary" /> {t('inquiryDetail.internalNotes')}
              </h3>
              <div className="flex gap-2">
                <Textarea
                  placeholder={t('inquiryDetail.addNotePlaceholder')}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={2}
                  className="flex-1 resize-none"
                />
                <Button size="sm" onClick={handleAddNote} disabled={addingNote || !newNote.trim()} className="self-end">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              {notesLoading ? (
                <p className="text-sm text-muted-foreground">{t('inquiryDetail.loadingNotes')}</p>
              ) : notesList.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('inquiryDetail.noNotes')}</p>
              ) : (
                <div className="space-y-3">
                  {notesList.map((n) => (
                    <div key={n._id} className="rounded-lg bg-muted/50 p-3 space-y-1">
                      <p className="text-sm">{n.note}</p>
                      <p className="text-xs text-muted-foreground">
                        {n.employee_id?.admin_name} · {formatDate(n.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right — status sidebar */}
        <div className="space-y-6">
          <Card className="border-border">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{t('inquiryDetail.status')}</h3>
                <Badge variant="secondary" className={`${getStatusColor(status)} font-medium`}>
                  {formatStatus(status)}
                </Badge>
              </div>
              <Select value={status} onValueChange={(v) => void handleStatusChange(v as InquiryStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">{t('inquiryDetail.new')}</SelectItem>
                  <SelectItem value="in_progress">{t('inquiryDetail.inProgress')}</SelectItem>
                  <SelectItem value="resolved">{t('inquiryDetail.resolved')}</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* History */}
          <Card className="border-border">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> {t('inquiryDetail.history')}
              </h3>
              {historyLoading ? (
                <p className="text-sm text-muted-foreground">{t('inquiryDetail.loadingHistory')}</p>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('inquiryDetail.noHistory')}</p>
              ) : (
                <div className="space-y-0">
                  {history.map((event, idx) => (
                    <div key={event._id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1 shrink-0" />
                        {idx < history.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium">{formatHistoryDescription(event.description)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {event.actor_id?.admin_name} · {formatDate(event.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
