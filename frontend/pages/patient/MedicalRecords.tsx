import { Alert, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MedicalRecord, recordsApi } from '@services/endpoints';
import { getAccessToken } from '@services/client';

export default function MedicalRecords() {
  const { t } = useTranslation();
  const [items, setItems] = useState<MedicalRecord[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    recordsApi
      .list()
      .then(setItems)
      .catch(() => setError(t('patient.records.loadFailed')));
  }, [t]);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">{t('patient.records.title')}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {items.length === 0 && <Typography color="text.secondary">{t('patient.records.empty')}</Typography>}
      {items.map((r) => (
        <Card key={r.id}>
          <CardContent>
            <Typography fontWeight={600}>
              {t('patient.records.recordLine', {
                id: r.id,
                doctor: r.doctor_name || t('patient.dashboard.doctorFallback', { id: r.doctor_id }),
              })}
            </Typography>
            <Typography variant="body2">
              {t('patient.records.diagnosis', { value: r.diagnosis || t('common.emDash') })}
            </Typography>
            <Typography variant="body2">
              {t('patient.records.symptoms', { value: r.symptoms || t('common.emDash') })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {r.notes}
            </Typography>
            {(r.prescriptions || []).map((p) => (
              <Stack key={p.id} direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  {t('patient.records.rxLine', {
                    id: p.id,
                    medicines: (p.medicines || []).map((m) => m.name).join(', '),
                  })}
                </Typography>
                <Button
                  size="small"
                  onClick={() => {
                    const token = getAccessToken();
                    window.open(`/api/v1/prescriptions/${p.id}/pdf?access_token=${token || ''}`, '_blank');
                    void fetch(`/api/v1/prescriptions/${p.id}/pdf`, {
                      headers: { Authorization: `Bearer ${token || ''}` },
                    })
                      .then((res) => res.blob())
                      .then((blob) => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `prescription-${p.id}.pdf`;
                        a.click();
                        URL.revokeObjectURL(url);
                      });
                  }}
                >
                  {t('patient.records.pdf')}
                </Button>
              </Stack>
            ))}
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
