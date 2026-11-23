import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Clock,
  FileText,
  FolderOpen,
  Link2,
  ShieldAlert,
  Trophy,
  XCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  CHALLENGE_TYPE_META,
  evaluateChallenge,
  formatDuration,
  getPredikat,
  shuffleWithSeed,
} from '../utils/gameLogic';
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
  isPreview?: boolean;
  onExit: () => void;
  onCompleteAttempt: (
    attempt: Omit<AttemptRecord, 'id' | 'userId' | 'userName' | 'completedAt'>
  ) => Promise<AttemptRecord | void>;
}

export function GameSimulator({
  game,
  material,
  isPreview = false,
  onExit,
  onCompleteAttempt,
}: GameSimulatorProps) {
  const sortedChallenges = useMemo(
    () => [...game.challenges].sort((a, b) => a.order - b.order),
    [game.challenges]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState(game.timerSeconds || 300);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Local interactive states for DnD / Matching
  const [selectedDragItemId, setSelectedDragItemId] = useState<string | null>(null);
  const [selectedMatchLeftId, setSelectedMatchLeftId] = useState<string | null>(null);

  const currentChallenge: Challenge | undefined = sortedChallenges[currentIndex];
  const isChecked = currentChallenge ? Boolean(checkedMap[currentChallenge.id]) : false;

  // Countdown timer
  useEffect(() => {
    if (sortedChallenges.length === 0) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sortedChallenges.length]);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (secondsLeft === 0 && !submitting && sortedChallenges.length > 0) {
      void handleFinishSimulation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  // Initialize default shuffled steps when entering an ordering challenge
  useEffect(() => {
    if (!currentChallenge) return;
    setSelectedDragItemId(null);
    setSelectedMatchLeftId(null);
    if (currentChallenge.type === 'ordering' && !answers[currentChallenge.id]) {
      const steps = currentChallenge.steps ?? [];
      const shuffled = shuffleWithSeed(steps, currentIndex + 17);
      // Ensure not accidentally already identical if >=2 items
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

  function updateAnswer(challengeId: string, val: unknown) {
    if (checkedMap[challengeId]) return;
    setAnswers((prev) => ({ ...prev, [challengeId]: val }));
  }

  function handleCheckCurrent() {
    if (!currentChallenge) return;
    setCheckedMap((prev) => ({ ...prev, [currentChallenge.id]: true }));
  }

  async function handleFinishSimulation() {
    if (submitting) return;
    setSubmitting(true);
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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentIndex]);

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

  const currentEval = currentChallenge
    ? evaluateChallenge(currentChallenge, answers[currentChallenge.id])
    : null;

  const progressPct = Math.round(((currentIndex + 1) / sortedChallenges.length) * 100);

  return (
    <div className="min-h-screen bg-[#FFF8E9] pb-12" data-state="playing">
      {/* Top Simulator Workspace Bar */}
      <div className="bg-white border-b border-[#EFE7D6] sticky top-0 z-20">
        <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onExit}
              className="px-3 py-2 rounded-xl bg-[#FFF8E9] hover:bg-[#FFCA65]/40 text-[#182230] text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isPreview ? 'Tutup Preview' : 'Keluar Misi'}</span>
            </button>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#2B8CBE] truncate">
                {isPreview ? 'Mode Preview Admin' : material?.title || 'Simulasi Kantor'}
              </p>
              <h1 className="font-display text-base sm:text-lg font-bold text-[#182230] truncate">
                {game.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <span className="block text-[11px] font-medium text-[#516072]">Tantangan</span>
              <span className="font-mono text-sm font-bold text-[#182230] tabular-nums">
                {currentIndex + 1} / {sortedChallenges.length}
              </span>
            </div>
            <div
              className={`px-3.5 py-2 rounded-xl font-mono text-sm font-bold tabular-nums inline-flex items-center gap-1.5 ${
                secondsLeft <= 30
                  ? 'bg-[#FFDCE8] text-[#8B1E42]'
                  : 'bg-[#EDF8FD] text-[#182230]'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{formatDuration(secondsLeft)}</span>
            </div>
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

      <div className="max-w-[1040px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Story & Instructions Briefing Strip */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EFE7D6] shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[#6D3FA3]">
                Skenario Kasus Kantor · Tingkat {game.difficulty}
              </p>
              <p className="text-sm sm:text-[15px] text-[#2F3B4B] leading-relaxed">
                {game.story}
              </p>
              {game.instructions && (
                <p className="text-xs text-[#516072]">
                  Instruksi: {game.instructions}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Active Challenge Card */}
        {currentChallenge && (
          <motion.div
            key={currentChallenge.id}
            initial={{ opacity: 1, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.14 }}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EFE7D6] shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#516072]">
                <span
                  className="w-2.5 h-2.5 rounded-sm inline-block"
                  style={{
                    backgroundColor: CHALLENGE_TYPE_META[currentChallenge.type].badgeTint,
                  }}
                />
                <span>Tantangan {currentIndex + 1}</span>
                <span aria-hidden="true">·</span>
                <span>{CHALLENGE_TYPE_META[currentChallenge.type].label}</span>
              </div>
              <span className="font-mono text-xs font-bold text-[#182230] bg-[#FFF8E9] px-3 py-1 rounded-lg border border-[#EFE7D6] tabular-nums">
                Bobot {currentChallenge.points} Poin
              </span>
            </div>

            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#182230]">
              {currentChallenge.title}
            </h2>
            <p className="mt-2 text-[15px] text-[#2F3B4B] leading-relaxed">
              {currentChallenge.prompt}
            </p>

            {/* Challenge Mechanism Body */}
            <div className="mt-6">
              {/* 1. Multiple Choice */}
              {currentChallenge.type === 'multiple_choice' && (
                <div className="space-y-3">
                  {(currentChallenge.options ?? []).map((opt, idx) => {
                    const selected = answers[currentChallenge.id] === idx;
                    const isCorrectOpt = idx === currentChallenge.correctIndex;
                    let borderClass = 'border-[#E6DEC9] bg-[#FFFDF8] hover:border-[#54BCEB]';
                    if (isChecked) {
                      if (isCorrectOpt) borderClass = 'border-[#71C98A] bg-[#EEF9F1]';
                      else if (selected) borderClass = 'border-[#E25C83] bg-[#FFDCE8]/55';
                    } else if (selected) {
                      borderClass = 'border-[#54BCEB] bg-[#EDF8FD]';
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={isChecked}
                        onClick={() => updateAnswer(currentChallenge.id, idx)}
                        className={`w-full text-left p-4 rounded-2xl border-2 transition-colors flex items-center gap-3.5 cursor-pointer ${borderClass}`}
                      >
                        <span className="w-8 h-8 rounded-xl bg-white border border-[#D8D0BE] flex items-center justify-center font-mono text-sm font-bold shrink-0">
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
                  <div className="p-5 rounded-2xl bg-[#FFF8E9] border border-[#EFE7D6] text-[15px] font-medium text-[#182230]">
                    "{currentChallenge.statement}"
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { val: true, label: 'Benar', desc: 'Sesuai prosedur administrasi' },
                      { val: false, label: 'Salah', desc: 'Menyalahi prosedur / berisiko' },
                    ].map((choice) => {
                      const selected = answers[currentChallenge.id] === choice.val;
                      const isCorrectChoice = choice.val === currentChallenge.correctAnswer;
                      let cls = 'border-[#E6DEC9] bg-white hover:border-[#54BCEB]';
                      if (isChecked) {
                        if (isCorrectChoice) cls = 'border-[#71C98A] bg-[#EEF9F1]';
                        else if (selected) cls = 'border-[#E25C83] bg-[#FFDCE8]/55';
                      } else if (selected) {
                        cls = 'border-[#54BCEB] bg-[#EDF8FD]';
                      }
                      return (
                        <button
                          key={String(choice.val)}
                          type="button"
                          disabled={isChecked}
                          onClick={() => updateAnswer(currentChallenge.id, choice.val)}
                          className={`p-5 rounded-2xl border-2 text-left transition-colors cursor-pointer ${cls}`}
                        >
                          <div className="flex items-center gap-2.5 font-display text-lg font-bold text-[#182230]">
                            {choice.val ? (
                              <CheckCircle2 className="w-5 h-5 text-[#71C98A]" />
                            ) : (
                              <XCircle className="w-5 h-5 text-[#D94E75]" />
                            )}
                            <span>{choice.label}</span>
                          </div>
                          <p className="text-xs text-[#516072] mt-1">{choice.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Drag and Drop */}
              {currentChallenge.type === 'drag_and_drop' && (
                <div className="space-y-5">
                  <p className="text-xs text-[#516072]">
                    Cara bermain: Seret kartu dokumen ke folder tujuan, atau klik kartu lalu
                    klik folder targetnya.
                  </p>
                  {/* Unassigned Documents */}
                  <div className="p-4 rounded-2xl bg-[#FFF8E9] border border-[#EFE7D6]">
                    <p className="text-xs font-semibold text-[#516072] mb-3">
                      Dokumen Menunggu Klasifikasi
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {(currentChallenge.items ?? [])
                        .filter((item) => {
                          const map = (answers[currentChallenge.id] as Record<string, string>) || {};
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
                              onClick={() =>
                                setSelectedDragItemId(isSelected ? null : item.id)
                              }
                              className={`px-4 py-3 rounded-2xl border-2 text-left transition-all cursor-grab active:cursor-grabbing ${
                                isSelected
                                  ? 'border-[#54BCEB] bg-[#EDF8FD] shadow-sm'
                                  : 'border-[#E6DEC9] bg-white hover:border-[#FFCA65]'
                              }`}
                            >
                              <div className="flex items-center gap-2 text-sm font-semibold text-[#182230]">
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
                        const map = (answers[currentChallenge.id] as Record<string, string>) || {};
                        return Boolean(map[item.id]);
                      }) && (
                        <p className="text-xs text-[#2B8CBE] font-medium">
                          Semua dokumen sudah ditempatkan ke folder. Klik "Periksa Jawaban" atau ubah penempatan bila perlu.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Target Folders / Zones */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(currentChallenge.zones ?? []).map((zone) => {
                      const map = (answers[currentChallenge.id] as Record<string, string>) || {};
                      const zoneItems = (currentChallenge.items ?? []).filter(
                        (i) => map[i.id] === zone.id
                      );
                      return (
                        <div
                          key={zone.id}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (isChecked) return;
                            const itemId =
                              e.dataTransfer.getData('text/plain') || selectedDragItemId;
                            if (!itemId) return;
                            updateAnswer(currentChallenge.id, { ...map, [itemId]: zone.id });
                            setSelectedDragItemId(null);
                          }}
                          className={`rounded-2xl border-2 border-dashed p-4 min-h-[160px] flex flex-col justify-between transition-colors ${
                            selectedDragItemId && !isChecked
                              ? 'border-[#54BCEB] bg-[#EDF8FD]/50'
                              : 'border-[#D8D0BE] bg-white'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2 font-display font-bold text-sm text-[#182230]">
                                <FolderOpen
                                  className="w-4 h-4 shrink-0"
                                  style={{ color: zone.color || '#54BCEB' }}
                                />
                                <span>{zone.label}</span>
                              </div>
                              {selectedDragItemId && !isChecked && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateAnswer(currentChallenge.id, {
                                      ...map,
                                      [selectedDragItemId]: zone.id,
                                    });
                                    setSelectedDragItemId(null);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-[#54BCEB] text-[#182230] text-xs font-semibold cursor-pointer"
                                >
                                  Taruh Sini
                                </button>
                              )}
                            </div>
                            <div className="space-y-2">
                              {zoneItems.map((zi) => {
                                const rightZone = zi.correctZoneId === zone.id;
                                return (
                                  <div
                                    key={zi.id}
                                    className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between gap-2 border ${
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
                                          const next = { ...map };
                                          delete next[zi.id];
                                          updateAnswer(currentChallenge.id, next);
                                        }}
                                        className="text-[11px] font-semibold text-[#516072] hover:text-[#182230] cursor-pointer"
                                      >
                                        Keluarkan
                                      </button>
                                    )}
                                  </div>
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

              {/* 4. Matching */}
              {currentChallenge.type === 'matching' && (() => {
                const pairs = currentChallenge.pairs ?? [];
                const shuffledRight = shuffleWithSeed(
                  pairs.map((p) => p.right),
                  currentIndex + 31
                );
                const mapping = (answers[currentChallenge.id] as Record<string, string>) || {};

                return (
                  <div className="space-y-4">
                    <p className="text-xs text-[#516072]">
                      Klik item di kolom kiri, lalu klik pasangannya di kolom kanan.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2.5">
                        <p className="text-xs font-semibold text-[#516072]">Dokumen / Istilah</p>
                        {pairs.map((pair) => {
                          const assignedRight = mapping[pair.id];
                          const isSelected = selectedMatchLeftId === pair.id;
                          const isMatchRight = isChecked && assignedRight === pair.right;
                          return (
                            <button
                              key={pair.id}
                              type="button"
                              disabled={isChecked}
                              onClick={() =>
                                setSelectedMatchLeftId(isSelected ? null : pair.id)
                              }
                              className={`w-full p-3.5 rounded-2xl border-2 text-left transition-colors cursor-pointer ${
                                isChecked
                                  ? isMatchRight
                                    ? 'border-[#71C98A] bg-[#EEF9F1]'
                                    : 'border-[#E25C83] bg-[#FFDCE8]/50'
                                  : isSelected
                                    ? 'border-[#BB8AE8] bg-[#F5EEFC]'
                                    : 'border-[#E6DEC9] bg-white hover:border-[#BB8AE8]'
                              }`}
                            >
                              <p className="text-sm font-semibold text-[#182230]">{pair.left}</p>
                              <p className="text-xs text-[#516072] mt-1 flex items-center gap-1.5">
                                <Link2 className="w-3.5 h-3.5" />
                                <span>
                                  {assignedRight ? `Terhubung ke: ${assignedRight}` : 'Belum dipasangkan'}
                                </span>
                              </p>
                            </button>
                          );
                        })}
                      </div>

                      <div className="space-y-2.5">
                        <p className="text-xs font-semibold text-[#516072]">Pasangan Klasifikasi</p>
                        {shuffledRight.map((rightVal, rIdx) => {
                          const linkedLeft = pairs.find((p) => mapping[p.id] === rightVal);
                          return (
                            <button
                              key={rIdx}
                              type="button"
                              disabled={isChecked || !selectedMatchLeftId}
                              onClick={() => {
                                if (!selectedMatchLeftId) return;
                                const next = { ...mapping };
                                // Remove previous owner of this rightVal so matching is 1-to-1
                                for (const k of Object.keys(next)) {
                                  if (next[k] === rightVal) delete next[k];
                                }
                                next[selectedMatchLeftId] = rightVal;
                                updateAnswer(currentChallenge.id, next);
                                setSelectedMatchLeftId(null);
                              }}
                              className={`w-full p-3.5 rounded-2xl border-2 text-left transition-colors ${
                                selectedMatchLeftId && !isChecked
                                  ? 'border-[#54BCEB] bg-[#EDF8FD]/60 hover:bg-[#EDF8FD] cursor-pointer'
                                  : 'border-[#E6DEC9] bg-[#FFFDF8]'
                              }`}
                            >
                              <p className="text-sm font-semibold text-[#182230]">{rightVal}</p>
                              <p className="text-xs text-[#516072] mt-1">
                                {linkedLeft
                                  ? `Dipilih untuk: ${linkedLeft.left}`
                                  : selectedMatchLeftId
                                    ? 'Klik untuk memasangkan'
                                    : 'Pilih item kiri terlebih dahulu'}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 5. Ordering */}
              {currentChallenge.type === 'ordering' && (() => {
                const steps = currentChallenge.steps ?? [];
                const stepMap = new Map(steps.map((s) => [s.id, s]));
                const currentOrder =
                  (answers[currentChallenge.id] as string[]) ?? steps.map((s) => s.id);

                const moveStep = (index: number, delta: number) => {
                  if (isChecked) return;
                  const target = index + delta;
                  if (target < 0 || target >= currentOrder.length) return;
                  const next = [...currentOrder];
                  const tmp = next[index];
                  next[index] = next[target];
                  next[target] = tmp;
                  updateAnswer(currentChallenge.id, next);
                };

                return (
                  <div className="space-y-3">
                    <p className="text-xs text-[#516072]">
                      Gunakan tombol naik/turun untuk menyusun langkah kerja dari urutan ke-1
                      hingga terakhir.
                    </p>
                    {currentOrder.map((stepId, idx) => {
                      const step = stepMap.get(stepId);
                      if (!step) return null;
                      const isRightPos = isChecked && steps[idx]?.id === stepId;
                      return (
                        <div
                          key={stepId}
                          className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-3 ${
                            isChecked
                              ? isRightPos
                                ? 'border-[#71C98A] bg-[#EEF9F1]'
                                : 'border-[#E25C83] bg-[#FFDCE8]/50'
                              : 'border-[#E6DEC9] bg-[#FFFDF8]'
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            <span className="w-8 h-8 rounded-xl bg-[#54BCEB] text-[#182230] font-mono text-sm font-bold flex items-center justify-center shrink-0">
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
                );
              })()}

              {/* 6. Find the Error */}
              {currentChallenge.type === 'find_the_error' && (() => {
                const selectedIds = new Set(
                  (answers[currentChallenge.id] as string[]) ?? []
                );
                const rows = currentChallenge.rows ?? [];
                const toggleRow = (rowId: string) => {
                  if (isChecked) return;
                  const next = new Set(selectedIds);
                  if (next.has(rowId)) next.delete(rowId);
                  else next.add(rowId);
                  updateAnswer(currentChallenge.id, Array.from(next));
                };

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-[#182230]">
                        {currentChallenge.tableTitle || 'Tabel Pemeriksaan Data'}
                      </p>
                      <span className="text-xs font-medium text-[#516072]">
                        {selectedIds.size} baris ditandai bermasalah
                      </span>
                    </div>
                    <div className="overflow-x-auto rounded-2xl border border-[#E6DEC9]">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="bg-[#FFF8E9] border-b border-[#E6DEC9]">
                            <th className="py-3 px-4 font-semibold text-[#516072] w-16">
                              Audit
                            </th>
                            {(currentChallenge.columns ?? []).map((col, cIdx) => (
                              <th
                                key={cIdx}
                                className="py-3 px-4 font-semibold text-[#182230]"
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => {
                            const marked = selectedIds.has(row.id);
                            let rowBg = 'bg-white hover:bg-[#FFF8E9]/60';
                            if (isChecked) {
                              if (row.isError && marked) rowBg = 'bg-[#EEF9F1]';
                              else if (row.isError && !marked) rowBg = 'bg-[#FFF7E3]';
                              else if (!row.isError && marked) rowBg = 'bg-[#FFDCE8]/60';
                            } else if (marked) {
                              rowBg = 'bg-[#FFDCE8]/70';
                            }

                            return (
                              <tr
                                key={row.id}
                                className={`border-b last:border-b-0 border-[#EFE7D6] transition-colors ${rowBg}`}
                              >
                                <td className="py-3 px-4">
                                  <button
                                    type="button"
                                    disabled={isChecked}
                                    onClick={() => toggleRow(row.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap ${
                                      marked
                                        ? 'bg-[#D94E75] text-white'
                                        : 'bg-[#FFF8E9] border border-[#D8D0BE] text-[#182230]'
                                    }`}
                                  >
                                    {marked ? 'Ditandai' : 'Tandai'}
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
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* 7. Case Simulation */}
              {currentChallenge.type === 'case_simulation' && (
                <div className="space-y-5">
                  <div className="rounded-2xl bg-[#FFF8E9] border border-[#E6DEC9] p-5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#516072]">
                      <span className="font-bold text-[#182230]">
                        {currentChallenge.dossierTitle || 'Dokumen Kasus Kantor'}
                      </span>
                      <span>Pengirim: {currentChallenge.dossierSender || 'Unit Administrasi'}</span>
                    </div>
                    <p className="text-sm text-[#2F3B4B] leading-relaxed">
                      {currentChallenge.dossierContent}
                    </p>
                  </div>
                  <div className="space-y-3">
                    {(currentChallenge.options ?? []).map((opt, idx) => {
                      const selected = answers[currentChallenge.id] === idx;
                      const isCorrectOpt = idx === currentChallenge.correctIndex;
                      let borderClass = 'border-[#E6DEC9] bg-white hover:border-[#FFCA65]';
                      if (isChecked) {
                        if (isCorrectOpt) borderClass = 'border-[#71C98A] bg-[#EEF9F1]';
                        else if (selected) borderClass = 'border-[#E25C83] bg-[#FFDCE8]/60';
                      } else if (selected) {
                        borderClass = 'border-[#FFCA65] bg-[#FFF7E3]';
                      }
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={isChecked}
                          onClick={() => updateAnswer(currentChallenge.id, idx)}
                          className={`w-full text-left p-4 rounded-2xl border-2 transition-colors flex items-center gap-3 cursor-pointer ${borderClass}`}
                        >
                          <span className="w-7 h-7 rounded-lg bg-[#FFF8E9] border border-[#D8D0BE] flex items-center justify-center font-mono text-xs font-bold shrink-0">
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
                  <div className="rounded-2xl bg-[#EDF8FD] border border-[#CBE8F7] p-5 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-[#182230]">
                      <ShieldAlert className="w-4 h-4 text-[#2B8CBE]" />
                      <span>Situasi Lapangan</span>
                    </div>
                    <p className="text-sm text-[#2F3B4B] leading-relaxed">
                      {currentChallenge.situation}
                    </p>
                    {currentChallenge.impactNote && (
                      <p className="text-xs font-medium text-[#516072]">
                        Catatan Risiko: {currentChallenge.impactNote}
                      </p>
                    )}
                  </div>
                  <div className="space-y-3">
                    {(currentChallenge.choices ?? []).map((choice) => {
                      const selected = answers[currentChallenge.id] === choice.id;
                      let cls = 'border-[#E6DEC9] bg-white hover:border-[#71C98A]';
                      if (isChecked) {
                        if (choice.isOptimal) cls = 'border-[#71C98A] bg-[#EEF9F1]';
                        else if (selected) cls = 'border-[#E25C83] bg-[#FFDCE8]/60';
                      } else if (selected) {
                        cls = 'border-[#54BCEB] bg-[#EDF8FD]';
                      }
                      return (
                        <button
                          key={choice.id}
                          type="button"
                          disabled={isChecked}
                          onClick={() => updateAnswer(currentChallenge.id, choice.id)}
                          className={`w-full text-left p-4 rounded-2xl border-2 transition-colors cursor-pointer ${cls}`}
                        >
                          <p className="text-sm sm:text-[15px] font-semibold text-[#182230]">
                            {choice.label}
                          </p>
                          {isChecked && (
                            <p className="text-xs text-[#516072] mt-1.5">
                              Dampak: {choice.consequence}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Feedback Banner after checking */}
            {isChecked && currentEval && (
              <div
                className={`mt-6 p-5 rounded-2xl border ${
                  currentEval.isCorrect
                    ? 'bg-[#EEF9F1] border-[#71C98A]'
                    : 'bg-[#FFF7E3] border-[#FFCA65]'
                }`}
              >
                <div className="flex items-start gap-3">
                  {currentEval.isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-[#2E854A] mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-[#B57B14] mt-0.5 shrink-0" />
                  )}
                  <div className="space-y-1">
                    <p className="font-display font-bold text-sm text-[#182230]">
                      {currentEval.isCorrect
                        ? `Tepat! (+${currentEval.earnedPoints} poin)`
                        : `Kurang tepat (${currentEval.earnedPoints}/${currentEval.maxPoints} poin)`}
                    </p>
                    <p className="text-sm text-[#2F3B4B] leading-relaxed">
                      {currentChallenge.explanation}
                    </p>
                    {!currentEval.isCorrect && (
                      <p className="text-xs text-[#516072] pt-1">
                        Jawaban yang diharapkan: {currentEval.correctAnswerSummary}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Footer */}
            <div className="mt-8 pt-5 border-t border-[#EFE7D6] flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                className="px-4 py-2.5 rounded-xl bg-[#FFF8E9] hover:bg-[#EFE7D6] text-[#182230] text-sm font-semibold disabled:opacity-40 cursor-pointer"
              >
                Sebelumnya
              </button>

              <div className="flex items-center gap-3">
                {!isChecked ? (
                  <button
                    type="button"
                    onClick={handleCheckCurrent}
                    className="px-6 py-2.5 rounded-xl bg-[#FFCA65] hover:bg-[#F5BC4E] text-[#182230] font-bold text-sm cursor-pointer"
                  >
                    Periksa Jawaban
                  </button>
                ) : currentIndex < sortedChallenges.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((i) => i + 1)}
                    className="px-6 py-2.5 rounded-xl bg-[#54BCEB] hover:bg-[#3FAEDB] text-[#182230] font-bold text-sm inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Tantangan Berikutnya</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleFinishSimulation}
                    className="px-6 py-2.5 rounded-xl bg-[#71C98A] hover:bg-[#5BB976] text-[#182230] font-bold text-sm inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    <Trophy className="w-4 h-4" />
                    <span>{submitting ? 'Menyimpan Hasil...' : 'Selesaikan Misi & Lihat Hasil'}</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
