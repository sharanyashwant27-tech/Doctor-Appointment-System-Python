import { Alert, Button, Card, CardActions, CardContent, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Notification, notificationsApi } from '@services/endpoints';

export default function Notifications() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Notification[]>([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      setItems(await notificationsApi.list());
    } catch {
      setError(t('shared.notifications.loadFailed'));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">{t('shared.notifications.title')}</Typography>
        <Button
          onClick={async () => {
            await notificationsApi.readAll();
            await load();
          }}
        >
          {t('shared.notifications.markAllRead')}
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
                {t('shared.notifications.markRead')}
              </Button>
            </CardActions>
          )}
        </Card>
      ))}
    </Stack>
  );
}
