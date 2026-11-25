import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Briefcase,
  CheckCircle2,
  Clock,
  FileSearch,
  FileText,
  Flame,
  FolderOpen,
  GripVertical,
  Lightbulb,
  Link2,
  Mail,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Stamp,
  Trophy,
  Unlink,
  Volume2,
  VolumeX,
  XCircle,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { DetectiveAvatar, SafeImage } from './Avatars';
import { OfficeSceneVisualizer } from './OfficeSceneVisualizer';
import { OfficeDispatchBar } from './OfficeDispatchBar';
import { OfficeFloorCanvas } from './OfficeFloorCanvas';
import {
  CHALLENGE_TYPE_META,
  evaluateChallenge,
  formatDuration,
  getPredikat,
  shuffleWithSeed,
} from '../utils/gameLogic';
import {
  applySmartScanner,
  calculateSpeedBonus,
  computeLiveSimulationStats,
  computeOfficeIntegrity,
  getChallengeHint,
  getNpcDispatch,
  getStreakReaction,
  isChallengeAnswered,
  type SmartScanResult,
} from '../utils/simulatorHelpers';
import {
  isSoundMuted,
  playClickSfx,
  playCorrectSfx,
  playFreezeSfx,
  playHintSfx,
  playMissionCompleteSfx,
  playPowerUpSfx,
  playSnapSfx,
  playStampSfx,
  playWrongSfx,
  setSoundMuted,
} from '../utils/soundFx';
import type {
  AttemptDetail,
  AttemptRecord,
  Challenge,
  GameSimulation,
  Material,
} from '../types';

interface GameSimulatorProps {
  game: GameSimulation;
  material?: Material;
  userAvatarId?: string;
  userName?: string;
  isPreview?: boolean;
  onExit: () => void;
  onCompleteAttempt: (
    attempt: Omit<AttemptRecord, 'id' | 'userId' | 'userName' | 'completedAt'>
  ) => Promise<AttemptRecord | void>;
}

const MATCH_PAIR_PALETTE = [
  { bg: '#EDF8FD', border: '#54BCEB', badgeBg: '#54BCEB', text: '#182230' },
  { bg: '#FFF7E3', border: '#FFCA65', badgeBg: '#FFCA65', text: '#182230' },
  { bg: '#EEF9F1', border: '#71C98A', badgeBg: '#71C98A', text: '#182230' },
  { bg: '#F5EEFC', border: '#BB8AE8', badgeBg: '#BB8AE8', text: '#182230' },
  { bg: '#FFDCE8', border: '#E25C83', badgeBg: '#E25C83', text: '#FFFFFF' },
];

const CONFETTI_PIECES = [
  { x: -110, y: -70, r: -28, color: '#54BCEB' },
  { x: -75, y: -95, r: 22, color: '#FFCA65' },
  { x: -35, y: -110, r: -16, color: '#71C98A' },
  { x: 15, y: -115, r: 34, color: '#BB8AE8' },
  { x: 60, y: -92, r: -22, color: '#FFDCE8' },
  { x: 105, y: -68, r: 26, color: '#54BCEB' },
  { x: -85, y: -45, r: 40, color: '#71C98A' },
  { x: 88, y: -42, r: -35, color: '#FFCA65' },
  { x: -12, y: -80, r: 18, color: '#BB8AE8' },
  { x: 38, y: -78, r: -19, color: '#71C98A' },
];

