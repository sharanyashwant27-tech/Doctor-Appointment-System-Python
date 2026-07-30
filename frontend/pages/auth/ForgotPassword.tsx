import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { FormEvent, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { forgotPassword } from '@services/auth';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [devToken, setDevToken] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await forgotPassword(email);
      setMsg(res.message);
      if (res.dev_token) setDevToken(res.dev_token);
    } catch {
      setError(t('auth.forgot.failed'));
    }
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        {t('auth.forgot.title')}
      </Typography>
      <Stack spacing={2} component="form" onSubmit={onSubmit}>
        {error && <Alert severity="error">{error}</Alert>}
        {msg && <Alert severity="success">{msg}</Alert>}
        {devToken && (
          <Alert severity="info">
            {t('auth.forgot.devToken', { token: devToken })}{' '}
            <Button component={RouterLink} to={`/reset-password?token=${devToken}`} size="small">
              {t('auth.forgot.resetPage')}
            </Button>
          </Alert>
        )}
        <TextField
          label={t('auth.forgot.email')}
          type="email"
          required
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" variant="contained">
          {t('auth.forgot.submit')}
        </Button>
        <Button component={RouterLink} to="/login">
          {t('auth.forgot.backLogin')}
        </Button>
      </Stack>
    </Paper>
  );
}
