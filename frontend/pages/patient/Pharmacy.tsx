import { Alert, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { PharmacyOrder, MedicalRecord, pharmacyApi, recordsApi } from '@services/endpoints';

function errMsg(e: unknown, fallback: string) {
  const ax = e as { response?: { data?: { message?: string; detail?: string } } };
  return ax.response?.data?.message || ax.response?.data?.detail || fallback;
}

export default function PatientPharmacy() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function reload() {
    setRecords(await recordsApi.list());
    setOrders(await pharmacyApi.orders());
  }

  useEffect(() => {
    reload().catch(() => setErr('Failed to load pharmacy'));
  }, []);

  const prescriptions = records.flatMap((r) =>
    (r.prescriptions || []).map((p) => ({
      ...p,
      doctor_name: r.doctor_name,
      diagnosis: r.diagnosis,
    })),
  );

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Pharmacy</Typography>
      <Typography color="text.secondary">
        Request fulfillment for your prescriptions and track pharmacy orders.
      </Typography>
      {msg && (
        <Alert severity="success" onClose={() => setMsg('')}>
          {msg}
        </Alert>
      )}
      {err && (
        <Alert severity="error" onClose={() => setErr('')}>
          {err}
        </Alert>
      )}

      <Typography variant="h6">My prescriptions</Typography>
      {prescriptions.length === 0 && (
        <Alert severity="info">No prescriptions yet. They appear after a completed visit.</Alert>
      )}
      {prescriptions.map((p) => (
        <Card key={p.id}>
          <CardContent>
            <Typography fontWeight={600}>
              Prescription #{p.id}
              {p.doctor_name ? ` · ${p.doctor_name}` : ''}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {p.diagnosis || 'Clinical Rx'} · {(p.medicines || []).map((m) => m.name).filter(Boolean).join(', ') || '—'}
            </Typography>
            <Button
              size="small"
              variant="contained"
              sx={{ mt: 1 }}
              onClick={async () => {
                try {
                  const o = await pharmacyApi.requestOrder(p.id);
                  setMsg(
                    o.status === 'pending'
                      ? `Fulfillment requested · ${o.order_number}`
                      : `Order ${o.order_number} · ${o.status}`,
                  );
                  await reload();
                } catch (e) {
                  setErr(errMsg(e, 'Request failed'));
                }
              }}
            >
              Request pharmacy fulfillment
            </Button>
          </CardContent>
        </Card>
      ))}

      <Typography variant="h6">My pharmacy orders</Typography>
      {orders.length === 0 && <Typography color="text.secondary">No pharmacy orders yet.</Typography>}
      {orders.map((o) => (
        <Card key={o.id}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography fontWeight={600}>
                {o.order_number} · ₹{o.total_amount}
              </Typography>
              <Chip
                size="small"
                label={o.status}
                color={o.status === 'dispensed' ? 'success' : o.status === 'pending' ? 'warning' : 'default'}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {o.items.map((it) => `${it.medicine_name}×${it.qty}`).join(', ') || 'Awaiting pharmacy matching'}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
