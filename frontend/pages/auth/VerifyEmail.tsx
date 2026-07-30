import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { verifyEmail } from '@services/auth';

export default function VerifyEmail() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [token, setToken] = useState(params.get('token') || '');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.get('token')) void onVerify(params.get('token')!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onVerify(tok: string) {
    try {
      await verifyEmail(tok);
      setMsg(t('auth.verify.success'));
      setError('');
    } catch {
      setError(t('auth.verify.failed'));
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await onVerify(token);
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        {t('auth.verify.title')}
      </Typography>
      <Stack spacing={2} component="form" onSubmit={onSubmit}>
        {error && <Alert severity="error">{error}</Alert>}
        {msg && <Alert severity="success">{msg}</Alert>}
        <TextField label={t('auth.verify.token')} fullWidth value={token} onChange={(e) => setToken(e.target.value)} />
        <Button type="submit" variant="contained">
          {t('auth.verify.submit')}
        </Button>
        <Button component={RouterLink} to="/login">
          {t('auth.verify.login')}
        </Button>
      </Stack>
    </Paper>
  );
}
