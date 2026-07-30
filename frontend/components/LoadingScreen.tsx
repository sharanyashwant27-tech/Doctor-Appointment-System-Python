import { Box, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function LoadingScreen({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <Box minHeight="40vh" display="flex" flexDirection="column" alignItems="center" justifyContent="center" gap={2}>
      <CircularProgress />
      <Typography color="text.secondary">{label ?? t('common.loading')}</Typography>
    </Box>
  );
}
