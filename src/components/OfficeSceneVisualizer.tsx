import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  FolderOpen,
  Monitor,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'motion/react';
import { DetectiveAvatar, SafeImage } from './Avatars';
import { getVisualSceneSummary } from '../utils/simulatorHelpers';
import { shuffleWithSeed } from '../utils/gameLogic';
import type { Challenge } from '../types';

const CABLE_COLORS = ['#54BCEB', '#FFCA65', '#71C98A', '#BB8AE8', '#E25C83'];

interface OfficeSceneVisualizerProps {
  challenge: Challenge;
  challengeIndex: number;
  answer: unknown;
  isChecked: boolean;
  isCorrect?: boolean;
  earnedPoints?: number;
  materialImageUrl?: string;
  materialTitle?: string;
  userAvatarId?: string;
  selectedDragItemId?: string | null;
  onAssignDragZone?: (zoneId: string) => void;
  onToggleErrorRow?: (rowId: string) => void;
}

export function OfficeSceneVisualizer({
  challenge,
  challengeIndex,
  answer,
  isChecked,
  isCorrect,
  materialImageUrl,
  materialTitle,
  userAvatarId = 'detective_blue',
  selectedDragItemId,
  onAssignDragZone,
  onToggleErrorRow,
}: OfficeSceneVisualizerProps) {
  const summary = getVisualSceneSummary(challenge, answer, isChecked, isCorrect);

  const statusToneClasses =
    summary.statusTone === 'success'
      ? 'bg-[#EEF9F1] border-[#71C98A] text-[#256D3B]'
      : summary.statusTone === 'warning'
        ? 'bg-[#FFF7E3] border-[#FFCA65] text-[#8E5B08]'
        : summary.statusTone === 'active'
          ? 'bg-[#EDF8FD] border-[#54BCEB] text-[#1C6E99]'
          : 'bg-[#FFF8E9] border-[#E6DEC9] text-[#516072]';

  return (
    <div
      data-testid="office-scene-visualizer"
      className="rounded-2xl border-2 border-[#EFE7D6] bg-gradient-to-br from-[#FFFDF8] via-[#FFF8E9] to-[#EDF8FD]/60 overflow-hidden mb-6"
    >
      {/* Top Scene Monitor Header */}
      <div className="px-4 sm:px-5 py-2.5 bg-white/90 border-b border-[#EFE7D6] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-extrabold text-[#182230]">
          <Monitor className="w-4 h-4 text-[#2B8CBE]" />
          <span>Visualisasi Simulasi: {summary.sceneTitle}</span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${statusToneClasses}`}
          >
            {summary.statusTone === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : summary.statusTone === 'warning' ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : (
              <FileSearch className="w-3.5 h-3.5" />
            )}
            <span>{summary.statusLabel}</span>
          </span>
        </div>
      </div>

      {/* Dynamic Scene Stage */}
      <div className="p-4 sm:p-5">
        {challenge.type === 'drag_and_drop' && (
          <DragDropCabinetScene
            challenge={challenge}
            answer={answer}
            isChecked={isChecked}
            selectedDragItemId={selectedDragItemId}
            onAssignDragZone={onAssignDragZone}
          />
        )}

        {challenge.type === 'matching' && (
          <MatchingCableScene
            challenge={challenge}
            challengeIndex={challengeIndex}
            answer={answer}
            isChecked={isChecked}
          />
        )}

        {challenge.type === 'find_the_error' && (
          <AuditMonitorScene
            challenge={challenge}
            answer={answer}
            isChecked={isChecked}
            onToggleErrorRow={onToggleErrorRow}
          />
        )}

        {challenge.type === 'ordering' && (
          <WorkflowPipelineScene
            challenge={challenge}
            answer={answer}
            isChecked={isChecked}
          />
        )}

        {challenge.type === 'decision_making' && (
          <SecurityControlScene
            challenge={challenge}
            answer={answer}
            isChecked={isChecked}
            isCorrect={isCorrect}
            userAvatarId={userAvatarId}
          />
        )}

        {(challenge.type === 'multiple_choice' ||
          challenge.type === 'true_false' ||
          challenge.type === 'case_simulation') && (
          <OfficeDeskScenarioScene
            challenge={challenge}
            answer={answer}
            isChecked={isChecked}
            isCorrect={isCorrect}
            materialImageUrl={materialImageUrl}
            materialTitle={materialTitle}
            userAvatarId={userAvatarId}
          />
        )}
      </div>
    </div>
  );
}

/* 1. Drag & Drop: Office Filing Cabinet & Paper Stack Scene */
function DragDropCabinetScene({
  challenge,
  answer,
  isChecked,
  selectedDragItemId,
  onAssignDragZone,
}: {
  challenge: Challenge;
  answer: unknown;
  isChecked: boolean;
  selectedDragItemId?: string | null;
  onAssignDragZone?: (zoneId: string) => void;
}) {
  const items = challenge.items ?? [];
  const zones = challenge.zones ?? [];
  const map =
    answer && typeof answer === 'object' ? (answer as Record<string, string>) : {};
  const unplaced = items.filter((i) => !map[i.id]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
      {/* Left: Office Desk Paper Tray */}
      <div className="md:col-span-4 bg-white rounded-2xl border border-[#EFE7D6] p-4 flex items-center gap-3.5">
        <svg width="72" height="68" viewBox="0 0 80 76" fill="none" aria-hidden="true" className="shrink-0">
          {/* Desk surface */}
          <rect x="6" y="54" width="68" height="12" rx="4" fill="#FFCA65" stroke="#182230" strokeWidth="2" />
          <rect x="12" y="66" width="8" height="6" rx="2" fill="#182230" />
          <rect x="60" y="66" width="8" height="6" rx="2" fill="#182230" />
          {/* Inbox tray */}
          <path d="M16 42H64L60 54H20L16 42Z" fill="#EDF8FD" stroke="#182230" strokeWidth="2" strokeLinejoin="round" />
          {/* Paper stack depending on unplaced count */}
          {unplaced.slice(0, 4).map((it, idx) => (
            <g key={it.id} transform={`translate(${idx * 3}, ${-idx * 6})`}>
              <rect
                x="22"
                y="32"
                width="36"
                height="12"
                rx="3"
                fill={selectedDragItemId === it.id ? '#54BCEB' : '#FFFFFF'}
                stroke="#182230"
                strokeWidth="1.8"
              />
              <line x1="27" y1="38" x2="50" y2="38" stroke="#182230" strokeWidth="1.5" strokeLinecap="round" />
            </g>
          ))}
        </svg>
        <div>
          <p className="font-mono text-xl font-extrabold text-[#182230] tabular-nums">
            {unplaced.length} Berkas
          </p>
          <p className="text-xs text-[#516072]">
            {unplaced.length === 0
              ? 'Meja sortir sudah bersih!'
              : selectedDragItemId
                ? 'Klik kabinet di kanan untuk menyimpan'
                : 'Menunggu masuk lemari arsip'}
          </p>
        </div>
      </div>

      {/* Right: Visual Filing Cabinets */}
      <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {zones.map((zone) => {
          const placedHere = items.filter((i) => map[i.id] === zone.id);
          const allRightHere =
            isChecked &&
            placedHere.length > 0 &&
            placedHere.every((i) => i.correctZoneId === zone.id);
          const hasWrongHere =
            isChecked && placedHere.some((i) => i.correctZoneId !== zone.id);

          return (
            <button
              key={zone.id}
              type="button"
              disabled={!selectedDragItemId || isChecked}
              onClick={() => selectedDragItemId && onAssignDragZone?.(zone.id)}
              className={`rounded-2xl border-2 p-3 text-left transition-all ${
                selectedDragItemId && !isChecked
                  ? 'border-[#54BCEB] bg-white hover:bg-[#EDF8FD] cursor-pointer shadow-xs'
                  : allRightHere
                    ? 'border-[#71C98A] bg-[#EEF9F1]'
                    : hasWrongHere
                      ? 'border-[#E25C83] bg-[#FFDCE8]/50'
                      : 'border-[#E6DEC9] bg-white cursor-default'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <FolderOpen
                  className="w-5 h-5 shrink-0"
                  style={{ color: zone.color || '#54BCEB' }}
                />
                <span className="font-mono text-xs font-extrabold text-[#182230] tabular-nums">
                  {placedHere.length} map
                </span>
              </div>
              {/* Visual drawer slots */}
              <div className="h-9 rounded-xl bg-[#FFF8E9] border border-[#EFE7D6] px-2 flex items-end gap-1.5 overflow-hidden">
                {placedHere.length === 0 ? (
                  <span className="text-[10px] text-[#9AA5B4] self-center mx-auto">
                    Laci kosong
                  </span>
                ) : (
                  placedHere.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ y: -8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      title={p.label}
                      className="h-7 flex-1 rounded-t-md border border-[#182230]/20"
                      style={{
                        backgroundColor: isChecked
                          ? p.correctZoneId === zone.id
                            ? '#71C98A'
                            : '#E25C83'
                          : zone.color || '#54BCEB',
                      }}
                    />
                  ))
                )}
              </div>
              <p className="text-xs font-bold text-[#182230] truncate mt-2">
                {zone.label}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* 2. Matching: Live Animated SVG Bezier Cable Diagram */
function MatchingCableScene({
  challenge,
  challengeIndex,
  answer,
  isChecked,
}: {
  challenge: Challenge;
  challengeIndex: number;
  answer: unknown;
  isChecked: boolean;
}) {
  const pairs = challenge.pairs ?? [];
  const shuffledRight = shuffleWithSeed(
    pairs.map((p) => p.right),
    challengeIndex + 31
  );
  const mapping =
    answer && typeof answer === 'object' ? (answer as Record<string, string>) : {};

  const rowHeight = 42;
  const svgHeight = Math.max(120, pairs.length * rowHeight + 16);

  return (
    <div className="bg-white rounded-2xl border border-[#EFE7D6] p-3 sm:p-4">
      <div className="grid grid-cols-12 items-center gap-2">
        {/* Left Nodes */}
        <div className="col-span-4 space-y-2">
          {pairs.map((p, idx) => {
            const color = CABLE_COLORS[idx % CABLE_COLORS.length];
            const isLinked = Boolean(mapping[p.id]);
            return (
              <div
                key={p.id}
                className="h-[34px] px-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold text-[#182230] bg-[#FFFDF8]"
                style={{ borderColor: isLinked ? color : '#E6DEC9' }}
              >
                <span
                  className="w-5 h-5 rounded-md font-mono text-[11px] font-extrabold flex items-center justify-center shrink-0"
                  style={{ backgroundColor: color, color: idx % 5 === 4 ? '#FFF' : '#182230' }}
                >
                  {idx + 1}
                </span>
                <span className="truncate">{p.left}</span>
              </div>
            );
          })}
        </div>

        {/* Center Live SVG Connection Cables */}
        <div className="col-span-4">
          <svg
            viewBox={`0 0 220 ${svgHeight}`}
            className="w-full overflow-visible"
            style={{ height: `${svgHeight}px` }}
            aria-label="Diagram kabel pasangan klasifikasi"
          >
            {/* Subtle grid dots */}
            {pairs.map((_, i) => {
              const y = 25 + i * rowHeight;
              return (
                <g key={i}>
                  <circle cx="8" cy={y} r="4" fill="#D8D0BE" />
                  <circle cx="212" cy={y} r="4" fill="#D8D0BE" />
                </g>
              );
            })}

            {pairs.map((p, leftIdx) => {
              const chosenRight = mapping[p.id];
              if (!chosenRight) return null;
              const rightIdx = shuffledRight.indexOf(chosenRight);
              if (rightIdx < 0) return null;

              const y1 = 25 + leftIdx * rowHeight;
              const y2 = 25 + rightIdx * rowHeight;
              const color = CABLE_COLORS[leftIdx % CABLE_COLORS.length];
              const exact = chosenRight === p.right;
              const strokeColor = isChecked
                ? exact
                  ? '#2E854A'
                  : '#D94E75'
                : color;

              return (
                <g key={p.id}>
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.35 }}
                    d={`M 8 ${y1} C 95 ${y1}, 125 ${y2}, 212 ${y2}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <circle cx="8" cy={y1} r="5" fill={strokeColor} />
                  <circle cx="212" cy={y2} r="5" fill={strokeColor} />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right Nodes */}
        <div className="col-span-4 space-y-2">
          {shuffledRight.map((rightLabel, rIdx) => {
            const ownerIdx = pairs.findIndex((p) => mapping[p.id] === rightLabel);
            const color =
              ownerIdx >= 0 ? CABLE_COLORS[ownerIdx % CABLE_COLORS.length] : '#E6DEC9';
            return (
              <div
                key={rIdx}
                className="h-[34px] px-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs font-bold text-[#182230] bg-[#FFFDF8]"
                style={{ borderColor: color }}
              >
                <span className="truncate">{rightLabel}</span>
                {ownerIdx >= 0 && (
                  <span
                    className="w-5 h-5 rounded-md font-mono text-[11px] font-extrabold flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: color,
                      color: ownerIdx % 5 === 4 ? '#FFF' : '#182230',
                    }}
                  >
                    {ownerIdx + 1}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* 3. Find the Error: Interactive Office Computer Audit Scanner */
function AuditMonitorScene({
  challenge,
  answer,
  isChecked,
  onToggleErrorRow,
}: {
  challenge: Challenge;
  answer: unknown;
  isChecked: boolean;
  onToggleErrorRow?: (rowId: string) => void;
}) {
  const rows = challenge.rows ?? [];
  const selectedIds = new Set(Array.isArray(answer) ? (answer as string[]) : []);

  return (
    <div className="bg-white rounded-2xl border-2 border-[#D8D0BE] p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-xs font-bold text-[#516072]">
          Pemindai Layar Data ({rows.length} Baris Diperiksa · Klik baris di monitor atau tabel untuk menandai)
        </p>
        <div className="flex items-center gap-3 text-[11px] font-semibold text-[#516072]">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#71C98A]" /> Aman
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#E25C83]" /> Ditandai Anomali
          </span>
        </div>
      </div>

      {/* Visual Monitor Screen */}
      <div className="relative rounded-xl bg-[#EDF8FD] border border-[#CBE8F7] p-3 overflow-hidden">
        {!isChecked && (
          <motion.div
            aria-hidden="true"
            animate={{ x: ['0%', '92%', '0%'] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none absolute top-0 bottom-0 w-10 bg-gradient-to-r from-transparent via-[#54BCEB]/25 to-transparent"
          />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 relative z-10">
          {rows.map((row, idx) => {
            const marked = selectedIds.has(row.id);
            let cardCls = 'bg-white border-[#CBE8F7] hover:border-[#54BCEB]';
            let statusText = 'Normal';
            if (isChecked) {
              if (row.isError && marked) {
                cardCls = 'bg-[#EEF9F1] border-[#71C98A]';
                statusText = 'Temuan Tepat';
              } else if (row.isError && !marked) {
                cardCls = 'bg-[#FFF7E3] border-[#FFCA65]';
                statusText = 'Terlewat';
              } else if (!row.isError && marked) {
                cardCls = 'bg-[#FFDCE8] border-[#E25C83]';
                statusText = 'Salah Tandai';
              } else {
                cardCls = 'bg-white border-[#71C98A]/60';
                statusText = 'Valid';
              }
            } else if (marked) {
              cardCls = 'bg-[#FFDCE8] border-[#E25C83]';
              statusText = 'Terindikasi';
            }

            return (
              <button
                key={row.id}
                type="button"
                disabled={isChecked}
                onClick={() => onToggleErrorRow?.(row.id)}
                className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                  isChecked ? 'cursor-default' : 'cursor-pointer'
                } ${cardCls}`}
              >
                <div className="flex items-center justify-between gap-1 text-[11px] font-mono font-bold">
                  <span className="text-[#516072]">BARIS #{idx + 1}</span>
                  <span
                    className={
                      marked || (isChecked && row.isError)
                        ? 'text-[#9A2348]'
                        : 'text-[#2E7245]'
                    }
                  >
                    {statusText}
                  </span>
                </div>
                <p className="text-xs font-bold text-[#182230] truncate mt-1">
                  {row.cells[1] ?? row.cells[0] ?? row.id}
                </p>
                <p className="font-mono text-[11px] text-[#516072] truncate">
                  {row.cells.slice(2).join(' · ') || row.cells[0]}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* 4. Ordering: Visual SOP Office Conveyor / Pipeline */
function WorkflowPipelineScene({
  challenge,
  answer,
  isChecked,
}: {
  challenge: Challenge;
  answer: unknown;
  isChecked: boolean;
}) {
  const steps = challenge.steps ?? [];
  const stepMap = new Map(steps.map((s) => [s.id, s]));
  const currentOrder = Array.isArray(answer)
    ? (answer as string[])
    : steps.map((s) => s.id);

  return (
    <div className="bg-white rounded-2xl border border-[#EFE7D6] p-4">
      <p className="text-xs font-bold text-[#516072] mb-3">
        Simulasi Jalur Alur Kerja SOP (Tahap 1 hingga {currentOrder.length})
      </p>
      <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
        {currentOrder.map((stepId, idx) => {
          const step = stepMap.get(stepId);
          if (!step) return null;
          const isRightPos = isChecked && steps[idx]?.id === stepId;
          return (
            <React.Fragment key={stepId}>
              <motion.div
                layout
                className={`min-w-[160px] flex-1 p-3 rounded-xl border-2 flex flex-col justify-between ${
                  isChecked
                    ? isRightPos
                      ? 'bg-[#EEF9F1] border-[#71C98A]'
                      : 'bg-[#FFDCE8]/60 border-[#E25C83]'
                    : 'bg-[#FFFDF8] border-[#CBE8F7]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-[#54BCEB] text-[#182230] font-mono text-[11px] font-extrabold">
                    TAHAP {idx + 1}
                  </span>
                  {isChecked &&
                    (isRightPos ? (
                      <CheckCircle2 className="w-4 h-4 text-[#2E854A]" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-[#9A2348]" />
                    ))}
                </div>
                <p className="text-xs font-semibold text-[#182230] line-clamp-2">
                  {step.text}
                </p>
              </motion.div>
              {idx < currentOrder.length - 1 && (
                <div className="flex items-center text-[#54BCEB] font-extrabold shrink-0" aria-hidden="true">
                  →
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* 5. Decision Making: Live Security Shield & Server Risk Meter */
function SecurityControlScene({
  challenge,
  answer,
  isChecked,
  isCorrect,
  userAvatarId,
}: {
  challenge: Challenge;
  answer: unknown;
  isChecked: boolean;
  isCorrect?: boolean;
  userAvatarId: string;
}) {
  const choices = challenge.choices ?? [];
  const chosenId = typeof answer === 'string' ? answer : '';
  const chosenChoice = choices.find((c) => c.id === chosenId);

  let meterPct = 50;
  let meterColor = '#FFCA65';
  let meterTitle = 'Status Keamanan: Menunggu Keputusan';
  if (isChecked && chosenChoice) {
    meterPct = Math.round((chosenChoice.scoreRatio || 0) * 100);
    if (isCorrect || meterPct >= 90) {
      meterColor = '#71C98A';
      meterTitle = 'Sistem Aman & Sesuai Prosedur';
    } else if (meterPct >= 40) {
      meterColor = '#FFCA65';
      meterTitle = 'Risiko Sedang · Perlu Perbaikan';
    } else {
      meterColor = '#E25C83';
      meterTitle = 'Bahaya Kebocoran Data!';
    }
  } else if (chosenChoice) {
    meterPct = 65;
    meterColor = '#54BCEB';
    meterTitle = 'Opsi Dipilih · Siap Diuji';
  }

  const dashOffset = 157 - (157 * meterPct) / 100;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-white rounded-2xl border border-[#EFE7D6] p-4">
      <div className="sm:col-span-5 flex items-center gap-3.5">
        <svg width="110" height="70" viewBox="0 0 120 74" aria-hidden="true" className="shrink-0">
          <path
            d="M 10 64 A 50 50 0 0 1 110 64"
            fill="none"
            stroke="#EFE7D6"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <motion.path
            d="M 10 64 A 50 50 0 0 1 110 64"
            fill="none"
            stroke={meterColor}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray="157"
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.5 }}
          />
          <text
            x="60"
            y="58"
            textAnchor="middle"
            className="font-mono text-base font-extrabold fill-[#182230]"
          >
            {isChecked ? `${meterPct}%` : chosenChoice ? 'SIAP' : '???'}
          </text>
        </svg>
        <div>
          <div className="flex items-center gap-1.5 text-sm font-extrabold text-[#182230]">
            {isChecked && isCorrect ? (
              <ShieldCheck className="w-4 h-4 text-[#2E854A]" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-[#2B8CBE]" />
            )}
            <span>{meterTitle}</span>
          </div>
          <p className="text-xs text-[#516072] mt-1">
            {chosenChoice
              ? `Tindakan dipilih: ${chosenChoice.label}`
              : 'Pilih tindakan paling aman di bawah untuk melihat dampaknya pada keamanan data.'}
          </p>
        </div>
      </div>

      <div className="sm:col-span-7 flex items-center gap-3 bg-[#FFF8E9] rounded-xl p-3 border border-[#EFE7D6]">
        <DetectiveAvatar avatarId={userAvatarId} size={44} />
        <div className="text-xs text-[#2F3B4B] leading-relaxed">
          <p className="font-bold text-[#182230]">Simulasi Ruang Server &amp; Kebijakan Akses</p>
          <p className="mt-0.5">
            {isChecked && chosenChoice
              ? chosenChoice.consequence
              : 'Setiap pilihan memiliki konsekuensi langsung terhadap kerahasiaan data perusahaan.'}
          </p>
        </div>
      </div>
    </div>
  );
}

/* 6. Multiple Choice / True-False / Case Simulation: Illustrated Office Desk */
function OfficeDeskScenarioScene({
  challenge,
  answer,
  isChecked,
  isCorrect,
  materialImageUrl,
  materialTitle,
  userAvatarId,
}: {
  challenge: Challenge;
  answer: unknown;
  isChecked: boolean;
  isCorrect?: boolean;
  materialImageUrl?: string;
  materialTitle?: string;
  userAvatarId: string;
}) {
  const hasSelection = answer !== undefined && answer !== null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-white rounded-2xl border border-[#EFE7D6] p-4">
      <div className="md:col-span-4 h-28 sm:h-32 rounded-xl overflow-hidden border border-[#EFE7D6]">
        <SafeImage
          src={materialImageUrl}
          alt={materialTitle || challenge.title}
          title={materialTitle || challenge.title}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="md:col-span-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <DetectiveAvatar avatarId={userAvatarId} size={52} />
          <div>
            <p className="text-xs font-bold text-[#2B8CBE]">
              {challenge.type === 'case_simulation'
                ? `Berkas Kasus dari ${challenge.dossierSender || 'Unit Kantor'}`
                : 'Meja Analisis Prosedur Kantor'}
            </p>
            <p className="text-sm font-bold text-[#182230] mt-0.5">
              {isChecked
                ? isCorrect
                  ? 'Analisis Dinyatakan Tepat & Sesuai SOP!'
                  : 'Keputusan Masih Perlu Penyesuaian SOP'
                : hasSelection
                  ? 'Jawaban sudah dipilih — tekan Periksa Jawaban untuk verifikasi!'
                  : 'Baca skenario dengan cermat dan tentukan langkah terbaik.'}
            </p>
          </div>
        </div>

        {/* Visual Office Stamp */}
        <div
          className={`px-4 py-2 rounded-xl border-2 font-mono text-xs font-extrabold tracking-wider text-center shrink-0 ${
            isChecked
              ? isCorrect
                ? 'border-[#71C98A] bg-[#EEF9F1] text-[#256D3B] -rotate-2'
                : 'border-[#E25C83] bg-[#FFDCE8] text-[#9A2348] rotate-2'
              : hasSelection
                ? 'border-[#54BCEB] bg-[#EDF8FD] text-[#1C6E99]'
                : 'border-dashed border-[#D8D0BE] bg-[#FFF8E9] text-[#516072]'
          }`}
        >
          {isChecked
            ? isCorrect
              ? 'TERVERIFIKASI'
              : 'PERLU KOREKSI'
            : hasSelection
              ? 'SIAP UJI'
              : 'MENUNGGU'}
        </div>
      </div>
    </div>
  );
}
