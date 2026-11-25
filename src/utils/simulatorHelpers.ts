import type { Challenge } from '../types';
import { evaluateChallenge } from './gameLogic';

export interface LiveSimulationStats {
  earnedPoints: number;
  maxCheckedPoints: number;
  totalPossiblePoints: number;
  checkedCount: number;
  correctCount: number;
  answeredCount: number;
}

export function isChallengeAnswered(
  challenge: Challenge,
  answer: unknown
): boolean {
  if (answer === undefined || answer === null) return false;

  switch (challenge.type) {
    case 'multiple_choice':
    case 'case_simulation':
      return typeof answer === 'number' && answer >= 0;
    case 'true_false':
      return typeof answer === 'boolean';
    case 'drag_and_drop':
      return (
        typeof answer === 'object' &&
        Object.keys(answer as Record<string, string>).length > 0
      );
    case 'matching':
      return (
        typeof answer === 'object' &&
        Object.keys(answer as Record<string, string>).length > 0
      );
    case 'ordering':
      return Array.isArray(answer) && answer.length > 0;
    case 'find_the_error':
      return Array.isArray(answer) && answer.length > 0;
    case 'decision_making':
      return typeof answer === 'string' && answer.length > 0;
  }
}

export function computeLiveSimulationStats(
  challenges: Challenge[],
  answers: Record<string, unknown>,
  checkedMap: Record<string, boolean>
): LiveSimulationStats {
  let earnedPoints = 0;
  let maxCheckedPoints = 0;
  let totalPossiblePoints = 0;
  let checkedCount = 0;
  let correctCount = 0;
  let answeredCount = 0;

  for (const ch of challenges) {
    const pts = Math.max(1, ch.points || 10);
    totalPossiblePoints += pts;

    if (isChallengeAnswered(ch, answers[ch.id])) {
      answeredCount++;
    }

    if (checkedMap[ch.id]) {
      checkedCount++;
      maxCheckedPoints += pts;
      const res = evaluateChallenge(ch, answers[ch.id]);
      earnedPoints += res.earnedPoints;
      if (res.isCorrect) {
        correctCount++;
      }
    }
  }

  return {
    earnedPoints,
    maxCheckedPoints,
    totalPossiblePoints,
    checkedCount,
    correctCount,
    answeredCount,
  };
}

export function getStreakReaction(
  streak: number,
  isCorrect: boolean,
  earnedPoints: number
): string {
  if (!isCorrect) {
    return earnedPoints > 0
      ? 'Sebagian benar! Perhatikan detail kasus berikut agar skor maksimal.'
      : 'Belum tepat, tapi setiap temuan adalah petunjuk berharga untuk kasus berikutnya.';
  }
  if (streak >= 4) return `Kombo Detektif x${streak}! Ketelitian luar biasa!`;
  if (streak === 3) return 'Hattrick x3! Analisis Anda sangat tajam!';
  if (streak === 2) return 'Kombo x2! Pertahankan fokus investigasi!';
  return 'Tepat sasaran! Data berhasil diselamatkan!';
}

export function getChallengeHint(challenge: Challenge): string {
  switch (challenge.type) {
    case 'find_the_error': {
      const errorCount = (challenge.rows ?? []).filter((r) => r.isError).length;
      return `Petunjuk Audit: Terdapat tepat ${errorCount} baris data yang bermasalah pada tabel ini. Periksa kesamaan nomor induk, selisih angka, atau format kode secara teliti.`;
    }
    case 'drag_and_drop': {
      const items = challenge.items ?? [];
      const zones = challenge.zones ?? [];
      if (items.length > 0 && zones.length > 0) {
        const first = items[0];
        const targetZone = zones.find((z) => z.id === first.correctZoneId);
        if (targetZone) {
          return `Petunjuk Klasifikasi: Dokumen "${first.label}" seharusnya masuk ke kategori "${targetZone.label}". Gunakan logika yang sama untuk dokumen lainnya.`;
        }
      }
      return 'Petunjuk Klasifikasi: Baca sub-label tiap dokumen dan cocokkan dengan fungsi utama setiap folder tujuan.';
    }
    case 'matching': {
      const firstPair = challenge.pairs?.[0];
      if (firstPair) {
        return `Petunjuk Koneksi: Item pertama "${firstPair.left}" berpasangan dengan "${firstPair.right}".`;
      }
      return 'Petunjuk Koneksi: Hubungkan pasangan satu per satu berdasarkan fungsi administrasi atau tingkat kerahasiaannya.';
    }
    case 'ordering': {
      const firstStep = challenge.steps?.[0];
      if (firstStep) {
        return `Petunjuk SOP: Langkah pertama (urutan ke-1) dalam prosedur ini adalah "${firstStep.text}".`;
      }
      return 'Petunjuk SOP: Pikirkan alur kronologis mulai dari penerimaan/identifikasi hingga pencatatan & penyimpanan akhir.';
    }
    case 'decision_making': {
      if (challenge.impactNote) {
        return `Petunjuk Risiko: ${challenge.impactNote}. Pilih tindakan yang paling aman secara prosedur dan meminimalkan kebocoran data.`;
      }
      return 'Petunjuk Risiko: Utamakan kepatuhan SOP, verifikasi resmi atasan, dan perlindungan informasi sensitif.';
    }
    case 'case_simulation': {
      return `Petunjuk Kasus: Perhatikan pengirim "${challenge.dossierSender || 'Unit Terkait'}" dan detail inti pada memo sebelum memilih langkah paling prosedural.`;
    }
    case 'true_false': {
      return 'Petunjuk Analisis: Uji apakah pernyataan tersebut melanggar prinsip keamanan informasi, kearsipan, atau ketelitian pencatatan.';
    }
    case 'multiple_choice':
    default: {
      return 'Petunjuk Detektif: Eliminasi pilihan yang tidak sesuai SOP resmi kantor, lalu pilih solusi yang paling terukur dan aman.';
    }
  }
}

