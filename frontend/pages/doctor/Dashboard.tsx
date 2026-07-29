import {
  Alert,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Appointment, Availability, appointmentsApi, doctorsApi, recordsApi } from '@services/endpoints';
import { useAuthContext } from '@context/AuthContext';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function StatCard({ label, value, to }: { label: string; value: string | number; to?: string }) {
  const card = (
    <Card sx={{ height: '100%', textDecoration: 'none' }} {...(to ? { component: RouterLink, to } : {})}>
      <CardContent>
        <Typography variant="h4" fontWeight={700}>
          {value}
        </Typography>
        <Typography color="text.secondary">{label}</Typography>
      </CardContent>
    </Card>
  );
  return card;
}

export default function DoctorDashboard() {
  const { user } = useAuthContext();
  const [items, setItems] = useState<Appointment[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [prescriptionCount, setPrescriptionCount] = useState(0);
  const [rating, setRating] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([appointmentsApi.list(), recordsApi.list(), doctorsApi.list()])
      .then(async ([appts, records, doctors]) => {
        setItems(appts);
        const rx = records.reduce((n, r) => n + (r.prescriptions?.length || 0), 0);
        setPrescriptionCount(rx);
        const mine =
          doctors.find((d) => d.email === user?.email) ||
          doctors.find((d) => d.full_name === user?.full_name);
        if (mine) {
          setRating(mine.rating_avg || 0);
          setAvailability(await doctorsApi.availability(mine.id));
        }
      })
      .catch(() => setError('Failed to load dashboard'));
  }, [user?.email, user?.full_name]);

  const todayKey = dayjs().format('YYYY-MM-DD');
  const today = useMemo(
    () => items.filter((a) => dayjs(a.scheduled_at).format('YYYY-MM-DD') === todayKey),
    [items, todayKey],
  );
  const upcoming = useMemo(
    () =>
      items
        .filter(
          (a) =>
            dayjs(a.scheduled_at).isAfter(dayjs()) &&
            ['pending', 'approved', 'confirmed', 'rescheduled'].includes(a.status),
        )
        .sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at))
        .slice(0, 8),
    [items],
  );
  const completed = items.filter((a) => a.status === 'completed').length;
  const cancelled = items.filter((a) => a.status === 'cancelled' || a.status === 'rejected').length;

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Doctor dashboard</Typography>
      <Typography color="text.secondary">Dr. {user?.full_name}</Typography>
      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={6} md={2}>
          <StatCard label="Today's appointments" value={today.length} to="/doctor/queue" />
        </Grid>
        <Grid item xs={6} md={2}>
          <StatCard label="Upcoming" value={upcoming.length} to="/doctor/calendar" />
        </Grid>
        <Grid item xs={6} md={2}>
          <StatCard label="Completed" value={completed} />
        </Grid>
        <Grid item xs={6} md={2}>
          <StatCard label="Cancelled" value={cancelled} />
        </Grid>
        <Grid item xs={6} md={2}>
          <StatCard label="Prescription count" value={prescriptionCount} to="/doctor/prescriptions/new" />
        </Grid>
        <Grid item xs={6} md={2}>
          <StatCard label="Patient reviews" value={rating.toFixed(1)} />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Today's appointments
              </Typography>
              {today.length === 0 && <Typography color="text.secondary">No visits scheduled today.</Typography>}
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Patient</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Token</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {today
                    .sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at))
                    .map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{dayjs(a.scheduled_at).format('HH:mm')}</TableCell>
                        <TableCell>{a.patient_name || `#${a.patient_id}`}</TableCell>
                        <TableCell>
                          <Chip size="small" label={a.status} />
                        </TableCell>
                        <TableCell>{a.token_number ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upcoming appointments
              </Typography>
              {upcoming.length === 0 && <Typography color="text.secondary">Nothing upcoming.</Typography>}
              {upcoming.map((a) => (
                <Stack key={a.id} direction="row" justifyContent="space-between" sx={{ py: 1 }} borderBottom={1} borderColor="divider">
                  <Typography>
                    {a.patient_name || `Patient #${a.patient_id}`} · {dayjs(a.scheduled_at).format('ddd D MMM HH:mm')}
                  </Typography>
                  <Chip size="small" label={a.status} />
                </Stack>
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Availability calendar
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Weekly slots · manage in{' '}
                <Typography component={RouterLink} to="/doctor/availability" color="primary" variant="body2">
                  Availability
                </Typography>
              </Typography>
              {availability.length === 0 && <Typography color="text.secondary">No availability set.</Typography>}
              {availability
                .filter((s) => s.is_active)
                .map((s) => (
                  <Stack key={s.id} direction="row" justifyContent="space-between" sx={{ py: 0.75 }}>
                    <Typography fontWeight={600}>
                      {s.day_of_week != null ? DAY_NAMES[s.day_of_week] : s.specific_date || 'Date'}
                    </Typography>
                    <Typography variant="body2">
                      {String(s.start_time).slice(0, 5)} – {String(s.end_time).slice(0, 5)}
                    </Typography>
                  </Stack>
                ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
