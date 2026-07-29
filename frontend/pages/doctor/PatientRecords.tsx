import { Alert, Card, CardContent, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { MedicalRecord, recordsApi } from '@services/endpoints';

export default function PatientRecords() {
  const [items, setItems] = useState<MedicalRecord[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    recordsApi
      .list()
      .then(setItems)
      .catch(() => setError('Failed to load records'));
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Patient records</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {items.map((r) => (
        <Card key={r.id}>
          <CardContent>
            <Typography fontWeight={600}>
              #{r.id} · {r.patient_name || `Patient #${r.patient_id}`}
            </Typography>
            <Typography variant="body2">Diagnosis: {r.diagnosis}</Typography>
            <Typography variant="body2">Symptoms: {r.symptoms}</Typography>
            <Typography variant="body2" color="text.secondary">
              Prescriptions: {(r.prescriptions || []).length}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
