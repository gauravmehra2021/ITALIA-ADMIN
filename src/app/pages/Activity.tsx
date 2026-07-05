import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Search, Activity as ActivityIcon, User, FileText, Shield } from 'lucide-react';
import { mockActivityLogs } from '../utils/mockData';
import { useLanguage } from '../contexts/LanguageContext';

export default function Activity() {
  const { t, language } = useLanguage();
  const [logs] = useState(mockActivityLogs);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.administrator.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case 'inquiry_updated': return 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400';
      case 'user_created': return 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400';
      case 'user_updated': return 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400';
      case 'user_deleted': return 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'inquiry_updated': return FileText;
      case 'user_created':
      case 'user_updated':
      case 'user_deleted': return User;
      default: return ActivityIcon;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'inquiry_updated': return t('activity.inquiryUpdated');
      case 'user_created': return t('activity.userCreated');
      case 'user_updated': return t('activity.userUpdated');
      case 'user_deleted': return t('activity.userDeleted');
      default: return action.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl tracking-tight mb-2">{t('activity.title')}</h1>
        <p className="text-muted-foreground">{t('activity.subtitle')}</p>
      </div>

      <Card className="border-border">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('activity.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('activity.filterByAction')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('activity.allActions')}</SelectItem>
                <SelectItem value="inquiry_updated">{t('activity.inquiryUpdated')}</SelectItem>
                <SelectItem value="user_created">{t('activity.userCreated')}</SelectItem>
                <SelectItem value="user_updated">{t('activity.userUpdated')}</SelectItem>
                <SelectItem value="user_deleted">{t('activity.userDeleted')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('activity.showing')} {filteredLogs.length} {t('activity.of')} {logs.length} {t('activity.activitiesCount')}
        </p>
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-4 px-6 text-sm font-medium">{t('activity.administrator')}</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">{t('activity.action')}</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">{t('activity.description')}</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">{t('activity.dateTime')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <ActivityIcon className="w-12 h-12 text-muted-foreground/50" />
                        <p className="text-muted-foreground">{t('activity.noLogs')}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const ActionIcon = getActionIcon(log.action);
                    return (
                      <tr
                        key={log.id}
                        className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Shield className="w-4 h-4 text-primary" />
                            </div>
                            <span className="font-medium">{log.administrator}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <Badge
                            variant="secondary"
                            className={`${getActionColor(log.action)} flex items-center gap-1.5 w-fit`}
                          >
                            <ActionIcon className="w-3 h-3" />
                            {getActionLabel(log.action)}
                          </Badge>
                        </td>
                        <td className="py-4 px-6 text-sm">{log.description}</td>
                        <td className="py-4 px-6 text-sm text-muted-foreground">
                          {formatDate(log.date)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
