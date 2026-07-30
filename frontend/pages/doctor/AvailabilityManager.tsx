import {
  Alert,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Availability, doctorsApi } from '@services/endpoints';
import { useAuthContext } from '@context/AuthContext';

export default function AvailabilityManager() {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const [items, setItems] = useState<Availability[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ day_of_week: 0, start_time: '09:00', end_time: '13:00', slot_minutes: 30 });
  const [doctorId, setDoctorId] = useState<number | null>(null);

  const days = (t('days', { returnObjects: true }) as string[]) || [];

  async function load() {
    try {
      const doctors = await doctorsApi.list();
      const mine = doctors.find((d) => d.email === user?.email) || doctors.find((d) => d.full_name === user?.full_name);
      if (!mine) {
        setError(t('doctor.availability.profileMissing'));
        return;
      }
      setDoctorId(mine.id);
      setItems(await doctorsApi.availability(mine.id));
    } catch {
      setError(t('doctor.availability.loadFailed'));
    }
  }

  useEffect(() => {
    void load();
  }, [user]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await doctorsApi.createAvailability({
        day_of_week: form.day_of_week,
        start_time: form.start_time.length === 5 ? `${form.start_time}:00` : form.start_time,
        end_time: form.end_time.length === 5 ? `${form.end_time}:00` : form.end_time,
        slot_minutes: form.slot_minutes,
        is_active: true,
      });
      await load();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || t('doctor.availability.createFailed'));
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h4">{t('doctor.availability.title')}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack component="form" direction={{ xs: 'column', md: 'row' }} spacing={2} onSubmit={onSubmit}>
        <TextField
          select
          label={t('doctor.availability.day')}
          value={form.day_of_week}
          onChange={(e) => setForm({ ...form, day_of_week: Number(e.target.value) })}
          sx={{ minWidth: 120 }}
        >
          {days.map((d, i) => (
            <MenuItem key={d} value={i}>
              {d}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label={t('doctor.availability.start')}
          type="time"
          value={form.start_time}
          onChange={(e) => setForm({ ...form, start_time: e.target.value })}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label={t('doctor.availability.end')}
          type="time"
          value={form.end_time}
          onChange={(e) => setForm({ ...form, end_time: e.target.value })}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label={t('doctor.availability.slotMin')}
          type="number"
          value={form.slot_minutes}
          onChange={(e) => setForm({ ...form, slot_minutes: Number(e.target.value) })}
        />
        <Button type="submit" variant="contained">
          {t('doctor.availability.add')}
        </Button>
      </Stack>
      {items.map((s) => (
        <Stack key={s.id} direction="row" spacing={2} alignItems="center">
          <Typography sx={{ flex: 1 }}>
            {days[s.day_of_week ?? 0] || s.specific_date} · {s.start_time}–{s.end_time} · {s.slot_minutes}m
            {doctorId ? '' : ''}
          </Typography>
          <Button size="small" color="error" onClick={async () => { await doctorsApi.deleteAvailability(s.id); await load(); }}>
            {t('doctor.availability.delete')}
          </Button>
        </Stack>
      ))}
    </Stack>
  );
}
