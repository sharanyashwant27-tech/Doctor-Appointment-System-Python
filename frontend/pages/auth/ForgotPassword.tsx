import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { FormEvent, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { forgotPassword } from '@services/auth';

export default function ForgotPassword() {
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
      setError('Request failed');
    }
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Forgot password
      </Typography>
      <Stack spacing={2} component="form" onSubmit={onSubmit}>
        {error && <Alert severity="error">{error}</Alert>}
        {msg && <Alert severity="success">{msg}</Alert>}
        {devToken && (
          <Alert severity="info">
            Dev token: {devToken} — use on{' '}
            <Button component={RouterLink} to={`/reset-password?token=${devToken}`} size="small">
              reset page
            </Button>
          </Alert>
        )}
        <TextField label="Email" type="email" required fullWidth value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button type="submit" variant="contained">
          Send reset link
        </Button>
        <Button component={RouterLink} to="/login">
          Back to login
        </Button>
      </Stack>
    </Paper>
  );
}
