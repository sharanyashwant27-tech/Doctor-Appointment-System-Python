import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '@services/auth';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [token, setToken] = useState(params.get('token') || '');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.get('token')) void onVerify(params.get('token')!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onVerify(t: string) {
    try {
      await verifyEmail(t);
      setMsg('Email verified');
      setError('');
    } catch {
      setError('Verification failed');
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await onVerify(token);
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Verify email
      </Typography>
      <Stack spacing={2} component="form" onSubmit={onSubmit}>
        {error && <Alert severity="error">{error}</Alert>}
        {msg && <Alert severity="success">{msg}</Alert>}
        <TextField label="Token" fullWidth value={token} onChange={(e) => setToken(e.target.value)} />
        <Button type="submit" variant="contained">
          Verify
        </Button>
        <Button component={RouterLink} to="/login">
          Login
        </Button>
      </Stack>
    </Paper>
  );
}
