import { Alert, Button, Paper, Stack, TextField, Typography, Divider } from '@mui/material';
import { FormEvent, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '@context/AuthContext';
import { advancedApi } from '@services/endpoints';
import { dashboardPathForRole } from '@/utils/navigation';

function homeForRole(role: string) {
  return dashboardPathForRole(role);
}

export default function Login() {
  const { t } = useTranslation();
  const { login, loginWithTokens } = useAuthContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState('patient1@medibook.local');
  const [password, setPassword] = useState('Patient@123');
  const [otp, setOtp] = useState('');
  const [needOtp, setNeedOtp] = useState(false);
  const [faceSample, setFaceSample] = useState('demo-face-patient1-' + 'x'.repeat(48));
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password, otp || undefined);
      if (!user) throw new Error('Login failed');
      navigate(homeForRole(user.role));
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string; details?: { code?: string } }; status?: number } })
        ?.response;
      if (res?.data?.details?.code === 'needing_2fa' || res?.status === 403) {
        setNeedOtp(true);
        setError(t('auth.login.errorNeed2fa'));
      } else {
        setError(res?.data?.message || t('auth.login.errorFailed'));
      }
    } finally {
      setLoading(false);
    }
  }

  async function onFaceLogin() {
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const tokens = await advancedApi.faceLogin(faceSample);
      const user = await loginWithTokens(tokens.access_token, tokens.refresh_token);
      if (!user) throw new Error('Face login failed');
      navigate(homeForRole(user.role));
    } catch {
      setError(t('auth.login.errorFace'));
    } finally {
      setLoading(false);
    }
  }

  async function onFaceEnrollAfterPassword() {
    setError('');
    setLoading(true);
    try {
      await login(email, password, otp || undefined);
      await advancedApi.enrollFace(faceSample);
      setInfo(t('auth.login.faceEnrolled'));
    } catch {
      setError(t('auth.login.enrollFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        {t('auth.login.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('auth.login.demoHint')}
      </Typography>
      <Stack spacing={2} component="form" onSubmit={onSubmit}>
        {error && <Alert severity={needOtp ? 'info' : 'error'}>{error}</Alert>}
        {info && <Alert severity="success">{info}</Alert>}
        <TextField
          label={t('auth.login.email')}
          type="email"
          fullWidth
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label={t('auth.login.password')}
          type="password"
          fullWidth
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {(needOtp || otp) && (
          <TextField label={t('auth.login.otp')} fullWidth value={otp} onChange={(e) => setOtp(e.target.value)} />
        )}
        <Button type="submit" variant="contained" fullWidth disabled={loading}>
          {loading ? t('auth.login.submitting') : t('auth.login.submit')}
        </Button>
        <Divider>{t('auth.login.orFace')}</Divider>
        <TextField
          label={t('auth.login.faceSample')}
          fullWidth
          value={faceSample}
          onChange={(e) => setFaceSample(e.target.value)}
          helperText={t('auth.login.faceHelper')}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button variant="outlined" fullWidth disabled={loading} onClick={onFaceEnrollAfterPassword}>
            {t('auth.login.enrollFace')}
          </Button>
          <Button variant="contained" color="secondary" fullWidth disabled={loading} onClick={onFaceLogin}>
            {t('auth.login.faceLogin')}
          </Button>
        </Stack>
        <Button component={RouterLink} to="/forgot-password">
          {t('auth.login.forgot')}
        </Button>
        <Button component={RouterLink} to="/register">
          {t('auth.login.createAccount')}
        </Button>
      </Stack>
    </Paper>
  );
}
