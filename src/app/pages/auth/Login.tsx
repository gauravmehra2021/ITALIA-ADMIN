import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { logo, updatedLogo } from '../../assets/images';
import '../../../styles/login-page.css';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success(t('login.toastSuccess'));
      navigate('/dashboard');
    } catch (error) {
      toast.error(t('login.toastError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden">
      {/* LEFT SIDE - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background relative">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <div className="absolute top-10 left-10 w-72 h-72 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-secondary rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-18 h-18 rounded-2xl mb-4">
            <img
              src={logo}
              alt="Logo"
              className="w-10 h-10 object-contain-logo rounded-lg"
            />
            </div>
            <h1 className="text-3xl tracking-tight">{t('login.welcome')}</h1>
            <p className="text-muted-foreground">
              {t('login.subtitle')}
            </p>
          </div>

          {/* <div className="bg-accent border border-border rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">{t('login.demoCredentials')}</p>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p><strong>{t('login.superAdmin')}:</strong> sostegno@yopmail.com / Admin@12345678</p>
            </div>
          </div> */}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('login.emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('login.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('login.passwordLabel')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('login.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label
                  htmlFor="remember"
                  className="text-sm font-normal cursor-pointer"
                >
                  {t('login.rememberMe')}
                </Label>
              </div>
              <a
                href="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                {t('login.forgotPassword')}
              </a>
            </div>

            <Button
              type="submit"
              className="w-full h-11"
              disabled={isLoading}
            >
              {isLoading ? t('login.signingIn') : t('login.signIn')}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            <p>{t('login.copyright')}</p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Premium Branding Panel */}
      <div className="login-brand-panel">
        <div className="login-ambient-glow login-ambient-glow--blue" />
        <div className="login-ambient-glow login-ambient-glow--light" />

        <div className="login-stars">
          <div className="login-star" />
          <div className="login-star" />
          <div className="login-star" />
          <div className="login-star" />
          <div className="login-star" />
          <div className="login-star" />
          <div className="login-star" />
          <div className="login-star" />
        </div>

        <div className="login-content">
          <div className="login-logo-wrap">
            <div className="login-logo-glow" />
            <div className="login-logo-ring" />
            <div className="login-logo-ring login-logo-ring--inner" />

            <div className="login-logo">
              <img
                src={updatedLogo}
                alt="SS EUROPA"
                className="login-logo-img"
              />
            </div>
          </div>

          <div className="login-brand">
            <h2 className="login-brand-title">SS EUROPA</h2>
            <div className="login-brand-divider" />
            <p className="login-brand-sub">
              {t('login.brandSub').split('\n').map((line: string, i: number) => (
                <span key={i}>{line}{i === 0 && <br />}</span>
              ))}
            </p>
          </div>

          <div className="login-tags">
            <span className="login-tag">{t('login.tagImmigration')}</span>
            <span className="login-tag">{t('login.tagVisas')}</span>
            <span className="login-tag">{t('login.tagInsurance')}</span>
            <span className="login-tag">{t('login.tagBusiness')}</span>
          </div>

          <div className="login-accent">
            <div className="login-accent-line" />
            <div className="login-accent-dot" />
            <div className="login-accent-line login-accent-line--right" />
          </div>
        </div>
      </div>
    </div>
  );
}
