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

export interface OfficeIntegrityState {
  percentage: number;
  label: 'Prima' | 'Waspada' | 'Kritis';
}

export function computeOfficeIntegrity(
  checkedResults: boolean[]
): OfficeIntegrityState {
  let score = 100;
  for (const isCorrect of checkedResults) {
    if (isCorrect) {
      score = Math.min(100, score + 10);
    } else {
      score = Math.max(20, score - 22);
    }
  }
  const label: OfficeIntegrityState['label'] =
    score >= 80 ? 'Prima' : score >= 50 ? 'Waspada' : 'Kritis';
  return { percentage: score, label };
}

export interface NpcDispatch {
  npcName: string;
  npcRole: string;
  npcAvatarId: string;
  message: string;
  replyClue: string;
  mood: 'info' | 'active' | 'success' | 'warning';
}

export function getNpcDispatch(
  challenge: Challenge,
  context: {
    isChecked: boolean;
    isCorrect?: boolean;
    answered: boolean;
    streak: number;
  }
): NpcDispatch {
  const personaByType: Record<
    Challenge['type'],
    { name: string; role: string; avatar: string; opener: string; clue: string }
  > = {
    drag_and_drop: {
      name: 'Bu Laras',
      role: 'Kepala Unit Kearsipan',
      avatar: 'detective_mint',
      opener:
        'Tumpukan berkas baru saja tiba di meja sortir! Tolong pisahkan ke laci map yang tepat sebelum jam audit.',
      clue: 'Lihat kode divisi atau jenis transaksi di sub-label tiap berkas sebelum memasukkannya ke laci.',
    },
    find_the_error: {
      name: 'Pak Hendra',
      role: 'Auditor Data Kantor',
      avatar: 'detective_yellow',
      opener:
        'Ada laporan selisih data masuk di tabel pusat! Tandai semua baris yang ganjil dengan pemindai audit.',
      clue: 'Bandingkan kolom identitas (NIP/kode) dan hitung ulang selisih jumlah catatan vs kondisi fisik.',
    },
    matching: {
      name: 'Raka Pratama',
      role: 'Koordinator Sistem Arsip',
      avatar: 'detective_blue',
      opener:
        'Kabel indeks sistem penyimpanan sedang terputus! Sambungkan setiap berkas ke jalur metode yang benar.',
      clue: 'Perhatikan kata kunci: tanggal (kronologis), kota/cabang (wilayah), atau nama (abjad).',
    },
    ordering: {
      name: 'Bu Laras',
      role: 'Kepala Unit Kearsipan',
      avatar: 'detective_mint',
      opener:
        'Alur SOP di ruang administrasi sempat tertukar! Susun ulang stasiun kerja dari tahap ke-1 sampai akhir.',
      clue: 'SOP kantor selalu berurutan dari penerimaan/verifikasi awal, pencatatan indeks, hingga penyimpanan.',
    },
    decision_making: {
      name: 'Sinta Wijaya',
      role: 'Manajer Keamanan Informasi',
      avatar: 'detective_purple',
      opener:
        'Situasi genting di ruang kontrol! Keputusan Anda akan langsung memengaruhi keamanan dan integritas data kantor.',
      clue: 'Selalu utamakan verifikasi resmi, prinsip hak akses minimum, dan jalur eskalasi atasan.',
    },
    case_simulation: {
      name: 'Dina Kusuma',
      role: 'Sekretaris Direksi',
      avatar: 'detective_mentor',
      opener:
        `Memo mendesak baru masuk dari ${challenge.dossierSender || 'Unit Terkait'}. Periksa isinya sebelum memberi disposisi!`,
      clue: 'Cocokkan inti masalah pada memo dengan tindakan administratif yang paling akuntabel.',
    },
    true_false: {
      name: 'Pak Hendra',
      role: 'Auditor Data Kantor',
      avatar: 'detective_yellow',
      opener:
        'Ada pernyataan prosedur yang beredar di grup staf. Pastikan apakah pernyataan itu sah secara SOP atau justru berisiko!',
      clue: 'Jika suatu tindakan membuka celah kebocoran data atau melewatkan pencatatan resmi, nilainya SALAH.',
    },
    multiple_choice: {
      name: 'Dina Kusuma',
      role: 'Sekretaris Direksi',
      avatar: 'detective_mentor',
      opener:
        'Kasus operasional butuh keputusan cepat dan akurat. Analisis bukti di layar lalu pilih langkah terbaik!',
      clue: 'Eliminasi opsi yang terburu-buru atau tidak terdokumentasi secara resmi.',
    },
  };

  const p = personaByType[challenge.type];

  if (context.isChecked) {
    if (context.isCorrect) {
      return {
        npcName: p.name,
        npcRole: p.role,
        npcAvatarId: p.avatar,
        message:
          context.streak >= 2
            ? `Mantap! Berkas tertangani mulus dengan Kombo x${context.streak}. Tim kantor makin percaya pada ketelitian Anda!`
            : 'Kerja rapi! Kasus ini terselesaikan sesuai standar SOP kantor.',
        replyClue: p.clue,
        mood: 'success',
      };
    }
    return {
      npcName: p.name,
      npcRole: p.role,
      npcAvatarId: p.avatar,
      message:
        'Ups, ada catatan koreksi dari tim audit! Pelajari pembahasannya sebentar agar kasus berikutnya lebih akurat.',
      replyClue: p.clue,
      mood: 'warning',
    };
  }

  if (context.answered) {
    return {
      npcName: p.name,
      npcRole: p.role,
      npcAvatarId: p.avatar,
      message:
        'Pilihan sudah terpasang di meja kerja. Jika sudah yakin, tekan "Periksa & Stempel Kasus" sekarang!',
      replyClue: p.clue,
      mood: 'active',
    };
  }

  return {
    npcName: p.name,
    npcRole: p.role,
    npcAvatarId: p.avatar,
    message: p.opener,
    replyClue: p.clue,
    mood: 'info',
  };
}

