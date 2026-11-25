import type {
  AttemptDetail,
  Challenge,
  ChallengeType,
  PredikatTitle,
  QuizQuestion,
} from '../types';

export interface PredikatInfo {
  title: PredikatTitle;
  accentColor: string;
  bgTint: string;
  description: string;
}

export const CHALLENGE_TYPE_META: Record<
  ChallengeType,
  { label: string; shortDesc: string; badgeTint: string }
> = {
  multiple_choice: {
    label: 'Pilihan Ganda',
    shortDesc: 'Memilih satu jawaban paling tepat dari beberapa opsi.',
    badgeTint: '#54BCEB',
  },
  true_false: {
    label: 'Benar atau Salah',
    shortDesc: 'Menilai kebenaran suatu pernyataan prosedur kantor.',
    badgeTint: '#71C98A',
  },
  drag_and_drop: {
    label: 'Drag & Drop Klasifikasi',
    shortDesc: 'Menyeret atau menempatkan dokumen ke folder/zona yang sesuai.',
    badgeTint: '#FFCA65',
  },
  matching: {
    label: 'Mencocokkan Pasangan',
    shortDesc: 'Menghubungkan kode, dokumen, atau istilah dengan pasangannya.',
    badgeTint: '#BB8AE8',
  },
  ordering: {
    label: 'Mengurutkan Langkah Kerja',
    shortDesc: 'Menyusun urutan SOP atau prosedur administrasi secara tepat.',
    badgeTint: '#54BCEB',
  },
  find_the_error: {
    label: 'Cari Kesalahan Data',
    shortDesc: 'Mengaudit tabel kantor dan menandai baris data yang bermasalah.',
    badgeTint: '#FFDCE8',
  },
  case_simulation: {
    label: 'Simulasi Studi Kasus',
    shortDesc: 'Membaca memo/dokumen kasus kantor dan menentukan solusi tepat.',
    badgeTint: '#FFCA65',
  },
  decision_making: {
    label: 'Pengambilan Keputusan',
    shortDesc: 'Memilih tindakan terbaik pada dilema kerja dan keamanan data.',
    badgeTint: '#71C98A',
  },
};

export function getPredikat(percentage: number): PredikatInfo {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
  if (clamped >= 90) {
    return {
      title: 'Master Administrator',
      accentColor: '#71C98A',
      bgTint: '#EEF9F1',
      description:
        'Luar biasa! Ketelitian analisis data, pemahaman prosedur, dan keputusan keamanan kantor Anda sangat akurat.',
    };
  }
  if (clamped >= 80) {
    return {
      title: 'Expert Staff',
      accentColor: '#54BCEB',
      bgTint: '#EDF8FD',
      description:
        'Sangat baik! Anda mampu menangani sebagian besar kasus administrasi perkantoran dengan rapi dan cepat.',
    };
  }
  if (clamped >= 70) {
    return {
      title: 'Junior Administrator',
      accentColor: '#FFCA65',
      bgTint: '#FFF7E3',
      description:
        'Cukup baik! Anda sudah memahami dasar pengelolaan data, namun masih perlu meningkatkan ketelitian pada kasus kompleks.',
    };
  }
  return {
    title: 'Trainee Administrator',
    accentColor: '#BB8AE8',
    bgTint: '#F5EEFC',
    description:
      'Terus berlatih! Pelajari kembali materi utama dan perhatikan detail dokumen sebelum mengambil tindakan.',
  };
}

export function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = Math.abs(Math.floor(seed)) || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = s % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export interface ChallengeEvaluation {
  isCorrect: boolean;
  earnedPoints: number;
  maxPoints: number;
  userAnswerSummary: string;
  correctAnswerSummary: string;
}

