import React, { useState } from 'react';
import {
  CheckCircle2,
  MessageSquare,
  ScanSearch,
  Snowflake,
  Sparkles,
  Timer,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { DetectiveAvatar } from './Avatars';
import type { NpcDispatch } from '../utils/simulatorHelpers';

interface OfficeDispatchBarProps {
  dispatch: NpcDispatch;
  isChecked: boolean;
  caseElapsedSeconds: number;
  scanCharges: number;
  freezeCharges: number;
  freezeSecondsLeft: number;
  scanUsedOnCurrent: boolean;
  scanFeedback?: string;
  onUseSmartScan: () => void;
  onUseFreezeTimer: () => void;
}

export function OfficeDispatchBar({
  dispatch,
  isChecked,
  caseElapsedSeconds,
  scanCharges,
  freezeCharges,
  freezeSecondsLeft,
  scanUsedOnCurrent,
  scanFeedback,
  onUseSmartScan,
  onUseFreezeTimer,
}: OfficeDispatchBarProps) {
  const [askColleagueOpen, setAskColleagueOpen] = useState(false);

  const moodStyles: Record<
    NpcDispatch['mood'],
    { card: string; badge: string; badgeText: string }
  > = {
    info: {
      card: 'bg-[#FFFDF8] border-[#EFE7D6]',
      badge: 'bg-[#EDF8FD] text-[#1D6B94]',
      badgeText: 'Info Rekan Divisi',
    },
    active: {
      card: 'bg-[#F5EEFC]/55 border-[#DFC9F7]',
      badge: 'bg-[#F5EEFC] text-[#6D3B9E]',
      badgeText: 'Siap Disahkan',
    },
    success: {
      card: 'bg-[#EEF9F1] border-[#96D9AA]',
      badge: 'bg-[#DDF5E4] text-[#1F7A3E]',
      badgeText: 'Divisi Terbantu',
    },
    warning: {
      card: 'bg-[#FFF7E3] border-[#F6D37E]',
      badge: 'bg-[#FFEBB8] text-[#8E5B08]',
      badgeText: 'Catatan Audit',
    },
  };

  const style = moodStyles[dispatch.mood];
  const speedTargetMax = 30;
  const speedPct = Math.max(
    0,
    Math.min(100, Math.round(((speedTargetMax - caseElapsedSeconds) / speedTargetMax) * 100))
  );
  const inFastWindow = caseElapsedSeconds <= 15;
  const inBonusWindow = caseElapsedSeconds <= speedTargetMax;

  return (
    <div className="mb-5 space-y-3">
      {/* Live NPC Colleague Dispatch + Detective Power-Up Controls */}
      <div className={`rounded-2xl border-2 p-4 transition-colors ${style.card}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Colleague Messenger */}
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            <DetectiveAvatar avatarId={dispatch.npcAvatarId} size={46} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold text-[#182230]">
                  {dispatch.npcName}
                </span>
                <span className="text-[11px] font-medium text-[#516072]">
                  · {dispatch.npcRole}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${style.badge}`}
                >
                  {style.badgeText}
                </span>
              </div>
              <p className="text-sm text-[#182230] mt-1 leading-relaxed font-medium">
                &ldquo;{dispatch.message}&rdquo;
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAskColleagueOpen((o) => !o)}
                  aria-expanded={askColleagueOpen}
                  className="text-xs font-bold text-[#2B8CBE] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>
                    {askColleagueOpen ? 'Tutup Saran Rekan' : 'Tanya Saran Rekan Divisi'}
                  </span>
                </button>
              </div>

              <AnimatePresence>
                {askColleagueOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="mt-2 text-xs text-[#2F3B4B] bg-white/90 border border-[#E6DEC9] rounded-xl px-3 py-2">
                      <strong className="text-[#182230]">Saran {dispatch.npcName}:</strong>{' '}
                      {dispatch.replyClue}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Tactical Detective Toolkit (Power-Ups) */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isChecked || scanUsedOnCurrent || scanCharges <= 0}
              onClick={onUseSmartScan}
              data-testid="powerup-smart-scan"
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                scanUsedOnCurrent
                  ? 'bg-[#EEF9F1] border-[#71C98A] text-[#1F7A3E]'
                  : 'bg-[#F5EEFC] hover:bg-[#EBDDFB] border-[#BB8AE8] text-[#182230]'
              }`}
            >
              <ScanSearch className="w-4 h-4 text-[#6D3B9E]" />
              <span>
                {scanUsedOnCurrent ? 'Pemindai Aktif' : `Pemindai Cerdas (${scanCharges})`}
              </span>
            </button>

            <button
              type="button"
              disabled={freezeSecondsLeft > 0 || freezeCharges <= 0}
              onClick={onUseFreezeTimer}
              data-testid="powerup-freeze-timer"
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                freezeSecondsLeft > 0
                  ? 'bg-[#EDF8FD] border-[#54BCEB] text-[#1D6B94]'
                  : 'bg-[#EDF8FD] hover:bg-[#DDF2FB] border-[#8AD3F4] text-[#182230]'
              }`}
            >
              <Snowflake className="w-4 h-4 text-[#2B8CBE]" />
              <span>
                {freezeSecondsLeft > 0
                  ? `Waktu Beku (${freezeSecondsLeft}s)`
                  : `Bekukan Waktu (${freezeCharges})`}
              </span>
            </button>
          </div>
        </div>

        {/* Speed Bonus Target Strip & Smart Scan Feedback */}
        <div className="mt-3 pt-3 border-t border-[#EFE7D6]/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 flex-1 min-w-[220px]">
            <span className="inline-flex items-center gap-1 font-bold text-[#182230] shrink-0">
              <Timer className="w-3.5 h-3.5 text-[#2B8CBE]" />
              <span>Bonus Ketangkasan:</span>
            </span>
            <div className="flex-1 max-w-[180px] h-2 rounded-full bg-white border border-[#E6DEC9] overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  inFastWindow
                    ? 'bg-[#71C98A]'
                    : inBonusWindow
                      ? 'bg-[#FFCA65]'
                      : 'bg-[#D8D0BE]'
                }`}
                style={{ width: `${isChecked ? 100 : speedPct}%` }}
              />
            </div>
            <span className="font-mono font-bold text-[#516072] tabular-nums">
              {isChecked
                ? 'Kasus Selesai'
                : inFastWindow
                  ? '+10 XP Kilat'
                  : inBonusWindow
                    ? '+5 XP Tepat'
                    : 'Mode Teliti'}
            </span>
          </div>

          <span className="text-[11px] font-medium text-[#516072] inline-flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-[#D08A13]" />
            <span>Kombo x2 mengisi ulang +1 Pemindai!</span>
          </span>
        </div>

        {scanFeedback && (
          <div className="mt-2.5 rounded-xl bg-[#EEF9F1] border border-[#71C98A] px-3.5 py-2 text-xs font-bold text-[#1F7A3E] flex items-center gap-2">
            {isChecked ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 shrink-0" />
            )}
            <span>{scanFeedback}</span>
          </div>
        )}
      </div>
    </div>
  );
}
