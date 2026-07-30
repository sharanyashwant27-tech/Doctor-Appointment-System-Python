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
import { Appointment, Payment, appointmentsApi, paymentsApi } from '@services/endpoints';
import UpiPayDialog from '@components/UpiPayDialog';

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
      setError('Failed to load appointments');
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
        setMsg(`Appointment #${appointmentId} is already paid`);
        await load();
        return;
      }
      setActivePayment(p);
      setPayOpen(true);
    } catch (e) {
      setError(errMsg(e, 'Could not start UPI payment'));
    } finally {
      setPayingId(null);
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h4">My appointments</Typography>
      <Typography color="text.secondary">List + calendar-style schedule · Pay consultation fees via UPI</Typography>
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
              <Typography variant="caption">{a.status}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>
      {items.map((a) => (
        <Card key={a.id}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography fontWeight={600}>
                #{a.id} · {a.doctor_name || `Doctor #${a.doctor_id}`} · {a.status}
              </Typography>
              <Chip
                size="small"
                label={`Payment: ${a.payment_status || 'unpaid'}`}
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
                      await appointmentsApi.cancel(a.id, 'Patient cancelled');
                      await load();
                    } catch (e) {
                      setError(errMsg(e, 'Cancel failed'));
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button size="small" onClick={() => setRescheduleId(a.id)}>
                  Reschedule
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
                {payingId === a.id ? 'Opening UPI…' : 'Pay with UPI'}
              </Button>
            )}
            {(a.payment_status || '').toLowerCase() === 'paid' && (
              <Chip size="small" color="success" label="Paid" />
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
                    setError(errMsg(e, 'Reschedule failed'));
                  }
                }}
              >
                Save
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
          setMsg(`UPI payment successful · ${p.invoice_number || `Payment #${p.id}`}`);
          await load();
        }}
      />
    </Stack>
  );
}