function ConfettiBurst({ burstKey }: { burstKey: number }) {
  if (burstKey <= 0) return null;
  return (
    <div
      key={burstKey}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-12 flex justify-center overflow-visible z-30"
    >
      {CONFETTI_PIECES.map((piece, idx) => (
        <motion.span
          key={idx}
          initial={{ opacity: 1, x: 0, y: 0, scale: 0.4, rotate: 0 }}
          animate={{
            opacity: [1, 1, 0],
            x: piece.x,
            y: [0, piece.y, piece.y + 38],
            scale: [0.6, 1.15, 0.8],
            rotate: piece.r * 3,
          }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="absolute w-3 h-3 rounded-sm"
          style={{ backgroundColor: piece.color }}
        />
      ))}
    </div>
  );
}

export function GameSimulator({
  game,
  material,
  userAvatarId = 'detective_blue',
  userName = 'Detektif Kantor',
  isPreview = false,
  onExit,
  onCompleteAttempt,
}: GameSimulatorProps) {
  const sortedChallenges = useMemo(
    () => [...game.challenges].sort((a, b) => a.order - b.order),
    [game.challenges]
  );

  const shouldAutoStart = useMemo(() => {
    if (isPreview) return true;
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('autostart') === '1';
  }, [isPreview]);

  const [phase, setPhase] = useState<'briefing' | 'playing'>(
    shouldAutoStart ? 'playing' : 'briefing'
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});
  const [hintOpenMap, setHintOpenMap] = useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState(game.timerSeconds || 300);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [caseElapsedMap, setCaseElapsedMap] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Gamification & juice state
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [speedBonusTotal, setSpeedBonusTotal] = useState(0);
  const [scanCharges, setScanCharges] = useState(1);
  const [freezeCharges, setFreezeCharges] = useState(1);
  const [freezeSecondsLeft, setFreezeSecondsLeft] = useState(0);
  const [scanResultsMap, setScanResultsMap] = useState<Record<string, SmartScanResult>>({});
  const [burstKey, setBurstKey] = useState(0);
  const [floatingPoints, setFloatingPoints] = useState<{
    key: number;
    amount: number;
    bonus?: number;
    isCorrect: boolean;
  } | null>(null);
  const [muted, setMuted] = useState<boolean>(() => isSoundMuted());

  // Local interactive states for DnD / Matching / Ordering DnD
  const [selectedDragItemId, setSelectedDragItemId] = useState<string | null>(null);
  const [dragHoverZoneId, setDragHoverZoneId] = useState<string | null>(null);
  const [selectedMatchLeftId, setSelectedMatchLeftId] = useState<string | null>(null);
  const [draggingOrderId, setDraggingOrderId] = useState<string | null>(null);

  const currentChallenge: Challenge | undefined = sortedChallenges[currentIndex];
  const isChecked = currentChallenge ? Boolean(checkedMap[currentChallenge.id]) : false;

  const liveStats = useMemo(
    () => computeLiveSimulationStats(sortedChallenges, answers, checkedMap),
    [sortedChallenges, answers, checkedMap]
  );

  const officeIntegrity = useMemo(() => {
    const checkedResults = sortedChallenges
      .filter((ch) => checkedMap[ch.id])
      .map((ch) => evaluateChallenge(ch, answers[ch.id]).isCorrect);
    return computeOfficeIntegrity(checkedResults);
  }, [sortedChallenges, checkedMap, answers]);

  const { correctMap, answeredMap } = useMemo(() => {
    const cMap: Record<string, boolean> = {};
    const aMap: Record<string, boolean> = {};
    for (const ch of sortedChallenges) {
      aMap[ch.id] = isChallengeAnswered(ch, answers[ch.id]);
      if (checkedMap[ch.id]) {
        cMap[ch.id] = evaluateChallenge(ch, answers[ch.id]).isCorrect;
      }
    }
    return { correctMap: cMap, answeredMap: aMap };
  }, [sortedChallenges, answers, checkedMap]);

  // Sync body dataset state for playability/testing
  useEffect(() => {
    document.body.dataset.state =
      phase === 'briefing' ? 'title' : isPaused ? 'paused' : 'playing';
    return () => {
      delete document.body.dataset.state;
    };
  }, [phase, isPaused]);

  // Keyboard start handshake on briefing screen (Enter / Space)
  useEffect(() => {
    if (phase !== 'briefing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        playSnapSfx();
        setPhase('playing');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase]);

  // Countdown timer & per-case timer (pauses when paused or frozen)
  useEffect(() => {
    if (phase !== 'playing' || isPaused || sortedChallenges.length === 0) return;
    const activeId = currentChallenge?.id;
    const isCurrentChecked = activeId ? Boolean(checkedMap[activeId]) : true;

    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      if (activeId && !isCurrentChecked) {
        setCaseElapsedMap((prev) => ({
          ...prev,
          [activeId]: (prev[activeId] ?? 0) + 1,
        }));
      }
      setFreezeSecondsLeft((prevFreeze) => {
        if (prevFreeze > 0) {
          return prevFreeze - 1;
        }
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            window.clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, isPaused, sortedChallenges.length, currentChallenge?.id, checkedMap]);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (
      phase === 'playing' &&
      !isPaused &&
      secondsLeft === 0 &&
      !submitting &&
      sortedChallenges.length > 0
    ) {
      void handleFinishSimulation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase, isPaused]);

  // Initialize default shuffled steps when entering an ordering challenge
  useEffect(() => {
    if (!currentChallenge) return;
    setSelectedDragItemId(null);
    setDragHoverZoneId(null);
    setSelectedMatchLeftId(null);
    setDraggingOrderId(null);

    if (currentChallenge.type === 'ordering' && !answers[currentChallenge.id]) {
      const steps = currentChallenge.steps ?? [];
      const shuffled = shuffleWithSeed(steps, currentIndex + 17);
      if (
        steps.length >= 2 &&
        shuffled.every((s, idx) => s.id === steps[idx].id)
      ) {
        const swapped = [...shuffled];
        const first = swapped[0];
        swapped[0] = swapped[1];
        swapped[1] = first;
        setAnswers((prev) => ({
          ...prev,
          [currentChallenge.id]: swapped.map((s) => s.id),
        }));
      } else {
        setAnswers((prev) => ({
          ...prev,
          [currentChallenge.id]: shuffled.map((s) => s.id),
        }));
      }
    }
  }, [currentChallenge, currentIndex, answers]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentIndex, phase]);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    setSoundMuted(next);
    if (!next) playClickSfx();
  }

  function startMission() {
    playSnapSfx();
    setPhase('playing');
    setIsPaused(false);
  }

  function handleRestartMission() {
    playSnapSfx();
    setCurrentIndex(0);
    setAnswers({});
    setCheckedMap({});
    setHintOpenMap({});
    setCaseElapsedMap({});
    setSecondsLeft(game.timerSeconds || 300);
    setElapsedSeconds(0);
    setStreak(0);
    setBestStreak(0);
    setSpeedBonusTotal(0);
    setScanCharges(1);
    setFreezeCharges(1);
    setFreezeSecondsLeft(0);
    setScanResultsMap({});
    setBurstKey(0);
    setFloatingPoints(null);
    setIsPaused(false);
    setPhase('playing');
  }

  function updateAnswer(challengeId: string, val: unknown) {
    if (checkedMap[challengeId]) return;
    setAnswers((prev) => ({ ...prev, [challengeId]: val }));
  }

  function handleUseSmartScan() {
    if (!currentChallenge || isChecked || scanCharges <= 0 || scanResultsMap[currentChallenge.id]) {
      return;
    }
    const result = applySmartScanner(currentChallenge, answers[currentChallenge.id]);
    setScanCharges((c) => Math.max(0, c - 1));
    setScanResultsMap((prev) => ({ ...prev, [currentChallenge.id]: result }));
    playPowerUpSfx();

    if (result.flaggedErrorRowId) {
      const existing = new Set(
        Array.isArray(answers[currentChallenge.id])
          ? (answers[currentChallenge.id] as string[])
          : []
      );
      existing.add(result.flaggedErrorRowId);
      updateAnswer(currentChallenge.id, Array.from(existing));
    } else if (result.revealedDragItem) {
      const existing =
        (answers[currentChallenge.id] as Record<string, string>) || {};
      updateAnswer(currentChallenge.id, {
        ...existing,
        [result.revealedDragItem.itemId]: result.revealedDragItem.zoneId,
      });
    } else if (result.revealedPair) {
      const existing =
        (answers[currentChallenge.id] as Record<string, string>) || {};
      const next = { ...existing };
      for (const k of Object.keys(next)) {
        if (next[k] === result.revealedPair.right) delete next[k];
      }
      next[result.revealedPair.pairId] = result.revealedPair.right;
      updateAnswer(currentChallenge.id, next);
    } else if (result.lockedFirstStepId) {
      const currentOrder =
        (answers[currentChallenge.id] as string[]) ??
        (currentChallenge.steps ?? []).map((s) => s.id);
      const filtered = currentOrder.filter((id) => id !== result.lockedFirstStepId);
      updateAnswer(currentChallenge.id, [result.lockedFirstStepId, ...filtered]);
    }
  }

  function handleUseFreezeTimer() {
    if (freezeCharges <= 0 || freezeSecondsLeft > 0) return;
    setFreezeCharges((c) => Math.max(0, c - 1));
    setFreezeSecondsLeft(15);
    playFreezeSfx();
  }

  function handleCheckCurrent() {
    if (!currentChallenge || checkedMap[currentChallenge.id]) return;
    const evalRes = evaluateChallenge(currentChallenge, answers[currentChallenge.id]);
    setCheckedMap((prev) => ({ ...prev, [currentChallenge.id]: true }));
    playStampSfx();

    if (evalRes.isCorrect) {
      const nextStreak = streak + 1;
      const caseSecs = caseElapsedMap[currentChallenge.id] ?? 0;
      const speedXp = calculateSpeedBonus(caseSecs, true);
      setStreak(nextStreak);
      setBestStreak((prev) => Math.max(prev, nextStreak));
      if (speedXp > 0) {
        setSpeedBonusTotal((prev) => prev + speedXp);
      }
      if (nextStreak >= 2 && nextStreak % 2 === 0) {
        setScanCharges((prev) => Math.min(3, prev + 1));
      }
      setBurstKey((k) => k + 1);
      setFloatingPoints({
        key: Date.now(),
        amount: evalRes.earnedPoints,
        bonus: speedXp,
        isCorrect: true,
      });
      playCorrectSfx(nextStreak);
    } else {
      setStreak(0);
      setFloatingPoints({
        key: Date.now(),
        amount: evalRes.earnedPoints,
        isCorrect: false,
      });
      playWrongSfx();
    }
  }

  function handleToggleHint() {
    if (!currentChallenge) return;
    const nextOpen = !hintOpenMap[currentChallenge.id];
    if (nextOpen) playHintSfx();
    setHintOpenMap((prev) => ({
      ...prev,
      [currentChallenge.id]: nextOpen,
    }));
  }

  // Keyboard gameplay shortcuts while playing
  useEffect(() => {
    if (phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsPaused((prev) => !prev);
        return;
      }
      if (isPaused || !currentChallenge) return;

      if (!isChecked) {
        if (
          (currentChallenge.type === 'multiple_choice' ||
            currentChallenge.type === 'case_simulation') &&
          ['1', '2', '3', '4'].includes(e.key)
        ) {
          const idx = Number(e.key) - 1;
          const scanRes = scanResultsMap[currentChallenge.id];
          if (
            idx < (currentChallenge.options?.length ?? 0) &&
            !scanRes?.eliminatedOptionIndices.includes(idx)
          ) {
            playClickSfx();
            updateAnswer(currentChallenge.id, idx);
          }
        } else if (
          currentChallenge.type === 'decision_making' &&
          ['1', '2', '3', '4'].includes(e.key)
        ) {
          const idx = Number(e.key) - 1;
          const choice = currentChallenge.choices?.[idx];
          const scanRes = scanResultsMap[currentChallenge.id];
          if (choice && !scanRes?.eliminatedChoiceIds.includes(choice.id)) {
            playClickSfx();
            updateAnswer(currentChallenge.id, choice.id);
          }
        } else if (
          currentChallenge.type === 'true_false' &&
          (e.key === '1' || e.key === '2')
        ) {
          playClickSfx();
          updateAnswer(currentChallenge.id, e.key === '1');
        }
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        const tag = target?.tagName;
        if (tag === 'BUTTON') return;
        e.preventDefault();
        if (!isChecked && isChallengeAnswered(currentChallenge, answers[currentChallenge.id])) {
          handleCheckCurrent();
        } else if (isChecked && currentIndex < sortedChallenges.length - 1) {
          playClickSfx();
          setCurrentIndex((i) => i + 1);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isPaused, currentChallenge, isChecked, answers, scanResultsMap, currentIndex]);

  async function handleFinishSimulation() {
    if (submitting) return;
    setSubmitting(true);
    playMissionCompleteSfx();
    try {
      const details: AttemptDetail[] = sortedChallenges.map((ch) => {
        const evalRes = evaluateChallenge(ch, answers[ch.id]);
        return {
          itemId: ch.id,
          title: ch.title,
          typeLabel: CHALLENGE_TYPE_META[ch.type].label,
          isCorrect: evalRes.isCorrect,
          earnedPoints: evalRes.earnedPoints,
          maxPoints: evalRes.maxPoints,
          userAnswerSummary: evalRes.userAnswerSummary,
          correctAnswerSummary: evalRes.correctAnswerSummary,
          explanation: ch.explanation,
        };
      });

      const score = details.reduce((s, d) => s + d.earnedPoints, 0);
      const maxScore = details.reduce((s, d) => s + d.maxPoints, 0) || 100;
      const percentage = Math.round((score / maxScore) * 100);
      const correctCount = details.filter((d) => d.isCorrect).length;
      const wrongCount = details.length - correctCount;
      const predikat = getPredikat(percentage).title;

      await onCompleteAttempt({
        materialId: game.materialId,
        materialTitle: material?.title || game.title,
        kind: 'simulation',
        targetId: game.id,
        targetTitle: game.title,
        score,
        maxScore,
        percentage,
        correctCount,
        wrongCount,
        durationSeconds: Math.max(1, elapsedSeconds),
        predikat,
        details,
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (sortedChallenges.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-white rounded-3xl p-8 border border-[#EFE7D6] text-center">
          <h2 className="font-display text-2xl font-bold text-[#182230]">
            Simulasi Belum Memiliki Tantangan
          </h2>
          <p className="text-sm text-[#516072] mt-2">
            Admin perlu menambahkan minimal satu tantangan pada game simulasi ini.
          </p>
          <button
            type="button"
            onClick={onExit}
            className="mt-6 px-5 py-2.5 rounded-xl bg-[#54BCEB] text-[#182230] font-semibold text-sm cursor-pointer"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  // Stage 1: Interactive Mission Briefing Screen (skipped on Admin preview or ?autostart=1)
  if (phase === 'briefing') {
    const mechanismNames = Array.from(
      new Set(sortedChallenges.map((c) => CHALLENGE_TYPE_META[c.type].label))
    );

    return (
      <div className="min-h-screen bg-[#FFF8E9] flex flex-col">
        <div className="max-w-[1000px] w-full mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col justify-center">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={onExit}
              className="px-4 py-2 rounded-xl bg-white border border-[#EFE7D6] hover:bg-[#FFCA65]/30 text-[#182230] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Materi</span>
            </button>

            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Aktifkan efek suara' : 'Matikan efek suara'}
              className="w-10 h-10 rounded-xl bg-white border border-[#EFE7D6] hover:bg-[#EDF8FD] flex items-center justify-center text-[#182230] cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-3xl border border-[#EFE7D6] shadow-md overflow-hidden"
          >
            {/* Colorful Office Dossier Top Strip */}
            <div className="bg-[#EDF8FD] border-b border-[#D5ECF8] px-6 sm:px-8 py-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#FFCA65] flex items-center justify-center text-[#182230] shadow-sm">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#2B8CBE]">
                    Briefing Misi Penyelamatan Data · Tingkat {game.difficulty}
                  </p>
                  <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#182230]">
                    {game.title}
                  </h1>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-[#182230] bg-white px-3.5 py-2 rounded-xl border border-[#D5ECF8] tabular-nums">
                Target Maks: {liveStats.totalPossiblePoints} Poin
              </span>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Detective Dialogue Box + Mission Visual */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                <div className="md:col-span-8 flex flex-col sm:flex-row items-start gap-4 bg-[#FFF8E9] rounded-2xl p-5 border border-[#EFE7D6]">
                  <DetectiveAvatar avatarId={userAvatarId} size={64} />
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-[#6D3FA3]">
                      Halo, {userName}! Kasus Baru Masuk ke Meja Kerja Anda:
                    </p>
                    <p className="text-[15px] text-[#182230] leading-relaxed font-medium">
                      {game.story}
                    </p>
                    {game.instructions && (
                      <p className="text-xs text-[#516072] pt-1">
                        Instruksi Tugas: {game.instructions}
                      </p>
                    )}
                  </div>
                </div>
                <div className="md:col-span-4 rounded-2xl overflow-hidden border border-[#EFE7D6] min-h-[130px]">
                  <SafeImage
                    src={material?.imageUrl}
                    alt={material?.title || game.title}
                    title={game.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Mission Stats */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <div className="rounded-2xl bg-[#EEF9F1] border border-[#CBEBD4] p-4 text-center">
                  <p className="font-mono text-2xl font-extrabold text-[#182230] tabular-nums">
                    {sortedChallenges.length}
                  </p>
                  <p className="text-xs font-semibold text-[#2E7245] mt-0.5">Kasus Investigasi</p>
                </div>
                <div className="rounded-2xl bg-[#FFF7E3] border border-[#F6DF9F] p-4 text-center">
                  <p className="font-mono text-2xl font-extrabold text-[#182230] tabular-nums">
                    {formatDuration(game.timerSeconds || 300)}
                  </p>
                  <p className="text-xs font-semibold text-[#8E5B08] mt-0.5">Batas Waktu</p>
                </div>
                <div className="rounded-2xl bg-[#F5EEFC] border border-[#E0CCF7] p-4 text-center">
                  <p className="font-mono text-2xl font-extrabold text-[#182230] tabular-nums">
                    {mechanismNames.length}
                  </p>
                  <p className="text-xs font-semibold text-[#6D3B9E] mt-0.5">Tipe Tantangan</p>
                </div>
              </div>

              {/* Challenge Preview List */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#516072] mb-2.5">
                  Rangkaian Aktivitas di Meja Kerja:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {sortedChallenges.map((ch, idx) => (
                    <div
                      key={ch.id}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[#FFFDF8] border border-[#EFE7D6]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 text-[#182230]"
                          style={{
                            backgroundColor: CHALLENGE_TYPE_META[ch.type].badgeTint,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#182230] truncate">{ch.title}</p>
                          <p className="text-[11px] text-[#516072] truncate">
                            {CHALLENGE_TYPE_META[ch.type].label}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-[#516072] shrink-0">
                        {ch.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Start CTA */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-[#516072]">
                  Tips: Jawab beruntun dengan tepat untuk membangun <strong className="text-[#182230]">Kombo Detektif</strong>!
                </p>
                <button
                  type="button"
                  data-start="true"
                  onClick={startMission}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#FFCA65] hover:bg-[#F5BC4E] text-[#182230] font-extrabold text-sm inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-transform active:scale-[0.98]"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Mulai Misi Sekarang!</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const currentEval = currentChallenge
    ? evaluateChallenge(currentChallenge, answers[currentChallenge.id])
    : null;
  const hintOpen = currentChallenge ? Boolean(hintOpenMap[currentChallenge.id]) : false;
  const activeScanResult = currentChallenge ? scanResultsMap[currentChallenge.id] : undefined;
  const currentCaseElapsed = currentChallenge ? (caseElapsedMap[currentChallenge.id] ?? 0) : 0;
  const activeDispatch = currentChallenge
    ? getNpcDispatch(currentChallenge, {
        isChecked,
        isCorrect: currentEval?.isCorrect,
        answered: isChallengeAnswered(currentChallenge, answers[currentChallenge.id]),
        streak,
      })
    : null;
  const progressPct = Math.round(
    ((liveStats.checkedCount || currentIndex + 1) / sortedChallenges.length) * 100
  );

  return (
    <div
      className="min-h-screen bg-[#FFF8E9] pb-14"
      data-state={isPaused ? 'paused' : 'playing'}
    >
      {/* Top Interactive Game HUD */}
      <div className="bg-white border-b border-[#EFE7D6] sticky top-0 z-20 shadow-xs">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onExit}
              className="px-3 py-2 rounded-xl bg-[#FFF8E9] hover:bg-[#FFCA65]/40 text-[#182230] text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isPreview ? 'Tutup Preview' : 'Keluar Misi'}</span>
            </button>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#2B8CBE] truncate">
                {isPreview ? 'Mode Preview Admin' : material?.title || 'Simulasi Kantor'}
              </p>
              <h1 className="font-display text-sm sm:text-base font-bold text-[#182230] truncate">
                {game.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Office Integrity Meter */}
            <div
              data-testid="office-integrity-badge"
              className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${
                officeIntegrity.label === 'Prima'
                  ? 'bg-[#EEF9F1] border-[#CBEBD4] text-[#182230]'
                  : officeIntegrity.label === 'Waspada'
                    ? 'bg-[#FFF7E3] border-[#F6DF9F] text-[#182230]'
                    : 'bg-[#FFDCE8] border-[#E25C83] text-[#7A1C3D]'
              }`}
            >
              <ShieldCheck
                className={`w-4 h-4 ${
                  officeIntegrity.label === 'Prima'
                    ? 'text-[#2E854A]'
                    : officeIntegrity.label === 'Waspada'
                      ? 'text-[#B57B14]'
                      : 'text-[#B82853]'
                }`}
              />
              <div>
                <span className="block text-[9px] font-semibold uppercase tracking-wide text-[#516072]">
                  Integritas
                </span>
                <span className="font-mono text-xs font-extrabold tabular-nums">
                  {officeIntegrity.percentage}% · {officeIntegrity.label}
                </span>
              </div>
            </div>

            {/* Live Score Counter */}
            <div className="relative px-2.5 py-1 rounded-xl bg-[#EDF8FD] border border-[#CBE8F7] flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-[#2B8CBE]" />
              <div>
                <span className="block text-[9px] font-semibold uppercase tracking-wide text-[#1D6B94]">
                  Skor Live
                </span>
                <span
                  data-testid="live-score-value"
                  className="font-mono text-xs font-extrabold text-[#182230] tabular-nums whitespace-nowrap"
                >
                  {liveStats.earnedPoints}/{liveStats.totalPossiblePoints}
                  {speedBonusTotal > 0 ? ` (+${speedBonusTotal} XP)` : ''}
                </span>
              </div>

              <AnimatePresence>
                {floatingPoints && floatingPoints.amount > 0 && (
                  <motion.span
                    key={floatingPoints.key}
                    initial={{ opacity: 1, y: 0, scale: 0.85 }}
                    animate={{ opacity: 0, y: -26, scale: 1.15 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.9 }}
                    className="pointer-events-none absolute -top-2 right-1 font-mono text-xs font-extrabold text-[#182230] bg-[#71C98A] px-2 py-0.5 rounded-lg shadow-sm"
                  >
                    +{floatingPoints.amount}
                    {floatingPoints.bonus ? ` (+${floatingPoints.bonus} Kilat)` : ''}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Combo Streak Indicator */}
            <div
              data-testid="combo-streak-badge"
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors ${
                streak >= 2
                  ? 'bg-[#FFCA65] border-[#E8AE3E] text-[#182230]'
                  : 'bg-[#FFF8E9] border-[#EFE7D6] text-[#516072]'
              }`}
            >
              <Flame
                className={`w-4 h-4 ${streak >= 2 ? 'text-[#B5410C]' : 'text-[#9AA5B4]'}`}
              />
              <div>
                <span className="block text-[10px] font-semibold uppercase tracking-wide">
                  Kombo
                </span>
                <span className="font-mono text-xs sm:text-sm font-extrabold tabular-nums">
                  x{streak}
                </span>
              </div>
            </div>

            {/* Timer (supports Freeze power-up) */}
            <div
              className={`px-3 py-2 rounded-xl font-mono text-xs sm:text-sm font-bold tabular-nums inline-flex items-center gap-1.5 border ${
                freezeSecondsLeft > 0
                  ? 'bg-[#EDF8FD] border-[#54BCEB] text-[#1D6B94]'
                  : secondsLeft <= 30
                    ? 'bg-[#FFDCE8] border-[#E25C83] text-[#8B1E42] animate-pulse'
                    : 'bg-[#FFF8E9] border-[#EFE7D6] text-[#182230]'
              }`}
            >
              {freezeSecondsLeft > 0 ? (
                <Snowflake className="w-4 h-4 text-[#2B8CBE]" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
              <span>
                {freezeSecondsLeft > 0
                  ? `BEKU ${freezeSecondsLeft}s`
                  : formatDuration(secondsLeft)}
              </span>
            </div>

            {/* Pause Toggle */}
            <button
              type="button"
              onClick={() => {
                playClickSfx();
                setIsPaused((prev) => !prev);
              }}
              aria-label={isPaused ? 'Lanjutkan misi' : 'Jeda misi'}
              title="Jeda misi (P)"
              className="w-9 h-9 rounded-xl bg-[#FFF8E9] hover:bg-[#FFCA65]/40 border border-[#EFE7D6] flex items-center justify-center text-[#182230] cursor-pointer"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>

            {/* Sound Mute/Unmute Toggle */}
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Aktifkan efek suara' : 'Matikan efek suara'}
              title={muted ? 'Aktifkan efek suara' : 'Matikan efek suara'}
              className="w-9 h-9 rounded-xl bg-[#FFF8E9] hover:bg-[#EDF8FD] border border-[#EFE7D6] flex items-center justify-center text-[#182230] cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 bg-[#EFE7D6] w-full">
          <div
            className="h-full bg-[#71C98A] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="max-w-[1060px] mx-auto px-4 sm:px-6 pt-5 space-y-5">
        {/* Playable 2D Top-Down Office Game Floor */}
        <OfficeFloorCanvas
          challenges={sortedChallenges}
          currentIndex={currentIndex}
          checkedMap={checkedMap}
          correctMap={correctMap}
          answeredMap={answeredMap}
          userAvatarId={userAvatarId}
          isPaused={isPaused}
          onSelectStation={(idx) => setCurrentIndex(idx)}
          onCollectStar={() => {
            setSpeedBonusTotal((prev) => prev + 5);
          }}
        />

        {/* Interactive Case Stepper Map (Papan Jejak Kasus) */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#EFE7D6] shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="text-xs font-bold uppercase tracking-wide text-[#516072]">
              Papan Kasus Investigasi ({liveStats.checkedCount}/{sortedChallenges.length} Diperiksa)
            </p>
            <span className="text-xs text-[#516072] font-medium">
              {bestStreak >= 2 ? `Rekor Kombo: x${bestStreak}` : `Skenario Tingkat ${game.difficulty}`}
            </span>
          </div>
          <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
            {sortedChallenges.map((ch, idx) => {
              const active = idx === currentIndex;
              const checked = Boolean(checkedMap[ch.id]);
              const answered = isChallengeAnswered(ch, answers[ch.id]);
              const evalStatus = checked ? evaluateChallenge(ch, answers[ch.id]).isCorrect : null;

              let cardCls = 'bg-[#FFFDF8] border-[#E6DEC9] text-[#516072] hover:border-[#54BCEB]';
              if (active) {
                cardCls = 'bg-[#EDF8FD] border-[#54BCEB] text-[#182230] shadow-xs';
              } else if (checked && evalStatus) {
                cardCls = 'bg-[#EEF9F1] border-[#71C98A] text-[#182230]';
              } else if (checked && !evalStatus) {
                cardCls = 'bg-[#FFF7E3] border-[#FFCA65] text-[#182230]';
              } else if (answered) {
                cardCls = 'bg-[#F5EEFC] border-[#BB8AE8] text-[#182230]';
              }

              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => {
                    playClickSfx();
                    setCurrentIndex(idx);
                  }}
                  aria-label={`Buka Kasus ${idx + 1}: ${ch.title}`}
                  className={`min-w-[140px] flex-1 px-3.5 py-2.5 rounded-2xl border-2 text-left transition-all cursor-pointer shrink-0 ${cardCls}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold uppercase">
                      Kasus {idx + 1}
                    </span>
                    {checked ? (
                      evalStatus ? (
                        <CheckCircle2 className="w-4 h-4 text-[#2E854A]" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-[#B57B14]" />
                      )
                    ) : answered ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#BB8AE8]" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#D8D0BE]" />
                    )}
                  </div>
                  <p className="text-xs font-bold text-[#182230] truncate mt-1">
                    {CHALLENGE_TYPE_META[ch.type].label}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Challenge Workspace */}
        {currentChallenge && (
          <motion.div
            key={currentChallenge.id}
            initial={{ opacity: 0.9, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="relative bg-white rounded-3xl p-6 sm:p-8 border border-[#EFE7D6] shadow-sm overflow-hidden"
          >
            <ConfettiBurst burstKey={burstKey} />

            {/* Challenge Header + Detective Hint Toggle */}
            <div className="flex flex-wrap items-start justify-between gap-3 mb-5 pb-4 border-b border-[#EFE7D6]">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-[#516072]">
                  <span
                    className="w-3 h-3 rounded-sm inline-block"
                    style={{
                      backgroundColor: CHALLENGE_TYPE_META[currentChallenge.type].badgeTint,
                    }}
                  />
                  <span>
                    Kasus {currentIndex + 1} dari {sortedChallenges.length}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#182230]">
                    {CHALLENGE_TYPE_META[currentChallenge.type].label}
                  </span>
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[#182230]">
                  {currentChallenge.title}
                </h2>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleHint}
                  aria-expanded={hintOpen}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors border ${
                    hintOpen
                      ? 'bg-[#FFCA65] border-[#E8AE3E] text-[#182230]'
                      : 'bg-[#FFF8E9] border-[#EFE7D6] hover:bg-[#FFCA65]/40 text-[#182230]'
                  }`}
                >
                  <Lightbulb className="w-4 h-4 text-[#B57B14]" />
                  <span>{hintOpen ? 'Tutup Petunjuk' : 'Petunjuk Detektif'}</span>
                </button>
                <span className="font-mono text-xs font-bold text-[#182230] bg-[#EDF8FD] px-3 py-2 rounded-xl border border-[#CBE8F7] tabular-nums">
                  +{currentChallenge.points} Poin
                </span>
              </div>
            </div>

            {/* Collapsible Detective Hint Speech Bubble */}
            <AnimatePresence>
              {hintOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-5 overflow-hidden"
                >
                  <div className="rounded-2xl bg-[#FFF7E3] border border-[#FFCA65] p-4 flex items-start gap-3.5">
                    <DetectiveAvatar avatarId={userAvatarId} size={42} />
                    <div>
                      <p className="text-xs font-extrabold text-[#8E5B08]">
                        Catatan Petunjuk Detektif:
                      </p>
                      <p className="text-sm text-[#182230] mt-0.5 leading-relaxed">
                        {getChallengeHint(currentChallenge)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Live Colleague Messenger, Detective Power-Ups & Speed Bonus Bar */}
            {activeDispatch && (
              <OfficeDispatchBar
                dispatch={activeDispatch}
                isChecked={isChecked}
                caseElapsedSeconds={currentCaseElapsed}
                scanCharges={scanCharges}
                freezeCharges={freezeCharges}
                freezeSecondsLeft={freezeSecondsLeft}
                scanUsedOnCurrent={Boolean(activeScanResult)}
                scanFeedback={activeScanResult?.scanMessage}
                onUseSmartScan={handleUseSmartScan}
                onUseFreezeTimer={handleUseFreezeTimer}
              />
            )}

            {/* Interactive Live Office Scene Visualization */}
            <OfficeSceneVisualizer
              challenge={currentChallenge}
              challengeIndex={currentIndex}
              answer={answers[currentChallenge.id]}
              isChecked={isChecked}
              isCorrect={currentEval?.isCorrect}
              earnedPoints={currentEval?.earnedPoints}
              materialImageUrl={material?.imageUrl}
              materialTitle={material?.title}
              userAvatarId={userAvatarId}
              selectedDragItemId={selectedDragItemId}
              onAssignDragZone={(zoneId) => {
                if (!selectedDragItemId || isChecked) return;
                const map =
                  (answers[currentChallenge.id] as Record<string, string>) || {};
                playSnapSfx();
                updateAnswer(currentChallenge.id, { ...map, [selectedDragItemId]: zoneId });
                setSelectedDragItemId(null);
              }}
              onToggleErrorRow={(rowId) => {
                if (isChecked) return;
                playClickSfx();
                const currentSet = new Set(
                  (answers[currentChallenge.id] as string[]) ?? []
                );
                if (currentSet.has(rowId)) currentSet.delete(rowId);
                else currentSet.add(rowId);
                updateAnswer(currentChallenge.id, Array.from(currentSet));
              }}
            />

            <p className="text-[15px] text-[#2F3B4B] leading-relaxed font-medium">
              {currentChallenge.prompt}
            </p>

            {/* Challenge Mechanism Body */}
            <div className="mt-5">
              {/* 1. Multiple Choice */}
              {currentChallenge.type === 'multiple_choice' && (
                <div className="space-y-3">
                  {(currentChallenge.options ?? []).map((opt, idx) => {
                    const selected = answers[currentChallenge.id] === idx;
                    const isCorrectOpt = idx === currentChallenge.correctIndex;
                    const isEliminated = Boolean(
                      activeScanResult?.eliminatedOptionIndices.includes(idx)
                    );
                    let borderClass =
                      'border-[#E6DEC9] bg-[#FFFDF8] hover:border-[#54BCEB] hover:-translate-y-0.5';
                    if (isChecked) {
                      if (isCorrectOpt) borderClass = 'border-[#71C98A] bg-[#EEF9F1]';
                      else if (selected) borderClass = 'border-[#E25C83] bg-[#FFDCE8]/55';
                    } else if (isEliminated) {
                      borderClass = 'border-[#E6DEC9] bg-[#F6F2E9] opacity-45 line-through';
                    } else if (selected) {
                      borderClass = 'border-[#54BCEB] bg-[#EDF8FD] shadow-xs';
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={isChecked || isEliminated}
                        onClick={() => {
                          playClickSfx();
                          updateAnswer(currentChallenge.id, idx);
                        }}
                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-3.5 cursor-pointer disabled:cursor-not-allowed ${borderClass}`}
                      >
                        <span
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center font-mono text-sm font-extrabold shrink-0 ${
                            selected && !isChecked
                              ? 'bg-[#54BCEB] border-[#3FAEDB] text-[#182230]'
                              : 'bg-white border-[#D8D0BE] text-[#182230]'
                          }`}
                        >
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="text-sm sm:text-[15px] font-medium text-[#182230]">
                          {opt}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 2. True or False */}
              {currentChallenge.type === 'true_false' && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-[#FFF8E9] border-2 border-[#EFE7D6] text-[15px] font-semibold text-[#182230] leading-relaxed">
                    &ldquo;{currentChallenge.statement}&rdquo;
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { val: true, label: 'BENAR', desc: 'Sesuai prosedur & SOP resmi kantor' },
                      { val: false, label: 'SALAH', desc: 'Menyalahi SOP atau berisiko bagi data' },
                    ].map((choice) => {
                      const selected = answers[currentChallenge.id] === choice.val;
                      const isCorrectChoice = choice.val === currentChallenge.correctAnswer;
                      let cls =
                        'border-[#E6DEC9] bg-white hover:border-[#54BCEB] hover:-translate-y-0.5';
                      if (isChecked) {
                        if (isCorrectChoice) cls = 'border-[#71C98A] bg-[#EEF9F1]';
                        else if (selected) cls = 'border-[#E25C83] bg-[#FFDCE8]/55';
                      } else if (selected) {
                        cls = choice.val
                          ? 'border-[#71C98A] bg-[#EEF9F1] shadow-xs'
                          : 'border-[#BB8AE8] bg-[#F5EEFC] shadow-xs';
                      }
                      return (
                        <button
                          key={String(choice.val)}
                          type="button"
                          disabled={isChecked}
                          onClick={() => {
                            playClickSfx();
                            updateAnswer(currentChallenge.id, choice.val);
                          }}
                          className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer ${cls}`}
                        >
                          <div className="flex items-center gap-2.5 font-display text-lg font-extrabold text-[#182230]">
                            {choice.val ? (
                              <CheckCircle2 className="w-6 h-6 text-[#2E854A]" />
                            ) : (
                              <XCircle className="w-6 h-6 text-[#D94E75]" />
                            )}
                            <span>{choice.label}</span>
                          </div>
                          <p className="text-xs text-[#516072] mt-1.5">{choice.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Drag and Drop Classification */}
              {currentChallenge.type === 'drag_and_drop' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#516072] bg-[#EDF8FD]/60 px-4 py-2.5 rounded-xl border border-[#CBE8F7]">
                    <span>
                      Seret kartu dokumen ke folder arsip tujuan, atau klik dokumen lalu klik folder target.
                    </span>
                    <span className="font-mono font-bold text-[#182230]">
                      {
                        Object.keys(
                          (answers[currentChallenge.id] as Record<string, string>) || {}
                        ).length
                      }
                      /{(currentChallenge.items ?? []).length} Ditempatkan
                    </span>
                  </div>

                  {/* Inbox Tray */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#FFF8E9] border-2 border-[#EFE7D6]">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#516072] mb-3 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#54BCEB]" />
                      <span>Kotak Masuk Dokumen</span>
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {(currentChallenge.items ?? [])
                        .filter((item) => {
                          const map =
                            (answers[currentChallenge.id] as Record<string, string>) || {};
                          return !map[item.id];
                        })
                        .map((item) => {
                          const isSelected = selectedDragItemId === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              draggable={!isChecked}
                              disabled={isChecked}
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', item.id);
                                setSelectedDragItemId(item.id);
                              }}
                              onClick={() => {
                                playClickSfx();
                                setSelectedDragItemId(isSelected ? null : item.id);
                              }}
                              className={`px-4 py-3 rounded-2xl border-2 text-left transition-all cursor-grab active:cursor-grabbing ${
                                isSelected
                                  ? 'border-[#54BCEB] bg-[#EDF8FD] shadow-sm scale-[1.02]'
                                  : 'border-[#E6DEC9] bg-white hover:border-[#FFCA65] hover:-translate-y-0.5'
                              }`}
                            >
                              <div className="flex items-center gap-2 text-sm font-bold text-[#182230]">
                                <FileText className="w-4 h-4 text-[#54BCEB] shrink-0" />
                                <span>{item.label}</span>
                              </div>
                              {item.sublabel && (
                                <span className="block text-xs text-[#516072] mt-0.5 pl-6">
                                  {item.sublabel}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      {(currentChallenge.items ?? []).every((item) => {
                        const map =
                          (answers[currentChallenge.id] as Record<string, string>) || {};
                        return Boolean(map[item.id]);
                      }) && (
                        <p className="text-xs text-[#2E7245] font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-[#71C98A]" />
                          <span>
                            Semua dokumen sudah masuk folder! Tekan &ldquo;Periksa Jawaban&rdquo; untuk mengunci hasil.
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Target Office Folders */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(currentChallenge.zones ?? []).map((zone) => {
                      const map =
                        (answers[currentChallenge.id] as Record<string, string>) || {};
                      const zoneItems = (currentChallenge.items ?? []).filter(
                        (i) => map[i.id] === zone.id
                      );
                      const isHovered = dragHoverZoneId === zone.id;

                      return (
                        <div
                          key={zone.id}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (!isChecked) setDragHoverZoneId(zone.id);
                          }}
                          onDragLeave={() => setDragHoverZoneId(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragHoverZoneId(null);
                            if (isChecked) return;
                            const itemId =
                              e.dataTransfer.getData('text/plain') || selectedDragItemId;
                            if (!itemId) return;
                            playSnapSfx();
                            updateAnswer(currentChallenge.id, { ...map, [itemId]: zone.id });
                            setSelectedDragItemId(null);
                          }}
                          className={`rounded-2xl border-2 p-4 min-h-[180px] flex flex-col justify-between transition-all ${
                            isHovered
                              ? 'border-[#54BCEB] bg-[#EDF8FD] scale-[1.01]'
                              : selectedDragItemId && !isChecked
                                ? 'border-dashed border-[#54BCEB] bg-[#EDF8FD]/45'
                                : 'border-dashed border-[#D8D0BE] bg-white'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-[#EFE7D6]">
                              <div className="flex items-center gap-2 font-display font-bold text-sm text-[#182230]">
                                <FolderOpen
                                  className="w-4 h-4 shrink-0"
                                  style={{ color: zone.color || '#54BCEB' }}
                                />
                                <span>{zone.label}</span>
                              </div>
                              <span className="font-mono text-[11px] font-bold text-[#516072] bg-[#FFF8E9] px-2 py-0.5 rounded-md">
                                {zoneItems.length}
                              </span>
                            </div>

                            {selectedDragItemId && !isChecked && (
                              <button
                                type="button"
                                onClick={() => {
                                  playSnapSfx();
                                  updateAnswer(currentChallenge.id, {
                                    ...map,
                                    [selectedDragItemId]: zone.id,
                                  });
                                  setSelectedDragItemId(null);
                                }}
                                className="w-full mb-2.5 py-1.5 rounded-xl bg-[#54BCEB] hover:bg-[#3FAEDB] text-[#182230] text-xs font-bold cursor-pointer"
                              >
                                + Masukkan ke Folder Ini
                              </button>
                            )}

                            <div className="space-y-2">
                              {zoneItems.map((zi) => {
                                const rightZone = zi.correctZoneId === zone.id;
                                return (
                                  <motion.div
                                    key={zi.id}
                                    initial={{ opacity: 0, scale: 0.94 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 border ${
                                      isChecked
                                        ? rightZone
                                          ? 'bg-[#EEF9F1] border-[#71C98A] text-[#182230]'
                                          : 'bg-[#FFDCE8] border-[#E25C83] text-[#182230]'
                                        : 'bg-[#FFF8E9] border-[#EFE7D6] text-[#182230]'
                                    }`}
                                  >
                                    <span>{zi.label}</span>
                                    {!isChecked && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          playClickSfx();
                                          const next = { ...map };
                                          delete next[zi.id];
                                          updateAnswer(currentChallenge.id, next);
                                        }}
                                        className="text-[11px] font-bold text-[#9A2348] hover:underline cursor-pointer shrink-0"
                                      >
                                        Keluarkan
                                      </button>
                                    )}
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. Matching with Color-Coded Numbered Connection Badges */}
              {currentChallenge.type === 'matching' &&
                (() => {
                  const pairs = currentChallenge.pairs ?? [];
                  const shuffledRight = shuffleWithSeed(
                    pairs.map((p) => p.right),
                    currentIndex + 31
                  );
                  const mapping =
                    (answers[currentChallenge.id] as Record<string, string>) || {};

                  return (
                    <div className="space-y-4">
                      <p className="text-xs text-[#516072] bg-[#F5EEFC]/60 px-4 py-2.5 rounded-xl border border-[#E0CCF7]">
                        Klik kartu di kolom kiri, lalu klik pasangannya di kolom kanan. Setiap pasangan ditandai nomor &amp; warna koneksi yang sama.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2.5">
                          <p className="text-xs font-bold uppercase tracking-wide text-[#516072]">
                            Dokumen / Istilah
                          </p>
                          {pairs.map((pair, pIdx) => {
                            const assignedRight = mapping[pair.id];
                            const isSelected = selectedMatchLeftId === pair.id;
                            const isMatchRight = isChecked && assignedRight === pair.right;
                            const colorSpec =
                              MATCH_PAIR_PALETTE[pIdx % MATCH_PAIR_PALETTE.length];

                            return (
                              <div
                                key={pair.id}
                                className={`p-3.5 rounded-2xl border-2 transition-all ${
                                  isChecked
                                    ? isMatchRight
                                      ? 'border-[#71C98A] bg-[#EEF9F1]'
                                      : 'border-[#E25C83] bg-[#FFDCE8]/50'
                                    : isSelected
                                      ? 'border-[#6D3B9E] bg-[#F5EEFC] shadow-xs'
                                      : assignedRight
                                        ? 'bg-white'
                                        : 'border-[#E6DEC9] bg-white hover:border-[#BB8AE8]'
                                }`}
                                style={
                                  !isChecked && !isSelected && assignedRight
                                    ? {
                                        borderColor: colorSpec.border,
                                        backgroundColor: colorSpec.bg,
                                      }
                                    : undefined
                                }
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <button
                                    type="button"
                                    disabled={isChecked}
                                    onClick={() => {
                                      playClickSfx();
                                      setSelectedMatchLeftId(isSelected ? null : pair.id);
                                    }}
                                    className="flex-1 text-left cursor-pointer flex items-start gap-2.5"
                                  >
                                    <span
                                      className="w-6 h-6 rounded-lg font-mono text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5"
                                      style={{
                                        backgroundColor: colorSpec.badgeBg,
                                        color: colorSpec.text,
                                      }}
                                    >
                                      {pIdx + 1}
                                    </span>
                                    <div>
                                      <p className="text-sm font-bold text-[#182230]">
                                        {pair.left}
                                      </p>
                                      <p className="text-xs text-[#516072] mt-1 flex items-center gap-1">
                                        <Link2 className="w-3.5 h-3.5" />
                                        <span>
                                          {assignedRight
                                            ? `Terhubung ke: ${assignedRight}`
                                            : isSelected
                                              ? 'Sekarang klik pasangannya di kanan →'
                                              : 'Klik untuk memilih'}
                                        </span>
                                      </p>
                                    </div>
                                  </button>
                                  {assignedRight && !isChecked && (
                                    <button
                                      type="button"
                                      aria-label={`Putus pasangan ${pair.left}`}
                                      onClick={() => {
                                        playClickSfx();
                                        const next = { ...mapping };
                                        delete next[pair.id];
                                        updateAnswer(currentChallenge.id, next);
                                      }}
                                      className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-[#516072] hover:text-[#9A2348] cursor-pointer"
                                    >
                                      <Unlink className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="space-y-2.5">
                          <p className="text-xs font-bold uppercase tracking-wide text-[#516072]">
                            Pasangan Klasifikasi
                          </p>
                          {shuffledRight.map((rightVal, rIdx) => {
                            const linkedIdx = pairs.findIndex(
                              (p) => mapping[p.id] === rightVal
                            );
                            const linkedLeft = linkedIdx >= 0 ? pairs[linkedIdx] : null;
                            const linkedColor =
                              linkedIdx >= 0
                                ? MATCH_PAIR_PALETTE[linkedIdx % MATCH_PAIR_PALETTE.length]
                                : null;

                            return (
                              <button
                                key={rIdx}
                                type="button"
                                disabled={isChecked || !selectedMatchLeftId}
                                onClick={() => {
                                  if (!selectedMatchLeftId) return;
                                  playSnapSfx();
                                  const next = { ...mapping };
                                  for (const k of Object.keys(next)) {
                                    if (next[k] === rightVal) delete next[k];
                                  }
                                  next[selectedMatchLeftId] = rightVal;
                                  updateAnswer(currentChallenge.id, next);
                                  setSelectedMatchLeftId(null);
                                }}
                                style={
                                  linkedColor && !isChecked
                                    ? {
                                        borderColor: linkedColor.border,
                                        backgroundColor: linkedColor.bg,
                                      }
                                    : undefined
                                }
                                className={`w-full p-3.5 rounded-2xl border-2 text-left transition-all flex items-start gap-2.5 ${
                                  selectedMatchLeftId && !isChecked
                                    ? 'border-[#54BCEB] bg-[#EDF8FD]/60 hover:bg-[#EDF8FD] cursor-pointer'
                                    : linkedColor
                                      ? ''
                                      : 'border-[#E6DEC9] bg-[#FFFDF8]'
                                }`}
                              >
                                {linkedIdx >= 0 && linkedColor && (
                                  <span
                                    className="w-6 h-6 rounded-lg font-mono text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5"
                                    style={{
                                      backgroundColor: linkedColor.badgeBg,
                                      color: linkedColor.text,
                                    }}
                                  >
                                    {linkedIdx + 1}
                                  </span>
                                )}
                                <div>
                                  <p className="text-sm font-bold text-[#182230]">{rightVal}</p>
                                  <p className="text-xs text-[#516072] mt-1">
                                    {linkedLeft
                                      ? `Terhubung ke #${linkedIdx + 1}: ${linkedLeft.left}`
                                      : selectedMatchLeftId
                                        ? 'Klik untuk memasangkan di sini'
                                        : 'Pilih item kiri terlebih dahulu'}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}

              {/* 5. Ordering (Drag & Drop + Up/Down Stepper) */}
              {currentChallenge.type === 'ordering' &&
                (() => {
                  const steps = currentChallenge.steps ?? [];
                  const stepMap = new Map(steps.map((s) => [s.id, s]));
                  const currentOrder =
                    (answers[currentChallenge.id] as string[]) ?? steps.map((s) => s.id);

                  const moveStep = (index: number, delta: number) => {
                    if (isChecked) return;
                    const target = index + delta;
                    if (target < 0 || target >= currentOrder.length) return;
                    playSnapSfx();
                    const next = [...currentOrder];
                    const tmp = next[index];
                    next[index] = next[target];
                    next[target] = tmp;
                    updateAnswer(currentChallenge.id, next);
                  };

                  const moveStepTo = (fromId: string, toIndex: number) => {
                    if (isChecked) return;
                    const fromIdx = currentOrder.indexOf(fromId);
                    if (fromIdx < 0 || fromIdx === toIndex) return;
                    playSnapSfx();
                    const next = [...currentOrder];
                    const [moved] = next.splice(fromIdx, 1);
                    next.splice(toIndex, 0, moved);
                    updateAnswer(currentChallenge.id, next);
                  };

                  return (
                    <div className="space-y-3">
                      <p className="text-xs text-[#516072] bg-[#EDF8FD]/60 px-4 py-2.5 rounded-xl border border-[#CBE8F7]">
                        Seret kartu langkah atau gunakan tombol panah untuk menyusun SOP kerja dari urutan ke-1 hingga selesai.
                      </p>
                      <div className="space-y-2.5">
                        {currentOrder.map((stepId, idx) => {
                          const step = stepMap.get(stepId);
                          if (!step) return null;
                          const isRightPos = isChecked && steps[idx]?.id === stepId;
                          return (
                            <div
                              key={stepId}
                              draggable={!isChecked}
                              onDragStart={() => setDraggingOrderId(stepId)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (draggingOrderId) {
                                  moveStepTo(draggingOrderId, idx);
                                  setDraggingOrderId(null);
                                }
                              }}
                              className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-3 transition-colors ${
                                isChecked
                                  ? isRightPos
                                    ? 'border-[#71C98A] bg-[#EEF9F1]'
                                    : 'border-[#E25C83] bg-[#FFDCE8]/50'
                                  : draggingOrderId === stepId
                                    ? 'border-[#54BCEB] bg-[#EDF8FD]'
                                    : 'border-[#E6DEC9] bg-[#FFFDF8] hover:border-[#54BCEB]'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {!isChecked && (
                                  <GripVertical className="w-4 h-4 text-[#9AA5B4] shrink-0 cursor-grab" />
                                )}
                                <span className="w-8 h-8 rounded-xl bg-[#54BCEB] text-[#182230] font-mono text-sm font-extrabold flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="text-sm sm:text-[15px] font-medium text-[#182230]">
                                  {step.text}
                                </span>
                              </div>
                              {!isChecked && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    aria-label={`Naikkan langkah ${step.text}`}
                                    onClick={() => moveStep(idx, -1)}
                                    className="w-9 h-9 rounded-xl bg-white border border-[#D8D0BE] hover:bg-[#EDF8FD] flex items-center justify-center disabled:opacity-35 cursor-pointer"
                                  >
                                    <ArrowUp className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === currentOrder.length - 1}
                                    aria-label={`Turunkan langkah ${step.text}`}
                                    onClick={() => moveStep(idx, 1)}
                                    className="w-9 h-9 rounded-xl bg-white border border-[#D8D0BE] hover:bg-[#EDF8FD] flex items-center justify-center disabled:opacity-35 cursor-pointer"
                                  >
                                    <ArrowDown className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

              {/* 6. Find the Error (Audit Data Mode) */}
              {currentChallenge.type === 'find_the_error' &&
                (() => {
                  const selectedIds = new Set(
                    (answers[currentChallenge.id] as string[]) ?? []
                  );
                  const rows = currentChallenge.rows ?? [];
                  const toggleRow = (rowId: string) => {
                    if (isChecked) return;
                    playClickSfx();
                    const next = new Set(selectedIds);
                    if (next.has(rowId)) next.delete(rowId);
                    else next.add(rowId);
                    updateAnswer(currentChallenge.id, Array.from(next));
                  };

                  return (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FFF8E9] px-4 py-3 rounded-2xl border border-[#EFE7D6]">
                        <div className="flex items-center gap-2 text-sm font-bold text-[#182230]">
                          <FileSearch className="w-4 h-4 text-[#D94E75]" />
                          <span>{currentChallenge.tableTitle || 'Tabel Pemeriksaan Data'}</span>
                        </div>
                        <span className="font-mono text-xs font-bold text-[#9A2348] bg-[#FFDCE8] px-3 py-1 rounded-lg tabular-nums">
                          {selectedIds.size} baris ditandai bermasalah
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border-2 border-[#E6DEC9]">
                        <table className="w-full text-left border-collapse text-sm">
                          <thead>
                            <tr className="bg-[#FFF8E9] border-b border-[#E6DEC9]">
                              <th className="py-3 px-4 font-bold text-[#516072] w-28">
                                Status Audit
                              </th>
                              {(currentChallenge.columns ?? []).map((col, cIdx) => (
                                <th
                                  key={cIdx}
                                  className="py-3 px-4 font-bold text-[#182230]"
                                >
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row) => {
                              const marked = selectedIds.has(row.id);
                              let rowBg = 'bg-white hover:bg-[#FFF8E9]/70';
                              if (isChecked) {
                                if (row.isError && marked) rowBg = 'bg-[#EEF9F1]';
                                else if (row.isError && !marked) rowBg = 'bg-[#FFF7E3]';
                                else if (!row.isError && marked) rowBg = 'bg-[#FFDCE8]/60';
                              } else if (marked) {
                                rowBg = 'bg-[#FFDCE8]/65';
                              }

                              return (
                                <React.Fragment key={row.id}>
                                  <tr
                                    className={`border-b last:border-b-0 border-[#EFE7D6] transition-colors ${rowBg}`}
                                  >
                                    <td className="py-3 px-4">
                                      <button
                                        type="button"
                                        disabled={isChecked}
                                        onClick={() => toggleRow(row.id)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap transition-transform active:scale-95 ${
                                          marked
                                            ? 'bg-[#D94E75] text-white shadow-xs'
                                            : 'bg-[#FFF8E9] border border-[#D8D0BE] text-[#182230] hover:border-[#D94E75]'
                                        }`}
                                      >
                                        {marked ? 'Terindikasi' : 'Tandai Salah'}
                                      </button>
                                    </td>
                                    {row.cells.map((cell, ci) => (
                                      <td
                                        key={ci}
                                        className="py-3 px-4 text-[#182230] font-mono text-[13px] tabular-nums"
                                      >
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                  {isChecked && row.isError && row.errorReason && (
                                    <tr className="bg-[#FFFDF8] border-b border-[#EFE7D6]">
                                      <td
                                        colSpan={(currentChallenge.columns?.length ?? 0) + 1}
                                        className="px-4 py-2 text-xs font-medium text-[#7A1C3D]"
                                      >
                                        Temuan Audit: {row.errorReason}
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

              {/* 7. Case Simulation (Office Memo Dossier) */}
              {currentChallenge.type === 'case_simulation' && (
                <div className="space-y-5">
                  <div className="rounded-2xl bg-[#FFF8E9] border-2 border-[#E6DEC9] overflow-hidden">
                    <div className="bg-[#FFCA65]/40 px-5 py-3 border-b border-[#E6DEC9] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-display font-extrabold text-[#182230] flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#8E5B08]" />
                        <span>{currentChallenge.dossierTitle || 'Memo Kasus Kantor'}</span>
                      </span>
                      <span className="font-semibold text-[#516072]">
                        Dari: {currentChallenge.dossierSender || 'Unit Administrasi'}
                      </span>
                    </div>
                    <div className="p-5">
                      <p className="text-sm sm:text-[15px] text-[#182230] leading-relaxed">
                        {currentChallenge.dossierContent}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {(currentChallenge.options ?? []).map((opt, idx) => {
                      const selected = answers[currentChallenge.id] === idx;
                      const isCorrectOpt = idx === currentChallenge.correctIndex;
                      const isEliminated = Boolean(
                        activeScanResult?.eliminatedOptionIndices.includes(idx)
                      );
                      let borderClass =
                        'border-[#E6DEC9] bg-white hover:border-[#FFCA65] hover:-translate-y-0.5';
                      if (isChecked) {
                        if (isCorrectOpt) borderClass = 'border-[#71C98A] bg-[#EEF9F1]';
                        else if (selected) borderClass = 'border-[#E25C83] bg-[#FFDCE8]/60';
                      } else if (isEliminated) {
                        borderClass = 'border-[#E6DEC9] bg-[#F6F2E9] opacity-45 line-through';
                      } else if (selected) {
                        borderClass = 'border-[#FFCA65] bg-[#FFF7E3] shadow-xs';
                      }
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={isChecked || isEliminated}
                          onClick={() => {
                            playClickSfx();
                            updateAnswer(currentChallenge.id, idx);
                          }}
                          className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-3 cursor-pointer disabled:cursor-not-allowed ${borderClass}`}
                        >
                          <span className="w-8 h-8 rounded-xl bg-[#FFF8E9] border border-[#D8D0BE] flex items-center justify-center font-mono text-xs font-extrabold shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-sm sm:text-[15px] font-medium text-[#182230]">
                            {opt}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 8. Decision Making */}
              {currentChallenge.type === 'decision_making' && (
                <div className="space-y-5">
                  <div className="rounded-2xl bg-[#EDF8FD] border-2 border-[#CBE8F7] p-5 space-y-2.5">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-[#182230]">
                      <ShieldAlert className="w-5 h-5 text-[#2B8CBE]" />
                      <span>Situasi Lapangan &amp; Dilema Keputusan</span>
                    </div>
                    <p className="text-sm sm:text-[15px] text-[#182230] leading-relaxed">
                      {currentChallenge.situation}
                    </p>
                    {currentChallenge.impactNote && (
                      <p className="text-xs font-semibold text-[#516072] bg-white/80 px-3 py-2 rounded-xl border border-[#CBE8F7]">
                        Catatan Risiko: {currentChallenge.impactNote}
                      </p>
                    )}
                  </div>
                  <div className="space-y-3">
                    {(currentChallenge.choices ?? []).map((choice) => {
                      const selected = answers[currentChallenge.id] === choice.id;
                      const isEliminated = Boolean(
                        activeScanResult?.eliminatedChoiceIds.includes(choice.id)
                      );
                      let cls =
                        'border-[#E6DEC9] bg-white hover:border-[#71C98A] hover:-translate-y-0.5';
                      if (isChecked) {
                        if (choice.isOptimal) cls = 'border-[#71C98A] bg-[#EEF9F1]';
                        else if (selected) cls = 'border-[#E25C83] bg-[#FFDCE8]/60';
                      } else if (isEliminated) {
                        cls = 'border-[#E6DEC9] bg-[#F6F2E9] opacity-45 line-through';
                      } else if (selected) {
                        cls = 'border-[#54BCEB] bg-[#EDF8FD] shadow-xs';
                      }
                      return (
                        <button
                          key={choice.id}
                          type="button"
                          disabled={isChecked || isEliminated}
                          onClick={() => {
                            playClickSfx();
                            updateAnswer(currentChallenge.id, choice.id);
                          }}
                          className={`w-full text-left p-4 rounded-2xl border-2 transition-all cursor-pointer disabled:cursor-not-allowed ${cls}`}
                        >
                          <p className="text-sm sm:text-[15px] font-bold text-[#182230]">
                            {choice.label}
                          </p>
                          {isChecked && (
                            <p className="text-xs text-[#516072] mt-1.5 font-medium">
                              Dampak Keputusan: {choice.consequence}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Feedback Banner with Detective Reaction */}
            {isChecked && currentEval && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-6 p-5 rounded-2xl border-2 ${
                  currentEval.isCorrect
                    ? 'bg-[#EEF9F1] border-[#71C98A]'
                    : 'bg-[#FFF7E3] border-[#FFCA65]'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <DetectiveAvatar avatarId={userAvatarId} size={46} />
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {currentEval.isCorrect ? (
                        <Sparkles className="w-4 h-4 text-[#2E854A]" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-[#B57B14]" />
                      )}
                      <p className="font-display font-extrabold text-sm text-[#182230]">
                        {getStreakReaction(
                          streak,
                          currentEval.isCorrect,
                          currentEval.earnedPoints
                        )}{' '}
                        ({currentEval.earnedPoints}/{currentEval.maxPoints} poin)
                      </p>
                    </div>
                    <p className="text-sm text-[#2F3B4B] leading-relaxed">
                      {currentChallenge.explanation}
                    </p>
                    {!currentEval.isCorrect && (
                      <p className="text-xs font-medium text-[#516072] pt-1">
                        Jawaban yang diharapkan: {currentEval.correctAnswerSummary}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Action Footer */}
            <div className="mt-8 pt-5 border-t border-[#EFE7D6] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => {
                    playClickSfx();
                    setCurrentIndex((i) => Math.max(0, i - 1));
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#FFF8E9] hover:bg-[#EFE7D6] text-[#182230] text-sm font-semibold disabled:opacity-40 cursor-pointer"
                >
                  Sebelumnya
                </button>
                <span className="hidden md:inline text-[11px] font-medium text-[#516072]">
                  Pintasan: P Jeda · Enter Periksa/Lanjut
                </span>
              </div>

              <div className="flex items-center gap-3">
                {!isChecked ? (
                  <button
                    type="button"
                    onClick={handleCheckCurrent}
                    className="px-6 py-2.5 rounded-xl bg-[#FFCA65] hover:bg-[#F5BC4E] text-[#182230] font-extrabold text-sm inline-flex items-center gap-2 cursor-pointer shadow-xs transition-transform active:scale-[0.98]"
                  >
                    <Stamp className="w-4 h-4" />
                    <span>Periksa &amp; Stempel Kasus</span>
                  </button>
                ) : currentIndex < sortedChallenges.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      playClickSfx();
                      setCurrentIndex((i) => i + 1);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-[#54BCEB] hover:bg-[#3FAEDB] text-[#182230] font-extrabold text-sm inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Tantangan Berikutnya</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleFinishSimulation}
                    className="px-6 py-2.5 rounded-xl bg-[#71C98A] hover:bg-[#5BB976] text-[#182230] font-extrabold text-sm inline-flex items-center gap-2 cursor-pointer disabled:opacity-60 shadow-xs"
                  >
                    <Trophy className="w-4 h-4" />
                    <span>
                      {submitting ? 'Menyimpan Hasil...' : 'Selesaikan Misi & Lihat Hasil'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Pause Modal */}
      {isPaused && (
        <div
          className="fixed inset-0 z-50 bg-[#182230]/45 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-modal-title"
        >
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#EFE7D6] shadow-xl p-6 sm:p-8 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-[#FFCA65] mx-auto flex items-center justify-center text-[#182230]">
              <Pause className="w-7 h-7" />
            </div>
            <div>
              <h2
                id="pause-modal-title"
                className="font-display text-2xl font-extrabold text-[#182230]"
              >
                Misi Dijeda
              </h2>
              <p className="text-sm text-[#516072] mt-1">
                Waktu dihentikan sementara. Lanjutkan investigasi kapan pun siap.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl bg-[#EDF8FD] border border-[#CBE8F7] p-3">
                <p className="font-mono text-lg font-extrabold text-[#182230] tabular-nums">
                  {liveStats.earnedPoints}
                </p>
                <p className="text-[11px] font-semibold text-[#1D6B94]">Skor Live</p>
              </div>
              <div className="rounded-2xl bg-[#EEF9F1] border border-[#CBEBD4] p-3">
                <p className="font-mono text-lg font-extrabold text-[#182230] tabular-nums">
                  {officeIntegrity.percentage}%
                </p>
                <p className="text-[11px] font-semibold text-[#2E7245]">Integritas</p>
              </div>
              <div className="rounded-2xl bg-[#FFF7E3] border border-[#F6DF9F] p-3">
                <p className="font-mono text-lg font-extrabold text-[#182230] tabular-nums">
                  {formatDuration(secondsLeft)}
                </p>
                <p className="text-[11px] font-semibold text-[#8E5B08]">Sisa Waktu</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  playClickSfx();
                  setIsPaused(false);
                }}
                className="w-full py-3 rounded-xl bg-[#54BCEB] hover:bg-[#3FAEDB] text-[#182230] font-extrabold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Lanjutkan Misi</span>
              </button>
              <button
                type="button"
                onClick={handleRestartMission}
                className="w-full py-2.5 rounded-xl bg-[#FFF8E9] hover:bg-[#FFCA65]/40 border border-[#EFE7D6] text-[#182230] font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Ulangi Dari Awal</span>
              </button>
              <button
                type="button"
                onClick={onExit}
                className="w-full py-2.5 rounded-xl bg-white hover:bg-[#FFDCE8]/60 border border-[#EFE7D6] text-[#7A1C3D] font-bold text-sm cursor-pointer"
              >
                Keluar Misi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