export interface SmartScanResult {
  eliminatedOptionIndices: number[];
  eliminatedChoiceIds: string[];
  flaggedErrorRowId?: string;
  revealedDragItem?: { itemId: string; zoneId: string };
  revealedPair?: { pairId: string; right: string };
  lockedFirstStepId?: string;
  scanMessage: string;
}

export function applySmartScanner(
  challenge: Challenge,
  currentAnswer: unknown
): SmartScanResult {
  switch (challenge.type) {
    case 'multiple_choice':
    case 'case_simulation': {
      const opts = challenge.options ?? [];
      const correctIdx = challenge.correctIndex ?? 0;
      const wrongIndices = opts
        .map((_, idx) => idx)
        .filter((idx) => idx !== correctIdx)
        .slice(0, opts.length >= 4 ? 2 : 1);
      return {
        eliminatedOptionIndices: wrongIndices,
        eliminatedChoiceIds: [],
        scanMessage: `Pemindai Cerdas menyingkirkan ${wrongIndices.length} opsi yang tidak sesuai SOP!`,
      };
    }
    case 'decision_making': {
      const choices = challenge.choices ?? [];
      const wrongChoiceIds = choices
        .filter((c) => !c.isOptimal && c.scoreRatio < 1)
        .sort((a, b) => a.scoreRatio - b.scoreRatio)
        .slice(0, 1)
        .map((c) => c.id);
      return {
        eliminatedOptionIndices: [],
        eliminatedChoiceIds: wrongChoiceIds,
        scanMessage:
          'Pemindai Risiko menandai 1 opsi keputusan yang berisiko tinggi bagi kantor!',
      };
    }
    case 'find_the_error': {
      const selected = new Set(Array.isArray(currentAnswer) ? (currentAnswer as string[]) : []);
      const unflaggedError = (challenge.rows ?? []).find(
        (r) => r.isError && !selected.has(r.id)
      );
      if (unflaggedError) {
        return {
          eliminatedOptionIndices: [],
          eliminatedChoiceIds: [],
          flaggedErrorRowId: unflaggedError.id,
          scanMessage: `Pemindai Audit menemukan 1 baris anomali: "${unflaggedError.cells[0] || unflaggedError.id}"!`,
        };
      }
      return {
        eliminatedOptionIndices: [],
        eliminatedChoiceIds: [],
        scanMessage: 'Semua baris bermasalah sudah ditandai pada tabel audit!',
      };
    }
    case 'drag_and_drop': {
      const currentMap =
        currentAnswer && typeof currentAnswer === 'object'
          ? (currentAnswer as Record<string, string>)
          : {};
      const nextItem = (challenge.items ?? []).find(
        (item) => currentMap[item.id] !== item.correctZoneId
      );
      if (nextItem) {
        return {
          eliminatedOptionIndices: [],
          eliminatedChoiceIds: [],
          revealedDragItem: { itemId: nextItem.id, zoneId: nextItem.correctZoneId },
          scanMessage: `Asisten Sortir memasukkan "${nextItem.label}" ke laci yang tepat!`,
        };
      }
      return {
        eliminatedOptionIndices: [],
        eliminatedChoiceIds: [],
        scanMessage: 'Semua dokumen sudah berada di laci yang benar!',
      };
    }
    case 'matching': {
      const currentMap =
        currentAnswer && typeof currentAnswer === 'object'
          ? (currentAnswer as Record<string, string>)
          : {};
      const nextPair = (challenge.pairs ?? []).find(
        (pair) => currentMap[pair.id] !== pair.right
      );
      if (nextPair) {
        return {
          eliminatedOptionIndices: [],
          eliminatedChoiceIds: [],
          revealedPair: { pairId: nextPair.id, right: nextPair.right },
          scanMessage: `Kabel Data menghubungkan "${nextPair.left}" dengan pasangannya!`,
        };
      }
      return {
        eliminatedOptionIndices: [],
        eliminatedChoiceIds: [],
        scanMessage: 'Seluruh jalur pasangan sudah tersambung dengan tepat!',
      };
    }
    case 'ordering': {
      const steps = challenge.steps ?? [];
      if (steps.length > 0) {
        return {
          eliminatedOptionIndices: [],
          eliminatedChoiceIds: [],
          lockedFirstStepId: steps[0].id,
          scanMessage: `Pemindai SOP menempatkan tahap ke-1: "${steps[0].text}"!`,
        };
      }
      return {
        eliminatedOptionIndices: [],
        eliminatedChoiceIds: [],
        scanMessage: 'Urutan SOP siap diperiksa.',
      };
    }
    case 'true_false':
    default: {
      const hintLabel = challenge.correctAnswer ? 'BENAR' : 'SALAH';
      return {
        eliminatedOptionIndices: [],
        eliminatedChoiceIds: [],
        scanMessage: `Petunjuk Pemindai: Berdasarkan audit SOP, pernyataan ini condong ke "${hintLabel}".`,
      };
    }
  }
}

export function calculateSpeedBonus(
  caseElapsedSeconds: number,
  isCorrect: boolean
): number {
  if (!isCorrect) return 0;
  if (caseElapsedSeconds <= 15) return 10;
  if (caseElapsedSeconds <= 30) return 5;
  return 0;
}

