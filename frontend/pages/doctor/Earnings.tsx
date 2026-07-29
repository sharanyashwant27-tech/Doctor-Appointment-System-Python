import { Alert, Card, CardContent, Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Payment, paymentsApi } from '@services/endpoints';

export default function Earnings() {
  const [items, setItems] = useState<Payment[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    paymentsApi
      .list()
      .then(setItems)
      .catch(() => setError('Failed to load earnings'));
  }, []);

  const total = useMemo(
    () => items.filter((p) => p.status === 'success').reduce((s, p) => s + Number(p.amount), 0),
    [items],
  );

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Earnings</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Card>
        <CardContent>
          <Typography variant="h5">₹{total.toFixed(2)}</Typography>
          <Typography color="text.secondary">Successful payments</Typography>
        </CardContent>
      </Card>
      {items.map((p) => (
        <Card key={p.id}>
          <CardContent>
            <Typography>
              {p.invoice_number || `#${p.id}`} · ₹{p.amount} · {p.status}
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
