import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Appointment, appointmentsApi, paymentsApi } from '@services/endpoints';

export default function MyAppointments() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [error, setError] = useState('');
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);
  const [when, setWhen] = useState(dayjs().add(2, 'day').hour(11).minute(0).format('YYYY-MM-DDTHH:mm'));

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

  return (
    <Stack spacing={2}>
      <Typography variant="h4">My appointments</Typography>
      <Typography color="text.secondary">List + calendar-style schedule</Typography>
      {error && <Alert severity="error">{error}</Alert>}
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
            <Typography fontWeight={600}>
              #{a.id} · {a.doctor_name || `Doctor #${a.doctor_id}`} · {a.status}
            </Typography>
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
                    await appointmentsApi.cancel(a.id, 'Patient cancelled');
                    await load();
                  }}
                >
                  Cancel
                </Button>
                <Button size="small" onClick={() => setRescheduleId(a.id)}>
                  Reschedule
                </Button>
              </>
            )}
            {['approved', 'completed', 'rescheduled'].includes(a.status) && (
              <Button
                size="small"
                variant="outlined"
                onClick={async () => {
                  try {
                    const p = await paymentsApi.checkout(a.id);
                    if (p.status === 'pending') {
                      await paymentsApi.confirm(p.id);
                    }
                    alert('Payment confirmed');
                  } catch (err: unknown) {
                    alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Payment failed');
                  }
                }}
              >
                Pay
              </Button>
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
                  await appointmentsApi.reschedule(a.id, new Date(when).toISOString());
                  setRescheduleId(null);
                  await load();
                }}
              >
                Save
              </Button>
            </Stack>
          )}
        </Card>
      ))}
    </Stack>
  );
}
