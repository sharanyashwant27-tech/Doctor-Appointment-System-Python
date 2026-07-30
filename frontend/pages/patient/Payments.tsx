import { Alert, Button, Card, CardActions, CardContent, Chip, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Payment, paymentsApi } from '@services/endpoints';
import { downloadAuthed } from '@services/download';
import UpiPayDialog from '@components/UpiPayDialog';
import { tStatus } from '@/i18n';

function errMsg(e: unknown, fallback: string) {
  const ax = e as { response?: { data?: { message?: string; detail?: string } } };
  return ax.response?.data?.message || ax.response?.data?.detail || fallback;
}

export default function Payments() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Payment[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [payOpen, setPayOpen] = useState(false);
  const [activePayment, setActivePayment] = useState<Payment | null>(null);

  async function load() {
    try {
      setItems(await paymentsApi.list());
    } catch {
      setError(t('patient.payments.loadFailed'));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">{t('patient.payments.title')}</Typography>
      <Typography color="text.secondary">{t('patient.payments.subtitle')}</Typography>
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
      {items.length === 0 && <Alert severity="info">{t('patient.payments.empty')}</Alert>}
      {items.map((p) => (
        <Card key={p.id}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography fontWeight={600}>
                {p.invoice_number || t('patient.payments.paymentFallback', { id: p.id })}
              </Typography>
              <Chip
                size="small"
                label={tStatus(t, p.status)}
                color={p.status === 'success' ? 'success' : p.status === 'pending' ? 'warning' : 'default'}
              />
              <Chip size="small" variant="outlined" label={(p.payment_mode || p.gateway || 'upi').toUpperCase()} />
            </Stack>
            <Typography variant="body2">
              {t('patient.payments.amountLine', {
                amount: p.amount,
                currency: p.currency,
                appointmentId: p.appointment_id,
              })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {p.doctor_name || t('patient.payments.doctorFallback')} ·{' '}
              {p.paid_at ? new Date(p.paid_at).toLocaleString() : t('status.notPaidYet')}
            </Typography>
            {p.upi_vpa && p.status === 'pending' && (
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                {t('patient.payments.payToUpi', { vpa: p.upi_vpa })}
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
                {t('patient.payments.completeUpi')}
              </Button>
            )}
            {p.status === 'success' && (
              <Button
                size="small"
                onClick={async () => {
                  try {
                    await downloadAuthed(`/api/v1/payments/${p.id}/invoice.pdf`, `invoice-${p.id}.pdf`);
                    setMsg(t('patient.payments.invoiceDownloaded'));
                  } catch (e) {
                    setError(errMsg(e, t('patient.payments.invoiceFailed')));
                  }
                }}
              >
                {t('patient.payments.downloadInvoice')}
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
          setMsg(
            t('patient.payments.upiSuccess', {
              invoice: paid.invoice_number || `#${paid.id}`,
            }),
          );
          await load();
        }}
      />
    </Stack>
  );
}
