import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Globe, ArrowLeft, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { forgotPasswordApi } from '../../services/auth.service';
import { useLanguage } from '../../contexts/LanguageContext';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsLoading(true);

      const response = await forgotPasswordApi(email);

      localStorage.setItem('resetUserId', response.data._id);
      localStorage.setItem('resetEmail', email);

      toast.success(response.message);
      navigate('/verify-otp');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('forgotPassword.toastError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <Globe className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl tracking-tight">{t('forgotPassword.title')}</h1>
          <p className="text-muted-foreground">{t('forgotPassword.subtitle')}</p>
        </div>

        {!emailSent ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">{t('forgotPassword.emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('forgotPassword.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading ? t('forgotPassword.sending') : t('forgotPassword.sendButton')}
            </Button>

            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('forgotPassword.backToSignIn')}
              </Link>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center space-y-4 p-8 bg-accent rounded-lg border border-border">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-medium">{t('forgotPassword.checkEmail')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('forgotPassword.sentTo')}
                  <br />
                  <strong className="text-foreground">{email}</strong>
                </p>
              </div>
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                {t('forgotPassword.didntReceive')}{' '}
                <button
                  onClick={() => setEmailSent(false)}
                  className="text-primary hover:underline"
                >
                  {t('forgotPassword.tryAgain')}
                </button>
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('forgotPassword.backToSignIn')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
