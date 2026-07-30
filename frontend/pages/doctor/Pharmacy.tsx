import {
  Alert,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PharmacyMedicine, pharmacyApi } from '@services/endpoints';
import { tStatus } from '@/i18n';

export default function DoctorPharmacy() {
  const { t } = useTranslation();
  const [meds, setMeds] = useState<PharmacyMedicine[]>([]);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');

  async function load(query?: string) {
    setMeds(await pharmacyApi.medicines(query ? { q: query } : undefined));
  }

  useEffect(() => {
    load().catch(() => setErr(t('doctor.pharmacy.loadFailed')));
  }, [t]);

  const low = meds.filter((m) => m.low_stock);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">{t('doctor.pharmacy.title')}</Typography>
      <Typography color="text.secondary">{t('doctor.pharmacy.subtitle')}</Typography>
      {err && <Alert severity="error">{err}</Alert>}
      {low.length > 0 && (
        <Alert severity="warning">
          {t('doctor.pharmacy.lowStock', { names: low.map((m) => m.name).join(', ') })}
        </Alert>
      )}
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          label={t('doctor.pharmacy.search')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') load(q).catch(() => setErr(t('doctor.pharmacy.searchFailed')));
          }}
        />
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('doctor.pharmacy.colName')}</TableCell>
            <TableCell>{t('doctor.pharmacy.colCategory')}</TableCell>
            <TableCell>{t('doctor.pharmacy.colStock')}</TableCell>
            <TableCell>{t('doctor.pharmacy.colMrp')}</TableCell>
            <TableCell>{t('doctor.pharmacy.colRx')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {meds.map((m) => (
            <TableRow key={m.id}>
              <TableCell>
                {m.name}
                {m.low_stock && (
                  <Chip size="small" color="warning" label={tStatus(t, 'low')} sx={{ ml: 1 }} />
                )}
              </TableCell>
              <TableCell>{m.category || t('common.emDash')}</TableCell>
              <TableCell>{m.stock_qty}</TableCell>
              <TableCell>₹{m.mrp}</TableCell>
              <TableCell>{m.requires_prescription ? t('common.yes') : t('common.no')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}
