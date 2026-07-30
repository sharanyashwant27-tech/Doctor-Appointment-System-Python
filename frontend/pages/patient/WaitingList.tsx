import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { modulesApi } from '@services/endpoints';
import { tStatus } from '@/i18n';

export default function WaitingListPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Array<{ id: number; doctor_id: number; status: string; notes?: string }>>([]);
  const [doctorId, setDoctorId] = useState('1');
  const [error, setError] = useState('');

  async function load() {
    try {
      setItems(await modulesApi.waitingList());
    } catch {
      setError(t('patient.waitlist.loadFailed'));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">{t('patient.waitlist.title')}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          label={t('patient.waitlist.doctorId')}
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
        />
        <Button
          variant="contained"
          onClick={async () => {
            await modulesApi.joinWaiting({ doctor_id: Number(doctorId) });
            await load();
          }}
        >
          {t('patient.waitlist.join')}
        </Button>
      </Stack>
      {items.map((i) => (
        <Stack key={i.id} direction="row" spacing={2} alignItems="center">
          <Typography>
            {t('patient.waitlist.itemLine', {
              id: i.id,
              doctorId: i.doctor_id,
              status: tStatus(t, i.status),
            })}
          </Typography>
          {i.status === 'waiting' && (
            <Button
              size="small"
              onClick={async () => {
                await modulesApi.cancelWaiting(i.id);
                await load();
              }}
            >
              {t('patient.waitlist.cancel')}
            </Button>
          )}
        </Stack>
      ))}
    </Stack>
  );
}
