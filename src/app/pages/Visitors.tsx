import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Search, Globe, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getVisitorCountryStatsApi, type VisitorCountryStat } from '../services/inquiry.service';
import { useLanguage } from '../contexts/LanguageContext';

const COLORS = ['#0B4D78', '#FF7A1A', '#22C55E', '#F59E0B', '#8B5CF6', '#3B82F6', '#EC4899', '#14B8A6'];

const PAGE_LIMIT = 20;

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function Visitors() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<VisitorCountryStat[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 400);
  const prevFilters = useRef({ debouncedSearch, startDate, endDate });

  useEffect(() => {
    const filtersChanged =
      prevFilters.current.debouncedSearch !== debouncedSearch ||
      prevFilters.current.startDate !== startDate ||
      prevFilters.current.endDate !== endDate;
    if (filtersChanged) {
      prevFilters.current = { debouncedSearch, startDate, endDate };
      setPage(1);
    }
  }, [debouncedSearch, startDate, endDate]);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const res = await getVisitorCountryStatsApi({
        page,
        limit: PAGE_LIMIT,
        search: debouncedSearch || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setData(res.data);
      setTotal(res.total);
      setLoading(false);
    };
    void fetch();
  }, [page, debouncedSearch, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const maxCount = data.length > 0 ? Math.max(...data.map((d) => d.count)) : 1;

  const clearFilters = () => {
    setSearch('');
    setStartDate('');
    setEndDate('');
  };

  const hasFilters = search || startDate || endDate;

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl tracking-tight mb-2">{t('visitors.title')}</h1>
        <p className="text-muted-foreground">{t('visitors.subtitle')}</p>
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('visitors.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <label className="text-xs text-muted-foreground absolute -top-2 left-3 bg-background px-1">
                {t('visitors.startDate')}
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="relative">
              <label className="text-xs text-muted-foreground absolute -top-2 left-3 bg-background px-1">
                {t('visitors.endDate')}
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          {hasFilters && (
            <div className="mt-3 flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground gap-1.5">
                <X className="w-3.5 h-3.5" />
                {t('visitors.clearFilters')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('visitors.showing')} {data.length} {t('visitors.of')} {total} {t('visitors.countriesCount')}
        </p>
        {loading && <p className="text-sm text-muted-foreground">{t('visitors.loading')}</p>}
      </div>

      {/* Chart */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle>{t('visitors.chartTitle')}</CardTitle>
              <CardDescription>{t('visitors.chartDesc')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-3 rounded bg-muted animate-pulse" />
                  <div className="w-32 h-3 rounded bg-muted animate-pulse" />
                  <div className="flex-1 h-2 rounded-full bg-muted animate-pulse" />
                  <div className="w-10 h-5 rounded bg-muted animate-pulse" />
                </div>
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                <Globe className="w-8 h-8 opacity-40" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">{t('visitors.noData')}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">{t('visitors.noDataDesc')}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {data.map((item, index) => {
                const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                const color = COLORS[index % COLORS.length];
                return (
                  <div
                    key={item.country}
                    className="flex items-center gap-3 px-1 py-2.5 rounded-lg hover:bg-muted/40 transition-colors group"
                  >
                    <span className="text-xs text-muted-foreground tabular-nums w-5 text-right shrink-0">
                      {(page - 1) * PAGE_LIMIT + index + 1}
                    </span>
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span
                      className="text-sm font-medium text-foreground w-40 shrink-0 truncate"
                      title={item.country}
                    >
                      {item.country}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-muted/60 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, pct > 0 ? 1 : 0)}%`, backgroundColor: color }}
                      />
                    </div>
                    <span
                      className="text-xs font-semibold tabular-nums px-2 py-0.5 rounded-md shrink-0 min-w-[2.5rem] text-center"
                      style={{ backgroundColor: `${color}18`, color }}
                    >
                      {item.count.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t('visitors.page')} {page} {t('visitors.of')} {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" />
              {t('visitors.previous')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
              {t('visitors.next')}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
