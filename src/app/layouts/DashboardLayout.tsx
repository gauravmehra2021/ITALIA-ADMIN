import { useState, useMemo } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router';
import { logo } from '../assets/images';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '../components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import {
  LayoutDashboard,
  FileText,
  User,
  Users,
  LogOut,
  Menu,
  Sun,
  Moon,
  MapPin,
} from 'lucide-react';

function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-0.5">
      <button
        onClick={() => setLanguage('it')}
        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
          language === 'it'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        IT
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
          language === 'en'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        EN
      </button>
    </div>
  );
}

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { setTheme, resolvedTheme } = useTheme();
  const { t, language } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = useMemo(() => [
    { name: t('layout.dashboard'), href: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin'] },
    { name: t('layout.inquiries'), href: '/inquiries', icon: FileText, roles: ['super_admin', 'admin', 'employee'] },
    { name: t('layout.employees'), href: '/employees', icon: Users, roles: ['super_admin', 'admin'] },
    { name: t('layout.visitors'), href: '/visitors', icon: MapPin, roles: ['super_admin', 'admin'] },
    { name: t('layout.account'), href: '/account', icon: User, roles: ['super_admin', 'admin', 'employee'] },
  ], [language, t]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase();

  const filteredNavigation = navigation.filter((item) => item.roles.includes(user?.role ?? ''));

  const renderNavItems = (mobile = false) =>
    filteredNavigation.map((item) => {
      const isActive = location.pathname === item.href;
      return (
        <Link
          key={item.href}
          to={item.href}
          onClick={() => mobile && setMobileMenuOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <item.icon className="w-5 h-5" />
          <span className="font-medium">{item.name}</span>
        </Link>
      );
    });

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col border-r border-border bg-card">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo */}
          <div className="flex items-center gap-3 h-16 px-6 border-b border-border">
            <img src={logo} alt="Logo" className="w-10 h-10 object-contain rounded-lg" />
            <div>
              <h1 className="font-semibold text-lg">SSE</h1>
              <p className="text-xs text-muted-foreground">{t('layout.adminDashboard')}</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {renderNavItems()}
          </nav>

          {/* User Profile */}
          <div className="border-t border-border p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-accent transition-colors">
                  <Avatar className="w-9 h-9">
                    {user?.profile_image && <AvatarImage src={user.profile_image} alt={user.name} className="object-cover" />}
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user && getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left overflow-hidden">
                    <p className="text-sm font-medium truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.role === 'super_admin' ? t('layout.superAdmin') : user?.role === 'employee' ? 'Employee' : t('layout.admin')}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{t('layout.myAccount')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/account')}>
                  <User className="w-4 h-4 mr-2" />
                  {t('layout.profileSettings')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleTheme}>
                  {resolvedTheme === 'dark' ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                  {resolvedTheme === 'dark' ? t('layout.lightMode') : t('layout.darkMode')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('layout.signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b border-border bg-card z-50">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-3">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-3 h-16 px-6 border-b border-border">
                    <img src={logo} alt="Logo" className="w-10 h-10 object-contain rounded-lg" />
                    <div>
                      <h1 className="font-semibold text-lg">SSE</h1>
                      <p className="text-xs text-muted-foreground">{t('layout.adminDashboard')}</p>
                    </div>
                  </div>
                  <nav className="flex-1 px-4 py-6 space-y-1">
                    {renderNavItems(true)}
                  </nav>
                  <div className="border-t border-border p-4">
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <Avatar className="w-9 h-9">
                        {user?.profile_image && <AvatarImage src={user.profile_image} alt={user.name} className="object-cover" />}
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {user && getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium truncate">{user?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user?.role === 'super_admin' ? t('layout.superAdmin') : user?.role === 'employee' ? 'Employee' : t('layout.admin')}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1 mt-3">
                      <button
                        onClick={toggleTheme}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm hover:bg-accent transition-colors"
                      >
                        {resolvedTheme === 'dark' ? (
                          <><Sun className="w-4 h-4" />{t('layout.lightMode')}</>
                        ) : (
                          <><Moon className="w-4 h-4" />{t('layout.darkMode')}</>
                        )}
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm hover:bg-accent transition-colors text-destructive"
                      >
                        <LogOut className="w-4 h-4" />
                        {t('layout.signOut')}
                      </button>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <img src={logo} alt="Logo" className="w-8 h-8 object-contain rounded-lg" />
              <h1 className="font-semibold">SSE</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {resolvedTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop top bar */}
      <div className="hidden lg:flex lg:pl-64 fixed top-0 right-0 left-64 h-14 border-b border-border bg-card/80 backdrop-blur-sm z-40 items-center justify-end px-6 gap-3">
        <LanguageSwitcher />
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 lg:pt-14 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
