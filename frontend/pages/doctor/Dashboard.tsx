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

const linkCardSx = {
  height: '100%',
  textDecoration: 'none',
  color: 'inherit',
  transition: 'box-shadow 0.15s, transform 0.15s',
  '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
} as const;

function StatCard({ label, value, to }: { label: string; value: string | number; to: string }) {
  return (
    <Card component={RouterLink} to={to} sx={linkCardSx}>
      <CardContent>
        <Typography variant="h4" fontWeight={700}>
          {value}
        </Typography>
        <Typography color="text.secondary">{label}</Typography>
      </CardContent>
    </Card>
  );
}

function SectionCard({
  title,
  to,
  children,
}: {
  title: string;
  to: string;
  children: React.ReactNode;
}) {
  return (
    <Card component={RouterLink} to={to} sx={{ ...linkCardSx, display: 'block' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
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
      <Typography color="text.secondary">
        Dr. {user?.full_name} · Click any card to open its page
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={6} md={2}>
          <StatCard label="Today's appointments" value={today.length} to="/doctor/queue" />
        </Grid>
        <Grid item xs={6} md={2}>
          <StatCard label="Upcoming" value={upcoming.length} to="/doctor/calendar" />
        </Grid>
        <Grid item xs={6} md={2}>
          <StatCard label="Completed" value={completed} to="/doctor/queue" />
        </Grid>
        <Grid item xs={6} md={2}>
          <StatCard label="Cancelled" value={cancelled} to="/doctor/queue" />
        </Grid>
        <Grid item xs={6} md={2}>
          <StatCard label="Prescription count" value={prescriptionCount} to="/doctor/prescriptions/new" />
        </Grid>
        <Grid item xs={6} md={2}>
          <StatCard label="Patient reviews" value={rating.toFixed(1)} to="/profile" />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <SectionCard title="Today's appointments" to="/doctor/queue">
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
          </SectionCard>
          <Card
            component={RouterLink}
            to="/doctor/calendar"
            sx={{ ...linkCardSx, display: 'block', mt: 2 }}
          >
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upcoming appointments
              </Typography>
              {upcoming.length === 0 && <Typography color="text.secondary">Nothing upcoming.</Typography>}
              {upcoming.map((a) => (
                <Stack
                  key={a.id}
                  direction="row"
                  justifyContent="space-between"
                  sx={{ py: 1 }}
                  borderBottom={1}
                  borderColor="divider"
                >
                  <Typography>
                    {a.patient_name || `Patient #${a.patient_id}`} ·{' '}
                    {dayjs(a.scheduled_at).format('ddd D MMM HH:mm')}
                  </Typography>
                  <Chip size="small" label={a.status} />
                </Stack>
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={5}>
          <SectionCard title="Availability calendar" to="/doctor/availability">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Weekly slots — open Availability to manage
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
          </SectionCard>
          <Card
            component={RouterLink}
            to="/doctor/pharmacy"
            sx={{ ...linkCardSx, display: 'block', mt: 2 }}
          >
            <CardContent>
              <Typography variant="h6">Pharmacy stock</Typography>
              <Typography color="text.secondary" variant="body2">
                Check medicine availability before prescribing
              </Typography>
            </CardContent>
          </Card>
          <Card
            component={RouterLink}
            to="/doctor/earnings"
            sx={{ ...linkCardSx, display: 'block', mt: 2 }}
          >
            <CardContent>
              <Typography variant="h6">Earnings</Typography>
              <Typography color="text.secondary" variant="body2">
                View consultation payments
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
