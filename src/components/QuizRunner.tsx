import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Trophy } from 'lucide-react';
import {
  evaluateQuizQuestion,
  formatDuration,
  getPredikat,
} from '../utils/gameLogic';
import type { AttemptDetail, AttemptRecord, Material, Quiz } from '../types';

interface QuizRunnerProps {
  quiz: Quiz;
  material?: Material;
  onExit: () => void;
  onCompleteAttempt: (
    attempt: Omit<AttemptRecord, 'id' | 'userId' | 'userName' | 'completedAt'>
  ) => Promise<AttemptRecord | void>;
}

export function QuizRunner({
  quiz,
  material,
  onExit,
  onCompleteAttempt,
}: QuizRunnerProps) {
  const questions = useMemo(
    () => [...quiz.questions].sort((a, b) => a.order - b.order),
    [quiz.questions]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedMap, setSelectedMap] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState(quiz.timerSeconds || 240);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (questions.length === 0) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((p) => p + 1);
      setSecondsLeft((p) => {
        if (p <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [questions.length]);

  useEffect(() => {
    if (secondsLeft === 0 && !submitting && questions.length > 0) {
      void handleSubmitQuiz();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  async function handleSubmitQuiz() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const details: AttemptDetail[] = questions.map((q) => {
        const chosen = typeof selectedMap[q.id] === 'number' ? selectedMap[q.id] : null;
        const evalRes = evaluateQuizQuestion(q, chosen);
        return {
          itemId: q.id,
          title: q.question,
          typeLabel: q.type === 'true_false' ? 'Benar atau Salah' : 'Pilihan Ganda',
          isCorrect: evalRes.isCorrect,
          earnedPoints: evalRes.earnedPoints,
          maxPoints: evalRes.maxPoints,
          userAnswerSummary: evalRes.userAnswerSummary,
          correctAnswerSummary: evalRes.correctAnswerSummary,
          explanation: q.explanation,
        };
      });

      const score = details.reduce((s, d) => s + d.earnedPoints, 0);
      const maxScore = details.reduce((s, d) => s + d.maxPoints, 0) || 100;
      const percentage = Math.round((score / maxScore) * 100);
      const correctCount = details.filter((d) => d.isCorrect).length;
      const wrongCount = details.length - correctCount;

      await onCompleteAttempt({
        materialId: quiz.materialId,
        materialTitle: material?.title || quiz.title,
        kind: 'quiz',
        targetId: quiz.id,
        targetTitle: quiz.title,
        score,
        maxScore,
        percentage,
        correctCount,
        wrongCount,
        durationSeconds: Math.max(1, elapsedSeconds),
        predikat: getPredikat(percentage).title,
        details,
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-3xl p-8 border border-[#EFE7D6] text-center">
          <h2 className="font-display text-2xl font-bold">Kuis Belum Memiliki Soal</h2>
          <p className="text-sm text-[#516072] mt-2">
            Guru atau admin perlu menambahkan soal ke kuis ini terlebih dahulu.
          </p>
          <button
            type="button"
            onClick={onExit}
            className="mt-5 px-5 py-2.5 rounded-xl bg-[#54BCEB] text-[#182230] font-semibold text-sm cursor-pointer"
          >
            Kembali ke Materi
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(selectedMap).length;

  return (
    <div className="min-h-screen bg-[#FFF8E9] pb-12">
      <div className="bg-white border-b border-[#EFE7D6] sticky top-0 z-20">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onExit}
              className="px-3 py-2 rounded-xl bg-[#FFF8E9] hover:bg-[#FFCA65]/40 text-[#182230] text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Batal</span>
            </button>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#6D3FA3] truncate">
                {material?.title || 'Kuis Evaluasi'}
              </p>
              <h1 className="font-display text-base sm:text-lg font-bold text-[#182230] truncate">
                {quiz.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <span className="text-xs font-semibold text-[#516072] hidden sm:inline tabular-nums">
              Terjawab {answeredCount}/{questions.length}
            </span>
            <div
              className={`px-3.5 py-2 rounded-xl font-mono text-sm font-bold tabular-nums inline-flex items-center gap-1.5 ${
                secondsLeft <= 30 ? 'bg-[#FFDCE8] text-[#8B1E42]' : 'bg-[#EDF8FD] text-[#182230]'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{formatDuration(secondsLeft)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1060px] mx-auto px-4 sm:px-6 pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Question Card */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-[#EFE7D6] shadow-sm">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#516072] mb-3">
            <span>
              Soal {currentIndex + 1} dari {questions.length} ·{' '}
              {currentQ.type === 'true_false' ? 'Benar atau Salah' : 'Pilihan Ganda'}
            </span>
            <span className="font-mono text-[#182230] tabular-nums">
              {currentQ.points} Poin
            </span>
          </div>

          <h2 className="font-display text-xl font-bold text-[#182230] leading-snug">
            {currentQ.question}
          </h2>

          <div className="mt-6 space-y-3">
            {currentQ.options.map((opt, idx) => {
              const chosen = selectedMap[currentQ.id] === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    setSelectedMap((prev) => ({ ...prev, [currentQ.id]: idx }))
                  }
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-colors flex items-center gap-3.5 cursor-pointer ${
                    chosen
                      ? 'border-[#54BCEB] bg-[#EDF8FD]'
                      : 'border-[#E6DEC9] bg-[#FFFDF8] hover:border-[#54BCEB]'
                  }`}
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

          <div className="mt-8 pt-5 border-t border-[#EFE7D6] flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              className="px-4 py-2.5 rounded-xl bg-[#FFF8E9] hover:bg-[#EFE7D6] text-sm font-semibold disabled:opacity-40 cursor-pointer"
            >
              Sebelumnya
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => i + 1)}
                className="px-5 py-2.5 rounded-xl bg-[#54BCEB] hover:bg-[#3FAEDB] text-[#182230] font-bold text-sm inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>Soal Berikutnya</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitQuiz}
                className="px-6 py-2.5 rounded-xl bg-[#71C98A] hover:bg-[#5BB976] text-[#182230] font-bold text-sm inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <Trophy className="w-4 h-4" />
                <span>{submitting ? 'Menilai...' : 'Kumpulkan Kuis'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Question Number Navigator */}
        <aside className="lg:col-span-4 bg-white rounded-3xl p-6 border border-[#EFE7D6] shadow-sm space-y-4">
          <h3 className="font-display text-base font-bold text-[#182230]">
            Navigasi Nomor Soal
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isCurrent = idx === currentIndex;
              const isAnswered = typeof selectedMap[q.id] === 'number';
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Soal nomor ${idx + 1}`}
                  className={`h-10 rounded-xl font-mono text-sm font-bold transition-colors cursor-pointer ${
                    isCurrent
                      ? 'bg-[#54BCEB] text-[#182230] ring-2 ring-[#182230]/20'
                      : isAnswered
                        ? 'bg-[#EEF9F1] text-[#182230] border border-[#71C98A]'
                        : 'bg-[#FFF8E9] text-[#516072] border border-[#E6DEC9]'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          <div className="pt-3 border-t border-[#EFE7D6] text-xs text-[#516072] space-y-1.5">
            <p className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#71C98A]" />
              <span>Nilai kelulusan: {quiz.passingScore}%</span>
            </p>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmitQuiz}
              className="w-full mt-2 py-2.5 rounded-xl bg-[#FFCA65] hover:bg-[#F5BC4E] text-[#182230] font-bold text-sm cursor-pointer"
            >
              Selesaikan & Lihat Nilai
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
