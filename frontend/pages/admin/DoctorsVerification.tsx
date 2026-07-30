import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { Doctor, adminApi, doctorsApi, modulesApi } from '@services/endpoints';

type Department = { id: number; name: string; is_active?: boolean };

const emptyForm = {
  full_name: '',
  email: '',
  password: 'Doctor@123',
  phone: '',
  department_id: '' as number | '',
  qualification: '',
  experience_years: 5,
  consultation_fee: 500,
  city: 'Mumbai',
  bio: '',
};

export default function DoctorsVerification() {
  const [items, setItems] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [docs, depts] = await Promise.all([doctorsApi.list(), modulesApi.departments()]);
      setItems(docs);
      setDepartments((depts as Department[]).filter((d) => d.is_active !== false));
    } catch {
      setError('Failed to load doctors or departments');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.department_id) {
      setError('Please select a department');
      return;
    }
    setSaving(true);
    try {
      const created = await adminApi.createDoctor({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        department_id: Number(form.department_id),
        qualification: form.qualification.trim() || undefined,
        experience_years: Number(form.experience_years) || 0,
        consultation_fee: Number(form.consultation_fee) || 0,
        city: form.city.trim() || undefined,
        bio: form.bio.trim() || undefined,
        is_verified: true,
      });
      setSuccess(
        `Added ${created.full_name} to ${created.department_name || created.specialty}. They can sign in with the password you set.`,
      );
      setForm({ ...emptyForm, department_id: form.department_id });
      await load();
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to create doctor';
      setError(typeof detail === 'string' ? detail : 'Failed to create doctor');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Doctors</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Card component="form" onSubmit={onCreate}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Add doctor
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create a doctor account and assign them to a department from the list.
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            }}
          >
            <TextField
              required
              label="Full name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            />
            <TextField
              required
              type="email"
              label="Email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <TextField
              required
              type="password"
              label="Temporary password"
              helperText="Minimum 8 characters"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
            <TextField
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <FormControl required fullWidth>
              <InputLabel id="dept-label">Department</InputLabel>
              <Select
                labelId="dept-label"
                label="Department"
                value={form.department_id}
                onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value as number }))}
              >
                {departments.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="City"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
            <TextField
              label="Qualification"
              value={form.qualification}
              onChange={(e) => setForm((f) => ({ ...f, qualification: e.target.value }))}
            />
            <TextField
              type="number"
              label="Experience (years)"
              value={form.experience_years}
              onChange={(e) => setForm((f) => ({ ...f, experience_years: Number(e.target.value) }))}
              inputProps={{ min: 0 }}
            />
            <TextField
              type="number"
              label="Consultation fee"
              value={form.consultation_fee}
              onChange={(e) => setForm((f) => ({ ...f, consultation_fee: Number(e.target.value) }))}
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Bio"
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              sx={{ gridColumn: { sm: '1 / -1' } }}
              multiline
              minRows={2}
            />
          </Box>
        </CardContent>
        <CardActions sx={{ px: 2, pb: 2 }}>
          <Button type="submit" variant="contained" disabled={saving || departments.length === 0}>
            {saving ? 'Adding…' : 'Add doctor'}
          </Button>
        </CardActions>
      </Card>

      <Typography variant="h5">Verification</Typography>
      {items.map((d) => (
        <Card key={d.id}>
          <CardContent>
            <Typography fontWeight={600}>
              {d.full_name} · {d.department_name || d.specialty}
            </Typography>
            <Typography variant="body2">
              {d.email} · {d.city || '—'} · {d.is_verified ? 'Verified' : 'Unverified'}
            </Typography>
          </CardContent>
          <CardActions>
            <Button
              size="small"
              variant="contained"
              disabled={d.is_verified}
              onClick={async () => {
                await adminApi.verifyDoctor(d.id, true);
                await load();
              }}
            >
              Verify
            </Button>
            <Button
              size="small"
              disabled={!d.is_verified}
              onClick={async () => {
                await adminApi.verifyDoctor(d.id, false);
                await load();
              }}
            >
              Unverify
            </Button>
          </CardActions>
        </Card>
      ))}
    </Stack>
  );
}
