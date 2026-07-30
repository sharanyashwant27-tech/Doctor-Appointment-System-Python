import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { recordsApi } from '@services/endpoints';

export default function WritePrescription() {
  const { t } = useTranslation();
  const [recordId, setRecordId] = useState('');
  const [medicine, setMedicine] = useState('Paracetamol');
  const [dose, setDose] = useState('500mg');
  const [frequency, setFrequency] = useState('2x daily');
  const [duration, setDuration] = useState('5 days');
  const [instructions, setInstructions] = useState('After food');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      await recordsApi.addPrescription(Number(recordId), {
        medicines: [{ name: medicine, dose, frequency, duration }],
        instructions,
      });
      setMsg(t('doctor.prescribe.added'));
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || t('doctor.prescribe.failed'));
    }
  }

  return (
    <Stack spacing={2} maxWidth={480} component="form" onSubmit={onSubmit}>
      <Typography variant="h4">{t('doctor.prescribe.title')}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {msg && <Alert severity="success">{msg}</Alert>}
      <TextField
        label={t('doctor.prescribe.recordId')}
        value={recordId}
        onChange={(e) => setRecordId(e.target.value)}
        required
      />
      <TextField label={t('doctor.prescribe.medicine')} value={medicine} onChange={(e) => setMedicine(e.target.value)} />
      <TextField label={t('doctor.prescribe.dose')} value={dose} onChange={(e) => setDose(e.target.value)} />
      <TextField label={t('doctor.prescribe.frequency')} value={frequency} onChange={(e) => setFrequency(e.target.value)} />
      <TextField label={t('doctor.prescribe.duration')} value={duration} onChange={(e) => setDuration(e.target.value)} />
      <TextField
        label={t('doctor.prescribe.instructions')}
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
      />
      <Button type="submit" variant="contained">
        {t('doctor.prescribe.save')}
      </Button>
    </Stack>
  );
}
