import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Circle,
  Loader,
  Mic,
  MonitorUp,
  Sparkles,
  Video,
  CheckCircle2,
  Brain,
} from 'lucide-react';
import { api } from '../../api';

const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;

const DEFAULT_QUESTIONS = [
  'Расскажите о моменте, когда вы взяли ответственность за других.',
  'Какой проект лучше всего показывает, что вы умеете доводить идею до результата?',
  'Как вы действуете, когда сталкиваетесь с неудачей или сильным стрессом?',
  'Почему вы хотите учиться именно в inVision U и что хотите изменить вокруг себя?',
];

const EMOTION_LABELS = {
  confident: 'Уверенность',
  engaged: 'Вовлечённость',
  neutral: 'Нейтрально',
  stressed: 'Напряжение',
};

export default function StudentVideoInterview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const canvasRef = useRef(null);
  const previousFrameRef = useRef(null);
  const rafRef = useRef(null);
  const timerRef = useRef(null);
  const speechSupported = Boolean(SpeechRecognitionApi);

  const [profile, setProfile] = useState(null);
  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS);
  const [loading, setLoading] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [manualTranscript, setManualTranscript] = useState('');
  const [currentEmotion, setCurrentEmotion] = useState({ label: 'neutral', confidence: 0, breakdown: { confident: 0, engaged: 0, neutral: 100, stressed: 0 } });
  const [responses, setResponses] = useState([]);
  const [recording, setRecording] = useState(false);
  const [answerStartedAt, setAnswerStartedAt] = useState(null);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [completed, setCompleted] = useState(false);
  const [metrics, setMetrics] = useState({ voiceSamples: [], faceSamples: [], motionSamples: [], totalDurationSec: 0 });

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.getStudentProfile(id),
      api.getVideoInterview(id).catch(() => null),
    ])
      .then(([prof, videoState]) => {
        if (!mounted) return;
        setProfile(prof);
        if (videoState) {
          setQuestions(videoState.questions?.length ? videoState.questions : DEFAULT_QUESTIONS);
          if (videoState.status === 'completed' && videoState.transcript?.length) {
            setResponses(videoState.transcript);
            setCompleted(true);
          }
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      cleanupMedia();
    };
  }, [id]);

  useEffect(() => {
    if (!recording) return undefined;

    rafRef.current = requestAnimationFrame(sampleAudio);
    timerRef.current = window.setInterval(() => {
      updateEmotionSignal();
    }, 1200);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recording, metrics.voiceSamples.length, currentTranscript, manualTranscript]);

  const answeredCount = responses.length;
  const activeQuestion = questions[activeIndex];
  const canFinish = responses.length === questions.length && responses.length > 0;
  const completionPercent = Math.round((answeredCount / questions.length) * 100);
  const emotionTone = useMemo(() => describeEmotion(currentEmotion.label), [currentEmotion.label]);

  async function prepareCamera() {
    setStarting(true);
    setError('');
    setWarning('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setupAudioAnalyser(stream);
      setCameraReady(true);
      const state = await api.startVideoInterview(id);
      setQuestions(state.questions?.length ? state.questions : DEFAULT_QUESTIONS);
      setResponses([]);
      setCompleted(false);
      setActiveIndex(0);
      setMetrics({ voiceSamples: [], faceSamples: [], motionSamples: [], totalDurationSec: 0 });
    } catch (err) {
      setError(err.message || 'Не удалось получить доступ к камере и микрофону');
    } finally {
      setStarting(false);
    }
  }

  function setupAudioAnalyser(stream) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      setWarning('Ваш браузер не поддерживает анализ аудиосигнала. Эмоции будут оцениваться в основном по транскрипту.');
      return;
    }

    const context = new AudioContextClass();
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);
    audioContextRef.current = context;
    analyserRef.current = analyser;
    sourceRef.current = source;
  }

  function sampleAudio() {
    if (!analyserRef.current || !recording) return;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const data = new Uint8Array(bufferLength);
    analyserRef.current.getByteTimeDomainData(data);
    const rms = Math.sqrt(data.reduce((sum, value) => {
      const normalized = (value - 128) / 128;
      return sum + normalized * normalized;
    }, 0) / bufferLength);

    setMetrics((prev) => ({
      ...prev,
      voiceSamples: [...prev.voiceSamples.slice(-59), Number(rms.toFixed(4))],
      faceSamples: [...prev.faceSamples.slice(-59), videoRef.current?.readyState >= 2 ? 1 : 0],
      motionSamples: [...prev.motionSamples.slice(-59), sampleVideoMotion()],
    }));

    rafRef.current = requestAnimationFrame(sampleAudio);
  }

  function updateEmotionSignal() {
    const transcript = `${currentTranscript} ${manualTranscript}`.trim();
    const textScore = scoreTranscript(transcript);
    const recentVoice = average(metrics.voiceSamples.slice(-15));
    const faceVisibleRatio = average(metrics.faceSamples.slice(-15));
    const movementScore = average(metrics.motionSamples.slice(-15)) * 100;

    const confident = clamp(Math.round(35 + textScore.positive * 0.5 + recentVoice * 120), 0, 100);
    const engaged = clamp(Math.round(30 + transcript.length / 8 + faceVisibleRatio * 30 + movementScore * 0.15), 0, 100);
    const stressed = clamp(Math.round(18 + textScore.stress * 0.7 + Math.max(0, 0.11 - recentVoice) * 500 + Math.max(0, movementScore - 62) * 0.45), 0, 100);
    const neutral = clamp(100 - Math.round((confident + engaged + stressed) / 3), 0, 100);

    const breakdown = { confident, engaged, neutral, stressed };
    const [label, confidence] = Object.entries(breakdown).sort((a, b) => b[1] - a[1])[0];
    setCurrentEmotion({ label, confidence, breakdown });
  }

  function startAnswer() {
    if (!cameraReady || recording) return;
    setRecording(true);
    setCurrentTranscript('');
    setAnswerStartedAt(Date.now());
    setError('');
    startSpeechRecognition();
  }

  function stopAnswer() {
    stopSpeechRecognition();
    setRecording(false);
  }

  function startSpeechRecognition() {
    if (!speechSupported) return;

    const recognition = new SpeechRecognitionApi();
    recognition.lang = 'ru-RU';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      Array.from(event.results).forEach((result) => {
        const chunk = result[0]?.transcript?.trim() || '';
        if (!chunk) return;
        if (result.isFinal) {
          finalTranscript += `${chunk} `;
        } else {
          interimTranscript += `${chunk} `;
        }
      });

      const normalizedFinal = finalTranscript.trim();
      const normalizedInterim = interimTranscript.trim();
      const combinedTranscript = [normalizedFinal, normalizedInterim]
        .filter(Boolean)
        .join(' ')
        .trim();

      setCurrentTranscript(combinedTranscript);
      setManualTranscript(combinedTranscript);
    };
    recognition.onerror = () => {
      setWarning('Автораспознавание речи нестабильно в этом браузере. Можно продолжить и при необходимости дописать ответ вручную.');
    };
    recognition.start();
    recognitionRef.current = recognition;
  }

  function stopSpeechRecognition() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }

  function saveAnswerAndContinue() {
    const transcript = currentTranscript.trim();
    const manual = manualTranscript.trim();
    if (!transcript && !manual) {
      setError('Нужно записать или ввести ответ перед переходом дальше');
      return;
    }

    stopAnswer();
    const durationSec = answerStartedAt ? Math.max(5, Math.round((Date.now() - answerStartedAt) / 1000)) : 0;
    const faceVisibleRatio = Number(average(metrics.faceSamples).toFixed(2));
    const voiceEnergyAvg = Number(average(metrics.voiceSamples).toFixed(3));
    const movementScore = Math.round(average(metrics.motionSamples) * 100);
    const postureStability = clamp(Math.round(100 - movementScore * 0.9), 0, 100);
    const visualEngagement = clamp(Math.round(faceVisibleRatio * 55 + (100 - Math.abs(movementScore - 42)) * 0.45), 0, 100);
    const speechPaceWpm = calculateSpeechPace({
      transcript,
      manualTranscript: manual,
      durationSec,
    });

    const answer = {
      question: activeQuestion,
      transcript,
      manualTranscript: manual,
      durationSec,
      primaryEmotion: currentEmotion.label,
      emotionConfidence: currentEmotion.confidence,
      emotionBreakdown: currentEmotion.breakdown,
      faceVisibleRatio,
      voiceEnergyAvg,
      movementScore,
      postureStability,
      visualEngagement,
      speechPaceWpm,
    };

    setResponses((prev) => [...prev, answer]);
    setMetrics((prev) => ({ ...prev, totalDurationSec: prev.totalDurationSec + durationSec, voiceSamples: [], faceSamples: [], motionSamples: [] }));
    setCurrentTranscript('');
    setManualTranscript('');
    setCurrentEmotion({ label: 'neutral', confidence: 0, breakdown: { confident: 0, engaged: 0, neutral: 100, stressed: 0 } });
    setAnswerStartedAt(null);
    setError('');
    previousFrameRef.current = null;

    if (activeIndex < questions.length - 1) {
      setActiveIndex((prev) => prev + 1);
    }
  }

  async function handleFinish() {
    setSubmitting(true);
    setError('');
    try {
      const emotionSummary = buildEmotionSummary(responses);
      const sessionMetrics = {
        averageAnswerDurationSec: Number((metrics.totalDurationSec / responses.length).toFixed(1)),
        faceVisibleRatio: Number(average(responses.map((item) => item.faceVisibleRatio)).toFixed(2)),
        voiceEnergyAvg: Number(average(responses.map((item) => item.voiceEnergyAvg)).toFixed(3)),
        transcriptCoverage: Number(((responses.filter((item) => item.transcript || item.manualTranscript).length / responses.length) * 100).toFixed(1)),
        averageMovementScore: Number(average(responses.map((item) => item.movementScore)).toFixed(1)),
        postureStability: Math.round(average(responses.map((item) => item.postureStability))),
        visualEngagement: Math.round(average(responses.map((item) => item.visualEngagement))),
        speechPaceWpm: Math.round(average(responses.map((item) => item.speechPaceWpm))),
      };
      await api.completeVideoInterview(id, { answers: responses, emotionSummary, sessionMetrics });
      cleanupMedia();
      setCameraReady(false);
      setRecording(false);
      setCompleted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function sampleVideoMotion() {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return 0;

    const canvas = canvasRef.current || document.createElement('canvas');
    if (!canvasRef.current) canvasRef.current = canvas;
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return 0;

    context.drawImage(video, 0, 0, size, size);
    const { data } = context.getImageData(0, 0, size, size);
    const brightness = new Uint8Array(size * size);
    for (let i = 0; i < brightness.length; i += 1) {
      const offset = i * 4;
      brightness[i] = Math.round((data[offset] + data[offset + 1] + data[offset + 2]) / 3);
    }

    const previous = previousFrameRef.current;
    previousFrameRef.current = brightness;
    if (!previous || previous.length !== brightness.length) return 0;

    let diff = 0;
    for (let i = 0; i < brightness.length; i += 1) {
      diff += Math.abs(brightness[i] - previous[i]);
    }
    return clamp(diff / (brightness.length * 255), 0, 1);
  }

  function cleanupMedia() {
    stopSpeechRecognition();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (sourceRef.current) sourceRef.current.disconnect();
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    previousFrameRef.current = null;
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button onClick={() => navigate(`/interview/${id}`)} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" /> Назад к текстовому интервью
        </button>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Sparkles className="w-4 h-4 text-primary-500" />
          AI соберёт речевые, эмоциональные и визуально-поведенческие сигналы для организатора
        </div>
      </div>

      <section className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.12),_transparent_35%),linear-gradient(135deg,_#ffffff,_#eef6ff)] p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white/80 px-3 py-1 text-xs font-medium text-primary-700">
              <Video className="w-3.5 h-3.5" /> Видео-интервью
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">Финальный этап с веб-камерой</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {profile?.full_name ? `${profile.full_name}, ` : ''}ответьте на 4 коротких вопроса голосом или текстом. После завершения мы сохраним транскрипт, эмоциональные индикаторы и базовые сигналы по движениям в кадре, а подробный AI-разбор увидит только организатор.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <StatusTile icon={Camera} label="Камера" value={cameraReady ? 'Подключена' : 'Ожидает доступ'} tone={cameraReady ? 'emerald' : 'amber'} />
              <StatusTile icon={Mic} label="Речь" value={speechSupported ? 'Автотранскрипт доступен' : 'Только ручной ввод'} tone={speechSupported ? 'blue' : 'slate'} />
              <StatusTile icon={Brain} label="Прогресс" value={`${answeredCount}/${questions.length} ответов`} tone="violet" />
            </div>
          </div>

          <div className="w-full max-w-md rounded-[24px] border border-slate-200 bg-slate-950 p-3 text-white shadow-xl">
            <div className="relative aspect-video overflow-hidden rounded-[18px] bg-slate-900">
              <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
              {!cameraReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/90 text-center">
                  <MonitorUp className="w-10 h-10 text-primary-300" />
                  <div>
                    <p className="text-sm font-medium">Подключите камеру и микрофон</p>
                    <p className="mt-1 text-xs text-slate-400">Нужны для проведения видео-интервью</p>
                  </div>
                </div>
              )}
              {recording && (
                <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-red-500/90 px-3 py-1 text-xs font-semibold">
                  <Circle className="w-3 h-3 fill-current" /> Идёт ответ
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/8 px-4 py-3 text-xs text-slate-200">
              <div>
                <p className="text-slate-400">Эмоциональный сигнал</p>
                <p className="mt-1 text-sm font-semibold text-white">{EMOTION_LABELS[currentEmotion.label]} • {currentEmotion.confidence}%</p>
              </div>
              <div className="max-w-[12rem] text-right text-[11px] leading-4 text-slate-300">{emotionTone}</div>
            </div>
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {warning && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{warning}</div>}

      {!cameraReady && !completed && (
        <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Подготовка к записи</h2>
              <p className="mt-1 text-sm text-slate-500">Сядьте в освещённом месте, разрешите доступ к камере и отвечайте свободно, как на живом интервью.</p>
            </div>
            <button
              onClick={prepareCamera}
              disabled={starting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {starting ? <Loader className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              Подключить камеру
            </button>
          </div>
        </section>
      )}

      {cameraReady && !completed && (
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">Вопрос {activeIndex + 1}</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">{activeQuestion}</h2>
              </div>
              <div className="min-w-40">
                <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>Прогресс</span>
                  <span>{completionPercent}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-primary-600 transition-all" style={{ width: `${completionPercent}%` }} />
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">Живой транскрипт</h3>
                  <span className="text-xs text-slate-400">{speechSupported ? 'из микрофона' : 'недоступно'}</span>
                </div>
                <div className="min-h-32 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700 shadow-inner">
                  {currentTranscript || <span className="text-slate-400">Во время ответа здесь появится распознанный текст</span>}
                </div>
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <label className="text-sm font-semibold text-slate-900">Текст ответа или правка транскрипта</label>
                <textarea
                  value={manualTranscript}
                  onChange={(e) => setManualTranscript(e.target.value)}
                  placeholder="Если автотранскрипт ошибся, исправьте или допишите ответ здесь"
                  className="mt-3 h-32 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {!recording ? (
                <button onClick={startAnswer} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                  <Mic className="w-4 h-4" /> Начать ответ
                </button>
              ) : (
                <button onClick={stopAnswer} className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700">
                  <Circle className="w-4 h-4 fill-current" /> Остановить запись
                </button>
              )}
              <button onClick={saveAnswerAndContinue} className="inline-flex items-center gap-2 rounded-2xl border border-primary-200 bg-primary-50 px-5 py-3 text-sm font-semibold text-primary-700 hover:bg-primary-100">
                <CheckCircle2 className="w-4 h-4" /> Сохранить ответ
              </button>
              <button
                onClick={handleFinish}
                disabled={!canFinish || submitting}
                className="inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3 text-sm font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50"
              >
                {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Завершить видео-интервью
              </button>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Короткая памятка</h3>
              <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
                <li>Отвечайте конкретными примерами, а не общими фразами.</li>
                <li>Если мысль оборвалась, можно дописать её в текстовом поле.</li>
                <li>Эмоциональные сигналы здесь используются как вспомогательная метрика, а не как окончательный вердикт.</li>
              </ul>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Уже сохранённые ответы</h3>
                <span className="text-xs text-slate-400">{answeredCount} из {questions.length}</span>
              </div>
              <div className="mt-4 space-y-3">
                {responses.length === 0 && <p className="text-sm text-slate-400">Пока нет сохранённых ответов</p>}
                {responses.map((item, index) => (
                  <div key={`${item.question}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Вопрос {index + 1}</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{item.question}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600 line-clamp-4">{item.transcript || item.manualTranscript}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>{EMOTION_LABELS[item.primaryEmotion]} • {item.emotionConfidence}%</span>
                      <span>{item.durationSec} сек.</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {completed && (
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Видео-интервью завершено
              </div>
              <h2 className="mt-3 text-2xl font-bold text-slate-950">Интервью отправлено организатору</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Мы сохранили ваши ответы, транскрипт, эмоциональные сигналы и визуально-поведенческие метрики. Подробный AI-разбор и итоговая оценка доступны только организатору в админ-панели.</p>
            </div>
            <Link to="/status" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Проверить статус заявки
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <ResultTile label="Ответов сохранено" value={responses.length} suffix={`из ${questions.length}`} color="primary" />
            <ResultTile label="Средняя длина" value={Math.round(average(responses.map((item) => item.durationSec)))} suffix="сек." color="emerald" />
            <ResultTile label="Транскрипт покрытия" value={Math.round((responses.filter((item) => item.transcript || item.manualTranscript).length / Math.max(responses.length, 1)) * 100)} suffix="%" color="amber" />
          </div>

          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
            После ручной проверки организатор сопоставит видео-интервью с письменной заявкой и текстовым интервью.
          </div>
        </section>
      )}
    </div>
  );
}

function StatusTile({ icon: Icon, label, value, tone }) {
  const toneClass = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
  }[tone] || 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}

function ResultTile({ label, value, color, suffix = 'из 100' }) {
  const colorClass = {
    primary: 'from-primary-600/10 to-primary-100 border-primary-200 text-primary-900',
    emerald: 'from-emerald-500/10 to-emerald-100 border-emerald-200 text-emerald-900',
    amber: 'from-amber-500/10 to-amber-100 border-amber-200 text-amber-900',
  }[color] || 'from-slate-500/10 to-slate-100 border-slate-200 text-slate-900';

  return (
    <div className={`rounded-[24px] border bg-gradient-to-br p-5 ${colorClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-3 text-4xl font-bold">{value ?? '—'}</p>
      <p className="mt-1 text-sm opacity-70">{suffix}</p>
    </div>
  );
}

function scoreTranscript(text) {
  const normalized = text.toLowerCase();
  const positiveWords = ['смог', 'сделал', 'добился', 'организовал', 'решил', 'помог', 'ответственность', 'инициатива', 'лидер', 'команда'];
  const stressWords = ['сложно', 'страшно', 'тревожно', 'переживал', 'ошибка', 'неудача', 'давление', 'стресс'];

  return {
    positive: positiveWords.reduce((score, word) => score + (normalized.includes(word) ? 16 : 0), 0),
    stress: stressWords.reduce((score, word) => score + (normalized.includes(word) ? 18 : 0), 0),
  };
}

function buildEmotionSummary(responses) {
  const distribution = responses.reduce((acc, item) => {
    Object.entries(item.emotionBreakdown || {}).forEach(([key, value]) => {
      acc[key] = (acc[key] || 0) + Number(value || 0);
    });
    return acc;
  }, { confident: 0, engaged: 0, neutral: 0, stressed: 0 });

  const normalizedDistribution = Object.fromEntries(
    Object.entries(distribution).map(([key, value]) => [key, Number((value / responses.length).toFixed(1))]),
  );
  const dominantEmotion = Object.entries(normalizedDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

  return {
    dominantEmotion,
    confidence: Math.round(average(responses.map((item) => item.emotionConfidence))),
    stableMoments: responses.filter((item) => ['confident', 'engaged'].includes(item.primaryEmotion)).length,
    stressMoments: responses.filter((item) => item.primaryEmotion === 'stressed').length,
    distribution: normalizedDistribution,
  };
}

function describeEmotion(label) {
  switch (label) {
    case 'confident':
      return 'Речь звучит устойчиво и собранно';
    case 'engaged':
      return 'Есть признаки включённости и интереса';
    case 'stressed':
      return 'Есть вероятность напряжения, стоит отвечать медленнее';
    default:
      return 'Сигнал пока нейтральный, он уточнится по мере ответа';
  }
}

function calculateSpeechPace({ transcript, manualTranscript, durationSec }) {
  const text = `${transcript || ''} ${manualTranscript || ''}`.trim();
  if (!text || !durationSec) return 0;
  const words = text.split(/\s+/).filter(Boolean).length;
  return clamp(Math.round((words / durationSec) * 60), 0, 300);
}

function average(values) {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (!filtered.length) return 0;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
