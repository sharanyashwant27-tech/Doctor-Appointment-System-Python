import { Alert, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PharmacyOrder, MedicalRecord, pharmacyApi, recordsApi } from '@services/endpoints';
import { tStatus } from '@/i18n';

function errMsg(e: unknown, fallback: string) {
  const ax = e as { response?: { data?: { message?: string; detail?: string } } };
  return ax.response?.data?.message || ax.response?.data?.detail || fallback;
}

export default function PatientPharmacy() {
  const { t } = useTranslation();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function reload() {
    setRecords(await recordsApi.list());
    setOrders(await pharmacyApi.orders());
  }

  useEffect(() => {
    reload().catch(() => setErr(t('patient.pharmacy.loadFailed')));
  }, [t]);

  const prescriptions = records.flatMap((r) =>
    (r.prescriptions || []).map((p) => ({
      ...p,
      doctor_name: r.doctor_name,
      diagnosis: r.diagnosis,
    })),
  );

  return (
    <Stack spacing={2}>
      <Typography variant="h4">{t('patient.pharmacy.title')}</Typography>
      <Typography color="text.secondary">{t('patient.pharmacy.subtitle')}</Typography>
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

      <Typography variant="h6">{t('patient.pharmacy.myRx')}</Typography>
      {prescriptions.length === 0 && (
        <Alert severity="info">{t('patient.pharmacy.noRx')}</Alert>
      )}
      {prescriptions.map((p) => (
        <Card key={p.id}>
          <CardContent>
            <Typography fontWeight={600}>
              {t('patient.pharmacy.rxTitle', { id: p.id })}
              {p.doctor_name ? ` · ${p.doctor_name}` : ''}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {p.diagnosis || t('patient.pharmacy.clinicalRx')} ·{' '}
              {(p.medicines || []).map((m) => m.name).filter(Boolean).join(', ') || t('common.emDash')}
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
                      ? t('patient.pharmacy.fulfillmentRequested', { orderNumber: o.order_number })
                      : t('patient.pharmacy.orderStatus', {
                          orderNumber: o.order_number,
                          status: tStatus(t, o.status),
                        }),
                  );
                  await reload();
                } catch (e) {
                  setErr(errMsg(e, t('patient.pharmacy.requestFailed')));
                }
              }}
            >
              {t('patient.pharmacy.requestFulfillment')}
            </Button>
          </CardContent>
        </Card>
      ))}

      <Typography variant="h6">{t('patient.pharmacy.myOrders')}</Typography>
      {orders.length === 0 && (
        <Typography color="text.secondary">{t('patient.pharmacy.noOrders')}</Typography>
      )}
      {orders.map((o) => (
        <Card key={o.id}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography fontWeight={600}>
                {o.order_number} · ₹{o.total_amount}
              </Typography>
              <Chip
                size="small"
                label={tStatus(t, o.status)}
                color={o.status === 'dispensed' ? 'success' : o.status === 'pending' ? 'warning' : 'default'}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {o.items.map((it) => `${it.medicine_name}×${it.qty}`).join(', ') ||
                t('patient.pharmacy.awaitingMatch')}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
