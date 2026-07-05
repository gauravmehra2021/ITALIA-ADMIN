import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Globe, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { resendOtpApi, verifyOtpApi } from '../../services/auth.service';
import { useLanguage } from '../../contexts/LanguageContext';

export default function VerifyOtp() {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const email = localStorage.getItem('resetEmail');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsLoading(true);

      const userId = localStorage.getItem('resetUserId');

      if (!userId) {
        toast.error(t('verifyOtp.toastSessionExpired'));
        navigate('/forgot-password');
        return;
      }

      const response = await verifyOtpApi(userId, otp);

      toast.success(response.message || t('verifyOtp.toastVerified'));
      navigate('/reset-password');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('verifyOtp.toastInvalid'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      if (!email) {
        toast.error(t('verifyOtp.toastEmailNotFound'));
        return;
      }

      setIsResending(true);

      const response = await resendOtpApi(email);

      toast.success(response.message || t('verifyOtp.toastResent'));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('verifyOtp.toastResendFailed'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <Globe className="w-8 h-8 text-primary-foreground" />
          </div>

          <h1 className="text-3xl tracking-tight">{t('verifyOtp.title')}</h1>

          <p className="text-muted-foreground">
            {t('verifyOtp.subtitle')}
            <br />
            <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Input
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder={t('verifyOtp.placeholder')}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              required
              className="h-11 text-center text-lg tracking-[0.5em]"
            />
          </div>

          <Button type="submit" className="w-full h-11" disabled={isLoading}>
            {isLoading ? t('verifyOtp.verifying') : t('verifyOtp.verifyButton')}
          </Button>

          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">{t('verifyOtp.didntReceive')}</p>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={isResending}
              className="text-sm text-primary hover:underline disabled:opacity-50"
            >
              {isResending ? t('verifyOtp.resending') : t('verifyOtp.resend')}
            </button>

            <div>
              <Link
                to="/forgot-password"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('verifyOtp.back')}
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
