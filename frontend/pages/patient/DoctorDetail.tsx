import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Availability, Doctor, appointmentsApi, doctorsApi } from '@services/endpoints';
import { tStatus } from '@/i18n';

export default function DoctorDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const doctorId = Number(id);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [slots, setSlots] = useState<Availability[]>([]);
  const [scheduledAt, setScheduledAt] = useState(dayjs().add(1, 'day').hour(10).minute(0).format('YYYY-MM-DDTHH:mm'));
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!doctorId) return;
    doctorsApi.get(doctorId).then(setDoctor).catch(() => setError(t('patient.doctorDetail.notFound')));
    doctorsApi.availability(doctorId).then(setSlots).catch(() => undefined);
  }, [doctorId, t]);

  async function book(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      const appt = await appointmentsApi.book({
        doctor_id: doctorId,
        scheduled_at: new Date(scheduledAt).toISOString(),
        reason,
      });
      setMsg(
        t('patient.doctorDetail.booked', {
          id: appt.id,
          status: tStatus(t, appt.status),
        }),
      );
      setTimeout(() => navigate('/patient/appointments'), 800);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          t('patient.doctorDetail.bookingFailed'),
      );
    }
  }

  if (!doctor && !error) return <Typography>{t('patient.doctorDetail.loading')}</Typography>;

  return (
    <Stack spacing={2} maxWidth={560}>
      <Typography variant="h4">{doctor?.full_name}</Typography>
      <Typography>
        {doctor?.specialty} · {doctor?.city} · ₹{doctor?.consultation_fee}
      </Typography>
      <Typography color="text.secondary">{doctor?.bio}</Typography>
      <Typography variant="subtitle1">{t('patient.doctorDetail.weeklyAvailability')}</Typography>
      {slots.length === 0 && <Typography variant="body2">{t('patient.doctorDetail.noSlots')}</Typography>}
      {slots.map((s) => (
        <Typography key={s.id} variant="body2">
          {t('patient.doctorDetail.slotLine', {
            day: s.day_of_week ?? t('day.date'),
            start: s.start_time,
            end: s.end_time,
            minutes: s.slot_minutes,
          })}
        </Typography>
      ))}
      <Stack component="form" spacing={2} onSubmit={book}>
        {error && <Alert severity="error">{error}</Alert>}
        {msg && <Alert severity="success">{msg}</Alert>}
        <TextField
          label={t('patient.doctorDetail.dateTime')}
          type="datetime-local"
          InputLabelProps={{ shrink: true }}
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          required
        />
        <TextField
          label={t('patient.doctorDetail.reason')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          multiline
          minRows={2}
        />
        <Button type="submit" variant="contained">
          {t('patient.doctorDetail.request')}
        </Button>
      </Stack>
    </Stack>
  );
}
