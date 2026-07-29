import { Alert, Card, CardContent, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Appointment, appointmentsApi } from '@services/endpoints';

export default function DoctorCalendar() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    appointmentsApi
      .list()
      .then(setItems)
      .catch(() => setError('Failed to load calendar'));
  }, []);

  const sorted = [...items].sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at));

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Calendar</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction="row" flexWrap="wrap" gap={1}>
        {sorted.map((a) => (
          <Card key={a.id} sx={{ width: 180 }}>
            <CardContent>
              <Typography variant="subtitle2">{dayjs(a.scheduled_at).format('ddd, D MMM')}</Typography>
              <Typography fontWeight={700}>{dayjs(a.scheduled_at).format('HH:mm')}</Typography>
              <Typography variant="body2">{a.patient_name || `Patient #${a.patient_id}`}</Typography>
              <Typography variant="caption">{a.status}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
