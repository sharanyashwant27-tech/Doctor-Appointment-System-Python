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
import { useTranslation } from 'react-i18next';
import { Doctor, adminApi, doctorsApi, modulesApi } from '@services/endpoints';
import { tStatus } from '@/i18n';

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
  const { t } = useTranslation();
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
      setError(t('admin.doctors.loadFailed'));
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
      setError(t('admin.doctors.selectDept'));
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
        t('admin.doctors.addedSuccess', {
          name: created.full_name,
          department: created.department_name || created.specialty,
        }),
      );
      setForm({ ...emptyForm, department_id: form.department_id });
      await load();
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        t('admin.doctors.createFailed');
      setError(typeof detail === 'string' ? detail : t('admin.doctors.createFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4">{t('admin.doctors.title')}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Card component="form" onSubmit={onCreate}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('admin.doctors.addTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('admin.doctors.addHint')}
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
              label={t('admin.doctors.fullName')}
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            />
            <TextField
              required
              type="email"
              label={t('admin.doctors.email')}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <TextField
              required
              type="password"
              label={t('admin.doctors.tempPassword')}
              helperText={t('admin.doctors.passwordHelper')}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
            <TextField
              label={t('admin.doctors.phone')}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <FormControl required fullWidth>
              <InputLabel id="dept-label">{t('admin.doctors.department')}</InputLabel>
              <Select
                labelId="dept-label"
                label={t('admin.doctors.department')}
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
              label={t('admin.doctors.city')}
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
            <TextField
              label={t('admin.doctors.qualification')}
              value={form.qualification}
              onChange={(e) => setForm((f) => ({ ...f, qualification: e.target.value }))}
            />
            <TextField
              type="number"
              label={t('admin.doctors.experience')}
              value={form.experience_years}
              onChange={(e) => setForm((f) => ({ ...f, experience_years: Number(e.target.value) }))}
              inputProps={{ min: 0 }}
            />
            <TextField
              type="number"
              label={t('admin.doctors.fee')}
              value={form.consultation_fee}
              onChange={(e) => setForm((f) => ({ ...f, consultation_fee: Number(e.target.value) }))}
              inputProps={{ min: 0 }}
            />
            <TextField
              label={t('admin.doctors.bio')}
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
            {saving ? t('admin.doctors.adding') : t('admin.doctors.add')}
          </Button>
        </CardActions>
      </Card>

      <Typography variant="h5">{t('admin.doctors.verification')}</Typography>
      {items.map((d) => (
        <Card key={d.id}>
          <CardContent>
            <Typography fontWeight={600}>
              {d.full_name} · {d.department_name || d.specialty}
            </Typography>
            <Typography variant="body2">
              {d.email} · {d.city || t('common.emDash')} ·{' '}
              {d.is_verified ? tStatus(t, 'verified') : tStatus(t, 'unverified')}
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
              {t('admin.doctors.verify')}
            </Button>
            <Button
              size="small"
              disabled={!d.is_verified}
              onClick={async () => {
                await adminApi.verifyDoctor(d.id, false);
                await load();
              }}
            >
              {t('admin.doctors.unverify')}
            </Button>
          </CardActions>
        </Card>
      ))}
    </Stack>
  );
}
