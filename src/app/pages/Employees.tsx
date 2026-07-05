import { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { getEmployeesApi } from '../services/auth.service';
import { useLanguage } from '../contexts/LanguageContext';

interface Employee {
  _id: string;
  admin_name: string;
  email: string;
  country_code?: string;
  phone_number?: string;
  role: string;
  createdAt?: string;
}

export default function Employees() {
  const { t, language } = useLanguage();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await getEmployeesApi();
        setEmployees(res?.data || []);
      } catch (error: any) {
        toast.error(error?.response?.data?.message || t('employees.loading'));
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  const filtered = employees.filter(
    (e) =>
      e.admin_name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase();

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl tracking-tight mb-2">{t('employees.title')}</h1>
        <p className="text-muted-foreground">{t('employees.subtitle')}</p>
      </div>

      <Card className="border-border">
        <CardContent className="p-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('employees.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        {t('employees.showing')} {filtered.length} {t('employees.of')} {employees.length} {t('employees.employeesCount')}
      </p>

      <Card className="border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">{t('employees.loading')}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">{t('employees.noEmployees')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-4 px-6 text-sm font-medium">{t('employees.employee')}</th>
                    <th className="text-left py-4 px-6 text-sm font-medium">{t('employees.email')}</th>
                    <th className="text-left py-4 px-6 text-sm font-medium">{t('employees.phone')}</th>
                    <th className="text-left py-4 px-6 text-sm font-medium">{t('employees.role')}</th>
                    <th className="text-left py-4 px-6 text-sm font-medium">{t('employees.created')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((emp) => (
                    <tr
                      key={emp._id}
                      className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {getInitials(emp.admin_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{emp.admin_name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-muted-foreground">{emp.email}</td>
                      <td className="py-4 px-6 text-sm text-muted-foreground">
                        {emp.country_code || emp.phone_number
                          ? `${emp.country_code ?? ''} ${emp.phone_number ?? ''}`.trim()
                          : '—'}
                      </td>
                      <td className="py-4 px-6">
                        <Badge
                          variant="secondary"
                          className="bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                        >
                          {emp.role}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-sm text-muted-foreground">
                        {formatDate(emp.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
