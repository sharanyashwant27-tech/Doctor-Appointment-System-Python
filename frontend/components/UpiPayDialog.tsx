import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Payment, paymentsApi } from '@services/endpoints';
import { qrImageUrl } from '@services/download';

type Props = {
  open: boolean;
  payment: Payment | null;
  onClose: () => void;
  onPaid: (payment: Payment) => void;
};

function errMsg(e: unknown, fallback: string) {
  const ax = e as { response?: { data?: { message?: string; detail?: string } } };
  return ax.response?.data?.message || ax.response?.data?.detail || fallback;
}

export default function UpiPayDialog({ open, payment, onClose, onPaid }: Props) {
  const { t, i18n } = useTranslation();
  const [upiRef, setUpiRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  if (!payment) return null;

  const vpa = payment.upi_vpa || t('upi.defaultVpa');
  const payee = payment.upi_payee_name || t('upi.defaultPayee');
  const qrData = payment.upi_qr_data || payment.upi_link || '';
  const link = payment.upi_link || '';
  const locale = i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-IN';

  async function copyVpa() {
    try {
      await navigator.clipboard.writeText(vpa);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t('upi.errorCopy'));
    }
  }

  async function confirmPaid() {
    if (!payment) return;
    const current = payment;
    setBusy(true);
    setError('');
    try {
      const done = await paymentsApi.confirm(current.id, upiRef.trim() || undefined);
      onPaid(done);
      setUpiRef('');
      onClose();
    } catch (e) {
      setError(errMsg(e, t('upi.errorConfirm')));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('upi.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="h5" fontWeight={700}>
            ₹{Number(payment.amount).toLocaleString(locale)} {payment.currency || 'INR'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('upi.appointmentLine', { id: payment.appointment_id })}
            {payment.doctor_name ? ` · ${payment.doctor_name}` : ''}
          </Typography>
          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          <Alert severity="info">
            {payment.payment_instructions || t('upi.defaultInstructions', { vpa })}
          </Alert>
          {qrData && (
            <Box
              component="img"
              alt={t('upi.qrAlt')}
              src={qrImageUrl(qrData, 220)}
              sx={{
                width: 220,
                height: 220,
                alignSelf: 'center',
                bgcolor: '#fff',
                p: 1,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
          )}
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {t('upi.idLabel', { payee })}
              </Typography>
              <Typography fontWeight={600} sx={{ wordBreak: 'break-all' }}>
                {vpa}
              </Typography>
            </Box>
            <IconButton aria-label={t('upi.copyAria')} onClick={copyVpa} size="small">
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Stack>
          {copied && (
            <Typography variant="caption" color="success.main">
              {t('upi.copied')}
            </Typography>
          )}
          <Button
            variant="outlined"
            disabled={!link}
            onClick={() => {
              window.location.href = link;
            }}
          >
            {t('upi.openApp')}
          </Button>
          <TextField
            label={t('upi.refLabel')}
            value={upiRef}
            onChange={(e) => setUpiRef(e.target.value)}
            fullWidth
            helperText={t('upi.refHelper')}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>
          {t('common.cancel')}
        </Button>
        <Button variant="contained" onClick={confirmPaid} disabled={busy}>
          {busy ? t('upi.confirming') : t('upi.confirmPaid')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
