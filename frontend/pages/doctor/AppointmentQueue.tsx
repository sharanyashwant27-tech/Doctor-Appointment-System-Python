import { Alert, Button, Card, CardActions, CardContent, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Appointment, appointmentsApi, recordsApi } from '@services/endpoints';
import { tStatus } from '@/i18n';

export default function AppointmentQueue() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Appointment[]>([]);
  const [error, setError] = useState('');
  const [todayOnly, setTodayOnly] = useState(true);

  async function load() {
    try {
      setItems(await appointmentsApi.list());
    } catch {
      setError(t('doctor.queue.loadFailed'));
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
        <Typography variant="h4">{t('doctor.queue.title')}</Typography>
        <FormControlLabel
          control={<Switch checked={todayOnly} onChange={(e) => setTodayOnly(e.target.checked)} />}
          label={t('doctor.queue.todayOnly')}
        />
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {visible.map((a) => (
        <Card key={a.id}>
          <CardContent>
            <Typography fontWeight={600}>
              {t('doctor.queue.cardLine', {
                id: a.id,
                token: a.token_number ?? t('common.emDash'),
                patient: a.patient_name || t('doctor.queue.patientFallback', { id: a.patient_id }),
                status: tStatus(t, a.status),
              })}
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
                  {t('doctor.queue.approve')}
                </Button>
                <Button
                  size="small"
                  color="warning"
                  onClick={async () => {
                    await appointmentsApi.reject(a.id, t('doctor.queue.rejectReason'));
                    await load();
                  }}
                >
                  {t('doctor.queue.reject')}
                </Button>
              </>
            )}
            {['approved', 'confirmed', 'rescheduled', 'pending'].includes(a.status) && (
              <>
                <Button
                  size="small"
                  color="error"
                  onClick={async () => {
                    await appointmentsApi.cancel(a.id, t('doctor.queue.cancelReason'));
                    await load();
                  }}
                >
                  {t('doctor.queue.cancel')}
                </Button>
                <Button size="small" color="warning" onClick={async () => { await appointmentsApi.noShow(a.id); await load(); }}>
                  {t('doctor.queue.noShow')}
                </Button>
              </>
            )}
            {['approved', 'confirmed', 'rescheduled'].includes(a.status) && (
              <Button
                size="small"
                onClick={async () => {
                  await appointmentsApi.complete(a.id, t('doctor.queue.completeNote'));
                  await recordsApi.create({
                    appointment_id: a.id,
                    diagnosis: t('doctor.queue.autoDiagnosis'),
                    symptoms: a.reason || '',
                    notes: t('doctor.queue.autoNotes'),
                  });
                  await load();
                }}
              >
                {t('doctor.queue.completeRecord')}
              </Button>
            )}
          </CardActions>
        </Card>
      ))}
    </Stack>
  );
}
