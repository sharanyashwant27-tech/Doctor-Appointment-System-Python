import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PharmacyMedicine,
  PharmacyOrder,
  PharmacyStats,
  pharmacyApi,
  recordsApi,
} from '@services/endpoints';

function errMsg(e: unknown, fallback: string) {
  const ax = e as { response?: { data?: { message?: string; detail?: string } } };
  return ax.response?.data?.message || ax.response?.data?.detail || fallback;
}

function Panel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

export default function AdminPharmacy() {
  const [tab, setTab] = useState(0);
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'low' | 'expiring'>('all');
  const [ordersFilter, setOrdersFilter] = useState<'all' | 'pending' | 'today'>('all');
  const [stats, setStats] = useState<PharmacyStats | null>(null);
  const [meds, setMeds] = useState<PharmacyMedicine[]>([]);
  const [suppliers, setSuppliers] = useState<Array<Record<string, unknown>>>([]);
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const [sku, setSku] = useState('');
  const [medName, setMedName] = useState('');
  const [mrp, setMrp] = useState('50');
  const [stockQty, setStockQty] = useState('100');
  const [reorder, setReorder] = useState('20');
  const [needsRx, setNeedsRx] = useState(false);

  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');

  const [purchaseMedId, setPurchaseMedId] = useState<number | ''>('');
  const [purchaseQty, setPurchaseQty] = useState('50');

  const [rxId, setRxId] = useState('');
  const [rxMatches, setRxMatches] = useState<Array<Record<string, unknown>>>([]);

  const [cart, setCart] = useState<Array<{ medicine_id: number; name: string; qty: number; mrp: number }>>([]);
  const [cartMedId, setCartMedId] = useState<number | ''>('');
  const [cartQty, setCartQty] = useState('1');
  const [customerName, setCustomerName] = useState('');

  const reload = useCallback(async () => {
    const [s, m, sup, o] = await Promise.all([
      pharmacyApi.stats(),
      pharmacyApi.medicines(q ? { q } : undefined),
      pharmacyApi.suppliers(),
      pharmacyApi.orders(),
    ]);
    setStats(s);
    setMeds(m);
    setSuppliers(sup);
    setOrders(o);
    if (m.length && !purchaseMedId) setPurchaseMedId(m[0].id);
    if (m.length && !cartMedId) setCartMedId(m[0].id);
  }, [q, purchaseMedId, cartMedId]);

  useEffect(() => {
    reload().catch((e) => setErr(errMsg(e, 'Failed to load pharmacy')));
  }, []);

  const lowStock = useMemo(() => meds.filter((m) => m.low_stock), [meds]);
  const cartTotal = useMemo(() => cart.reduce((s, c) => s + c.mrp * c.qty, 0), [cart]);

  const visibleMeds = useMemo(() => {
    const soon = Date.now() + 60 * 24 * 60 * 60 * 1000;
    if (inventoryFilter === 'low') return meds.filter((m) => m.low_stock);
    if (inventoryFilter === 'expiring') {
      return meds.filter((m) => m.expiry_date && new Date(m.expiry_date).getTime() <= soon);
    }
    return meds;
  }, [meds, inventoryFilter]);

  const visibleOrders = useMemo(() => {
    if (ordersFilter === 'pending') {
      return orders.filter((o) => o.status === 'pending' || o.status === 'ready');
    }
    if (ordersFilter === 'today') {
      const today = new Date().toDateString();
      return orders.filter((o) => {
        const when = o.dispensed_at || o.created_at;
        return when && new Date(when).toDateString() === today;
      });
    }
    return orders;
  }, [orders, ordersFilter]);

  function goToCard(kind: string) {
    switch (kind) {
      case 'Medicines':
        setInventoryFilter('all');
        setTab(0);
        break;
      case 'Low stock':
        setInventoryFilter('low');
        setTab(0);
        break;
      case 'Pending orders':
        setOrdersFilter('pending');
        setTab(2);
        break;
      case "Today's sales":
      case "Today's orders":
        setOrdersFilter('today');
        setTab(2);
        break;
      case 'Expiring soon':
        setInventoryFilter('expiring');
        setTab(0);
        break;
      default:
        break;
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Pharmacy management</Typography>
      <Typography color="text.secondary">
        Inventory, suppliers, prescription dispense, and walk-in POS. Click a card to open its section.
      </Typography>
      {msg && (
        <Alert severity="success" onClose={() => setMsg('')}>
          {msg}
        </Alert>
      )}
      {err && (
        <Alert severity="error" onClose={() => setErr('')}>
          {err}
        </Alert>
      )}

      {stats && (
        <Grid container spacing={2}>
          {[
            ['Medicines', stats.medicines_count],
            ['Low stock', stats.low_stock_count],
            ['Pending orders', stats.pending_orders],
            ["Today's sales", `₹${stats.today_sales}`],
            ["Today's orders", stats.today_orders],
            ['Expiring soon', stats.expiring_soon],
          ].map(([label, value]) => (
            <Grid item xs={6} sm={4} md={2} key={String(label)}>
              <Card
                onClick={() => goToCard(String(label))}
                sx={{
                  cursor: 'pointer',
                  transition: 'box-shadow 0.15s, transform 0.15s',
                  '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
                }}
              >
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="h5" fontWeight={700}>
                    {value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {lowStock.length > 0 && (
        <Alert
          severity="warning"
          action={
            <Button color="inherit" size="small" onClick={() => goToCard('Low stock')}>
              View
            </Button>
          }
        >
          Low stock: {lowStock.map((m) => `${m.name} (${m.stock_qty})`).join(', ')}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile>
        <Tab label="Inventory" />
        <Tab label="Suppliers" />
        <Tab label="Orders / Dispense" />
        <Tab label="Walk-in POS" />
      </Tabs>

      <Panel value={tab} index={0}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            <TextField size="small" label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button
              variant="outlined"
              onClick={() => reload().catch((e) => setErr(errMsg(e, 'Refresh failed')))}
            >
              Search / refresh
            </Button>
            <TextField
              select
              size="small"
              label="Filter"
              value={inventoryFilter}
              onChange={(e) => setInventoryFilter(e.target.value as 'all' | 'low' | 'expiring')}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="all">All medicines</MenuItem>
              <MenuItem value="low">Low stock</MenuItem>
              <MenuItem value="expiring">Expiring soon</MenuItem>
            </TextField>
          </Stack>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Add medicine
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
                <TextField size="small" label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
                <TextField size="small" label="Name" value={medName} onChange={(e) => setMedName(e.target.value)} />
                <TextField size="small" label="MRP" value={mrp} onChange={(e) => setMrp(e.target.value)} />
                <TextField
                  size="small"
                  label="Initial stock"
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                />
                <TextField
                  size="small"
                  label="Reorder level"
                  value={reorder}
                  onChange={(e) => setReorder(e.target.value)}
                />
                <TextField
                  select
                  size="small"
                  label="Needs Rx"
                  value={needsRx ? 'yes' : 'no'}
                  onChange={(e) => setNeedsRx(e.target.value === 'yes')}
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="no">No</MenuItem>
                  <MenuItem value="yes">Yes</MenuItem>
                </TextField>
                <Button
                  variant="contained"
                  onClick={async () => {
                    try {
                      await pharmacyApi.createMedicine({
                        sku,
                        name: medName,
                        mrp: Number(mrp),
                        stock_qty: Number(stockQty),
                        reorder_level: Number(reorder),
                        requires_prescription: needsRx,
                      });
                      setSku('');
                      setMedName('');
                      setMsg('Medicine added');
                      await reload();
                    } catch (e) {
                      setErr(errMsg(e, 'Create failed'));
                    }
                  }}
                >
                  Add
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Receive purchase stock
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <TextField
                  select
                  size="small"
                  label="Medicine"
                  value={purchaseMedId}
                  onChange={(e) => setPurchaseMedId(Number(e.target.value))}
                  sx={{ minWidth: 220 }}
                >
                  {meds.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.name} (stock {m.stock_qty})
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  label="Qty"
                  value={purchaseQty}
                  onChange={(e) => setPurchaseQty(e.target.value)}
                />
                <Button
                  variant="contained"
                  disabled={!purchaseMedId}
                  onClick={async () => {
                    try {
                      await pharmacyApi.purchase({
                        medicine_id: Number(purchaseMedId),
                        qty: Number(purchaseQty),
                      });
                      setMsg('Stock received');
                      await reload();
                    } catch (e) {
                      setErr(errMsg(e, 'Purchase failed'));
                    }
                  }}
                >
                  Receive
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>SKU</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Stock</TableCell>
                <TableCell>MRP</TableCell>
                <TableCell>Expiry</TableCell>
                <TableCell>Flags</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleMeds.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.sku}</TableCell>
                  <TableCell>
                    {m.name}
                    {m.generic_name ? ` (${m.generic_name})` : ''}
                  </TableCell>
                  <TableCell>{m.stock_qty}</TableCell>
                  <TableCell>₹{m.mrp}</TableCell>
                  <TableCell>{m.expiry_date || '—'}</TableCell>
                  <TableCell>
                    {m.low_stock && <Chip size="small" color="warning" label="Low" sx={{ mr: 0.5 }} />}
                    {m.requires_prescription && <Chip size="small" label="Rx" />}
                  </TableCell>
                </TableRow>
              ))}
              {visibleMeds.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography color="text.secondary">No medicines match this filter.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Stack>
      </Panel>

      <Panel value={tab} index={1}>
        <Stack spacing={2} maxWidth={640}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <TextField size="small" label="Supplier name" value={supName} onChange={(e) => setSupName(e.target.value)} />
            <TextField size="small" label="Phone" value={supPhone} onChange={(e) => setSupPhone(e.target.value)} />
            <Button
              variant="contained"
              onClick={async () => {
                try {
                  await pharmacyApi.createSupplier({ name: supName, phone: supPhone });
                  setSupName('');
                  setSupPhone('');
                  setMsg('Supplier added');
                  await reload();
                } catch (e) {
                  setErr(errMsg(e, 'Supplier failed'));
                }
              }}
            >
              Add supplier
            </Button>
          </Stack>
          {suppliers.map((s) => (
            <Card key={String(s.id)}>
              <CardContent>
                <Typography fontWeight={600}>{String(s.name)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {String(s.contact || '—')} · {String(s.phone || '—')} · {String(s.email || '')}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Panel>

      <Panel value={tab} index={2}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            <TextField
              size="small"
              label="Prescription id"
              value={rxId}
              onChange={(e) => setRxId(e.target.value)}
            />
            <Button
              variant="outlined"
              onClick={async () => {
                try {
                  setRxMatches(await pharmacyApi.matchRx(Number(rxId)));
                } catch (e) {
                  setErr(errMsg(e, 'Match failed'));
                }
              }}
            >
              Match catalog
            </Button>
            <Button
              variant="contained"
              disabled={!rxId || !rxMatches.length}
              onClick={async () => {
                try {
                  const items = rxMatches
                    .map((row) => {
                      const matched = row.matched_medicine as PharmacyMedicine | null;
                      if (!matched) return null;
                      return { medicine_id: matched.id, qty: matched.pack_size || 1 };
                    })
                    .filter(Boolean) as Array<{ medicine_id: number; qty: number }>;
                  if (!items.length) {
                    setErr('No catalog matches to dispense');
                    return;
                  }
                  const o = await pharmacyApi.dispenseFromRx({
                    prescription_id: Number(rxId),
                    items,
                    mark_paid: true,
                  });
                  setMsg(`Dispensed ${o.order_number} · ₹${o.total_amount}`);
                  setRxMatches([]);
                  await reload();
                } catch (e) {
                  setErr(errMsg(e, 'Dispense failed'));
                }
              }}
            >
              Dispense matched lines
            </Button>
            <Button
              size="small"
              onClick={async () => {
                try {
                  const recs = await recordsApi.list();
                  const rx = recs.flatMap((r) => r.prescriptions || []);
                  if (rx[0]) {
                    setRxId(String(rx[0].id));
                    setMsg(`Loaded prescription #${rx[0].id}`);
                  } else setErr('No prescriptions in records');
                } catch (e) {
                  setErr(errMsg(e, 'Could not load records'));
                }
              }}
            >
              Load sample Rx id
            </Button>
          </Stack>
          {rxMatches.map((row, i) => (
            <Typography key={i} variant="body2">
              Rx: {String(row.rx_name)} {row.rx_dose ? `· ${String(row.rx_dose)}` : ''} →{' '}
              {(row.matched_medicine as PharmacyMedicine | null)?.name || 'no match'}
            </Typography>
          ))}

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="h6">Orders</Typography>
            <TextField
              select
              size="small"
              label="Filter"
              value={ordersFilter}
              onChange={(e) => setOrdersFilter(e.target.value as 'all' | 'pending' | 'today')}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="all">All orders</MenuItem>
              <MenuItem value="pending">Pending / ready</MenuItem>
              <MenuItem value="today">Today</MenuItem>
            </TextField>
          </Stack>
          {visibleOrders.length === 0 && (
            <Typography color="text.secondary">No orders for this filter.</Typography>
          )}
          {visibleOrders.map((o) => (
            <Card key={o.id}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography fontWeight={600}>
                    {o.order_number} · ₹{o.total_amount}
                  </Typography>
                  <Chip size="small" label={o.status} color={o.status === 'pending' ? 'warning' : 'success'} />
                  <Chip size="small" variant="outlined" label={o.payment_status} />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {o.patient_name || 'Walk-in'} · Rx #{o.prescription_id || '—'} ·{' '}
                  {o.items.map((it) => `${it.medicine_name}×${it.qty}`).join(', ')}
                </Typography>
                {['pending', 'ready'].includes(o.status) && (
                  <Button
                    size="small"
                    sx={{ mt: 1 }}
                    variant="contained"
                    onClick={async () => {
                      try {
                        await pharmacyApi.dispenseOrder(o.id);
                        setMsg(`Order ${o.order_number} dispensed`);
                        await reload();
                      } catch (e) {
                        setErr(errMsg(e, 'Dispense failed'));
                      }
                    }}
                  >
                    Dispense now
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Panel>

      <Panel value={tab} index={3}>
        <Stack spacing={2} maxWidth={640}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <TextField
              select
              size="small"
              label="Medicine"
              value={cartMedId}
              onChange={(e) => setCartMedId(Number(e.target.value))}
              sx={{ minWidth: 220 }}
            >
              {meds
                .filter((m) => !m.requires_prescription)
                .map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.name} · ₹{m.mrp} · stock {m.stock_qty}
                  </MenuItem>
                ))}
            </TextField>
            <TextField size="small" label="Qty" value={cartQty} onChange={(e) => setCartQty(e.target.value)} />
            <Button
              variant="outlined"
              onClick={() => {
                const m = meds.find((x) => x.id === cartMedId);
                if (!m) return;
                setCart((prev) => {
                  const existing = prev.find((p) => p.medicine_id === m.id);
                  if (existing) {
                    return prev.map((p) =>
                      p.medicine_id === m.id ? { ...p, qty: p.qty + Number(cartQty) } : p,
                    );
                  }
                  return [...prev, { medicine_id: m.id, name: m.name, qty: Number(cartQty), mrp: m.mrp }];
                });
              }}
            >
              Add to cart
            </Button>
          </Stack>
          <TextField
            size="small"
            label="Customer name (optional)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          {cart.map((c) => (
            <Typography key={c.medicine_id} variant="body2">
              {c.name} × {c.qty} = ₹{(c.mrp * c.qty).toFixed(2)}
            </Typography>
          ))}
          <Typography fontWeight={700}>Total ₹{cartTotal.toFixed(2)}</Typography>
          <Button
            variant="contained"
            disabled={!cart.length}
            onClick={async () => {
              try {
                const o = await pharmacyApi.walkIn({
                  items: cart.map((c) => ({ medicine_id: c.medicine_id, qty: c.qty })),
                  customer_name: customerName || undefined,
                  mark_paid: true,
                });
                setMsg(`Sale ${o.order_number} · ₹${o.total_amount}`);
                setCart([]);
                setCustomerName('');
                await reload();
              } catch (e) {
                setErr(errMsg(e, 'Sale failed'));
              }
            }}
          >
            Complete UPI / cash sale
          </Button>
        </Stack>
      </Panel>
    </Stack>
  );
}
