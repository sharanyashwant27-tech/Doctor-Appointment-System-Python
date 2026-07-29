import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { modulesApi } from '@services/endpoints';

export default function WaitingListPage() {
  const [items, setItems] = useState<Array<{ id: number; doctor_id: number; status: string; notes?: string }>>([]);
  const [doctorId, setDoctorId] = useState('1');
  const [error, setError] = useState('');

  async function load() {
    try {
      setItems(await modulesApi.waitingList());
    } catch {
      setError('Failed to load waiting list');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Waiting list</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction="row" spacing={1}>
        <TextField size="small" label="Doctor ID" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} />
        <Button
          variant="contained"
          onClick={async () => {
            await modulesApi.joinWaiting({ doctor_id: Number(doctorId) });
            await load();
          }}
        >
          Join waitlist
        </Button>
      </Stack>
      {items.map((i) => (
        <Stack key={i.id} direction="row" spacing={2} alignItems="center">
          <Typography>
            #{i.id} doctor {i.doctor_id} · {i.status}
          </Typography>
          {i.status === 'waiting' && (
            <Button size="small" onClick={async () => { await modulesApi.cancelWaiting(i.id); await load(); }}>
              Cancel
            </Button>
          )}
        </Stack>
      ))}
    </Stack>
  );
}