export interface VisualSceneSummary {
  sceneTitle: string;
  statusLabel: string;
  statusTone: 'neutral' | 'active' | 'success' | 'warning';
  completionRatio: number;
}

export function getVisualSceneSummary(
  challenge: Challenge,
  answer: unknown,
  isChecked: boolean,
  isCorrect?: boolean
): VisualSceneSummary {
  const titleByType: Record<Challenge['type'], string> = {
    drag_and_drop: 'Ruang Sortir & Kabinet Arsip',
    find_the_error: 'Monitor Audit & Pemindai Tabel',
    matching: 'Papan Diagram Koneksi Data',
    ordering: 'Jalur Alur Kerja SOP Kantor',
    case_simulation: 'Meja Memo & Surat Masuk Kantor',
    decision_making: 'Ruang Kontrol Keamanan Data',
    true_false: 'Meja Pemeriksaan Kepatuhan SOP',
    multiple_choice: 'Meja Analisis Staf Administrasi',
  };

  const sceneTitle = titleByType[challenge.type];

  if (isChecked) {
    return {
      sceneTitle,
      statusLabel: isCorrect ? 'Terverifikasi Tepat' : 'Perlu Koreksi',
      statusTone: isCorrect ? 'success' : 'warning',
      completionRatio: 1,
    };
  }

  switch (challenge.type) {
    case 'drag_and_drop': {
      const total = challenge.items?.length ?? 0;
      const placed =
        answer && typeof answer === 'object'
          ? Object.keys(answer as Record<string, string>).length
          : 0;
      return {
        sceneTitle,
        statusLabel: `${placed}/${total} Berkas Masuk Kabinet`,
        statusTone: placed > 0 ? 'active' : 'neutral',
        completionRatio: total > 0 ? placed / total : 0,
      };
    }
    case 'matching': {
      const total = challenge.pairs?.length ?? 0;
      const linked =
        answer && typeof answer === 'object'
          ? Object.keys(answer as Record<string, string>).length
          : 0;
      return {
        sceneTitle,
        statusLabel: `${linked}/${total} Jalur Terhubung`,
        statusTone: linked > 0 ? 'active' : 'neutral',
        completionRatio: total > 0 ? linked / total : 0,
      };
    }
    case 'find_the_error': {
      const total = challenge.rows?.length ?? 0;
      const flagged = Array.isArray(answer) ? answer.length : 0;
      return {
        sceneTitle,
        statusLabel:
          flagged > 0 ? `${flagged} Baris Ditandai Audit` : 'Siap Memindai Data',
        statusTone: flagged > 0 ? 'active' : 'neutral',
        completionRatio: total > 0 ? Math.min(1, flagged / Math.max(1, total / 2)) : 0,
      };
    }
    case 'ordering': {
      const total = challenge.steps?.length ?? 0;
      const arranged = Array.isArray(answer) ? answer.length : 0;
      return {
        sceneTitle,
        statusLabel: `${arranged} Tahap SOP Tersedia`,
        statusTone: arranged > 0 ? 'active' : 'neutral',
        completionRatio: total > 0 ? arranged / total : 0,
      };
    }
    default: {
      const answered = isChallengeAnswered(challenge, answer);
      return {
        sceneTitle,
        statusLabel: answered ? 'Keputusan Dipilih' : 'Menunggu Analisis Anda',
        statusTone: answered ? 'active' : 'neutral',
        completionRatio: answered ? 1 : 0,
      };
    }
  }
}
