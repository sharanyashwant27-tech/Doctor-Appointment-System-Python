import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { FormEvent, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { resetPassword } from '@services/auth';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [token, setToken] = useState(params.get('token') || '');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await resetPassword(token, password);
      setMsg('Password updated. You can sign in.');
      setError('');
    } catch {
      setError('Reset failed — check token');
    }
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Reset password
      </Typography>
      <Stack spacing={2} component="form" onSubmit={onSubmit}>
        {error && <Alert severity="error">{error}</Alert>}
        {msg && <Alert severity="success">{msg}</Alert>}
        <TextField label="Token" fullWidth required value={token} onChange={(e) => setToken(e.target.value)} />
        <TextField
          label="New password"
          type="password"
          fullWidth
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" variant="contained">
          Update password
        </Button>
        <Button component={RouterLink} to="/login">
          Login
        </Button>
      </Stack>
    </Paper>
  );
}
