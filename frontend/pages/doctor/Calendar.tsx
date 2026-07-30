import { Alert, Card, CardContent, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Appointment, appointmentsApi } from '@services/endpoints';
import { tStatus } from '@/i18n';

export default function DoctorCalendar() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Appointment[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    appointmentsApi
      .list()
      .then(setItems)
      .catch(() => setError(t('doctor.calendar.loadFailed')));
  }, [t]);

  const sorted = [...items].sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at));

  return (
    <Stack spacing={2}>
      <Typography variant="h4">{t('doctor.calendar.title')}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction="row" flexWrap="wrap" gap={1}>
        {sorted.map((a) => (
          <Card key={a.id} sx={{ width: 180 }}>
            <CardContent>
              <Typography variant="subtitle2">{dayjs(a.scheduled_at).format('ddd, D MMM')}</Typography>
              <Typography fontWeight={700}>{dayjs(a.scheduled_at).format('HH:mm')}</Typography>
              <Typography variant="body2">
                {a.patient_name || t('doctor.calendar.patientFallback', { id: a.patient_id })}
              </Typography>
              <Typography variant="caption">{tStatus(t, a.status)}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
