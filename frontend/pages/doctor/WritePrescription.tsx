import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import { FormEvent, useState } from 'react';
import { recordsApi } from '@services/endpoints';

export default function WritePrescription() {
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
      setMsg('Prescription added');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed');
    }
  }

  return (
    <Stack spacing={2} maxWidth={480} component="form" onSubmit={onSubmit}>
      <Typography variant="h4">Write prescription</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {msg && <Alert severity="success">{msg}</Alert>}
      <TextField label="Medical record ID" value={recordId} onChange={(e) => setRecordId(e.target.value)} required />
      <TextField label="Medicine" value={medicine} onChange={(e) => setMedicine(e.target.value)} />
      <TextField label="Dose" value={dose} onChange={(e) => setDose(e.target.value)} />
      <TextField label="Frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)} />
      <TextField label="Duration" value={duration} onChange={(e) => setDuration(e.target.value)} />
      <TextField label="Instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
      <Button type="submit" variant="contained">
        Save prescription
      </Button>
    </Stack>
  );
}
