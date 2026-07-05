import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  FileText,
  Clock,
  CheckCircle2,
  TrendingUp,
  Calendar,
  ArrowRight,
  MoreVertical,
  Globe,
} from 'lucide-react';
import { serviceLabels, type Inquiry, type InquiryStatus } from '../utils/mockData';
import {
  getDashboardStatsApi,
  getEnquiryTypeChartApi,
  getInquiriesApi,
  getLastSixMonthsChartApi,
  getTopCountriesApi,
  updateInquiryStatusApi,
  type DashboardStatsResponse,
  type EnquiryTypeChartPoint,
  type MonthlyChartPoint,
  type TopCountryPoint,
} from '../services/inquiry.service';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';

const COLORS = ['#0B4D78', '#FF7A1A', '#22C55E', '#F59E0B', '#8B5CF6', '#3B82F6', '#EC4899', '#14B8A6'];

export default function Dashboard() {
  const { t, language } = useLanguage();
  const [dashboardStats, setDashboardStats] = useState<DashboardStatsResponse>({
    total: 0,
    new: 0,
    inProgress: 0,
    resolved: 0,
    today: 0,
    thisMonth: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyChartPoint[]>([]);
  const [serviceData, setServiceData] = useState<EnquiryTypeChartPoint[]>([]);
  const [recentInquiries, setRecentInquiries] = useState<Inquiry[]>([]);
  const [topCountries, setTopCountries] = useState<TopCountryPoint[]>([]);
  const [loadingRecentInquiries, setLoadingRecentInquiries] = useState(false);
  const [loadingDashboardData, setLoadingDashboardData] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoadingDashboardData(true);
      try {
        const [statsResponse, monthlyResponse, serviceResponse, topCountriesResponse] = await Promise.all([
          getDashboardStatsApi(),
          getLastSixMonthsChartApi(),
          getEnquiryTypeChartApi(),
          getTopCountriesApi(),
        ]);
        setDashboardStats(statsResponse);
        setMonthlyData(monthlyResponse);
        setServiceData(serviceResponse);
        setTopCountries(topCountriesResponse);
      } catch (error) {
        console.error('Failed to load dashboard data', error);
        setDashboardStats({ total: 0, new: 0, inProgress: 0, resolved: 0, today: 0, thisMonth: 0 });
        setMonthlyData([]);
        setServiceData([]);
        setTopCountries([]);
      } finally {
        setLoadingDashboardData(false);
      }
    };
    void fetchDashboardData();
  }, []);

  useEffect(() => {
    const fetchRecentInquiries = async () => {
      setLoadingRecentInquiries(true);
      try {
        const response = await getInquiriesApi({ page: 1, limit: 5, search: '' });
        setRecentInquiries(response.data);
      } catch (error) {
        console.error('Failed to load recent inquiries', error);
        setRecentInquiries([]);
      } finally {
        setLoadingRecentInquiries(false);
      }
    };
    void fetchRecentInquiries();
  }, []);

  const kpiCards = [
    {
      title: t('dashboard.totalInquiries'),
      value: loadingDashboardData ? '—' : dashboardStats.total,
      icon: FileText,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
    },
    {
      title: t('dashboard.newInquiries'),
      value: loadingDashboardData ? '—' : dashboardStats.new,
      icon: Clock,
      color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30',
    },
    {
      title: t('dashboard.inProgress'),
      value: loadingDashboardData ? '—' : dashboardStats.inProgress,
      icon: TrendingUp,
      color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30',
    },
    {
      title: t('dashboard.resolved'),
      value: loadingDashboardData ? '—' : dashboardStats.resolved,
      icon: CheckCircle2,
      color: 'text-green-600 bg-green-50 dark:bg-green-950/30',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400';
      case 'in_progress': return 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400';
      case 'resolved': return 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400';
    }
  };

  const formatStatus = (status: string) => {
    const map: Record<string, string> = {
      new: t('dashboard.statusNew'),
      in_progress: t('dashboard.statusInProgress'),
      resolved: t('dashboard.statusResolved'),
    };
    return map[status] ?? status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', { month: 'short', day: 'numeric' });

  const handleUpdateStatus = async (inquiryId: string, newStatus: InquiryStatus) => {
    const response = await updateInquiryStatusApi(inquiryId, newStatus);
    if (response.success) {
      setRecentInquiries(prev =>
        prev.map(inquiry => (inquiry.id === inquiryId ? { ...inquiry, status: newStatus } : inquiry))
      );
      toast.success(response.message);
      return;
    }
    toast.error(response.message);
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl tracking-tight mb-2">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground">{t('dashboard.subtitle')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} className="border-border">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  <p className="text-3xl font-semibold tracking-tight">{kpi.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${kpi.color} flex items-center justify-center`}>
                  <kpi.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('dashboard.todayInquiries')}</p>
                <p className="text-2xl font-semibold">{loadingDashboardData ? '—' : dashboardStats.today}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('dashboard.thisMonthInquiries')}</p>
                <p className="text-2xl font-semibold">{loadingDashboardData ? '—' : dashboardStats.thisMonth}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>{t('dashboard.monthlyTrend')}</CardTitle>
            <CardDescription>{t('dashboard.monthlyTrendDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorInquiries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0B4D78" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0B4D78" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--card-foreground)',
                  }}
                  labelStyle={{ color: 'var(--card-foreground)', fontWeight: 500 }}
                  itemStyle={{ color: 'var(--muted-foreground)' }}
                />
                <Area
                  type="monotone"
                  dataKey="inquiries"
                  stroke="#0B4D78"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorInquiries)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>{t('dashboard.serviceDistribution')}</CardTitle>
            <CardDescription>{t('dashboard.serviceDistributionDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {serviceData.length === 0 ? (
              <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-muted-foreground">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <FileText className="w-8 h-8 opacity-40" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{t('dashboard.noData')}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">{t('dashboard.noDataDesc')}</p>
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto scrollbar-thin pr-1" style={{ maxHeight: 300 }}>
                {(() => {
                  const total = serviceData.reduce((sum, d) => sum + d.value, 0);
                  const sorted = [...serviceData].sort((a, b) => b.value - a.value);
                  return sorted.map((entry, index) => {
                    const pct = total > 0 ? (entry.value / total) * 100 : 0;
                    const color = COLORS[index % COLORS.length];
                    return (
                      <div key={entry.name} className="group mb-3 last:mb-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-sm font-medium text-foreground truncate" title={entry.name}>
                              {entry.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            <span className="text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
                            <span
                              className="text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded-md"
                              style={{ backgroundColor: `${color}18`, color }}
                            >
                              {entry.value}
                            </span>
                          </div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Countries */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Globe className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{t('dashboard.topCountries')}</CardTitle>
                <CardDescription className="text-xs mt-0.5">{t('dashboard.topCountriesDesc')}</CardDescription>
              </div>
            </div>
            {topCountries.length > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                {topCountries.length} {topCountries.length === 1 ? t('dashboard.country') : t('dashboard.countries')}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loadingDashboardData ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-3 rounded bg-muted animate-pulse" />
                  <div className="w-28 h-3 rounded bg-muted animate-pulse" />
                  <div className="flex-1 h-1.5 rounded-full bg-muted animate-pulse" />
                  <div className="w-7 h-5 rounded bg-muted animate-pulse" />
                </div>
              ))}
            </div>
          ) : topCountries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
              <Globe className="w-8 h-8 opacity-20" />
              <p className="text-sm">{t('dashboard.noCountryData')}</p>
            </div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: `${5 * 44}px` }}>
              <div className="space-y-1">
                {topCountries.map((item, index) => {
                  const max = topCountries[0].count;
                  const pct = max > 0 ? (item.count / max) * 100 : 0;
                  const color = COLORS[index % COLORS.length];
                  return (
                    <div
                      key={item.country}
                      className="flex items-center gap-3 px-1 py-2.5 rounded-lg hover:bg-muted/40 transition-colors group"
                    >
                      <span className="text-xs text-muted-foreground tabular-nums w-4 text-right shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-foreground w-36 shrink-0 truncate" title={item.country}>
                        {item.country}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                      <span
                        className="text-xs font-semibold tabular-nums px-2 py-0.5 rounded-md shrink-0"
                        style={{ backgroundColor: `${color}18`, color }}
                      >
                        {item.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Inquiries Table */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('dashboard.recentInquiries')}</CardTitle>
            <CardDescription>{t('dashboard.recentInquiriesDesc')}</CardDescription>
          </div>
          <Link to="/inquiries">
            <Button variant="outline" size="sm">
              {t('dashboard.viewAll')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('dashboard.name')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('dashboard.email')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('dashboard.subject')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('dashboard.contactVia')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('dashboard.service')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('dashboard.status')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('dashboard.date')}</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">{t('dashboard.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loadingRecentInquiries ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      {t('dashboard.loading')}
                    </td>
                  </tr>
                ) : recentInquiries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      {t('dashboard.noRecentInquiries')}
                    </td>
                  </tr>
                ) : (
                  recentInquiries.map((inquiry) => (
                    <tr key={inquiry.id} className="border-b border-border last:border-0 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                      <td className="py-4 px-4">
                        <div className="font-semibold text-foreground">{inquiry.fullName}</div>
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">{inquiry.email}</td>
                      <td className="py-4 px-4 text-sm text-foreground">{inquiry.objectType}</td>
                      <td className="py-4 px-4 text-sm capitalize text-foreground">{inquiry.contactMethod}</td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-foreground">{serviceLabels[inquiry.service]}</span>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="secondary" className={`${getStatusColor(inquiry.status)} font-medium`}>
                          {formatStatus(inquiry.status)}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {formatDate(inquiry.createdDate)}
                      </td>
                      <td className="py-4 px-4 text-right">
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
                            {inquiry.status !== 'new' && (
                              <DropdownMenuItem
                                className="cursor-pointer text-blue-600 focus:bg-blue-50 focus:text-blue-700 dark:focus:bg-blue-950/40"
                                onClick={() => void handleUpdateStatus(inquiry.id, 'new')}
                              >
                                {t('dashboard.markNew')}
                              </DropdownMenuItem>
                            )}
                            {inquiry.status !== 'in_progress' && (
                              <DropdownMenuItem
                                className="cursor-pointer text-orange-600 focus:bg-orange-50 focus:text-orange-700 dark:focus:bg-orange-950/40"
                                onClick={() => void handleUpdateStatus(inquiry.id, 'in_progress')}
                              >
                                {t('dashboard.markInProgress')}
                              </DropdownMenuItem>
                            )}
                            {inquiry.status !== 'resolved' && (
                              <DropdownMenuItem
                                className="cursor-pointer text-green-600 focus:bg-green-50 focus:text-green-700 dark:focus:bg-green-950/40"
                                onClick={() => void handleUpdateStatus(inquiry.id, 'resolved')}
                              >
                                {t('dashboard.markResolved')}
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
    </div>
  );
}
