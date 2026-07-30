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
  const [upiRef, setUpiRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  if (!payment) return null;

  const vpa = payment.upi_vpa || 'medibook@upi';
  const payee = payment.upi_payee_name || 'MediBook Clinic';
  const qrData = payment.upi_qr_data || payment.upi_link || '';
  const link = payment.upi_link || '';

  async function copyVpa() {
    try {
      await navigator.clipboard.writeText(vpa);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy UPI ID');
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
      setError(errMsg(e, 'Could not confirm UPI payment'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Pay with UPI</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="h5" fontWeight={700}>
            ₹{Number(payment.amount).toLocaleString('en-IN')} {payment.currency || 'INR'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Appointment #{payment.appointment_id}
            {payment.doctor_name ? ` · ${payment.doctor_name}` : ''}
          </Typography>
          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          <Alert severity="info">
            {payment.payment_instructions ||
              `Scan the QR with GPay / PhonePe / Paytm, or pay to ${vpa}, then confirm below.`}
          </Alert>
          {qrData && (
            <Box
              component="img"
              alt="UPI QR code"
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
                UPI ID · {payee}
              </Typography>
              <Typography fontWeight={600} sx={{ wordBreak: 'break-all' }}>
                {vpa}
              </Typography>
            </Box>
            <IconButton aria-label="Copy UPI ID" onClick={copyVpa} size="small">
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Stack>
          {copied && (
            <Typography variant="caption" color="success.main">
              UPI ID copied
            </Typography>
          )}
          <Button
            variant="outlined"
            disabled={!link}
            onClick={() => {
              // Opens GPay/PhonePe/BHIM on mobile; on desktop shows app chooser / may no-op
              window.location.href = link;
            }}
          >
            Open UPI app
          </Button>
          <TextField
            label="UPI transaction / UTR (optional)"
            value={upiRef}
            onChange={(e) => setUpiRef(e.target.value)}
            fullWidth
            helperText="Paste the UPI reference from your app after paying"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" onClick={confirmPaid} disabled={busy}>
          {busy ? 'Confirming…' : 'I have paid — Confirm'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
