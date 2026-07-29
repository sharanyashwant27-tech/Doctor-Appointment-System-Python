import { Alert, Button, Card, CardActions, CardContent, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Payment, paymentsApi } from '@services/endpoints';
import { getAccessToken } from '@services/client';

export default function Payments() {
  const [items, setItems] = useState<Payment[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    paymentsApi
      .list()
      .then(setItems)
      .catch(() => setError('Failed to load payments'));
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Payment history</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {items.map((p) => (
        <Card key={p.id}>
          <CardContent>
            <Typography fontWeight={600}>
              {p.invoice_number || `Payment #${p.id}`} · {p.status}
            </Typography>
            <Typography variant="body2">
              ₹{p.amount} {p.currency} · Appointment #{p.appointment_id}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {p.doctor_name} · {p.paid_at ? new Date(p.paid_at).toLocaleString() : '—'}
            </Typography>
          </CardContent>
          <CardActions>
            {p.status === 'success' && (
              <Button
                size="small"
                onClick={() => {
                  const token = getAccessToken();
                  void fetch(`/api/v1/payments/${p.id}/invoice.pdf`, {
                    headers: { Authorization: `Bearer ${token || ''}` },
                  })
                    .then((res) => res.blob())
                    .then((blob) => {
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `invoice-${p.id}.pdf`;
                      a.click();
                      URL.revokeObjectURL(url);
                    });
                }}
              >
                Download invoice
              </Button>
            )}
          </CardActions>
        </Card>
      ))}
    </Stack>
  );
}