export function evaluateChallenge(
  challenge: Challenge,
  userAnswer: unknown
): ChallengeEvaluation {
  const maxPoints = Math.max(1, challenge.points || 10);

  switch (challenge.type) {
    case 'multiple_choice':
    case 'case_simulation': {
      const options = challenge.options ?? [];
      const correctIdx = challenge.correctIndex ?? 0;
      const chosenIdx = typeof userAnswer === 'number' ? userAnswer : -1;
      const isCorrect = chosenIdx === correctIdx && chosenIdx >= 0;
      return {
        isCorrect,
        earnedPoints: isCorrect ? maxPoints : 0,
        maxPoints,
        userAnswerSummary:
          chosenIdx >= 0 && options[chosenIdx]
            ? options[chosenIdx]
            : 'Tidak dijawab',
        correctAnswerSummary: options[correctIdx] ?? '-',
      };
    }

    case 'true_false': {
      const expected = Boolean(challenge.correctAnswer);
      const chosen = typeof userAnswer === 'boolean' ? userAnswer : null;
      const isCorrect = chosen !== null && chosen === expected;
      return {
        isCorrect,
        earnedPoints: isCorrect ? maxPoints : 0,
        maxPoints,
        userAnswerSummary:
          chosen === null ? 'Tidak dijawab' : chosen ? 'Benar' : 'Salah',
        correctAnswerSummary: expected ? 'Benar' : 'Salah',
      };
    }

    case 'drag_and_drop': {
      const items = challenge.items ?? [];
      const zones = challenge.zones ?? [];
      const placements =
        userAnswer && typeof userAnswer === 'object'
          ? (userAnswer as Record<string, string>)
          : {};
      if (items.length === 0) {
        return {
          isCorrect: true,
          earnedPoints: maxPoints,
          maxPoints,
          userAnswerSummary: '-',
          correctAnswerSummary: '-',
        };
      }
      let correctItems = 0;
      for (const item of items) {
        if (placements[item.id] === item.correctZoneId) {
          correctItems++;
        }
      }
      const ratio = correctItems / items.length;
      const earnedPoints = Math.round(maxPoints * ratio);
      const isCorrect = correctItems === items.length;
      const zoneMap = new Map(zones.map((z) => [z.id, z.label]));
      return {
        isCorrect,
        earnedPoints,
        maxPoints,
        userAnswerSummary: `${correctItems} dari ${items.length} dokumen ditempatkan tepat`,
        correctAnswerSummary: items
          .map((i) => `${i.label} -> ${zoneMap.get(i.correctZoneId) ?? i.correctZoneId}`)
          .join('; '),
      };
    }

    case 'matching': {
      const pairs = challenge.pairs ?? [];
      const mapping =
        userAnswer && typeof userAnswer === 'object'
          ? (userAnswer as Record<string, string>)
          : {};
      if (pairs.length === 0) {
        return {
          isCorrect: true,
          earnedPoints: maxPoints,
          maxPoints,
          userAnswerSummary: '-',
          correctAnswerSummary: '-',
        };
      }
      let matchedCount = 0;
      for (const pair of pairs) {
        if (mapping[pair.id] === pair.right) {
          matchedCount++;
        }
      }
      const ratio = matchedCount / pairs.length;
      return {
        isCorrect: matchedCount === pairs.length,
        earnedPoints: Math.round(maxPoints * ratio),
        maxPoints,
        userAnswerSummary: `${matchedCount} dari ${pairs.length} pasangan cocok`,
        correctAnswerSummary: pairs.map((p) => `${p.left} = ${p.right}`).join('; '),
      };
    }

    case 'ordering': {
      const expectedSteps = challenge.steps ?? [];
      const submittedIds = Array.isArray(userAnswer) ? (userAnswer as string[]) : [];
      if (expectedSteps.length === 0) {
        return {
          isCorrect: true,
          earnedPoints: maxPoints,
          maxPoints,
          userAnswerSummary: '-',
          correctAnswerSummary: '-',
        };
      }
      let exactPositions = 0;
      for (let i = 0; i < expectedSteps.length; i++) {
        if (submittedIds[i] === expectedSteps[i].id) {
          exactPositions++;
        }
      }
      const ratio = exactPositions / expectedSteps.length;
      return {
        isCorrect: exactPositions === expectedSteps.length,
        earnedPoints: Math.round(maxPoints * ratio),
        maxPoints,
        userAnswerSummary: `${exactPositions} dari ${expectedSteps.length} urutan tepat`,
        correctAnswerSummary: expectedSteps.map((s, idx) => `${idx + 1}. ${s.text}`).join(' -> '),
      };
    }

    case 'find_the_error': {
      const rows = challenge.rows ?? [];
      const selectedIds = Array.isArray(userAnswer)
        ? new Set(userAnswer as string[])
        : new Set<string>();
      const errorRows = rows.filter((r) => r.isError);
      const errorIdSet = new Set(errorRows.map((r) => r.id));

      if (errorRows.length === 0) {
        const isCorrect = selectedIds.size === 0;
        return {
          isCorrect,
          earnedPoints: isCorrect ? maxPoints : 0,
          maxPoints,
          userAnswerSummary: `${selectedIds.size} baris ditandai`,
          correctAnswerSummary: 'Tidak ada baris kesalahan',
        };
      }

      let truePositives = 0;
      let falsePositives = 0;
      selectedIds.forEach((id) => {
        if (errorIdSet.has(id)) truePositives++;
        else falsePositives++;
      });

      const rawRatio = Math.max(
        0,
        (truePositives - falsePositives * 0.5) / errorRows.length
      );
      const isCorrect =
        truePositives === errorRows.length && falsePositives === 0;
      return {
        isCorrect,
        earnedPoints: Math.round(maxPoints * Math.min(1, rawRatio)),
        maxPoints,
        userAnswerSummary: `${truePositives} temuan benar, ${falsePositives} salah tandai`,
        correctAnswerSummary: errorRows
          .map((r) => `${r.cells[0] ?? r.id} (${r.errorReason ?? 'Data salah'})`)
          .join('; '),
      };
    }

    case 'decision_making': {
      const choices = challenge.choices ?? [];
      const chosenId = typeof userAnswer === 'string' ? userAnswer : '';
      const selected = choices.find((c) => c.id === chosenId);
      const optimal = choices.find((c) => c.isOptimal) ?? choices[0];
      const scoreRatio = selected ? Math.max(0, Math.min(1, selected.scoreRatio)) : 0;
      const isCorrect = Boolean(selected?.isOptimal || scoreRatio >= 1);
      return {
        isCorrect,
        earnedPoints: Math.round(maxPoints * scoreRatio),
        maxPoints,
        userAnswerSummary: selected ? selected.label : 'Tidak ada keputusan',
        correctAnswerSummary: optimal ? optimal.label : '-',
      };
    }
  }
}

