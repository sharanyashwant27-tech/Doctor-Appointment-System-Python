import {
  Alert,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { FormEvent, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { register as registerApi } from '@services/auth';
import { useAuthContext } from '@context/AuthContext';

export default function Register() {
  const { login } = useAuthContext();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'patient',
    specialty: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await registerApi({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        phone: form.phone || undefined,
        role: form.role as 'patient' | 'doctor',
        specialty: form.role === 'doctor' ? form.specialty || 'General' : undefined,
      });
      const user = await login(form.email, form.password);
      if (!user) throw new Error('Login failed');
      navigate(user.role === 'doctor' ? '/doctor' : '/patient');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Registration failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Create account
      </Typography>
      <Stack spacing={2} component="form" onSubmit={onSubmit}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Full name"
          required
          fullWidth
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
        />
        <TextField
          label="Email"
          type="email"
          required
          fullWidth
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <TextField
          label="Password"
          type="password"
          required
          fullWidth
          helperText="Min 8 characters"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <TextField
          label="Phone"
          fullWidth
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <TextField
          select
          label="Role"
          fullWidth
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          <MenuItem value="patient">Patient</MenuItem>
          <MenuItem value="doctor">Doctor</MenuItem>
        </TextField>
        {form.role === 'doctor' && (
          <TextField
            label="Specialty"
            required
            fullWidth
            value={form.specialty}
            onChange={(e) => setForm({ ...form, specialty: e.target.value })}
          />
        )}
        <Button type="submit" variant="contained" disabled={loading}>
          {loading ? 'Creating…' : 'Register'}
        </Button>
        <Button component={RouterLink} to="/login">
          Back to login
        </Button>
      </Stack>
    </Paper>
  );
}
