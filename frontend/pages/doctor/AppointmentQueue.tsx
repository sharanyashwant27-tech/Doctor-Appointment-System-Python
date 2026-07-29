import { Alert, Button, Card, CardActions, CardContent, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { Appointment, appointmentsApi, recordsApi } from '@services/endpoints';

export default function AppointmentQueue() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [error, setError] = useState('');
  const [todayOnly, setTodayOnly] = useState(true);

  async function load() {
    try {
      setItems(await appointmentsApi.list());
    } catch {
      setError('Failed to load queue');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    if (!todayOnly) return items;
    const today = dayjs().format('YYYY-MM-DD');
    return items.filter((a) => dayjs(a.scheduled_at).format('YYYY-MM-DD') === today);
  }, [items, todayOnly]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">Appointment queue</Typography>
        <FormControlLabel
          control={<Switch checked={todayOnly} onChange={(e) => setTodayOnly(e.target.checked)} />}
          label="Today only"
        />
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {visible.map((a) => (
        <Card key={a.id}>
          <CardContent>
            <Typography fontWeight={600}>
              #{a.id} · Token {a.token_number ?? '—'} · {a.patient_name || `Patient #${a.patient_id}`} · {a.status}
            </Typography>
            <Typography variant="body2">{new Date(a.scheduled_at).toLocaleString()}</Typography>
            <Typography variant="body2" color="text.secondary">
              {a.reason}
            </Typography>
          </CardContent>
          <CardActions>
            {a.status === 'pending' && (
              <>
                <Button size="small" variant="contained" onClick={async () => { await appointmentsApi.approve(a.id); await load(); }}>
                  Approve
                </Button>
                <Button size="small" color="warning" onClick={async () => { await appointmentsApi.reject(a.id, 'Unavailable'); await load(); }}>
                  Reject
                </Button>
              </>
            )}
            {['approved', 'confirmed', 'rescheduled', 'pending'].includes(a.status) && (
              <>
                <Button size="small" color="error" onClick={async () => { await appointmentsApi.cancel(a.id, 'Doctor cancelled'); await load(); }}>
                  Cancel
                </Button>
                <Button size="small" color="warning" onClick={async () => { await appointmentsApi.noShow(a.id); await load(); }}>
                  No-show
                </Button>
              </>
            )}
            {['approved', 'confirmed', 'rescheduled'].includes(a.status) && (
              <Button
                size="small"
                onClick={async () => {
                  await appointmentsApi.complete(a.id, 'Visit completed');
                  await recordsApi.create({
                    appointment_id: a.id,
                    diagnosis: 'Clinical assessment',
                    symptoms: a.reason || '',
                    notes: 'Auto-created on complete',
                  });
                  await load();
                }}
              >
                Complete + record
              </Button>
            )}
          </CardActions>
        </Card>
      ))}
    </Stack>
  );
}