export function evaluateQuizQuestion(
  question: QuizQuestion,
  selectedIndex: number | null
): ChallengeEvaluation {
  const maxPoints = Math.max(1, question.points || 10);
  const chosen = typeof selectedIndex === 'number' ? selectedIndex : -1;
  const isCorrect = chosen === question.correctIndex && chosen >= 0;
  return {
    isCorrect,
    earnedPoints: isCorrect ? maxPoints : 0,
    maxPoints,
    userAnswerSummary:
      chosen >= 0 && question.options[chosen]
        ? question.options[chosen]
        : 'Tidak dijawab',
    correctAnswerSummary: question.options[question.correctIndex] ?? '-',
  };
}

export function getRecommendations(
  percentage: number,
  details: AttemptDetail[],
  materialTitle: string
): string[] {
  const recs: string[] = [];
  const wrongDetails = details.filter((d) => !d.isCorrect);

  if (percentage >= 90) {
    recs.push(
      `Pertahankan ketelitian Anda pada topik "${materialTitle}". Anda siap melanjutkan ke misi tingkat berikutnya.`
    );
  } else if (percentage >= 70) {
    recs.push(
      `Tinjau kembali bagian pembahasan pada ${wrongDetails.length} tantangan yang belum sempurna di "${materialTitle}".`
    );
  } else {
    recs.push(
      `Baca ulang materi "${materialTitle}" beserta tujuan pembelajarannya, lalu coba ulangi simulasi untuk meningkatkan akurasi.`
    );
  }

  if (wrongDetails.some((d) => d.typeLabel.includes('Kesalahan'))) {
    recs.push(
      'Latih ketelitian memeriksa setiap kolom data (NIP, kode, jumlah fisik vs catatan) baris demi baris.'
    );
  }
  if (wrongDetails.some((d) => d.typeLabel.includes('Keputusan'))) {
    recs.push(
      'Prioritaskan prosedur keamanan informasi dan eskalasi resmi saat menghadapi dilema akses dokumen.'
    );
  }
  if (wrongDetails.some((d) => d.typeLabel.includes('Drag') || d.typeLabel.includes('Urutkan'))) {
    recs.push(
      'Perhatikan alur standar operasional (SOP) dan sistem klasifikasi arsip sebelum menempatkan dokumen.'
    );
  }

  return recs;
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export function extractYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const watchMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/);
  if (watchMatch && watchMatch[1]) {
    return `https://www.youtube.com/embed/${watchMatch[1]}`;
  }
  return null;
}

export interface WelcomeProfile {
  eyebrow: string;
  headline: string;
  institutionLabel: string;
  roleOrRankLabel: string;
}

export function getWelcomeProfile(params: {
  name?: string;
  role: 'admin' | 'siswa';
  institution?: string;
  completedCount?: number;
  avgScore?: number;
}): WelcomeProfile {
  const safeName = params.name?.trim() || (params.role === 'admin' ? 'Guru / Admin' : 'Peserta');
  const safeInstitution =
    params.institution?.trim() ||
    (params.role === 'admin' ? 'Pengelola Office Mystery' : 'Peserta Umum');

  if (params.role === 'admin') {
    return {
      eyebrow: 'Selamat datang di Dashboard Pengajar & Admin',
      headline: `Halo, ${safeName}!`,
      institutionLabel: safeInstitution,
      roleOrRankLabel: 'Administrator / Guru Pengampu',
    };
  }

  const completed = Math.max(0, params.completedCount ?? 0);
  const rank =
    completed > 0
      ? getPredikat(params.avgScore ?? 0).title
      : 'Calon Administrator';

  return {
    eyebrow:
      completed > 0
        ? 'Selamat datang kembali, Staf Investigasi'
        : 'Selamat datang, Staf Investigasi Baru',
    headline: `Halo, ${safeName}!`,
    institutionLabel: safeInstitution,
    roleOrRankLabel: rank,
  };
}

