import { Alert, Button, Paper, Stack, TextField, Typography, Divider } from '@mui/material';
import { FormEvent, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@context/AuthContext';
import { advancedApi } from '@services/endpoints';

function homeForRole(role: string) {
  if (role === 'admin') return '/admin';
  if (role === 'doctor') return '/doctor';
  return '/patient';
}

export default function Login() {
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
        setError('Enter your 2FA code to continue');
      } else {
        setError(res?.data?.message || 'Login failed');
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
      setError('Face not recognized — enroll after password login from Profile tools, or use the demo sample after enroll.');
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
      setInfo('Face enrolled for this account. You can use Face login next time.');
    } catch {
      setError('Enroll failed — check credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Sign in
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Demo: patient1@medibook.local / Patient@123
      </Typography>
      <Stack spacing={2} component="form" onSubmit={onSubmit}>
        {error && <Alert severity={needOtp ? 'info' : 'error'}>{error}</Alert>}
        {info && <Alert severity="success">{info}</Alert>}
        <TextField label="Email" type="email" fullWidth required value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField
          label="Password"
          type="password"
          fullWidth
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {(needOtp || otp) && (
          <TextField label="2FA OTP" fullWidth value={otp} onChange={(e) => setOtp(e.target.value)} />
        )}
        <Button type="submit" variant="contained" fullWidth disabled={loading}>
          {loading ? 'Signing in…' : 'Login'}
        </Button>
        <Divider>or face login (demo)</Divider>
        <TextField
          label="Face sample / descriptor"
          fullWidth
          value={faceSample}
          onChange={(e) => setFaceSample(e.target.value)}
          helperText="Demo biometric: enroll once, then Face login with the same sample"
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button variant="outlined" fullWidth disabled={loading} onClick={onFaceEnrollAfterPassword}>
            Enroll face
          </Button>
          <Button variant="contained" color="secondary" fullWidth disabled={loading} onClick={onFaceLogin}>
            Face login
          </Button>
        </Stack>
        <Button component={RouterLink} to="/forgot-password">
          Forgot password
        </Button>
        <Button component={RouterLink} to="/register">
          Create account
        </Button>
      </Stack>
    </Paper>
  );
}
