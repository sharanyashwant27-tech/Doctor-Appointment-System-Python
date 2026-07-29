import { Alert, Button, Card, CardActions, CardContent, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Doctor, adminApi, doctorsApi } from '@services/endpoints';

export default function DoctorsVerification() {
  const [items, setItems] = useState<Doctor[]>([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      setItems(await doctorsApi.list());
    } catch {
      setError('Failed to load doctors');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Doctor verification</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {items.map((d) => (
        <Card key={d.id}>
          <CardContent>
            <Typography fontWeight={600}>
              {d.full_name} · {d.specialty}
            </Typography>
            <Typography variant="body2">
              {d.city} · {d.is_verified ? 'Verified' : 'Unverified'}
            </Typography>
          </CardContent>
          <CardActions>
            <Button
              size="small"
              variant="contained"
              disabled={d.is_verified}
              onClick={async () => {
                await adminApi.verifyDoctor(d.id, true);
                await load();
              }}
            >
              Verify
            </Button>
            <Button
              size="small"
              disabled={!d.is_verified}
              onClick={async () => {
                await adminApi.verifyDoctor(d.id, false);
                await load();
              }}
            >
              Unverify
            </Button>
          </CardActions>
        </Card>
      ))}
    </Stack>
  );
}
