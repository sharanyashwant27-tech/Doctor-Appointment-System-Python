import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { advancedApi, Appointment, appointmentsApi, recordsApi } from '@services/endpoints';
import { downloadAuthed, openAuthedPdf, qrImageUrl } from '@services/download';

function Panel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

function errMsg(e: unknown, fallback: string) {
  const ax = e as { response?: { data?: { message?: string; detail?: string } } };
  return ax.response?.data?.message || ax.response?.data?.detail || fallback;
}

export default function DoctorAdvanced() {
  const [tab, setTab] = useState(0);
  const [threads, setThreads] = useState<Array<{ id: number; patient_id: number; doctor_id: number }>>([]);
  const [threadId, setThreadId] = useState<number | ''>('');
  const [messages, setMessages] = useState<Array<{ id?: number; body: string; sender_user_id: number }>>([]);
  const [body, setBody] = useState('');
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [selectedApptId, setSelectedApptId] = useState<number | ''>('');
  const [qrToken, setQrToken] = useState('');
  const [checkInResult, setCheckInResult] = useState<Record<string, unknown> | null>(null);
  const [patientId, setPatientId] = useState('');
  const [certType, setCertType] = useState('sick_leave');
  const [diagnosis, setDiagnosis] = useState('Viral fever');
  const [certId, setCertId] = useState<number | null>(null);
  const [signature, setSignature] = useState(
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iNjAiPjx0ZXh0IHg9IjEwIiB5PSI0MCIgZm9udC1zaXplPSIyOCI+RHIgU2lnbjwvdGV4dD48L3N2Zz4=',
  );
  const [rxId, setRxId] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const reload = useCallback(async () => {
    const [t, a] = await Promise.all([advancedApi.chatThreads(), appointmentsApi.list()]);
    setThreads(t);
    setAppts(a);
    if (a.length && !selectedApptId) {
      setSelectedApptId(a[0].id);
      setPatientId(String(a[0].patient_id));
    }
  }, [selectedApptId]);

  useEffect(() => {
    reload().catch(() => setErr('Failed to load doctor tools data'));
    recordsApi
      .list()
      .then((recs) => {
        const rx = recs.flatMap((r) => r.prescriptions || []);
        if (rx[0]) setRxId(String(rx[0].id));
      })
      .catch(() => undefined);
  }, []);

  const selectedAppt = useMemo(
    () => appts.find((a) => a.id === selectedApptId) || null,
    [appts, selectedApptId],
  );

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Doctor advanced tools</Typography>
      <Typography color="text.secondary">
        Chat, QR check-in, live video, certificates, and signed e-prescriptions.
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
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
        <Tab label="Chat" />
        <Tab label="QR check-in" />
        <Tab label="Video" />
        <Tab label="Certificates" />
        <Tab label="e-Rx + sign" />
      </Tabs>

      <Panel value={tab} index={0}>
        <Stack spacing={2} maxWidth={640}>
          <TextField
            select
            label="Thread"
            value={threadId}
            onChange={async (e) => {
              const id = Number(e.target.value);
              setThreadId(id);
              try {
                setMessages(await advancedApi.chatMessages(id));
              } catch (ex) {
                setErr(errMsg(ex, 'Could not load messages'));
              }
            }}
            fullWidth
            helperText={threads.length ? 'Select a patient chat thread' : 'No threads yet — patients open chat first'}
          >
            {threads.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                Thread #{t.id} · patient {t.patient_id}
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ maxHeight: 260, overflow: 'auto', bgcolor: 'background.paper', p: 1, borderRadius: 2 }}>
            {messages.map((m, i) => (
              <Typography key={m.id ?? `${m.sender_user_id}-${i}`} variant="body2" sx={{ mb: 0.5 }}>
                User #{m.sender_user_id}: {m.body}
              </Typography>
            ))}
            {!messages.length && (
              <Typography variant="body2" color="text.secondary">
                No messages in this thread.
              </Typography>
            )}
          </Box>
          <TextField label="Reply" value={body} onChange={(e) => setBody(e.target.value)} fullWidth />
          <Button
            variant="contained"
            disabled={!threadId || !body.trim() || busy}
            onClick={async () => {
              try {
                await advancedApi.postChat(Number(threadId), body);
                setBody('');
                setMessages(await advancedApi.chatMessages(Number(threadId)));
                setMsg('Message sent');
              } catch (e) {
                setErr(errMsg(e, 'Send failed'));
              }
            }}
          >
            Send
          </Button>
          <Button size="small" onClick={() => reload().catch(() => undefined)}>
            Refresh threads
          </Button>
        </Stack>
      </Panel>

      <Panel value={tab} index={1}>
        <Stack spacing={2} maxWidth={560}>
          <TextField
            select
            label="Load QR from appointment"
            value={selectedApptId}
            onChange={async (e) => {
              const id = Number(e.target.value);
              setSelectedApptId(id);
              const appt = appts.find((a) => a.id === id);
              if (appt) setPatientId(String(appt.patient_id));
              try {
                const qr = await appointmentsApi.qr(id);
                setQrToken(String(qr.qr_token || ''));
                setMsg(`Loaded QR for appointment #${id}`);
              } catch (ex) {
                setErr(errMsg(ex, 'Could not load QR'));
              }
            }}
            fullWidth
          >
            {appts.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                #{a.id} · {a.patient_name || `patient ${a.patient_id}`} · {a.status}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Scan / paste QR token"
            value={qrToken}
            onChange={(e) => setQrToken(e.target.value)}
            fullWidth
            helperText="Paste medibook check-in token from patient QR"
          />
          {qrToken && (
            <Box
              component="img"
              alt="QR preview"
              src={qrImageUrl(qrToken.startsWith('medibook:') ? qrToken : `medibook:checkin:${qrToken}`)}
              sx={{ width: 180, height: 180, bgcolor: '#fff', p: 1, borderRadius: 2 }}
            />
          )}
          <Button
            variant="contained"
            disabled={!qrToken.trim() || busy}
            onClick={async () => {
              try {
                const token = qrToken.includes(':') ? qrToken.split(':').pop() || qrToken : qrToken;
                const r = await appointmentsApi.checkIn(token);
                setCheckInResult(r as Record<string, unknown>);
                setMsg('Patient checked in');
                await reload();
              } catch (e) {
                setErr(errMsg(e, 'Check-in failed'));
              }
            }}
          >
            Check in patient
          </Button>
          {checkInResult && (
            <Card>
              <CardContent>
                <Typography variant="body2" component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(checkInResult, null, 2)}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Stack>
      </Panel>

      <Panel value={tab} index={2}>
        <Stack spacing={2} maxWidth={720}>
          <TextField
            select
            label="Appointment"
            value={selectedApptId}
            onChange={(e) => {
              const id = Number(e.target.value);
              setSelectedApptId(id);
              const appt = appts.find((a) => a.id === id);
              if (appt) setPatientId(String(appt.patient_id));
            }}
            fullWidth
          >
            {appts.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                #{a.id} · patient {a.patient_id} · {a.status}
                {a.consultation_mode === 'online' ? ' · online' : ''}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            disabled={!selectedApptId || busy}
            onClick={async () => {
              try {
                const room = await advancedApi.videoRoom(Number(selectedApptId));
                setVideoUrl(room.meeting_url);
                window.open(room.meeting_url, '_blank', 'noopener,noreferrer');
                setMsg('Jitsi room opened');
              } catch (e) {
                setErr(errMsg(e, 'Video room failed'));
              }
            }}
          >
            Open live consult room
          </Button>
          {videoUrl && (
            <>
              <Button href={videoUrl} target="_blank" rel="noreferrer" variant="outlined">
                Join Jitsi in new tab
              </Button>
              <Box
                component="iframe"
                title="Doctor video consult"
                src={videoUrl}
                sx={{ width: '100%', height: 360, border: 0, borderRadius: 2 }}
                allow="camera; microphone; fullscreen; display-capture"
              />
            </>
          )}
          {selectedAppt?.meeting_url && !videoUrl && (
            <Alert severity="info">
              Saved meeting:{' '}
              <a href={selectedAppt.meeting_url} target="_blank" rel="noreferrer">
                {selectedAppt.meeting_url}
              </a>
            </Alert>
          )}
        </Stack>
      </Panel>

      <Panel value={tab} index={3}>
        <Stack spacing={2} maxWidth={520}>
          <TextField
            label="Patient profile id"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            helperText="Filled from selected appointment when available"
          />
          <TextField select label="Type" value={certType} onChange={(e) => setCertType(e.target.value)}>
            <MenuItem value="fitness">Fitness</MenuItem>
            <MenuItem value="sick_leave">Sick leave</MenuItem>
            <MenuItem value="travel">Travel</MenuItem>
          </TextField>
          <TextField label="Diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
          <Button
            variant="contained"
            disabled={busy}
            onClick={async () => {
              const pid = Number(patientId || selectedAppt?.patient_id);
              if (!pid) {
                setErr('Patient id required');
                return;
              }
              try {
                const c = await advancedApi.createCertificate({
                  patient_id: pid,
                  cert_type: certType,
                  diagnosis,
                  remarks: 'Issued via MediBook',
                  appointment_id: selectedApptId ? Number(selectedApptId) : undefined,
                });
                setCertId(c.id);
                setMsg(`Certificate #${c.id} created`);
              } catch (e) {
                setErr(errMsg(e, 'Certificate failed'));
              }
            }}
          >
            Generate certificate
          </Button>
          {certId && (
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={async () => {
                  try {
                    await openAuthedPdf(`/api/v1/advanced/certificates/${certId}.pdf`);
                  } catch (e) {
                    setErr(errMsg(e, 'Could not open PDF'));
                  }
                }}
              >
                Open PDF
              </Button>
              <Button
                variant="contained"
                onClick={async () => {
                  try {
                    await downloadAuthed(
                      `/api/v1/advanced/certificates/${certId}.pdf`,
                      `certificate-${certId}.pdf`,
                    );
                    setMsg('Certificate downloaded');
                  } catch (e) {
                    setErr(errMsg(e, 'Download failed'));
                  }
                }}
              >
                Download PDF
              </Button>
            </Stack>
          )}
        </Stack>
      </Panel>

      <Panel value={tab} index={4}>
        <Stack spacing={2} maxWidth={560}>
          <TextField
            label="Prescription id"
            value={rxId}
            onChange={(e) => setRxId(e.target.value)}
            helperText="From a completed visit medical record"
          />
          <TextField
            label="Digital signature (data-url)"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            multiline
            minRows={2}
          />
          <Button
            variant="contained"
            disabled={!rxId || busy}
            onClick={async () => {
              try {
                const bundle = await advancedApi.erxBundle(Number(rxId), signature);
                setMsg(`e-Prescription bundled · signed=${bundle.signed}`);
                if (bundle.pdf_base64) {
                  const a = document.createElement('a');
                  a.href = `data:application/pdf;base64,${bundle.pdf_base64}`;
                  a.download = `eprescription-${rxId}.pdf`;
                  a.click();
                }
              } catch (e) {
                setErr(errMsg(e, 'e-Rx failed — ensure prescription id exists'));
              }
            }}
          >
            Sign & download e-Rx PDF
          </Button>
        </Stack>
      </Panel>
    </Stack>
  );
}
