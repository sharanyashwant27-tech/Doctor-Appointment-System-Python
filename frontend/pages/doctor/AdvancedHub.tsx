import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { advancedApi, appointmentsApi, recordsApi } from '@services/endpoints';

function Panel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

export default function DoctorAdvanced() {
  const [tab, setTab] = useState(0);
  const [threads, setThreads] = useState<Array<{ id: number; patient_id: number; doctor_id: number }>>([]);
  const [threadId, setThreadId] = useState<number | ''>('');
  const [messages, setMessages] = useState<Array<{ body: string; sender_user_id: number }>>([]);
  const [body, setBody] = useState('');
  const [appts, setAppts] = useState<Array<{ id: number; patient_id: number; status: string }>>([]);
  const [qrToken, setQrToken] = useState('');
  const [checkInResult, setCheckInResult] = useState('');
  const [patientId, setPatientId] = useState('');
  const [certType, setCertType] = useState('sick_leave');
  const [diagnosis, setDiagnosis] = useState('Viral fever');
  const [certId, setCertId] = useState<number | null>(null);
  const [signature, setSignature] = useState('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iNjAiPjx0ZXh0IHg9IjEwIiB5PSI0MCIgZm9udC1zaXplPSIyOCI+RHIgU2lnbjwvdGV4dD48L3N2Zz4=');
  const [rxId, setRxId] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  useEffect(() => {
    advancedApi.chatThreads().then(setThreads).catch(() => undefined);
    appointmentsApi.list().then((a) => setAppts(a as Array<{ id: number; patient_id: number; status: string }>)).catch(() => undefined);
    recordsApi.list().then((recs) => {
      const rx = recs.flatMap((r) => r.prescriptions || []);
      if (rx[0]) setRxId(String(rx[0].id));
    }).catch(() => undefined);
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Doctor advanced tools</Typography>
      {msg && <Alert severity="success" onClose={() => setMsg('')}>{msg}</Alert>}
      {err && <Alert severity="error" onClose={() => setErr('')}>{err}</Alert>}
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
              setMessages(await advancedApi.chatMessages(id));
            }}
            fullWidth
          >
            {threads.map((t) => (
              <MenuItem key={t.id} value={t.id}>Thread #{t.id} · patient {t.patient_id}</MenuItem>
            ))}
          </TextField>
          {messages.map((m, i) => (
            <Typography key={i} variant="body2">#{m.sender_user_id}: {m.body}</Typography>
          ))}
          <TextField label="Reply" value={body} onChange={(e) => setBody(e.target.value)} />
          <Button
            variant="contained"
            disabled={!threadId}
            onClick={async () => {
              await advancedApi.postChat(Number(threadId), body);
              setBody('');
              setMessages(await advancedApi.chatMessages(Number(threadId)));
            }}
          >
            Send
          </Button>
        </Stack>
      </Panel>

      <Panel value={tab} index={1}>
        <Stack spacing={2} maxWidth={520}>
          <TextField label="Scan / paste QR token" value={qrToken} onChange={(e) => setQrToken(e.target.value)} fullWidth />
          <Button
            variant="contained"
            onClick={async () => {
              try {
                const r = await appointmentsApi.checkIn(qrToken);
                setCheckInResult(JSON.stringify(r));
                setMsg('Checked in');
              } catch {
                setErr('Check-in failed');
              }
            }}
          >
            Check in patient
          </Button>
          {checkInResult && <Typography variant="body2">{checkInResult}</Typography>}
        </Stack>
      </Panel>

      <Panel value={tab} index={2}>
        <Stack spacing={2} maxWidth={520}>
          <TextField
            select
            label="Appointment"
            value={appts[0]?.id || ''}
            onChange={() => undefined}
            fullWidth
          >
            {appts.map((a) => (
              <MenuItem key={a.id} value={a.id}>#{a.id} · patient {a.patient_id}</MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            disabled={!appts[0]}
            onClick={async () => {
              const room = await advancedApi.videoRoom(appts[0].id);
              setVideoUrl(room.meeting_url);
            }}
          >
            Open live consult room
          </Button>
          {videoUrl && (
            <Button href={videoUrl} target="_blank" rel="noreferrer" variant="outlined">
              Join Jitsi
            </Button>
          )}
        </Stack>
      </Panel>

      <Panel value={tab} index={3}>
        <Stack spacing={2} maxWidth={520}>
          <TextField
            label="Patient profile id"
            value={patientId || (appts[0] ? String(appts[0].patient_id) : '')}
            onChange={(e) => setPatientId(e.target.value)}
          />
          <TextField select label="Type" value={certType} onChange={(e) => setCertType(e.target.value)}>
            <MenuItem value="fitness">Fitness</MenuItem>
            <MenuItem value="sick_leave">Sick leave</MenuItem>
            <MenuItem value="travel">Travel</MenuItem>
          </TextField>
          <TextField label="Diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
          <Button
            variant="contained"
            onClick={async () => {
              const pid = Number(patientId || appts[0]?.patient_id);
              if (!pid) {
                setErr('Patient id required');
                return;
              }
              const c = await advancedApi.createCertificate({
                patient_id: pid,
                cert_type: certType,
                diagnosis,
                remarks: 'Issued via MediBook',
              });
              setCertId(c.id);
              setMsg(`Certificate #${c.id} created`);
            }}
          >
            Generate certificate
          </Button>
          {certId && (
            <Button href={advancedApi.certificatePdfUrl(certId)} target="_blank" variant="outlined">
              Download PDF
            </Button>
          )}
        </Stack>
      </Panel>

      <Panel value={tab} index={4}>
        <Stack spacing={2} maxWidth={560}>
          <TextField label="Prescription id" value={rxId} onChange={(e) => setRxId(e.target.value)} />
          <TextField
            label="Digital signature (base64 / data-url)"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            multiline
            minRows={2}
          />
          <Button
            variant="contained"
            disabled={!rxId}
            onClick={async () => {
              const bundle = await advancedApi.erxBundle(Number(rxId), signature);
              setMsg(`e-Prescription bundled · signed=${bundle.signed}`);
              if (bundle.pdf_base64) {
                const a = document.createElement('a');
                a.href = `data:application/pdf;base64,${bundle.pdf_base64}`;
                a.download = `eprescription-${rxId}.pdf`;
                a.click();
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
