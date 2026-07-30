import {
  Alert,
  Button,
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
import { Link as RouterLink, useNavigate } from 'react-router-dom';
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
import UpiPayDialog from '@components/UpiPayDialog';

const linkCardSx = {
  height: '100%',
  textDecoration: 'none',
  color: 'inherit',
  cursor: 'pointer',
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

export default function PatientDashboard() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [payOpen, setPayOpen] = useState(false);
  const [activePayment, setActivePayment] = useState<Payment | null>(null);

  async function reload() {
    const [a, r, p, n] = await Promise.all([
      appointmentsApi.list(),
      recordsApi.list(),
      paymentsApi.list(),
      notificationsApi.list(),
    ]);
    setAppointments(a);
    setRecords(r);
    setPayments(p);
    setNotifications(n);
  }

  useEffect(() => {
    reload().catch(() => setError('Could not load dashboard'));
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
        .filter(
          (a) =>
            ['completed', 'cancelled', 'no_show', 'rejected'].includes(a.status) ||
            dayjs(a.scheduled_at).isBefore(dayjs()),
        )
        .sort((a, b) => +new Date(b.scheduled_at) - +new Date(a.scheduled_at))
        .slice(0, 6),
    [appointments],
  );

  const prescriptions = useMemo(
    () =>
      records.flatMap((r) =>
        (r.prescriptions || []).map((p) => ({ ...p, doctor_name: r.doctor_name, record_id: r.id })),
      ),
    [records],
  );

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Patient dashboard</Typography>
      <Typography color="text.secondary">
        Welcome, {user?.full_name || 'Patient'} · Click any card to open its page
      </Typography>
      {msg && (
        <Alert severity="success" onClose={() => setMsg('')}>
          {msg}
        </Alert>
      )}
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
        <Grid item xs={6} sm={4} md={2}>
          <StatCard label="Payments" value={payments.length} to="/patient/payments" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard label="Prescriptions" value={prescriptions.length} to="/patient/pharmacy" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard label="Find doctors" value="Book" to="/patient/doctors" />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card sx={linkCardSx} onClick={() => navigate('/patient/appointments')}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upcoming appointment
              </Typography>
              {upcoming.length === 0 && (
                <Typography color="text.secondary">No upcoming visits. Book a doctor.</Typography>
              )}
              {upcoming.slice(0, 1).map((a) => (
                <Stack key={a.id} spacing={1}>
                  <Typography fontWeight={700}>
                    {a.doctor_name || `Doctor #${a.doctor_id}`} · {a.specialty || ''}
                  </Typography>
                  <Typography>{dayjs(a.scheduled_at).format('dddd, D MMM YYYY · HH:mm')}</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip size="small" label={a.status} sx={{ width: 'fit-content' }} />
                    <Chip
                      size="small"
                      variant="outlined"
                      color={(a.payment_status || 'unpaid') === 'paid' ? 'success' : 'warning'}
                      label={`Payment: ${a.payment_status || 'unpaid'}`}
                    />
                  </Stack>
                  {a.meeting_url && (
                    <Typography
                      variant="body2"
                      component="a"
                      href={a.meeting_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Join online consult
                    </Typography>
                  )}
                  {['approved', 'confirmed', 'rescheduled'].includes(a.status) &&
                    !['paid'].includes((a.payment_status || 'unpaid').toLowerCase()) && (
                      <Button
                        size="small"
                        variant="contained"
                        sx={{ alignSelf: 'flex-start' }}
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const p = await paymentsApi.checkout(a.id);
                            if (p.status === 'success') {
                              setMsg('Already paid');
                              await reload();
                              return;
                            }
                            setActivePayment(p);
                            setPayOpen(true);
                          } catch (err) {
                            const ax = err as { response?: { data?: { message?: string } } };
                            setError(ax.response?.data?.message || 'Could not start UPI payment');
                          }
                        }}
                      >
                        Pay with UPI
                      </Button>
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

          <Card
            sx={{ ...linkCardSx, mt: 2 }}
            onClick={() => navigate('/patient/appointments')}
          >
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Past visits
              </Typography>
              {pastVisits.length === 0 && (
                <Typography color="text.secondary">No past visits yet.</Typography>
              )}
              {pastVisits.map((a) => (
                <Stack
                  key={a.id}
                  direction="row"
                  justifyContent="space-between"
                  sx={{ py: 1 }}
                  borderBottom={1}
                  borderColor="divider"
                >
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
          <Card sx={linkCardSx} onClick={() => navigate('/patient/records')}>
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
              <Typography variant="body2" color="primary" sx={{ mt: 1, display: 'inline-block' }}>
                View all records →
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ ...linkCardSx, mt: 2 }} onClick={() => navigate('/patient/payments')}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Payments
              </Typography>
              {payments.length === 0 && <Typography color="text.secondary">No payments yet.</Typography>}
              {payments.slice(0, 4).map((p) => (
                <Stack
                  key={p.id}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ py: 1 }}
                  gap={1}
                >
                  <Typography variant="body2">
                    ₹{p.amount} · {p.invoice_number || `Pay #${p.id}`}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      size="small"
                      label={p.status}
                      color={p.status === 'success' ? 'success' : 'warning'}
                    />
                    {p.status === 'pending' && (
                      <Button
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePayment(p);
                          setPayOpen(true);
                        }}
                      >
                        Pay UPI
                      </Button>
                    )}
                  </Stack>
                </Stack>
              ))}
              <Typography variant="body2" color="primary">
                Payment history →
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ ...linkCardSx, mt: 2 }} onClick={() => navigate('/notifications')}>
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
              {notifications.length === 0 && (
                <Typography color="text.secondary">No notifications.</Typography>
              )}
              <Typography variant="body2" color="primary">
                Open inbox →
              </Typography>
            </CardContent>
          </Card>

          <Card
            component={RouterLink}
            to="/patient/advanced"
            sx={{ ...linkCardSx, display: 'block', mt: 2 }}
          >
            <CardContent>
              <Typography variant="h6">Advanced care tools</Typography>
              <Typography variant="body2" color="text.secondary">
                Video, chat, OCR, reminders, calendar
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <UpiPayDialog
        open={payOpen}
        payment={activePayment}
        onClose={() => {
          setPayOpen(false);
          setActivePayment(null);
        }}
        onPaid={async (paid) => {
          setMsg(`UPI payment successful · ${paid.invoice_number || `#${paid.id}`}`);
          await reload();
        }}
      />
    </Stack>
  );
}
