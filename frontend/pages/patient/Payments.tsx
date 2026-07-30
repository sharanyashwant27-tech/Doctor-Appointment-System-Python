import { Alert, Button, Card, CardActions, CardContent, Chip, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Payment, paymentsApi } from '@services/endpoints';
import { downloadAuthed } from '@services/download';
import UpiPayDialog from '@components/UpiPayDialog';

function errMsg(e: unknown, fallback: string) {
  const ax = e as { response?: { data?: { message?: string; detail?: string } } };
  return ax.response?.data?.message || ax.response?.data?.detail || fallback;
}

export default function Payments() {
  const [items, setItems] = useState<Payment[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [payOpen, setPayOpen] = useState(false);
  const [activePayment, setActivePayment] = useState<Payment | null>(null);

  async function load() {
    try {
      setItems(await paymentsApi.list());
    } catch {
      setError('Failed to load payments');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Payment history</Typography>
      <Typography color="text.secondary">UPI payments, invoices, and pending checkouts</Typography>
      {msg && (
        <Alert severity="success" onClose={() => setMsg('')}>
          {msg}
        </Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {items.length === 0 && <Alert severity="info">No payments yet. Pay from My appointments.</Alert>}
      {items.map((p) => (
        <Card key={p.id}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography fontWeight={600}>
                {p.invoice_number || `Payment #${p.id}`}
              </Typography>
              <Chip
                size="small"
                label={p.status}
                color={p.status === 'success' ? 'success' : p.status === 'pending' ? 'warning' : 'default'}
              />
              <Chip size="small" variant="outlined" label={(p.payment_mode || p.gateway || 'upi').toUpperCase()} />
            </Stack>
            <Typography variant="body2">
              ₹{p.amount} {p.currency} · Appointment #{p.appointment_id}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {p.doctor_name || 'Doctor'} · {p.paid_at ? new Date(p.paid_at).toLocaleString() : 'Not paid yet'}
            </Typography>
            {p.upi_vpa && p.status === 'pending' && (
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                Pay to UPI: {p.upi_vpa}
              </Typography>
            )}
          </CardContent>
          <CardActions>
            {p.status === 'pending' && (
              <Button
                size="small"
                variant="contained"
                onClick={() => {
                  setActivePayment(p);
                  setPayOpen(true);
                }}
              >
                Complete UPI payment
              </Button>
            )}
            {p.status === 'success' && (
              <Button
                size="small"
                onClick={async () => {
                  try {
                    await downloadAuthed(`/api/v1/payments/${p.id}/invoice.pdf`, `invoice-${p.id}.pdf`);
                    setMsg('Invoice downloaded');
                  } catch (e) {
                    setError(errMsg(e, 'Invoice download failed'));
                  }
                }}
              >
                Download invoice
              </Button>
            )}
          </CardActions>
        </Card>
      ))}

      <UpiPayDialog
        open={payOpen}
        payment={activePayment}
        onClose={() => {
          setPayOpen(false);
          setActivePayment(null);
        }}
        onPaid={async (paid) => {
          setMsg(`UPI payment successful · ${paid.invoice_number || `#${paid.id}`}`);
          await load();
        }}
      />
    </Stack>
  );
}
