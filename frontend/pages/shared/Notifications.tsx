import { Alert, Button, Card, CardActions, CardContent, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Notification, notificationsApi } from '@services/endpoints';

export default function Notifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      setItems(await notificationsApi.list());
    } catch {
      setError('Failed to load notifications');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">Notifications</Typography>
        <Button
          onClick={async () => {
            await notificationsApi.readAll();
            await load();
          }}
        >
          Mark all read
        </Button>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {items.map((n) => (
        <Card key={n.id} sx={{ opacity: n.is_read ? 0.7 : 1 }}>
          <CardContent>
            <Typography fontWeight={600}>{n.title}</Typography>
            <Typography variant="body2">{n.message}</Typography>
            <Typography variant="caption" color="text.secondary">
              {n.created_at ? new Date(n.created_at).toLocaleString() : ''} · {n.channel}
            </Typography>
          </CardContent>
          {!n.is_read && (
            <CardActions>
              <Button
                size="small"
                onClick={async () => {
                  await notificationsApi.markRead(n.id);
                  await load();
                }}
              >
                Mark read
              </Button>
            </CardActions>
          )}
        </Card>
      ))}
    </Stack>
  );
}
