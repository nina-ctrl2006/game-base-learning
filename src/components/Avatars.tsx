import React, { useState } from 'react';
import { FolderOpen } from 'lucide-react';

export const AVATAR_OPTIONS = [
  { id: 'detective_blue', label: 'Detektif Langit', bg: '#54BCEB', accent: '#182230', hat: '#FFCA65' },
  { id: 'detective_mint', label: 'Analis Arsip', bg: '#71C98A', accent: '#182230', hat: '#FFFFFF' },
  { id: 'detective_yellow', label: 'Auditor Emas', bg: '#FFCA65', accent: '#182230', hat: '#54BCEB' },
  { id: 'detective_purple', label: 'Penjaga Data', bg: '#BB8AE8', accent: '#182230', hat: '#FFDCE8' },
  { id: 'detective_mentor', label: 'Pembimbing Kantor', bg: '#FFDCE8', accent: '#182230', hat: '#BB8AE8' },
];

export function DetectiveAvatar({
  avatarId,
  size = 44,
  className = '',
}: {
  avatarId?: string;
  size?: number;
  className?: string;
}) {
  const preset = AVATAR_OPTIONS.find((a) => a.id === avatarId) ?? AVATAR_OPTIONS[0];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 rounded-2xl ${className}`}
    >
      <rect width="64" height="64" rx="18" fill={preset.bg} />
      <circle cx="32" cy="36" r="14" fill="#FFE0C2" stroke="#182230" strokeWidth="2.2" />
      {/* Friendly hair / detective cap */}
      <path
        d="M17 29C17 20 23.5 14 32 14C40.5 14 47 20 47 29H17Z"
        fill={preset.hat}
        stroke="#182230"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M13 29H51" stroke="#182230" strokeWidth="2.4" strokeLinecap="round" />
      {/* Glasses */}
      <circle cx="26.5" cy="36.5" r="4.2" fill="#FFFFFF" stroke="#182230" strokeWidth="2" />
      <circle cx="37.5" cy="36.5" r="4.2" fill="#FFFFFF" stroke="#182230" strokeWidth="2" />
      <path d="M30.7 36.5H33.3" stroke="#182230" strokeWidth="2" />
      <circle cx="26.8" cy="36.5" r="1.4" fill="#182230" />
      <circle cx="37.2" cy="36.5" r="1.4" fill="#182230" />
      {/* Smile */}
      <path
        d="M27.5 43.5C29 45.5 35 45.5 36.5 43.5"
        stroke="#182230"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SafeImage({
  src,
  alt,
  title,
  className = '',
}: {
  src?: string;
  alt: string;
  title?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#EDF8FD] via-[#FFF8E9] to-[#EEF9F1] text-[#182230] p-4 ${className}`}
      >
        <div className="w-11 h-11 rounded-2xl bg-white/90 flex items-center justify-center shadow-sm">
          <FolderOpen className="w-5 h-5 text-[#54BCEB]" />
        </div>
        {title && (
          <span className="text-xs font-medium text-center text-[#516072] line-clamp-2">
            {title}
          </span>
        )}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
