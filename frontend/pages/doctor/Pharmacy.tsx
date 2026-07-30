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
import { PharmacyMedicine, pharmacyApi } from '@services/endpoints';

export default function DoctorPharmacy() {
  const [meds, setMeds] = useState<PharmacyMedicine[]>([]);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');

  async function load(query?: string) {
    setMeds(await pharmacyApi.medicines(query ? { q: query } : undefined));
  }

  useEffect(() => {
    load().catch(() => setErr('Failed to load pharmacy stock'));
  }, []);

  const low = meds.filter((m) => m.low_stock);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Pharmacy stock</Typography>
      <Typography color="text.secondary">
        Read-only view of clinic inventory to inform prescribing. Low-stock items are highlighted.
      </Typography>
      {err && <Alert severity="error">{err}</Alert>}
      {low.length > 0 && (
        <Alert severity="warning">
          Low stock: {low.map((m) => m.name).join(', ')}
        </Alert>
      )}
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          label="Search medicine"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') load(q).catch(() => setErr('Search failed'));
          }}
        />
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Stock</TableCell>
            <TableCell>MRP</TableCell>
            <TableCell>Rx?</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {meds.map((m) => (
            <TableRow key={m.id}>
              <TableCell>
                {m.name}
                {m.low_stock && <Chip size="small" color="warning" label="Low" sx={{ ml: 1 }} />}
              </TableCell>
              <TableCell>{m.category || '—'}</TableCell>
              <TableCell>{m.stock_qty}</TableCell>
              <TableCell>₹{m.mrp}</TableCell>
              <TableCell>{m.requires_prescription ? 'Yes' : 'No'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}
