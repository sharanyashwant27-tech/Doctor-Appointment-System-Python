import {
  Alert,
  Card,
  CardContent,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { useEffect, useMemo, useState } from 'react';
import { Analytics, adminApi } from '@services/endpoints';

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h4" fontWeight={700}>
          {value}
        </Typography>
        <Typography color="text.secondary">{label}</Typography>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .analytics()
      .then(setData)
      .catch(() => setError('Failed to load analytics'));
  }, []);

  const statusPie = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.appointments_by_status).map(([label, value], id) => ({ id, value, label }));
  }, [data]);

  const dept = data?.department_performance?.length
    ? data.department_performance
    : (data?.appointments_by_specialty || []).map((s) => ({ department: s.specialty, count: s.count }));

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Admin dashboard</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {data && (
        <>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={4} md={2}>
              <StatCard label="Total doctors" value={data.doctors_total} />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <StatCard label="Total patients" value={data.patients_total} />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <StatCard label="Today's appointments" value={data.todays_appointments ?? 0} />
            </Grid>
            <Grid item xs={6} sm={4} md={3}>
              <StatCard label="Revenue" value={`₹${Number(data.payments_total).toLocaleString()}`} />
            </Grid>
            <Grid item xs={6} sm={4} md={3}>
              <StatCard label="Pending payments" value={data.pending_payments ?? 0} />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Appointment chart
                  </Typography>
                  {statusPie.length > 0 ? (
                    <PieChart series={[{ data: statusPie }]} height={280} />
                  ) : (
                    <Typography color="text.secondary">No appointment data</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Revenue graph
                  </Typography>
                  {(data.revenue_by_month || []).length > 0 ? (
                    <LineChart
                      xAxis={[{ scaleType: 'point', data: data.revenue_by_month.map((r) => r.month) }]}
                      series={[{ data: data.revenue_by_month.map((r) => r.revenue), label: 'Revenue' }]}
                      height={280}
                    />
                  ) : (
                    <Typography color="text.secondary">No revenue yet</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Department wise reports
                  </Typography>
                  <BarChart
                    xAxis={[{ scaleType: 'band', data: dept.map((d) => d.department) }]}
                    series={[{ data: dept.map((d) => d.count), label: 'Appointments' }]}
                    height={280}
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent activities
                  </Typography>
                  <List dense>
                    {(data.recent_activities || []).length === 0 && (
                      <Typography color="text.secondary">No recent activity</Typography>
                    )}
                    {(data.recent_activities || []).map((a) => (
                      <ListItem key={a.id} divider>
                        <ListItemText
                          primary={`${a.action} · ${a.entity_type}${a.entity_id ? ` #${a.entity_id}` : ''}`}
                          secondary={a.created_at ? new Date(a.created_at).toLocaleString() : ''}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Doctor performance
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Doctor</TableCell>
                    <TableCell align="right">Completed</TableCell>
                    <TableCell align="right">Cancelled</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                    <TableCell align="right">Rating</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data.doctor_performance || []).map((d) => (
                    <TableRow key={d.doctor_id}>
                      <TableCell>{d.doctor_name}</TableCell>
                      <TableCell align="right">{d.completed}</TableCell>
                      <TableCell align="right">{d.cancelled}</TableCell>
                      <TableCell align="right">₹{Number(d.revenue).toLocaleString()}</TableCell>
                      <TableCell align="right">{(d.rating ?? 0).toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </Stack>
  );
}
