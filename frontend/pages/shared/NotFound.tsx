import { Typography, Paper } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function Page() {
  const { t } = useTranslation();
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {t('shared.notFound.title')}
      </Typography>
      <Typography color="text.secondary">{t('shared.notFound.body')}</Typography>
    </Paper>
  );
}
