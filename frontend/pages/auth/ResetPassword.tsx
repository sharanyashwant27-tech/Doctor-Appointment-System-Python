import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { FormEvent, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { resetPassword } from '@services/auth';

export default function ResetPassword() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [token, setToken] = useState(params.get('token') || '');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await resetPassword(token, password);
      setMsg(t('auth.reset.success'));
      setError('');
    } catch {
      setError(t('auth.reset.failed'));
    }
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        {t('auth.reset.title')}
      </Typography>
      <Stack spacing={2} component="form" onSubmit={onSubmit}>
        {error && <Alert severity="error">{error}</Alert>}
        {msg && <Alert severity="success">{msg}</Alert>}
        <TextField label={t('auth.reset.token')} fullWidth required value={token} onChange={(e) => setToken(e.target.value)} />
        <TextField
          label={t('auth.reset.newPassword')}
          type="password"
          fullWidth
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" variant="contained">
          {t('auth.reset.submit')}
        </Button>
        <Button component={RouterLink} to="/login">
          {t('auth.reset.login')}
        </Button>
      </Stack>
    </Paper>
  );
}
