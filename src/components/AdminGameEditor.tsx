import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  Plus,
  Save,
  Send,
  Trash2,
} from 'lucide-react';
import { CHALLENGE_TYPE_META } from '../utils/gameLogic';
import { GameSimulator } from './GameSimulator';
import type {
  Challenge,
  ChallengeType,
  Difficulty,
  GameSimulation,
  Material,
  PublishStatus,
} from '../types';

interface AdminGameEditorProps {
  initial?: GameSimulation;
  materials: Material[];
  onCancel: () => void;
  onSave: (payload: Partial<GameSimulation>) => Promise<void>;
}

function createEmptyChallenge(type: ChallengeType, order: number): Challenge {
  const id = `ch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const base: Challenge = {
    id,
    order,
    type,
    title: `Tantangan ${order}: ${CHALLENGE_TYPE_META[type].label}`,
    prompt: 'Selesaikan kasus kantor berikut sesuai prosedur yang berlaku.',
    points: 25,
    explanation: 'Penjelasan jawaban yang benar sesuai pedoman administrasi.',
  };

  switch (type) {
    case 'multiple_choice':
      return {
        ...base,
        options: ['Pilihan A', 'Pilihan B', 'Pilihan C'],
        correctIndex: 0,
      };
    case 'true_false':
      return {
        ...base,
        statement: 'Pernyataan prosedur kerja kantor yang harus dievaluasi kebenarannya.',
        correctAnswer: true,
      };
    case 'drag_and_drop':
      return {
        ...base,
        zones: [
          { id: 'z1', label: 'Folder A (Umum)', color: '#54BCEB' },
          { id: 'z2', label: 'Folder B (Khusus)', color: '#71C98A' },
        ],
        items: [
          { id: 'i1', label: 'Dokumen Contoh 1', sublabel: 'No. 01/ADM', correctZoneId: 'z1' },
          { id: 'i2', label: 'Dokumen Contoh 2', sublabel: 'No. 02/KHS', correctZoneId: 'z2' },
        ],
      };
    case 'matching':
      return {
        ...base,
        pairs: [
          { id: 'p1', left: 'Kode KP', right: 'Kepegawaian' },
          { id: 'p2', left: 'Kode KU', right: 'Keuangan' },
        ],
      };
    case 'ordering':
      return {
        ...base,
        steps: [
          { id: 's1', text: 'Langkah 1: Terima dan periksa dokumen' },
          { id: 's2', text: 'Langkah 2: Catat ke buku agenda' },
          { id: 's3', text: 'Langkah 3: Simpan di folder klasifikasi' },
        ],
      };
    case 'find_the_error':
      return {
        ...base,
        tableTitle: 'Tabel Audit Data Kantor',
        columns: ['Kode', 'Nama', 'Status'],
        rows: [
          { id: 'r1', cells: ['A-01', 'Data Valid', 'Sesuai'], isError: false },
          {
            id: 'r2',
            cells: ['A-01', 'Data Ganda', 'Duplikat'],
            isError: true,
            errorReason: 'Kode A-01 tercatat ganda.',
          },
        ],
      };
    case 'case_simulation':
      return {
        ...base,
        dossierTitle: 'Memo Internal Kantor #01',
        dossierSender: 'Kepala Tata Usaha',
        dossierContent: 'Ringkasan kasus operasional kantor yang perlu diselesaikan staf.',
        options: ['Tindakan 1 (Tepat)', 'Tindakan 2 (Kurang Tepat)', 'Tindakan 3'],
        correctIndex: 0,
      };
    case 'decision_making':
      return {
        ...base,
        situation: 'Situasi mendesak di meja layanan / keamanan dokumen kantor.',
        impactNote: 'Keputusan memengaruhi keamanan dan kelancaran operasional.',
        choices: [
          {
            id: 'c1',
            label: 'Ikuti prosedur verifikasi resmi terlebih dahulu',
            consequence: 'Aman dan sesuai SOP.',
            scoreRatio: 1,
            isOptimal: true,
          },
          {
            id: 'c2',
            label: 'Kirim tanpa pemeriksaan agar cepat',
            consequence: 'Berisiko tinggi terjadi kesalahan atau kebocoran.',
            scoreRatio: 0,
            isOptimal: false,
          },
        ],
      };
  }
}

export function AdminGameEditor({
  initial,
  materials,
  onCancel,
  onSave,
}: AdminGameEditorProps) {
  const [title, setTitle] = useState(initial?.title || '');
  const [materialId, setMaterialId] = useState(
    initial?.materialId || materials[0]?.id || ''
  );
  const [description, setDescription] = useState(initial?.description || '');
  const [story, setStory] = useState(
    initial?.story ||
      'Kantor menghadapi kendala data yang membutuhkan ketelitian Anda sebagai staf administrasi.'
  );
  const [instructions, setInstructions] = useState(
    initial?.instructions ||
      'Baca setiap petunjuk tantangan, selesaikan tugas, dan periksa pembahasan.'
  );
  const [timerSeconds, setTimerSeconds] = useState(initial?.timerSeconds || 300);
  const [difficulty, setDifficulty] = useState<Difficulty>(
    initial?.difficulty || 'Pemula'
  );
  const [challenges, setChallenges] = useState<Challenge[]>(
    initial?.challenges?.length
      ? [...initial.challenges].sort((a, b) => a.order - b.order)
      : [createEmptyChallenge('multiple_choice', 1)]
  );
  const [newChallengeType, setNewChallengeType] =
    useState<ChallengeType>('multiple_choice');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  function addChallenge() {
    setChallenges((prev) => [
      ...prev,
      createEmptyChallenge(newChallengeType, prev.length + 1),
    ]);
  }

  function updateChallenge(index: number, patch: Partial<Challenge>) {
    setChallenges((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c))
    );
  }

  function moveChallenge(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= challenges.length) return;
    const next = [...challenges];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    setChallenges(next.map((c, idx) => ({ ...c, order: idx + 1 })));
  }

  function deleteChallenge(index: number) {
    setChallenges((prev) =>
      prev.filter((_, i) => i !== index).map((c, idx) => ({ ...c, order: idx + 1 }))
    );
  }

  async function submitWithStatus(status: PublishStatus) {
    if (!title.trim() || !materialId) {
      setError('Judul game dan materi terhubung wajib diisi.');
      return;
    }
    if (challenges.length === 0) {
      setError('Tambahkan minimal satu tantangan di dalam game.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSave({
        id: initial?.id,
        materialId,
        title: title.trim(),
        description: description.trim(),
        story: story.trim(),
        instructions: instructions.trim(),
        timerSeconds: Number(timerSeconds) || 300,
        difficulty,
        status,
        challenges: challenges.map((c, idx) => ({ ...c, order: idx + 1 })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan game.');
    } finally {
      setSaving(false);
    }
  }

  const previewGame: GameSimulation = {
    id: initial?.id || 'preview_game',
    materialId,
    title: title || 'Preview Simulasi Baru',
    description,
    story,
    instructions,
    timerSeconds,
    difficulty,
    status: 'draft',
    challenges: challenges.map((c, idx) => ({ ...c, order: idx + 1 })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (previewMode) {
    return (
      <div className="fixed inset-0 z-50 bg-[#FFF8E9] overflow-y-auto">
        <GameSimulator
          game={previewGame}
          material={materials.find((m) => m.id === materialId)}
          isPreview
          onExit={() => setPreviewMode(false)}
          onCompleteAttempt={async () => {
            setPreviewMode(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EFE7D6] shadow-sm space-y-6">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#EFE7D6]">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#182230]">
            {initial ? 'Edit Game & Simulasi' : 'Buat Game Simulasi Baru'}
          </h2>
          <p className="text-xs text-[#516072] mt-0.5">
            Pilih materi terkait lalu rangkai berbagai jenis tantangan interaktif kantor.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-[#FFF8E9] hover:bg-[#EFE7D6] text-xs font-bold cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode(true)}
            className="px-4 py-2 rounded-xl bg-[#EDF8FD] hover:bg-[#DDF2FB] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Preview Game</span>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => submitWithStatus('draft')}
            className="px-4 py-2 rounded-xl bg-[#FFCA65] hover:bg-[#F5BC4E] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Draft</span>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => submitWithStatus('published')}
            className="px-5 py-2 rounded-xl bg-[#71C98A] hover:bg-[#5BB976] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Publikasikan</span>
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-xl bg-[#FFDCE8] text-sm font-medium text-[#7A1C3D]">
          {error}
        </div>
      )}

      {/* Basic Game Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="gm-title" className="block text-sm font-semibold mb-1">
            Judul Game / Misi
          </label>
          <input
            id="gm-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Misi 5: Penyelamatan Surat Dinas"
            className="w-full px-4 py-2.5 rounded-xl border border-[#D8D0BE] text-sm"
          />
        </div>

        <div>
          <label htmlFor="gm-mat" className="block text-sm font-semibold mb-1">
            Hubungkan dengan Materi
          </label>
          <select
            id="gm-mat"
            value={materialId}
            onChange={(e) => setMaterialId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-[#D8D0BE] text-sm bg-white"
          >
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="gm-desc" className="block text-sm font-semibold mb-1">
            Deskripsi Singkat
          </label>
          <input
            id="gm-desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Deskripsi misi bagi siswa..."
            className="w-full px-4 py-2.5 rounded-xl border border-[#D8D0BE] text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="gm-timer" className="block text-sm font-semibold mb-1">
              Timer (Detik)
            </label>
            <input
              id="gm-timer"
              type="number"
              min={30}
              max={3600}
              value={timerSeconds}
              onChange={(e) => setTimerSeconds(Number(e.target.value) || 300)}
              className="w-full px-4 py-2.5 rounded-xl border border-[#D8D0BE] text-sm font-mono"
            />
          </div>
          <div>
            <label htmlFor="gm-diff" className="block text-sm font-semibold mb-1">
              Kesulitan
            </label>
            <select
              id="gm-diff"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="w-full px-4 py-2.5 rounded-xl border border-[#D8D0BE] text-sm bg-white"
            >
              <option value="Pemula">Pemula</option>
              <option value="Menengah">Menengah</option>
              <option value="Mahir">Mahir</option>
            </select>
          </div>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="gm-story" className="block text-sm font-semibold mb-1">
            Cerita / Skenario Kasus Kantor
          </label>
          <textarea
            id="gm-story"
            rows={2}
            value={story}
            onChange={(e) => setStory(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-[#D8D0BE] text-sm"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="gm-inst" className="block text-sm font-semibold mb-1">
            Instruksi Permainan
          </label>
          <input
            id="gm-inst"
            type="text"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-[#D8D0BE] text-sm"
          />
        </div>
      </div>

      {/* Challenge Builder Toolbar */}
      <div className="p-4 rounded-2xl bg-[#FFF8E9] border border-[#EFE7D6] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-base text-[#182230]">
            Daftar Tantangan ({challenges.length})
          </h3>
          <p className="text-xs text-[#516072]">
            Tambahkan berbagai tipe aktivitas interaktif dalam satu misi simulasi.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Pilih tipe tantangan"
            value={newChallengeType}
            onChange={(e) => setNewChallengeType(e.target.value as ChallengeType)}
            className="px-3 py-2 rounded-xl bg-white border border-[#D8D0BE] text-xs font-semibold"
          >
            {(Object.keys(CHALLENGE_TYPE_META) as ChallengeType[]).map((t) => (
              <option key={t} value={t}>
                {CHALLENGE_TYPE_META[t].label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addChallenge}
            className="px-4 py-2 rounded-xl bg-[#54BCEB] hover:bg-[#3FAEDB] text-xs font-bold text-[#182230] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Tantangan</span>
          </button>
        </div>
      </div>

      {/* Challenge Cards */}
      <div className="space-y-5">
        {challenges.map((ch, idx) => (
          <div
            key={ch.id}
            className="rounded-2xl border border-[#E6DEC9] bg-[#FFFDF8] p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#EFE7D6]">
              <div className="flex items-center gap-2 text-xs font-bold text-[#182230]">
                <span className="px-2.5 py-1 rounded-lg bg-[#EDF8FD] font-mono">
                  #{idx + 1}
                </span>
                <span>{CHALLENGE_TYPE_META[ch.type].label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => moveChallenge(idx, -1)}
                  aria-label="Naikkan urutan tantangan"
                  className="w-8 h-8 rounded-lg bg-white border border-[#D8D0BE] flex items-center justify-center disabled:opacity-40 cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={idx === challenges.length - 1}
                  onClick={() => moveChallenge(idx, 1)}
                  aria-label="Turunkan urutan tantangan"
                  className="w-8 h-8 rounded-lg bg-white border border-[#D8D0BE] flex items-center justify-center disabled:opacity-40 cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteChallenge(idx)}
                  aria-label="Hapus tantangan"
                  className="w-8 h-8 rounded-lg bg-[#FFDCE8]/70 text-[#9A2348] flex items-center justify-center cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-9">
                <label className="block text-xs font-semibold mb-1">Judul Tantangan</label>
                <input
                  type="text"
                  value={ch.title}
                  onChange={(e) => updateChallenge(idx, { title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#D8D0BE] text-sm"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold mb-1">Poin Skor</label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={ch.points}
                  onChange={(e) =>
                    updateChallenge(idx, { points: Number(e.target.value) || 10 })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#D8D0BE] text-sm font-mono"
                />
              </div>
              <div className="md:col-span-12">
                <label className="block text-xs font-semibold mb-1">
                  Pertanyaan / Perintah Tantangan
                </label>
                <textarea
                  rows={2}
                  value={ch.prompt}
                  onChange={(e) => updateChallenge(idx, { prompt: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#D8D0BE] text-sm"
                />
              </div>
            </div>

            {/* Type-specific Editors */}
            {(ch.type === 'multiple_choice' || ch.type === 'case_simulation') && (
              <div className="space-y-3 bg-white p-4 rounded-xl border border-[#EFE7D6]">
                {ch.type === 'case_simulation' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3 border-b border-[#EFE7D6]">
                    <input
                      type="text"
                      value={ch.dossierTitle || ''}
                      onChange={(e) => updateChallenge(idx, { dossierTitle: e.target.value })}
                      placeholder="Judul Dokumen/Memo Kasus"
                      className="px-3 py-2 rounded-lg border border-[#D8D0BE] text-xs"
                    />
                    <input
                      type="text"
                      value={ch.dossierSender || ''}
                      onChange={(e) => updateChallenge(idx, { dossierSender: e.target.value })}
                      placeholder="Pengirim Dokumen"
                      className="px-3 py-2 rounded-lg border border-[#D8D0BE] text-xs"
                    />
                    <textarea
                      rows={2}
                      value={ch.dossierContent || ''}
                      onChange={(e) => updateChallenge(idx, { dossierContent: e.target.value })}
                      placeholder="Isi memo atau kronologi kasus..."
                      className="md:col-span-2 px-3 py-2 rounded-lg border border-[#D8D0BE] text-xs"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Pilihan Jawaban (Centang yang Benar)</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateChallenge(idx, {
                        options: [...(ch.options || []), `Pilihan ${(ch.options?.length || 0) + 1}`],
                      })
                    }
                    className="text-xs font-semibold text-[#2B8CBE] cursor-pointer"
                  >
                    + Tambah Opsi
                  </button>
                </div>
                {(ch.options || []).map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct_${ch.id}`}
                      checked={ch.correctIndex === oi}
                      onChange={() => updateChallenge(idx, { correctIndex: oi })}
                      aria-label={`Tandai opsi ${oi + 1} benar`}
                    />
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const next = [...(ch.options || [])];
                        next[oi] = e.target.value;
                        updateChallenge(idx, { options: next });
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-[#D8D0BE] text-xs"
                    />
                    {(ch.options?.length || 0) > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = (ch.options || []).filter((_, i) => i !== oi);
                          updateChallenge(idx, {
                            options: next,
                            correctIndex: Math.min(ch.correctIndex || 0, next.length - 1),
                          });
                        }}
                        className="text-xs text-[#9A2348] cursor-pointer"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {ch.type === 'true_false' && (
              <div className="bg-white p-4 rounded-xl border border-[#EFE7D6] space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Pernyataan Evaluasi</label>
                  <input
                    type="text"
                    value={ch.statement || ''}
                    onChange={(e) => updateChallenge(idx, { statement: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#D8D0BE] text-xs"
                  />
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span>Kunci Jawaban:</span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={ch.correctAnswer === true}
                      onChange={() => updateChallenge(idx, { correctAnswer: true })}
                    />
                    <span>Benar</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={ch.correctAnswer === false}
                      onChange={() => updateChallenge(idx, { correctAnswer: false })}
                    />
                    <span>Salah</span>
                  </label>
                </div>
              </div>
            )}

            {ch.type === 'drag_and_drop' && (
              <div className="bg-white p-4 rounded-xl border border-[#EFE7D6] space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Folder / Zona Tujuan</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateChallenge(idx, {
                          zones: [
                            ...(ch.zones || []),
                            {
                              id: `z_${Date.now()}`,
                              label: `Folder ${(ch.zones?.length || 0) + 1}`,
                              color: '#54BCEB',
                            },
                          ],
                        })
                      }
                      className="text-xs font-semibold text-[#2B8CBE] cursor-pointer"
                    >
                      + Tambah Folder
                    </button>
                  </div>
                  {(ch.zones || []).map((z, zi) => (
                    <div key={z.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={z.label}
                        onChange={(e) => {
                          const next = [...(ch.zones || [])];
                          next[zi] = { ...z, label: e.target.value };
                          updateChallenge(idx, { zones: next });
                        }}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-[#D8D0BE] text-xs"
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Kartu Dokumen</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateChallenge(idx, {
                          items: [
                            ...(ch.items || []),
                            {
                              id: `i_${Date.now()}`,
                              label: 'Dokumen Baru',
                              correctZoneId: ch.zones?.[0]?.id || '',
                            },
                          ],
                        })
                      }
                      className="text-xs font-semibold text-[#2B8CBE] cursor-pointer"
                    >
                      + Tambah Dokumen
                    </button>
                  </div>
                  {(ch.items || []).map((item, ii) => (
                    <div key={item.id} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => {
                          const next = [...(ch.items || [])];
                          next[ii] = { ...item, label: e.target.value };
                          updateChallenge(idx, { items: next });
                        }}
                        className="px-3 py-1.5 rounded-lg border border-[#D8D0BE] text-xs"
                      />
                      <select
                        value={item.correctZoneId}
                        onChange={(e) => {
                          const next = [...(ch.items || [])];
                          next[ii] = { ...item, correctZoneId: e.target.value };
                          updateChallenge(idx, { items: next });
                        }}
                        className="px-3 py-1.5 rounded-lg border border-[#D8D0BE] text-xs bg-white"
                      >
                        {(ch.zones || []).map((z) => (
                          <option key={z.id} value={z.id}>
                            Target: {z.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ch.type === 'matching' && (
              <div className="bg-white p-4 rounded-xl border border-[#EFE7D6] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Pasangan Kiri & Kanan</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateChallenge(idx, {
                        pairs: [
                          ...(ch.pairs || []),
                          { id: `p_${Date.now()}`, left: 'Item Kiri', right: 'Pasangan Kanan' },
                        ],
                      })
                    }
                    className="text-xs font-semibold text-[#2B8CBE] cursor-pointer"
                  >
                    + Tambah Pasangan
                  </button>
                </div>
                {(ch.pairs || []).map((pair, pi) => (
                  <div key={pair.id} className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={pair.left}
                      onChange={(e) => {
                        const next = [...(ch.pairs || [])];
                        next[pi] = { ...pair, left: e.target.value };
                        updateChallenge(idx, { pairs: next });
                      }}
                      className="px-3 py-1.5 rounded-lg border border-[#D8D0BE] text-xs"
                    />
                    <input
                      type="text"
                      value={pair.right}
                      onChange={(e) => {
                        const next = [...(ch.pairs || [])];
                        next[pi] = { ...pair, right: e.target.value };
                        updateChallenge(idx, { pairs: next });
                      }}
                      className="px-3 py-1.5 rounded-lg border border-[#D8D0BE] text-xs"
                    />
                  </div>
                ))}
              </div>
            )}

            {ch.type === 'ordering' && (
              <div className="bg-white p-4 rounded-xl border border-[#EFE7D6] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Urutan Langkah Benar (1 → Akhir)</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateChallenge(idx, {
                        steps: [
                          ...(ch.steps || []),
                          { id: `s_${Date.now()}`, text: `Langkah ${(ch.steps?.length || 0) + 1}` },
                        ],
                      })
                    }
                    className="text-xs font-semibold text-[#2B8CBE] cursor-pointer"
                  >
                    + Tambah Langkah
                  </button>
                </div>
                {(ch.steps || []).map((st, si) => (
                  <div key={st.id} className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold w-6">{si + 1}.</span>
                    <input
                      type="text"
                      value={st.text}
                      onChange={(e) => {
                        const next = [...(ch.steps || [])];
                        next[si] = { ...st, text: e.target.value };
                        updateChallenge(idx, { steps: next });
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-[#D8D0BE] text-xs"
                    />
                  </div>
                ))}
              </div>
            )}

            {ch.type === 'find_the_error' && (
              <div className="bg-white p-4 rounded-xl border border-[#EFE7D6] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={ch.tableTitle || ''}
                    onChange={(e) => updateChallenge(idx, { tableTitle: e.target.value })}
                    placeholder="Judul Tabel"
                    className="px-3 py-1.5 rounded-lg border border-[#D8D0BE] text-xs"
                  />
                  <input
                    type="text"
                    value={(ch.columns || []).join(', ')}
                    onChange={(e) =>
                      updateChallenge(idx, {
                        columns: e.target.value.split(',').map((s) => s.trim()),
                      })
                    }
                    placeholder="Kolom dipisah koma (misal: NIP, Nama, Status)"
                    className="px-3 py-1.5 rounded-lg border border-[#D8D0BE] text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Baris Data (Centang jika Baris Salah/Ganda)</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateChallenge(idx, {
                        rows: [
                          ...(ch.rows || []),
                          {
                            id: `r_${Date.now()}`,
                            cells: (ch.columns || ['Col1', 'Col2', 'Col3']).map(() => 'Data'),
                            isError: false,
                          },
                        ],
                      })
                    }
                    className="text-xs font-semibold text-[#2B8CBE] cursor-pointer"
                  >
                    + Tambah Baris
                  </button>
                </div>
                {(ch.rows || []).map((row, ri) => (
                  <div key={row.id} className="p-2.5 rounded-xl bg-[#FFF8E9] space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1 text-xs font-bold">
                        <input
                          type="checkbox"
                          checked={row.isError}
                          onChange={(e) => {
                            const next = [...(ch.rows || [])];
                            next[ri] = { ...row, isError: e.target.checked };
                            updateChallenge(idx, { rows: next });
                          }}
                        />
                        <span>Baris Salah</span>
                      </label>
                      <input
                        type="text"
                        value={row.cells.join(' | ')}
                        onChange={(e) => {
                          const next = [...(ch.rows || [])];
                          next[ri] = {
                            ...row,
                            cells: e.target.value.split('|').map((s) => s.trim()),
                          };
                          updateChallenge(idx, { rows: next });
                        }}
                        placeholder="Isi kolom dipisah |"
                        className="flex-1 px-2.5 py-1 rounded-lg bg-white border border-[#D8D0BE] text-xs font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {ch.type === 'decision_making' && (
              <div className="bg-white p-4 rounded-xl border border-[#EFE7D6] space-y-3">
                <input
                  type="text"
                  value={ch.situation || ''}
                  onChange={(e) => updateChallenge(idx, { situation: e.target.value })}
                  placeholder="Konteks situasi lapangan..."
                  className="w-full px-3 py-1.5 rounded-lg border border-[#D8D0BE] text-xs"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Pilihan Keputusan</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateChallenge(idx, {
                        choices: [
                          ...(ch.choices || []),
                          {
                            id: `dec_${Date.now()}`,
                            label: 'Pilihan Keputusan Baru',
                            consequence: 'Dampak tindakan',
                            scoreRatio: 0,
                            isOptimal: false,
                          },
                        ],
                      })
                    }
                    className="text-xs font-semibold text-[#2B8CBE] cursor-pointer"
                  >
                    + Tambah Keputusan
                  </button>
                </div>
                {(ch.choices || []).map((dc, di) => (
                  <div key={dc.id} className="p-2.5 rounded-xl bg-[#FFF8E9] space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`opt_${ch.id}`}
                        checked={dc.isOptimal}
                        onChange={() => {
                          const next = (ch.choices || []).map((item, j) => ({
                            ...item,
                            isOptimal: j === di,
                            scoreRatio: j === di ? 1 : 0,
                          }));
                          updateChallenge(idx, { choices: next });
                        }}
                        aria-label="Keputusan paling tepat"
                      />
                      <input
                        type="text"
                        value={dc.label}
                        onChange={(e) => {
                          const next = [...(ch.choices || [])];
                          next[di] = { ...dc, label: e.target.value };
                          updateChallenge(idx, { choices: next });
                        }}
                        className="flex-1 px-2.5 py-1 rounded-lg bg-white border border-[#D8D0BE] text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1">
                Pembahasan Jawaban
              </label>
              <input
                type="text"
                value={ch.explanation}
                onChange={(e) => updateChallenge(idx, { explanation: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#D8D0BE] text-xs"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
