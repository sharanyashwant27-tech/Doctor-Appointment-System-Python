import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Availability, Doctor, appointmentsApi, doctorsApi } from '@services/endpoints';

export default function DoctorDetail() {
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
    doctorsApi.get(doctorId).then(setDoctor).catch(() => setError('Doctor not found'));
    doctorsApi.availability(doctorId).then(setSlots).catch(() => undefined);
  }, [doctorId]);

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
      setMsg(`Booked appointment #${appt.id} (${appt.status})`);
      setTimeout(() => navigate('/patient/appointments'), 800);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Booking failed');
    }
  }

  if (!doctor && !error) return <Typography>Loading…</Typography>;

  return (
    <Stack spacing={2} maxWidth={560}>
      <Typography variant="h4">{doctor?.full_name}</Typography>
      <Typography>
        {doctor?.specialty} · {doctor?.city} · ₹{doctor?.consultation_fee}
      </Typography>
      <Typography color="text.secondary">{doctor?.bio}</Typography>
      <Typography variant="subtitle1">Weekly availability</Typography>
      {slots.length === 0 && <Typography variant="body2">No published slots.</Typography>}
      {slots.map((s) => (
        <Typography key={s.id} variant="body2">
          Day {s.day_of_week ?? 'date'} · {s.start_time}–{s.end_time} ({s.slot_minutes} min)
        </Typography>
      ))}
      <Stack component="form" spacing={2} onSubmit={book}>
        {error && <Alert severity="error">{error}</Alert>}
        {msg && <Alert severity="success">{msg}</Alert>}
        <TextField
          label="Date & time"
          type="datetime-local"
          InputLabelProps={{ shrink: true }}
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          required
        />
        <TextField label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} multiline minRows={2} />
        <Button type="submit" variant="contained">
          Request appointment
        </Button>
      </Stack>
    </Stack>
  );
}
