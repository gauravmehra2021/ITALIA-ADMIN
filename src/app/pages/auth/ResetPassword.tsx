import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Globe, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { resetPasswordApi } from '../../services/auth.service';
import { useLanguage } from '../../contexts/LanguageContext';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(t('resetPassword.toastNoMatch'));
      return;
    }

    if (password.length < 8) {
      toast.error(t('resetPassword.toastTooShort'));
      return;
    }

    try {
      setIsLoading(true);

      const userId = localStorage.getItem('resetUserId');

      if (!userId) {
        toast.error(t('resetPassword.toastSessionExpired'));
        navigate('/forgot-password');
        return;
      }

      const response = await resetPasswordApi(userId, password);

      toast.success(response.message || t('resetPassword.resetButton'));

      localStorage.removeItem('resetUserId');
      localStorage.removeItem('resetEmail');

      navigate('/login');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('resetPassword.toastError'));
    } finally {
      setIsLoading(false);
    }
  };

  const passwordRequirements = [
    { met: password.length >= 8, text: t('resetPassword.req8chars') },
    { met: /[A-Z]/.test(password), text: t('resetPassword.reqUppercase') },
    { met: /[a-z]/.test(password), text: t('resetPassword.reqLowercase') },
    { met: /[0-9]/.test(password), text: t('resetPassword.reqNumber') },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <Globe className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl tracking-tight">{t('resetPassword.title')}</h1>
          <p className="text-muted-foreground">{t('resetPassword.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t('resetPassword.newPassword')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('resetPassword.newPasswordPlaceholder')}
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
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('resetPassword.confirmPassword')}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {password && (
            <div className="bg-accent border border-border rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium mb-2">{t('resetPassword.requirements')}</p>
              <div className="space-y-1.5">
                {passwordRequirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle2
                      className={`w-4 h-4 ${req.met ? 'text-green-500' : 'text-muted-foreground'}`}
                    />
                    <span className={`text-xs ${req.met ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {req.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button type="submit" className="w-full h-11" disabled={isLoading}>
            {isLoading ? t('resetPassword.resetting') : t('resetPassword.resetButton')}
          </Button>
        </form>
      </div>
    </div>
  );
}
