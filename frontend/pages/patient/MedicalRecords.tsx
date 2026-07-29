import { Alert, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { MedicalRecord, recordsApi } from '@services/endpoints';
import { getAccessToken } from '@services/client';

export default function MedicalRecords() {
  const [items, setItems] = useState<MedicalRecord[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    recordsApi
      .list()
      .then(setItems)
      .catch(() => setError('Failed to load records'));
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Medical records</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {items.length === 0 && <Typography color="text.secondary">No records yet.</Typography>}
      {items.map((r) => (
        <Card key={r.id}>
          <CardContent>
            <Typography fontWeight={600}>
              Record #{r.id} · {r.doctor_name || `Doctor #${r.doctor_id}`}
            </Typography>
            <Typography variant="body2">Diagnosis: {r.diagnosis || '—'}</Typography>
            <Typography variant="body2">Symptoms: {r.symptoms || '—'}</Typography>
            <Typography variant="body2" color="text.secondary">
              {r.notes}
            </Typography>
            {(r.prescriptions || []).map((p) => (
              <Stack key={p.id} direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  Rx #{p.id}: {(p.medicines || []).map((m) => m.name).join(', ')}
                </Typography>
                <Button
                  size="small"
                  onClick={() => {
                    const token = getAccessToken();
                    window.open(`/api/v1/prescriptions/${p.id}/pdf?access_token=${token || ''}`, '_blank');
                    // Prefer authenticated fetch download
                    void fetch(`/api/v1/prescriptions/${p.id}/pdf`, {
                      headers: { Authorization: `Bearer ${token || ''}` },
                    })
                      .then((res) => res.blob())
                      .then((blob) => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `prescription-${p.id}.pdf`;
                        a.click();
                        URL.revokeObjectURL(url);
                      });
                  }}
                >
                  PDF
                </Button>
              </Stack>
            ))}
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
