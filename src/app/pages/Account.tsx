import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { User, Mail, Phone, Shield, Eye, EyeOff, Sun, Moon, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { changePasswordApi, createEmployeeApi, editProfileApi, getProfileApi } from '../services/auth.service';

export default function Account() {
  const { user, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const [profileLoading, setProfileLoading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    country_code: '',
    phone_number: '',
    profile_image_url: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [employeeData, setEmployeeData] = useState({
    admin_name: '',
    email: '',
    password: '',
    country_code: '',
    phone_number: '',
  });
  const [showEmpPassword, setShowEmpPassword] = useState(false);
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);

  const handleCreateEmployee = async () => {
    if (!employeeData.admin_name || !employeeData.email || !employeeData.password) {
      toast.error(t('account.toastEmployeeRequired'));
      return;
    }
    try {
      setIsCreatingEmployee(true);
      const payload: any = {
        admin_name: employeeData.admin_name,
        email: employeeData.email,
        password: employeeData.password,
      };
      if (employeeData.country_code) payload.country_code = employeeData.country_code;
      if (employeeData.phone_number) payload.phone_number = employeeData.phone_number;
      await createEmployeeApi(payload);
      toast.success(t('account.toastEmployeeCreated'));
      setEmployeeData({ admin_name: '', email: '', password: '', country_code: '', phone_number: '' });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('account.toastEmployeeError'));
    } finally {
      setIsCreatingEmployee(false);
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase();

  const handleSaveProfile = async () => {
    try {
      setIsSavingProfile(true);
      await editProfileApi({
        admin_name: profileData.name,
        email: profileData.email,
        country_code: profileData.country_code,
        phone_number: profileData.phone_number,
        profile_image: profileImage,
      });
      updateProfile({
        name: profileData.name,
        email: profileData.email,
        profile_image: profileImagePreview || profileData.profile_image_url,
      });
      setIsEditingProfile(false);
      setProfileImage(null);
      toast.success(t('account.toastProfileUpdated'));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('account.toastProfileError'));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    setProfileImage(null);
    setProfileImagePreview(null);
    setIsEditingProfile(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileImage(file);
    setProfileImagePreview(URL.createObjectURL(file));
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t('account.toastPasswordNoMatch'));
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error(t('account.toastPasswordTooShort'));
      return;
    }
    try {
      const response = await changePasswordApi(passwordData.currentPassword, passwordData.newPassword);
      toast.success(response.message || t('account.toastPasswordChanged'));
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('account.toastPasswordError'));
    }
  };

  const themeOptions = [
    { value: 'light', label: t('account.light'), icon: Sun, description: t('account.lightDesc') },
    { value: 'dark', label: t('account.dark'), icon: Moon, description: t('account.darkDesc') },
    { value: 'system', label: t('account.system'), icon: Monitor, description: t('account.systemDesc') },
  ];

  const fetchProfile = async () => {
    try {
      setProfileLoading(true);
      const response = await getProfileApi();
      setProfileData({
        name: response?.data?.admin_name || '',
        email: response?.data?.email || '',
        country_code: response?.data?.country_code || '',
        phone_number: response?.data?.phone_number || '',
        profile_image_url: response?.data?.profile_image ? `https://api.sseuropa.com/${response.data.profile_image}` : '',
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('account.toastProfileLoadError'));
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl tracking-tight mb-2">{t('account.title')}</h1>
        <p className="text-muted-foreground">{t('account.subtitle')}</p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('account.profileInfo')}</CardTitle>
          <CardDescription>{t('account.profileInfoDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {profileLoading ? (
            <div className="text-center py-6">{t('account.loadingProfile')}</div>
          ) : (
            <>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    {profileImagePreview || profileData.profile_image_url ? (
                      <img
                        src={profileImagePreview || profileData.profile_image_url}
                        alt="Profile"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                        {getInitials(profileData.name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  {isEditingProfile && (
                    <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center cursor-pointer hover:bg-primary/90">
                      <span className="text-xs">✎</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                  )}
                </div>
                <div>
                  <h3 className="font-medium mb-1">{profileData.name}</h3>
                  <Badge
                    variant="secondary"
                    className={
                      user?.role === 'super_admin'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400'
                        : user?.role === 'employee'
                        ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                    }
                  >
                    {user?.role === 'super_admin' ? t('layout.superAdmin') : user?.role === 'employee' ? 'Employee' : t('layout.admin')}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('account.fullName')}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      disabled={!isEditingProfile}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t('account.emailAddress')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      disabled={!isEditingProfile}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('account.phoneNumber')}</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="+1"
                      value={profileData.country_code}
                      onChange={(e) => setProfileData({ ...profileData, country_code: e.target.value })}
                      disabled={!isEditingProfile}
                      className="w-24"
                    />
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={profileData.phone_number}
                        onChange={(e) => setProfileData({ ...profileData, phone_number: e.target.value })}
                        disabled={!isEditingProfile}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {!isEditingProfile ? (
                    <Button onClick={() => setIsEditingProfile(true)}>{t('account.editProfile')}</Button>
                  ) : (
                    <>
                      <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                        {isSavingProfile ? t('account.saving') : t('account.saveChanges')}
                      </Button>
                      <Button variant="outline" onClick={handleCancelEdit}>{t('account.cancel')}</Button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>{t('account.security')}</CardTitle>
          <CardDescription>{t('account.securityDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">{t('account.currentPassword')}</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                placeholder={t('account.currentPasswordPlaceholder')}
                className="pr-10"
              />
              <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t('account.newPassword')}</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder={t('account.newPasswordPlaceholder')}
                className="pr-10"
              />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('account.confirmPassword')}</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder={t('account.confirmPasswordPlaceholder')}
                className="pr-10"
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button onClick={handleChangePassword}>{t('account.changePassword')}</Button>
        </CardContent>
      </Card>

      {/* Create Employee Section */}
      {user?.role !== 'employee' && <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" /> {t('account.createEmployee')}
          </CardTitle>
          <CardDescription>{t('account.createEmployeeDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emp_name">{t('account.empFullName')} <span className="text-destructive">{t('account.required')}</span></Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="emp_name"
                placeholder={t('account.empFullName')}
                value={employeeData.admin_name}
                onChange={(e) => setEmployeeData({ ...employeeData, admin_name: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="emp_email">{t('account.empEmail')} <span className="text-destructive">{t('account.required')}</span></Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="emp_email"
                type="email"
                placeholder={t('account.empEmail')}
                value={employeeData.email}
                onChange={(e) => setEmployeeData({ ...employeeData, email: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="emp_password">{t('account.empPassword')} <span className="text-destructive">{t('account.required')}</span></Label>
            <div className="relative">
              <Input
                id="emp_password"
                type={showEmpPassword ? 'text' : 'password'}
                placeholder={t('account.empPassword')}
                value={employeeData.password}
                onChange={(e) => setEmployeeData({ ...employeeData, password: e.target.value })}
                className="pr-10"
              />
              <button type="button" onClick={() => setShowEmpPassword(!showEmpPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showEmpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('account.empPhone')} <span className="text-muted-foreground text-xs">{t('account.optional')}</span></Label>
            <div className="flex gap-2">
              <Input
                placeholder="+1"
                value={employeeData.country_code}
                onChange={(e) => setEmployeeData({ ...employeeData, country_code: e.target.value })}
                className="w-24"
              />
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('account.empPhone')}
                  value={employeeData.phone_number}
                  onChange={(e) => setEmployeeData({ ...employeeData, phone_number: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <Button onClick={handleCreateEmployee} disabled={isCreatingEmployee}>
            {isCreatingEmployee ? t('account.creating') : t('account.createEmployeeBtn')}
          </Button>
        </CardContent>
      </Card>}

      {/* Appearance Section */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>{t('account.appearance')}</CardTitle>
          <CardDescription>{t('account.appearanceDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value as 'light' | 'dark' | 'system')}
                  className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
