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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { advancedApi, Appointment, appointmentsApi, Doctor, doctorsApi } from '@services/endpoints';
import { downloadAuthed, qrImageUrl } from '@services/download';

function TabPanel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

function errMsg(e: unknown, fallback: string) {
  const ax = e as { response?: { data?: { message?: string; detail?: string } } };
  return ax.response?.data?.message || ax.response?.data?.detail || fallback;
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
  const [chatLog, setChatLog] = useState<Array<{ id?: number; body: string; sender_user_id: number }>>([]);
  const [chatBody, setChatBody] = useState('');
  const [reminders, setReminders] = useState<Array<Record<string, unknown>>>([]);
  const [medName, setMedName] = useState('Amlodipine');
  const [medTime, setMedTime] = useState('09:00');
  const [policies, setPolicies] = useState<Array<Record<string, unknown>>>([]);
  const [ocrText, setOcrText] = useState(
    'Hemoglobin: 13.5 g/dL\nWBC: 6.8\nGlucose fasting: 95 mg/dL\nImpression: Within normal limits.',
  );
  const [ocrFile, setOcrFile] = useState('blood_report.pdf');
  const [ocrOut, setOcrOut] = useState<Record<string, unknown> | null>(null);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [selectedApptId, setSelectedApptId] = useState<number | ''>('');
  const [videoUrl, setVideoUrl] = useState('');
  const [qrPayload, setQrPayload] = useState<Record<string, unknown> | null>(null);
  const [calendarStatus, setCalendarStatus] = useState('');
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [googleCalendarUrl, setGoogleCalendarUrl] = useState(
    'https://calendar.google.com/calendar/u/0/r/settings/export',
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const reloadAppts = useCallback(async () => {
    const a = await appointmentsApi.list();
    setAppts(a);
    if (a.length && !selectedApptId) setSelectedApptId(a[0].id);
    return a;
  }, [selectedApptId]);

  useEffect(() => {
    doctorsApi
      .list({ limit: 100 } as Record<string, string | number>)
      .then((d) => {
        setDoctors(d);
        if (d[0] && !doctorId) setDoctorId(d[0].id);
      })
      .catch(() => undefined);
    advancedApi.reminders().then(setReminders).catch(() => undefined);
    advancedApi.policies().then(setPolicies).catch(() => undefined);
    advancedApi
      .calendarStatus()
      .then((s) => {
        setCalendarConnected(Boolean(s.connected));
        if (s.google_calendar_url) setGoogleCalendarUrl(String(s.google_calendar_url));
        setCalendarStatus(
          s.connected
            ? 'Google Calendar linked — download .ics and import in Google Calendar'
            : 'Not connected yet',
        );
      })
      .catch(() => undefined);
    reloadAppts().catch(() => undefined);
  }, []);

  const selectedAppt = useMemo(
    () => appts.find((a) => a.id === selectedApptId) || null,
    [appts, selectedApptId],
  );

  const listeningSupported = useMemo(
    () => typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window),
    [],
  );

  async function runTriage() {
    setErr('');
    setBusy(true);
    try {
      const t = await advancedApi.checkSymptoms(symptoms);
      setTriage(t);
      setRecs(await advancedApi.recommend({ symptoms, limit: 5 }));
      setMsg('Symptom check complete — pick a recommended doctor to book');
    } catch (e) {
      setErr(errMsg(e, 'Symptom check failed'));
    } finally {
      setBusy(false);
    }
  }

  async function bookDoctor(doctor_id: number, scheduled_at?: string, reason?: string, online = false) {
    setBusy(true);
    setErr('');
    try {
      const when =
        scheduled_at ||
        new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      const appt = await appointmentsApi.book({
        doctor_id,
        scheduled_at: when,
        reason: reason || symptoms || 'Advanced tools booking',
        consultation_mode: online ? 'online' : 'in_person',
      });
      await reloadAppts();
      setSelectedApptId(appt.id);
      setMsg(`Appointment #${appt.id} booked${online ? ' (online video)' : ''}`);
      return appt;
    } catch (e) {
      setErr(errMsg(e, 'Booking failed'));
      return null;
    } finally {
      setBusy(false);
    }
  }

  function startVoice() {
    const w = window as unknown as {
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      SpeechRecognition?: new () => SpeechRecognitionLike;
    };
    type SpeechRecognitionLike = {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onresult: ((ev: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
      onerror: ((ev: { error?: string }) => void) | null;
      start: () => void;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setErr('Speech recognition not supported — paste a transcript and parse it.');
      return;
    }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-IN';
    rec.onresult = (ev) => {
      const text = ev.results[0][0].transcript;
      setVoice(text);
      advancedApi.voiceParse(text).then(setVoiceResult).catch(() => setErr('Voice parse failed'));
    };
    rec.onerror = () => setErr('Voice capture failed — try typing the transcript');
    rec.start();
    setMsg('Listening… speak your booking request');
  }

  async function confirmVoiceBooking() {
    if (!voiceResult) return;
    setBusy(true);
    setErr('');
    try {
      const specialty = String(voiceResult.suggested_specialty || '');
      const when = voiceResult.suggested_datetime ? String(voiceResult.suggested_datetime) : undefined;
      const recList = await advancedApi.recommend({ symptoms: voice || specialty, limit: 1 });
      const top = recList[0];
      if (!top?.doctor_id) {
        setErr('No matching doctor found for that specialty');
        return;
      }
      await bookDoctor(Number(top.doctor_id), when, `Voice booking: ${voice}`, false);
      setRecs(recList);
    } catch (e) {
      setErr(errMsg(e, 'Voice booking failed'));
    } finally {
      setBusy(false);
    }
  }

  async function startVideo() {
    if (!selectedApptId) {
      setErr('Select an appointment first (or book an online consult below)');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const room = await advancedApi.videoRoom(Number(selectedApptId));
      setVideoUrl(room.meeting_url);
      setMsg('Video room ready — opening Jitsi');
      window.open(room.meeting_url, '_blank', 'noopener,noreferrer');
      await reloadAppts();
    } catch (e) {
      setErr(errMsg(e, 'Could not start video room'));
    } finally {
      setBusy(false);
    }
  }

  async function bookOnlineAndJoin() {
    const cardiology = doctors.find((d) => /cardio/i.test(d.specialty)) || doctors[0];
    if (!cardiology) {
      setErr('No doctors available to book');
      return;
    }
    const appt = await bookDoctor(cardiology.id, undefined, 'Online video consult', true);
    if (!appt) return;
    setBusy(true);
    try {
      const room = await advancedApi.videoRoom(appt.id);
      setVideoUrl(room.meeting_url);
      window.open(room.meeting_url, '_blank', 'noopener,noreferrer');
      setMsg('Online appointment booked and video room opened');
    } catch (e) {
      setErr(errMsg(e, 'Booked, but video room failed'));
    } finally {
      setBusy(false);
    }
  }

  async function showQr() {
    if (!selectedApptId) {
      setErr('Select an appointment to show QR');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const qr = await appointmentsApi.qr(Number(selectedApptId));
      setQrPayload(qr);
      setMsg(`QR ready for appointment #${selectedApptId}`);
    } catch (e) {
      setErr(errMsg(e, 'QR fetch failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Advanced care tools</Typography>
      <Typography color="text.secondary">
        Symptom AI, voice booking, live video, chat, OCR, insurance, reminders, ratings, and calendar — all wired to live APIs.
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
          <TextField
            label="Describe symptoms"
            multiline
            minRows={3}
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
          />
          <Button variant="contained" disabled={busy} onClick={runTriage}>
            Check symptoms & recommend
          </Button>
          {triage && (
            <Card>
              <CardContent>
                <Typography variant="h6">
                  Primary: {(triage.primary as { specialty: string }).specialty}
                </Typography>
                <Typography variant="body2">{(triage.primary as { advice: string }).advice}</Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  {String(triage.disclaimer)}
                </Typography>
              </CardContent>
            </Card>
          )}
          {recs.map((r) => (
            <Card key={String(r.doctor_id)}>
              <CardContent>
                <Typography fontWeight={600}>
                  {String(r.full_name)} · {String(r.specialty)}
                </Typography>
                <Typography variant="body2">
                  Score {String(r.score)} · ₹{String(r.consultation_fee)} · ★{String(r.rating_avg)}
                </Typography>
                <Typography variant="caption" display="block">
                  {String(r.reason)}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={busy}
                    onClick={() => bookDoctor(Number(r.doctor_id), undefined, symptoms)}
                  >
                    Book this doctor
                  </Button>
                  <Button size="small" component={RouterLink} to={`/patient/doctors/${r.doctor_id}`}>
                    View profile
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <Stack spacing={2} maxWidth={720}>
          <TextField
            label="Voice transcript"
            multiline
            minRows={2}
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            helperText={listeningSupported ? 'Use Speak (Chrome) or type your request' : 'Type your booking request'}
          />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="outlined" onClick={startVoice} disabled={!listeningSupported || busy}>
              Speak
            </Button>
            <Button
              variant="contained"
              disabled={busy}
              onClick={async () => {
                try {
                  setVoiceResult(await advancedApi.voiceParse(voice));
                  setMsg('Intent parsed — confirm booking when ready');
                } catch (e) {
                  setErr(errMsg(e, 'Parse failed'));
                }
              }}
            >
              Parse booking intent
            </Button>
            <Button variant="contained" color="secondary" disabled={!voiceResult || busy} onClick={confirmVoiceBooking}>
              Confirm & book
            </Button>
          </Stack>
          {voiceResult && (
            <Alert severity="info">
              Specialty: {String(voiceResult.suggested_specialty)} · When:{' '}
              {String(voiceResult.suggested_datetime || '—')} · Doctor hint:{' '}
              {String(voiceResult.doctor_name_hint || '—')}
            </Alert>
          )}
        </Stack>
      </TabPanel>

      <TabPanel value={tab} index={2}>
        <Stack spacing={2} maxWidth={720}>
          <TextField
            label="Ask the health assistant"
            value={assistantMsg}
            onChange={(e) => setAssistantMsg(e.target.value)}
            multiline
            minRows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                (async () => {
                  try {
                    const r = await advancedApi.assistant(assistantMsg);
                    setAssistantReply(r.reply);
                  } catch (ex) {
                    setErr(errMsg(ex, 'Assistant failed'));
                  }
                })();
              }
            }}
          />
          <Button
            variant="contained"
            disabled={busy || !assistantMsg.trim()}
            onClick={async () => {
              try {
                const r = await advancedApi.assistant(assistantMsg);
                setAssistantReply(r.reply);
              } catch (e) {
                setErr(errMsg(e, 'Assistant failed'));
              }
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
              <MenuItem key={d.id} value={d.id}>
                {d.full_name || d.specialty} (#{d.id})
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            disabled={!doctorId || busy}
            onClick={async () => {
              try {
                const t = await advancedApi.openThread(Number(doctorId));
                setThreadId(t.id);
                setChatLog(await advancedApi.chatMessages(t.id));
                setMsg(`Chat thread #${t.id} open`);
              } catch (e) {
                setErr(errMsg(e, 'Could not open chat'));
              }
            }}
          >
            Open chat
          </Button>
          {threadId && (
            <>
              <Divider />
              <Box sx={{ maxHeight: 240, overflow: 'auto', bgcolor: 'background.paper', p: 1, borderRadius: 2 }}>
                {chatLog.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No messages yet — say hello.
                  </Typography>
                )}
                {chatLog.map((m, i) => (
                  <Typography key={m.id ?? `${m.sender_user_id}-${i}`} variant="body2" sx={{ mb: 0.5 }}>
                    User #{m.sender_user_id}: {m.body}
                  </Typography>
                ))}
              </Box>
              <TextField label="Message" value={chatBody} onChange={(e) => setChatBody(e.target.value)} fullWidth />
              <Button
                variant="contained"
                disabled={!chatBody.trim() || busy}
                onClick={async () => {
                  try {
                    await advancedApi.postChat(threadId, chatBody);
                    setChatBody('');
                    setChatLog(await advancedApi.chatMessages(threadId));
                  } catch (e) {
                    setErr(errMsg(e, 'Send failed'));
                  }
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
            value={selectedApptId}
            onChange={(e) => setSelectedApptId(Number(e.target.value))}
            fullWidth
            helperText={appts.length ? 'Choose an appointment for video or QR check-in' : 'No appointments — book one below'}
          >
            {appts.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                #{a.id} · {a.status} · {a.doctor_name || 'Doctor'} · {a.scheduled_at?.slice(0, 16) || ''}
                {a.consultation_mode === 'online' ? ' · online' : ''}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="contained" disabled={busy || !selectedApptId} onClick={startVideo}>
              Start / join live video
            </Button>
            <Button variant="outlined" disabled={busy} onClick={bookOnlineAndJoin}>
              Book online consult + join
            </Button>
            <Button variant="outlined" disabled={busy || !selectedApptId} onClick={showQr}>
              Show QR check-in
            </Button>
            <Button size="small" onClick={() => reloadAppts().catch(() => setErr('Refresh failed'))}>
              Refresh appointments
            </Button>
          </Stack>
          {videoUrl && (
            <Stack spacing={1}>
              <Button href={videoUrl} target="_blank" rel="noreferrer" variant="contained" color="secondary">
                Open video consult (Jitsi)
              </Button>
              <Box
                component="iframe"
                title="MediBook video consult"
                src={videoUrl}
                sx={{ width: '100%', height: 360, border: 0, borderRadius: 2, bgcolor: '#000' }}
                allow="camera; microphone; fullscreen; display-capture"
              />
            </Stack>
          )}
          {selectedAppt?.meeting_url && !videoUrl && (
            <Alert severity="info">
              Existing meeting link:{' '}
              <a href={selectedAppt.meeting_url} target="_blank" rel="noreferrer">
                {selectedAppt.meeting_url}
              </a>
            </Alert>
          )}
          {qrPayload && (
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Check-in QR · token {String(qrPayload.qr_token || '')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Token #{String(qrPayload.token_number ?? '—')} · Show this at reception or to your doctor
                </Typography>
                <Box
                  component="img"
                  alt="Appointment QR"
                  src={qrImageUrl(String(qrPayload.checkin_payload || qrPayload.qr_token || ''))}
                  sx={{ width: 220, height: 220, display: 'block', bgcolor: '#fff', p: 1, borderRadius: 2 }}
                />
                <Typography variant="caption" display="block" sx={{ mt: 1, wordBreak: 'break-all' }}>
                  {String(qrPayload.checkin_payload || qrPayload.qr_token)}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Stack>
      </TabPanel>

      <TabPanel value={tab} index={5}>
        <Stack spacing={2} maxWidth={480}>
          <TextField label="Medicine" value={medName} onChange={(e) => setMedName(e.target.value)} />
          <TextField label="Time (HH:MM)" value={medTime} onChange={(e) => setMedTime(e.target.value)} />
          <Button
            variant="contained"
            disabled={busy}
            onClick={async () => {
              try {
                await advancedApi.createReminder({
                  medicine_name: medName,
                  schedule_time: medTime.length === 5 ? `${medTime}:00` : medTime,
                });
                setReminders(await advancedApi.reminders());
                setMsg('Reminder saved — Celery will notify at that time when worker is running');
              } catch (e) {
                setErr(errMsg(e, 'Reminder failed'));
              }
            }}
          >
            Add reminder
          </Button>
          {reminders.map((r) => (
            <Typography key={String(r.id)} variant="body2">
              {String(r.medicine_name)} @ {String(r.schedule_time)}
              {r.dosage ? ` · ${String(r.dosage)}` : ''}
            </Typography>
          ))}
        </Stack>
      </TabPanel>

      <TabPanel value={tab} index={6}>
        <Stack spacing={2} maxWidth={520}>
          <Button
            variant="contained"
            disabled={busy}
            onClick={async () => {
              try {
                await advancedApi.addPolicy({
                  provider: 'Demo Health Insurance',
                  policy_number: `POL-${Date.now().toString().slice(-6)}`,
                  coverage_percent: 80,
                });
                setPolicies(await advancedApi.policies());
                setMsg('Policy added');
              } catch (e) {
                setErr(errMsg(e, 'Policy failed'));
              }
            }}
          >
            Add demo policy
          </Button>
          {policies.map((p) => (
            <Card key={String(p.id)}>
              <CardContent>
                <Typography>
                  {String(p.provider)} · {String(p.policy_number)} · {String(p.coverage_percent)}%
                </Typography>
                <Button
                  size="small"
                  sx={{ mt: 1 }}
                  onClick={async () => {
                    try {
                      const c = await advancedApi.submitClaim({
                        policy_id: Number(p.id),
                        amount: 1200,
                        appointment_id: selectedApptId ? Number(selectedApptId) : undefined,
                      });
                      setMsg(`Claim ${c.claim_ref} · ${c.status}`);
                    } catch (e) {
                      setErr(errMsg(e, 'Claim failed'));
                    }
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
          <TextField label="Filename" value={ocrFile} onChange={(e) => setOcrFile(e.target.value)} />
          <TextField
            label="Report text (or paste OCR output)"
            multiline
            minRows={5}
            value={ocrText}
            onChange={(e) => setOcrText(e.target.value)}
          />
          <Button
            variant="outlined"
            component="label"
          >
            Upload text/PDF (reads as text)
            <input
              hidden
              type="file"
              accept=".txt,.csv,.pdf,.json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setOcrFile(file.name);
                try {
                  const text = await file.text();
                  if (text.trim()) setOcrText(text.slice(0, 8000));
                  setMsg(`Loaded ${file.name}`);
                } catch {
                  setMsg(`Attached ${file.name} — using demo extract if binary`);
                }
              }}
            />
          </Button>
          <Button
            variant="contained"
            disabled={busy}
            onClick={async () => {
              try {
                const r = await advancedApi.ocrScan(ocrFile, ocrText);
                setOcrOut(r);
                setMsg('OCR scan complete');
              } catch (e) {
                setErr(errMsg(e, 'OCR failed'));
              }
            }}
          >
            Run OCR scan
          </Button>
          {ocrOut && (
            <Card>
              <CardContent>
                <Typography variant="subtitle2">Findings</Typography>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{JSON.stringify(ocrOut.findings, null, 2)}</pre>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {String(ocrOut.extracted_text)}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Stack>
      </TabPanel>

      <TabPanel value={tab} index={8}>
        <Stack spacing={2} maxWidth={520}>
          <TextField
            select
            label="Doctor"
            value={doctorId}
            onChange={(e) => setDoctorId(Number(e.target.value))}
            fullWidth
          >
            {doctors.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.full_name || d.specialty}
              </MenuItem>
            ))}
          </TextField>
          <Rating value={rating} onChange={(_, v) => setRating(v)} />
          <TextField label="Comment" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
          <Button
            variant="contained"
            disabled={!doctorId || !rating || busy}
            onClick={async () => {
              try {
                await advancedApi.submitReview({
                  doctor_id: Number(doctorId),
                  rating: rating!,
                  comment: reviewComment,
                  appointment_id: selectedApptId ? Number(selectedApptId) : undefined,
                });
                setMsg('Review submitted — doctor rating updated');
              } catch (e) {
                setErr(errMsg(e, 'Review failed'));
              }
            }}
          >
            Submit rating
          </Button>
        </Stack>
      </TabPanel>

      <TabPanel value={tab} index={9}>
        <Stack spacing={2} maxWidth={560}>
          <Alert severity="info">
            MediBook syncs with Google Calendar via an <strong>.ics</strong> file (no Google Cloud OAuth
            app required). Connect, download your appointments, then import the file in Google Calendar.
          </Alert>
          <Button
            variant="contained"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setErr('');
              try {
                const c = await advancedApi.connectCalendar();
                setCalendarConnected(Boolean(c.connected));
                if (c.google_calendar_url) setGoogleCalendarUrl(String(c.google_calendar_url));
                setCalendarStatus(
                  c.message ||
                    'Linked — download medibook.ics, then Import it under Google Calendar Settings',
                );
                await downloadAuthed('/api/v1/advanced/calendar/export.ics', 'medibook.ics');
                setMsg('Connected. medibook.ics downloaded — import it in Google Calendar next');
              } catch (e) {
                setErr(errMsg(e, 'Calendar connect failed'));
              } finally {
                setBusy(false);
              }
            }}
          >
            {calendarConnected ? 'Reconnect & download .ics' : 'Connect Google Calendar'}
          </Button>
          {calendarStatus && (
            <Alert severity={calendarConnected ? 'success' : 'info'} onClose={() => setCalendarStatus('')}>
              {calendarStatus}
            </Alert>
          )}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              disabled={busy}
              onClick={async () => {
                try {
                  await downloadAuthed('/api/v1/advanced/calendar/export.ics', 'medibook.ics');
                  setMsg('Calendar .ics downloaded');
                } catch (e) {
                  setErr(errMsg(e, 'ICS download failed'));
                }
              }}
            >
              Download .ics export
            </Button>
            <Button
              variant="contained"
              color="secondary"
              href={googleCalendarUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open Google Calendar Import
            </Button>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            In Google Calendar: Settings → Import &amp; export → Import → choose{' '}
            <code>medibook.ics</code> → Import.
          </Typography>
        </Stack>
      </TabPanel>
    </Stack>
  );
}
