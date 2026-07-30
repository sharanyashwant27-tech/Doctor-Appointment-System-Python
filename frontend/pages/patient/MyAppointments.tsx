import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Appointment, Payment, appointmentsApi, paymentsApi } from '@services/endpoints';
import UpiPayDialog from '@components/UpiPayDialog';
import { tStatus } from '@/i18n';

const PAYABLE_STATUSES = new Set(['approved', 'confirmed', 'completed', 'rescheduled']);
const UNPAID = new Set(['unpaid', 'pending', 'failed', '', undefined, null]);

function canPay(a: Appointment) {
  const pay = (a.payment_status || 'unpaid').toLowerCase();
  return PAYABLE_STATUSES.has(a.status) && UNPAID.has(pay as string);
}

function errMsg(e: unknown, fallback: string) {
  const ax = e as { response?: { data?: { message?: string; detail?: string } } };
  return ax.response?.data?.message || ax.response?.data?.detail || fallback;
}

export default function MyAppointments() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Appointment[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);
  const [when, setWhen] = useState(dayjs().add(2, 'day').hour(11).minute(0).format('YYYY-MM-DDTHH:mm'));
  const [payOpen, setPayOpen] = useState(false);
  const [activePayment, setActivePayment] = useState<Payment | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);

  async function load() {
    try {
      setItems(await appointmentsApi.list());
    } catch {
      setError(t('patient.appointments.loadFailed'));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function startUpiPay(appointmentId: number) {
    setPayingId(appointmentId);
    setError('');
    try {
      const p = await paymentsApi.checkout(appointmentId);
      if (p.status === 'success') {
        setMsg(t('patient.appointments.alreadyPaid', { id: appointmentId }));
        await load();
        return;
      }
      setActivePayment(p);
      setPayOpen(true);
    } catch (e) {
      setError(errMsg(e, t('patient.appointments.upiStartFailed')));
    } finally {
      setPayingId(null);
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h4">{t('patient.appointments.title')}</Typography>
      <Typography color="text.secondary">{t('patient.appointments.subtitle')}</Typography>
      {msg && (
        <Alert severity="success" onClose={() => setMsg('')}>
          {msg}
        </Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <Stack direction="row" flexWrap="wrap" gap={1}>
        {items.map((a) => (
          <Card key={`cal-${a.id}`} sx={{ minWidth: 140, bgcolor: 'action.hover' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption">{dayjs(a.scheduled_at).format('ddd D MMM')}</Typography>
              <Typography variant="body2" fontWeight={600}>
                {dayjs(a.scheduled_at).format('HH:mm')}
              </Typography>
              <Typography variant="caption">{tStatus(t, a.status)}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>
      {items.map((a) => (
        <Card key={a.id}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography fontWeight={600}>
                #{a.id} · {a.doctor_name || t('patient.appointments.doctorFallback', { id: a.doctor_id })} ·{' '}
                {tStatus(t, a.status)}
              </Typography>
              <Chip
                size="small"
                label={t('status.paymentPrefix', {
                  status: tStatus(t, a.payment_status || 'unpaid'),
                })}
                color={(a.payment_status || 'unpaid') === 'paid' ? 'success' : 'warning'}
                variant="outlined"
              />
            </Stack>
            <Typography variant="body2">{new Date(a.scheduled_at).toLocaleString()}</Typography>
            <Typography variant="body2" color="text.secondary">
              {a.reason}
            </Typography>
          </CardContent>
          <CardActions>
            {!['cancelled', 'rejected', 'completed'].includes(a.status) && (
              <>
                <Button
                  size="small"
                  onClick={async () => {
                    try {
                      await appointmentsApi.cancel(a.id, t('patient.appointments.cancelReason'));
                      await load();
                    } catch (e) {
                      setError(errMsg(e, t('patient.appointments.cancelFailed')));
                    }
                  }}
                >
                  {t('patient.appointments.cancel')}
                </Button>
                <Button size="small" onClick={() => setRescheduleId(a.id)}>
                  {t('patient.appointments.reschedule')}
                </Button>
              </>
            )}
            {canPay(a) && (
              <Button
                size="small"
                variant="contained"
                disabled={payingId === a.id}
                onClick={() => startUpiPay(a.id)}
              >
                {payingId === a.id ? t('patient.appointments.openingUpi') : t('patient.appointments.payUpi')}
              </Button>
            )}
            {(a.payment_status || '').toLowerCase() === 'paid' && (
              <Chip size="small" color="success" label={tStatus(t, 'paid')} />
            )}
          </CardActions>
          {rescheduleId === a.id && (
            <Stack direction="row" spacing={1} sx={{ px: 2, pb: 2 }}>
              <TextField
                type="datetime-local"
                size="small"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={async () => {
                  try {
                    await appointmentsApi.reschedule(a.id, new Date(when).toISOString());
                    setRescheduleId(null);
                    await load();
                  } catch (e) {
                    setError(errMsg(e, t('patient.appointments.rescheduleFailed')));
                  }
                }}
              >
                {t('patient.appointments.save')}
              </Button>
            </Stack>
          )}
        </Card>
      ))}

      <UpiPayDialog
        open={payOpen}
        payment={activePayment}
        onClose={() => {
          setPayOpen(false);
          setActivePayment(null);
        }}
        onPaid={async (p) => {
          setMsg(
            t('patient.appointments.upiSuccess', {
              invoice: p.invoice_number || t('patient.payments.paymentFallback', { id: p.id }),
            }),
          );
          await load();
        }}
      />
    </Stack>
  );
}
