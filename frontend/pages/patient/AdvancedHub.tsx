import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  MenuItem,
  Rating,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { advancedApi, appointmentsApi, doctorsApi, Doctor } from '@services/endpoints';
import { getAccessToken } from '@services/client';

function TabPanel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

export default function PatientAdvanced() {
  const [tab, setTab] = useState(0);
  const [symptoms, setSymptoms] = useState('chest pain and shortness of breath');
  const [triage, setTriage] = useState<Record<string, unknown> | null>(null);
  const [recs, setRecs] = useState<Array<Record<string, unknown>>>([]);
  const [voice, setVoice] = useState('Book cardiology tomorrow for chest pain');
  const [voiceResult, setVoiceResult] = useState<Record<string, unknown> | null>(null);
  const [assistantMsg, setAssistantMsg] = useState('I have a fever and cough');
  const [assistantReply, setAssistantReply] = useState('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState<number | ''>('');
  const [rating, setRating] = useState<number | null>(5);
  const [reviewComment, setReviewComment] = useState('');
  const [threadId, setThreadId] = useState<number | null>(null);
  const [chatLog, setChatLog] = useState<Array<{ body: string; sender_user_id: number }>>([]);
  const [chatBody, setChatBody] = useState('');
  const [reminders, setReminders] = useState<Array<Record<string, unknown>>>([]);
  const [medName, setMedName] = useState('Amlodipine');
  const [medTime, setMedTime] = useState('09:00');
  const [policies, setPolicies] = useState<Array<Record<string, unknown>>>([]);
  const [ocrOut, setOcrOut] = useState<Record<string, unknown> | null>(null);
  const [appts, setAppts] = useState<Array<{ id: number; status: string }>>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    doctorsApi.list().then(setDoctors).catch(() => undefined);
    advancedApi.reminders().then(setReminders).catch(() => undefined);
    advancedApi.policies().then(setPolicies).catch(() => undefined);
    appointmentsApi.list().then((a) => setAppts(a as Array<{ id: number; status: string }>)).catch(() => undefined);
  }, []);

  const listeningSupported = useMemo(
    () => typeof window !== 'undefined' && 'webkitSpeechRecognition' in window,
    [],
  );

  async function runTriage() {
    setErr('');
    try {
      const t = await advancedApi.checkSymptoms(symptoms);
      setTriage(t);
      setRecs(await advancedApi.recommend({ symptoms, limit: 5 }));
    } catch {
      setErr('Symptom check failed');
    }
  }

  function startVoice() {
    // Browser Web Speech API (Chrome)
    const w = window as unknown as {
      webkitSpeechRecognition?: new () => {
        continuous: boolean;
        interimResults: boolean;
        onresult: ((ev: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
        onerror: (() => void) | null;
        start: () => void;
      };
    };
    const SR = w.webkitSpeechRecognition;
    if (!SR) {
      setErr('Speech recognition not supported in this browser — paste a transcript instead.');
      return;
    }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (ev) => {
      const text = ev.results[0][0].transcript;
      setVoice(text);
      advancedApi.voiceParse(text).then(setVoiceResult).catch(() => setErr('Voice parse failed'));
    };
    rec.onerror = () => setErr('Voice capture failed');
    rec.start();
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Advanced care tools</Typography>
      <Typography color="text.secondary">
        Symptom AI, voice booking, video, chat, OCR, insurance, reminders, ratings, and more.
      </Typography>
      {msg && <Alert severity="success" onClose={() => setMsg('')}>{msg}</Alert>}
      {err && <Alert severity="error" onClose={() => setErr('')}>{err}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons allowScrollButtonsMobile>
        <Tab label="Symptom AI" />
        <Tab label="Voice book" />
        <Tab label="Assistant" />
        <Tab label="Chat" />
        <Tab label="Video / QR" />
        <Tab label="Reminders" />
        <Tab label="Insurance" />
        <Tab label="OCR" />
        <Tab label="Reviews" />
        <Tab label="Calendar" />
      </Tabs>

      <TabPanel value={tab} index={0}>
        <Stack spacing={2} maxWidth={720}>
          <TextField label="Describe symptoms" multiline minRows={3} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
          <Button variant="contained" onClick={runTriage}>Check symptoms & recommend</Button>
          {triage && (
            <Card>
              <CardContent>
                <Typography variant="h6">Primary: {(triage.primary as { specialty: string }).specialty}</Typography>
                <Typography variant="body2">{(triage.primary as { advice: string }).advice}</Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>{String(triage.disclaimer)}</Typography>
              </CardContent>
            </Card>
          )}
          {recs.map((r) => (
            <Card key={String(r.doctor_id)}>
              <CardContent>
                <Typography fontWeight={600}>{String(r.full_name)} · {String(r.specialty)}</Typography>
                <Typography variant="body2">Score {String(r.score)} · ₹{String(r.consultation_fee)} · ★{String(r.rating_avg)}</Typography>
                <Typography variant="caption">{String(r.reason)}</Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <Stack spacing={2} maxWidth={720}>
          <TextField label="Voice transcript" multiline minRows={2} value={voice} onChange={(e) => setVoice(e.target.value)} />
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={startVoice} disabled={!listeningSupported}>Speak</Button>
            <Button variant="contained" onClick={() => advancedApi.voiceParse(voice).then(setVoiceResult)}>Parse booking intent</Button>
          </Stack>
          {voiceResult && (
            <Alert severity="info">
              Specialty: {String(voiceResult.suggested_specialty)} · When: {String(voiceResult.suggested_datetime || '—')} ·
              Doctor hint: {String(voiceResult.doctor_name_hint || '—')}
            </Alert>
          )}
        </Stack>
      </TabPanel>

      <TabPanel value={tab} index={2}>
        <Stack spacing={2} maxWidth={720}>
          <TextField label="Ask the health assistant" value={assistantMsg} onChange={(e) => setAssistantMsg(e.target.value)} />
          <Button
            variant="contained"
            onClick={async () => {
              const r = await advancedApi.assistant(assistantMsg);
              setAssistantReply(r.reply);
            }}
          >
            Send
          </Button>
          {assistantReply && <Alert severity="success">{assistantReply}</Alert>}
        </Stack>
      </TabPanel>

      <TabPanel value={tab} index={3}>
        <Stack spacing={2} maxWidth={720}>
          <TextField
            select
            label="Doctor"
            value={doctorId}
            onChange={(e) => setDoctorId(Number(e.target.value))}
            fullWidth
          >
            {doctors.map((d) => (
              <MenuItem key={d.id} value={d.id}>{d.full_name || d.specialty} (#{d.id})</MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            disabled={!doctorId}
            onClick={async () => {
              const t = await advancedApi.openThread(Number(doctorId));
              setThreadId(t.id);
              setChatLog(await advancedApi.chatMessages(t.id));
            }}
          >
            Open chat
          </Button>
          {threadId && (
            <>
              <Divider />
              {chatLog.map((m, i) => (
                <Typography key={i} variant="body2">#{m.sender_user_id}: {m.body}</Typography>
              ))}
              <TextField label="Message" value={chatBody} onChange={(e) => setChatBody(e.target.value)} />
              <Button
                onClick={async () => {
                  await advancedApi.postChat(threadId, chatBody);
                  setChatBody('');
                  setChatLog(await advancedApi.chatMessages(threadId));
                }}
              >
                Send
              </Button>
            </>
          )}
        </Stack>
      </TabPanel>

      <TabPanel value={tab} index={4}>
        <Stack spacing={2} maxWidth={720}>
          <TextField
            select
            label="Appointment"
            value={appts[0]?.id || ''}
            onChange={() => undefined}
            fullWidth
            helperText="Uses your first listed appointment for demo join"
          >
            {appts.map((a) => (
              <MenuItem key={a.id} value={a.id}>#{a.id} · {a.status}</MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            disabled={!appts[0]}
            onClick={async () => {
              const room = await advancedApi.videoRoom(appts[0].id);
              setVideoUrl(room.meeting_url);
              setMsg('Jitsi room ready');
            }}
          >
            Start / join live video
          </Button>
          {videoUrl && (
            <Button href={videoUrl} target="_blank" rel="noreferrer" variant="outlined">
              Open video consult
            </Button>
          )}
          {appts[0] && (
            <Button
              onClick={async () => {
                const qr = await appointmentsApi.qr(appts[0].id);
                setMsg(`QR token: ${qr.qr_token || qr.token || JSON.stringify(qr)}`);
              }}
            >
              Show QR check-in token
            </Button>
          )}
        </Stack>
      </TabPanel>

      <TabPanel value={tab} index={5}>
        <Stack spacing={2} maxWidth={480}>
          <TextField label="Medicine" value={medName} onChange={(e) => setMedName(e.target.value)} />
          <TextField label="Time (HH:MM)" value={medTime} onChange={(e) => setMedTime(e.target.value)} />
          <Button
            variant="contained"
            onClick={async () => {
              await advancedApi.createReminder({
                medicine_name: medName,
                schedule_time: medTime.length === 5 ? `${medTime}:00` : medTime,
              });
              setReminders(await advancedApi.reminders());
              setMsg('Reminder saved');
            }}
          >
            Add reminder
          </Button>
          {reminders.map((r) => (
            <Typography key={String(r.id)} variant="body2">
              {String(r.medicine_name)} @ {String(r.schedule_time)}
            </Typography>
          ))}
        </Stack>
      </TabPanel>

      <TabPanel value={tab} index={6}>
        <Stack spacing={2} maxWidth={520}>
          <Button
            variant="contained"
            onClick={async () => {
              await advancedApi.addPolicy({ provider: 'Demo Health Insurance', policy_number: 'POL-DEMO-001', coverage_percent: 80 });
              setPolicies(await advancedApi.policies());
              setMsg('Policy added');
            }}
          >
            Add demo policy
          </Button>
          {policies.map((p) => (
            <Card key={String(p.id)}>
              <CardContent>
                <Typography>{String(p.provider)} · {String(p.policy_number)}</Typography>
                <Button
                  size="small"
                  onClick={async () => {
                    const c = await advancedApi.submitClaim({ policy_id: Number(p.id), amount: 1200 });
                    setMsg(`Claim ${c.claim_ref} · ${c.status}`);
                  }}
                >
                  File claim ₹1200
                </Button>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </TabPanel>

      <TabPanel value={tab} index={7}>
        <Stack spacing={2} maxWidth={640}>
          <Button
            variant="contained"
            onClick={async () => {
              const r = await advancedApi.ocrScan(
                'blood_report.pdf',
                'Hemoglobin: 13.5 g/dL\nWBC: 6.8\nGlucose fasting: 95 mg/dL\nImpression: Within normal limits.',
              );
              setOcrOut(r);
            }}
          >
            Scan demo lab report (OCR)
          </Button>
          {ocrOut && (
            <Card>
              <CardContent>
                <Typography variant="subtitle2">Findings</Typography>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{JSON.stringify(ocrOut.findings, null, 2)}</pre>
                <Typography variant="body2" sx={{ mt: 1 }}>{String(ocrOut.extracted_text)}</Typography>
              </CardContent>
            </Card>
          )}
        </Stack>
      </TabPanel>

      <TabPanel value={tab} index={8}>
        <Stack spacing={2} maxWidth={520}>
          <TextField select label="Doctor" value={doctorId} onChange={(e) => setDoctorId(Number(e.target.value))} fullWidth>
            {doctors.map((d) => (
              <MenuItem key={d.id} value={d.id}>{d.full_name || d.specialty}</MenuItem>
            ))}
          </TextField>
          <Rating value={rating} onChange={(_, v) => setRating(v)} />
          <TextField label="Comment" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
          <Button
            variant="contained"
            disabled={!doctorId || !rating}
            onClick={async () => {
              await advancedApi.submitReview({ doctor_id: Number(doctorId), rating: rating!, comment: reviewComment });
              setMsg('Review submitted — doctor rating updated');
            }}
          >
            Submit rating
          </Button>
        </Stack>
      </TabPanel>

      <TabPanel value={tab} index={9}>
        <Stack spacing={2} maxWidth={520}>
          <Button
            variant="contained"
            onClick={async () => {
              const c = await advancedApi.connectCalendar();
              setMsg(c.demo ? 'Google Calendar connected (demo OAuth)' : 'Connected');
            }}
          >
            Connect Google Calendar (demo)
          </Button>
          <Button
            variant="outlined"
            href={advancedApi.calendarIcsUrl()}
            onClick={(e) => {
              e.preventDefault();
              const token = getAccessToken();
              window.open(`/api/v1/advanced/calendar/export.ics${token ? '' : ''}`, '_blank');
              // download via fetch with bearer
              fetch('/api/v1/advanced/calendar/export.ics', {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              })
                .then((r) => r.blob())
                .then((b) => {
                  const url = URL.createObjectURL(b);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'medibook.ics';
                  a.click();
                });
            }}
          >
            Download .ics export
          </Button>
        </Stack>
      </TabPanel>
    </Stack>
  );
}
