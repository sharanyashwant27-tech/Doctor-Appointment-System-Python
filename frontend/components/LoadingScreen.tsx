import { Box, CircularProgress, Typography } from '@mui/material';

export default function LoadingScreen({ label = 'Loading…' }: { label?: string }) {
  return (
    <Box minHeight="40vh" display="flex" flexDirection="column" alignItems="center" justifyContent="center" gap={2}>
      <CircularProgress />
      <Typography color="text.secondary">{label}</Typography>
    </Box>
  );
}
