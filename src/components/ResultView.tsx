import React from 'react';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Clock,
  Lightbulb,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  formatDuration,
  getPredikat,
  getRecommendations,
} from '../utils/gameLogic';
import type { AttemptRecord } from '../types';

interface ResultViewProps {
  attempt: AttemptRecord;
  relatedSimulationScore?: number;
  relatedQuizScore?: number;
  onPlayAgain: () => void;
  onBackToMaterial: () => void;
}

export function ResultView({
  attempt,
  relatedSimulationScore,
  relatedQuizScore,
  onPlayAgain,
  onBackToMaterial,
}: ResultViewProps) {
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [attempt.id]);

  const predikatInfo = getPredikat(attempt.percentage);
  const recommendations = getRecommendations(
    attempt.percentage,
    attempt.details,
    attempt.materialTitle
  );

  return (
    <div className="min-h-screen bg-[#FFF8E9] py-8 px-4 sm:px-6" data-state="gameover">
      <div className="max-w-[960px] mx-auto space-y-6">
        {/* Hero Achievement Card */}
        <motion.div
          initial={{ opacity: 1, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
          className="bg-white rounded-3xl p-7 sm:p-10 border border-[#EFE7D6] shadow-sm text-center"
        >
          <motion.div
            initial={{ scale: 0.6, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center mb-5"
            style={{ backgroundColor: predikatInfo.bgTint }}
          >
            <Award className="w-10 h-10" style={{ color: predikatInfo.accentColor }} />
          </motion.div>

          <p className="text-sm font-semibold text-[#516072]">
            Evaluasi Hasil {attempt.kind === 'simulation' ? 'Simulasi Kerja' : 'Kuis Materi'}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#182230] mt-1">
            {predikatInfo.title}
          </h1>
          <p className="text-sm text-[#516072] mt-2">
            Pemain: <strong className="text-[#182230]">{attempt.userName}</strong> · Materi:{' '}
            <strong className="text-[#182230]">{attempt.materialTitle}</strong>
          </p>
          <p className="mt-3 text-[15px] text-[#2F3B4B] max-w-xl mx-auto">
            {predikatInfo.description}
          </p>

          {/* Metrics Grid */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-5 gap-3 text-left">
            <div className="rounded-2xl p-4 bg-[#EDF8FD]">
              <span className="block text-xs text-[#516072]">Keberhasilan</span>
              <span className="font-mono text-2xl font-extrabold text-[#182230] tabular-nums">
                {attempt.percentage}%
              </span>
            </div>
            <div className="rounded-2xl p-4 bg-[#FFF8E9]">
              <span className="block text-xs text-[#516072]">Skor Poin</span>
              <span className="font-mono text-2xl font-extrabold text-[#182230] tabular-nums">
                {attempt.score}/{attempt.maxScore}
              </span>
            </div>
            <div className="rounded-2xl p-4 bg-[#EEF9F1]">
              <span className="block text-xs text-[#516072]">Jawaban Benar</span>
              <span className="font-mono text-2xl font-extrabold text-[#1F7A3E] tabular-nums">
                {attempt.correctCount}
              </span>
            </div>
            <div className="rounded-2xl p-4 bg-[#FFDCE8]/60">
              <span className="block text-xs text-[#516072]">Jawaban Salah</span>
              <span className="font-mono text-2xl font-extrabold text-[#9A2348] tabular-nums">
                {attempt.wrongCount}
              </span>
            </div>
            <div className="rounded-2xl p-4 bg-[#F5EEFC] col-span-2 sm:col-span-1">
              <span className="block text-xs text-[#516072]">Waktu</span>
              <span className="font-mono text-2xl font-extrabold text-[#182230] tabular-nums inline-flex items-center gap-1">
                <Clock className="w-4 h-4 text-[#6D3FA3]" />
                {formatDuration(attempt.durationSeconds)}
              </span>
            </div>
          </div>

          {/* Combined Simulation & Quiz Summary if available */}
          {(typeof relatedSimulationScore === 'number' ||
            typeof relatedQuizScore === 'number') && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-6 text-xs text-[#516072]">
              {typeof relatedSimulationScore === 'number' && (
                <span>
                  Skor Terbaik Simulasi:{' '}
                  <strong className="font-mono text-[#182230] tabular-nums">
                    {relatedSimulationScore}%
                  </strong>
                </span>
              )}
              {typeof relatedQuizScore === 'number' && (
                <span>
                  Nilai Terbaik Kuis:{' '}
                  <strong className="font-mono text-[#182230] tabular-nums">
                    {relatedQuizScore}%
                  </strong>
                </span>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onPlayAgain}
              className="px-6 py-3 rounded-2xl bg-[#FFCA65] hover:bg-[#F5BC4E] text-[#182230] font-bold text-sm inline-flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Main Lagi</span>
            </button>
            <button
              type="button"
              onClick={onBackToMaterial}
              className="px-6 py-3 rounded-2xl bg-[#54BCEB] hover:bg-[#3FAEDB] text-[#182230] font-bold text-sm inline-flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Materi</span>
            </button>
          </div>
        </motion.div>

        {/* Recommendations */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EFE7D6] shadow-sm">
          <h2 className="font-display text-lg font-bold text-[#182230] flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-[#FFCA65]" />
            <span>Rekomendasi Belajar</span>
          </h2>
          <ul className="space-y-2 text-sm text-[#2F3B4B] list-disc pl-5">
            {recommendations.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </div>

        {/* Detailed Pembahasan */}
        {attempt.details.length > 0 && (
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EFE7D6] shadow-sm space-y-4">
            <h2 className="font-display text-lg font-bold text-[#182230]">
              Pembahasan Jawaban
            </h2>
            <div className="divide-y divide-[#EFE7D6]">
              {attempt.details.map((d, idx) => (
                <div key={d.itemId + idx} className="py-4 first:pt-0 last:pb-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      {d.isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-[#71C98A] mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-[#D94E75] mt-0.5 shrink-0" />
                      )}
                      <div>
                        <p className="font-semibold text-sm text-[#182230]">
                          {idx + 1}. {d.title}
                        </p>
                        <p className="text-xs text-[#516072]">
                          {d.typeLabel} · Jawaban Anda: {d.userAnswerSummary}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#182230] shrink-0 tabular-nums">
                      {d.earnedPoints}/{d.maxPoints}
                    </span>
                  </div>
                  <p className="text-sm text-[#2F3B4B] pl-7">
                    {d.explanation || `Kunci jawaban: ${d.correctAnswerSummary}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
