import { Alert, Card, CardContent, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MedicalRecord, recordsApi } from '@services/endpoints';

export default function PatientRecords() {
  const { t } = useTranslation();
  const [items, setItems] = useState<MedicalRecord[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    recordsApi
      .list()
      .then(setItems)
      .catch(() => setError(t('doctor.records.loadFailed')));
  }, [t]);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">{t('doctor.records.title')}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {items.map((r) => (
        <Card key={r.id}>
          <CardContent>
            <Typography fontWeight={600}>
              {t('doctor.records.line', {
                id: r.id,
                patient: r.patient_name || t('doctor.records.patientFallback', { id: r.patient_id }),
              })}
            </Typography>
            <Typography variant="body2">{t('doctor.records.diagnosis', { value: r.diagnosis })}</Typography>
            <Typography variant="body2">{t('doctor.records.symptoms', { value: r.symptoms })}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('doctor.records.prescriptions', { count: (r.prescriptions || []).length })}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
