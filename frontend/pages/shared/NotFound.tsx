import { Typography, Paper } from '@mui/material';

export default function Page() {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        404 — Not Found
      </Typography>
      <Typography color="text.secondary">Placeholder page — implement in W4.</Typography>
    </Paper>
  );
}
