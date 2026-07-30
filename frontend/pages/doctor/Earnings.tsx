import { Alert, Card, CardContent, Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Payment, paymentsApi } from '@services/endpoints';
import { tStatus } from '@/i18n';

export default function Earnings() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Payment[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    paymentsApi
      .list()
      .then(setItems)
      .catch(() => setError(t('doctor.earnings.loadFailed')));
  }, [t]);

  const total = useMemo(
    () => items.filter((p) => p.status === 'success').reduce((s, p) => s + Number(p.amount), 0),
    [items],
  );

  return (
    <Stack spacing={2}>
      <Typography variant="h4">{t('doctor.earnings.title')}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Card>
        <CardContent>
          <Typography variant="h5">₹{total.toFixed(2)}</Typography>
          <Typography color="text.secondary">{t('doctor.earnings.successful')}</Typography>
        </CardContent>
      </Card>
      {items.map((p) => (
        <Card key={p.id}>
          <CardContent>
            <Typography>
              {p.invoice_number || `#${p.id}`} · ₹{p.amount} · {tStatus(t, p.status)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Appointment #{p.appointment_id} · {p.patient_name}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
