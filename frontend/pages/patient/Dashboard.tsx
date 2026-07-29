import {
  Alert,
  Card,
  CardContent,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Appointment,
  MedicalRecord,
  Notification,
  Payment,
  appointmentsApi,
  notificationsApi,
  paymentsApi,
  recordsApi,
} from '@services/endpoints';
import { useAuthContext } from '@context/AuthContext';

function StatCard({ label, value, to }: { label: string; value: string | number; to: string }) {
  return (
    <Card component={RouterLink} to={to} sx={{ height: '100%', textDecoration: 'none' }}>
      <CardContent>
        <Typography variant="h4" fontWeight={700}>
          {value}
        </Typography>
        <Typography color="text.secondary">{label}</Typography>
      </CardContent>
    </Card>
  );
}

export default function PatientDashboard() {
  const { user } = useAuthContext();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([appointmentsApi.list(), recordsApi.list(), paymentsApi.list(), notificationsApi.list()])
      .then(([a, r, p, n]) => {
        setAppointments(a);
        setRecords(r);
        setPayments(p);
        setNotifications(n);
      })
      .catch(() => setError('Could not load dashboard'));
  }, []);

  const upcoming = useMemo(
    () =>
      appointments
        .filter(
          (a) =>
            dayjs(a.scheduled_at).isAfter(dayjs().subtract(1, 'hour')) &&
            !['cancelled', 'rejected', 'completed', 'no_show'].includes(a.status),
        )
        .sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at)),
    [appointments],
  );

  const pastVisits = useMemo(
    () =>
      appointments
        .filter((a) => ['completed', 'cancelled', 'no_show', 'rejected'].includes(a.status) || dayjs(a.scheduled_at).isBefore(dayjs()))
        .sort((a, b) => +new Date(b.scheduled_at) - +new Date(a.scheduled_at))
        .slice(0, 6),
    [appointments],
  );

  const prescriptions = useMemo(
    () => records.flatMap((r) => (r.prescriptions || []).map((p) => ({ ...p, doctor_name: r.doctor_name, record_id: r.id }))),
    [records],
  );

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Patient dashboard</Typography>
      <Typography color="text.secondary">Welcome, {user?.full_name || 'Patient'}</Typography>
      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard label="Upcoming appointment" value={upcoming.length} to="/patient/appointments" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard label="Past visits" value={pastVisits.length} to="/patient/appointments" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard label="Medical records" value={records.length} to="/patient/records" />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <StatCard label="Payments" value={payments.length} to="/patient/payments" />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <StatCard label="Prescriptions" value={prescriptions.length} to="/patient/records" />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upcoming appointment
              </Typography>
              {upcoming.length === 0 && <Typography color="text.secondary">No upcoming visits. Book a doctor.</Typography>}
              {upcoming.slice(0, 1).map((a) => (
                <Stack key={a.id} spacing={1}>
                  <Typography fontWeight={700}>
                    {a.doctor_name || `Doctor #${a.doctor_id}`} · {a.specialty || ''}
                  </Typography>
                  <Typography>{dayjs(a.scheduled_at).format('dddd, D MMM YYYY · HH:mm')}</Typography>
                  <Chip size="small" label={a.status} sx={{ width: 'fit-content' }} />
                  {a.meeting_url && (
                    <Typography variant="body2" component="a" href={a.meeting_url} target="_blank" rel="noreferrer">
                      Join online consult
                    </Typography>
                  )}
                </Stack>
              ))}
              {upcoming.length > 1 && (
                <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">
                  +{upcoming.length - 1} more upcoming
                </Typography>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Past visits
              </Typography>
              {pastVisits.length === 0 && <Typography color="text.secondary">No past visits yet.</Typography>}
              {pastVisits.map((a) => (
                <Stack key={a.id} direction="row" justifyContent="space-between" sx={{ py: 1 }} borderBottom={1} borderColor="divider">
                  <Typography variant="body2">
                    {a.doctor_name || `Doctor #${a.doctor_id}`} · {dayjs(a.scheduled_at).format('D MMM YYYY')}
                  </Typography>
                  <Chip size="small" label={a.status} />
                </Stack>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Medical records & prescriptions
              </Typography>
              {records.length === 0 && <Typography color="text.secondary">No records yet.</Typography>}
              {records.slice(0, 4).map((r) => (
                <Stack key={r.id} sx={{ py: 1 }} borderBottom={1} borderColor="divider">
                  <Typography fontWeight={600}>
                    {r.diagnosis || 'Clinical note'} · {r.doctor_name || `Doctor #${r.doctor_id}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {(r.prescriptions || []).length} prescription(s)
                  </Typography>
                </Stack>
              ))}
              <Typography component={RouterLink} to="/patient/records" variant="body2" color="primary" sx={{ mt: 1, display: 'inline-block' }}>
                View all records
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Payments
              </Typography>
              {payments.length === 0 && <Typography color="text.secondary">No payments yet.</Typography>}
              {payments.slice(0, 4).map((p) => (
                <Stack key={p.id} direction="row" justifyContent="space-between" sx={{ py: 1 }}>
                  <Typography variant="body2">
                    ₹{p.amount} · {p.invoice_number || `Pay #${p.id}`}
                  </Typography>
                  <Chip size="small" label={p.status} color={p.status === 'success' ? 'success' : 'default'} />
                </Stack>
              ))}
              <Typography component={RouterLink} to="/patient/payments" variant="body2" color="primary">
                Payment history
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Notifications</Typography>
                {unread > 0 && <Chip size="small" color="primary" label={`${unread} unread`} />}
              </Stack>
              <List dense>
                {notifications.slice(0, 5).map((n) => (
                  <ListItem key={n.id} disableGutters>
                    <ListItemText
                      primary={n.title}
                      secondary={n.message}
                      primaryTypographyProps={{ fontWeight: n.is_read ? 400 : 700 }}
                    />
                  </ListItem>
                ))}
              </List>
              {notifications.length === 0 && <Typography color="text.secondary">No notifications.</Typography>}
              <Typography component={RouterLink} to="/notifications" variant="body2" color="primary">
                Open inbox
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
