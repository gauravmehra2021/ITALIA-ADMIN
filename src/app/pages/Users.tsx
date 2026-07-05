import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
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
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Search, Plus, MoreVertical, Edit, Trash2, Shield, UserCog } from 'lucide-react';
import { mockAdmins, type AdminUser } from '../utils/mockData';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function Users() {
  const { user: currentUser } = useAuth();
  const { t, language } = useLanguage();
  const [users, setUsers] = useState(mockAdmins);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin' as 'admin' | 'super_admin',
    status: 'active' as 'active' | 'inactive',
    phone: '',
  });

  const isSuperAdmin = currentUser?.role === 'super_admin';

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase();

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  const handleCreateUser = () => {
    if (!isSuperAdmin) { toast.error(`${t('users.toastOnlySuperAdmin')} ${t('users.toastCreateUsers')}`); return; }
    const newUser: AdminUser = {
      id: `${users.length + 1}`,
      name: formData.name,
      email: formData.email,
      role: formData.role,
      status: formData.status,
      phone: formData.phone,
      lastLogin: new Date().toISOString(),
      createdDate: new Date().toISOString(),
    };
    setUsers([...users, newUser]);
    toast.success(t('users.toastCreated'));
    setCreateDialogOpen(false);
    resetForm();
  };

  const handleEditUser = () => {
    if (!isSuperAdmin) { toast.error(`${t('users.toastOnlySuperAdmin')} ${t('users.toastEditUsers')}`); return; }
    if (selectedUser) {
      setUsers(users.map((user) =>
        user.id === selectedUser.id
          ? { ...user, name: formData.name, email: formData.email, role: formData.role, status: formData.status, phone: formData.phone }
          : user
      ));
      toast.success(t('users.toastUpdated'));
      setEditDialogOpen(false);
      setSelectedUser(null);
      resetForm();
    }
  };

  const handleDeleteUser = () => {
    if (!isSuperAdmin) { toast.error(`${t('users.toastOnlySuperAdmin')} ${t('users.toastDeleteUsers')}`); return; }
    if (selectedUser) {
      setUsers(users.filter((user) => user.id !== selectedUser.id));
      toast.success(t('users.toastDeleted'));
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const openEditDialog = (user: AdminUser) => {
    setSelectedUser(user);
    setFormData({ name: user.name, email: user.email, password: '', role: user.role, status: user.status, phone: user.phone || '' });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (user: AdminUser) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '', role: 'admin', status: 'active', phone: '' });
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-6 lg:p-8">
        <Card className="border-border">
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">{t('users.accessRestricted')}</h2>
            <p className="text-muted-foreground">{t('users.accessRestrictedDesc')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl tracking-tight mb-2">{t('users.title')}</h1>
          <p className="text-muted-foreground">{t('users.subtitle')}</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('users.addAdmin')}
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('users.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('users.filterByRole')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('users.allRoles')}</SelectItem>
                <SelectItem value="super_admin">{t('users.superAdmin')}</SelectItem>
                <SelectItem value="admin">{t('users.admin')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('users.filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('users.allStatuses')}</SelectItem>
                <SelectItem value="active">{t('users.active')}</SelectItem>
                <SelectItem value="inactive">{t('users.inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('users.showing')} {filteredUsers.length} {t('users.of')} {users.length} {t('users.usersCount')}
        </p>
      </div>

      {/* Users Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-4 px-6 text-sm font-medium">{t('users.user')}</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">{t('users.email')}</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">{t('users.role')}</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">{t('users.status')}</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">{t('users.lastLogin')}</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">{t('users.created')}</th>
                  <th className="text-right py-4 px-6 text-sm font-medium">{t('users.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          {user.phone && <div className="text-xs text-muted-foreground">{user.phone}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-muted-foreground">{user.email}</td>
                    <td className="py-4 px-6">
                      <Badge
                        variant="secondary"
                        className={
                          user.role === 'super_admin'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                        }
                      >
                        {user.role === 'super_admin' ? t('users.superAdmin') : t('users.admin')}
                      </Badge>
                    </td>
                    <td className="py-4 px-6">
                      <Badge
                        variant="secondary"
                        className={
                          user.status === 'active'
                            ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400'
                        }
                      >
                        {user.status === 'active' ? t('users.active') : t('users.inactive')}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-sm text-muted-foreground">{formatDate(user.lastLogin).split(',')[0]}</td>
                    <td className="py-4 px-6 text-sm text-muted-foreground">{formatDate(user.createdDate).split(',')[0]}</td>
                    <td className="py-4 px-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(user)}>
                            <Edit className="w-4 h-4 mr-2" />
                            {t('users.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openDeleteDialog(user)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('users.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('users.createAdmin')}</DialogTitle>
            <DialogDescription>{t('users.createAdminDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('users.fullName')}</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('users.email')}</Label>
              <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="john@amei.it" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t('users.phone')}</Label>
              <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+39 345 678 9012" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('users.password')}</Label>
              <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{t('users.role')}</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as 'admin' | 'super_admin' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t('users.admin')}</SelectItem>
                  <SelectItem value="super_admin">{t('users.superAdmin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">{t('users.status')}</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as 'active' | 'inactive' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('users.active')}</SelectItem>
                  <SelectItem value="inactive">{t('users.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>{t('users.cancel')}</Button>
            <Button onClick={handleCreateUser}>{t('users.createUser')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('users.editUser')}</DialogTitle>
            <DialogDescription>{t('users.editUserDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t('users.fullName')}</Label>
              <Input id="edit-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">{t('users.email')}</Label>
              <Input id="edit-email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">{t('users.phone')}</Label>
              <Input id="edit-phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">{t('users.role')}</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as 'admin' | 'super_admin' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t('users.admin')}</SelectItem>
                  <SelectItem value="super_admin">{t('users.superAdmin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">{t('users.status')}</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as 'active' | 'inactive' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('users.active')}</SelectItem>
                  <SelectItem value="inactive">{t('users.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>{t('users.cancel')}</Button>
            <Button onClick={handleEditUser}>{t('users.saveChanges')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('users.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('users.deleteConfirmDesc')}{' '}
              <strong>{selectedUser?.name}</strong>{t('users.deleteConfirmDesc2')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('users.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('users.confirmDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
