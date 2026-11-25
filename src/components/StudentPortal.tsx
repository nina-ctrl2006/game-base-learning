import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  FileText,
  Gamepad2,
  LogOut,
  PlayCircle,
  Search,
  Target,
} from 'lucide-react';
import { AVATAR_OPTIONS, DetectiveAvatar, SafeImage } from './Avatars';
import { RichTextRenderer } from './RichTextRenderer';
import { extractYouTubeEmbedUrl, getPredikat, getWelcomeProfile } from '../utils/gameLogic';
import type {
  AttemptRecord,
  Category,
  GameSimulation,
  Material,
  MaterialProgress,
  PublicUser,
  Quiz,
} from '../types';

export type StudentTab = 'beranda' | 'materi' | 'riwayat';

interface StudentPortalProps {
  user: PublicUser;
  categories: Category[];
  materials: Material[];
  games: GameSimulation[];
  quizzes: Quiz[];
  progress: MaterialProgress[];
  attempts: AttemptRecord[];
  activeTab: StudentTab;
  selectedMaterialId: string | null;
  onChangeTab: (tab: StudentTab) => void;
  onSelectMaterial: (materialId: string | null) => void;
  onMarkMaterialRead: (materialId: string, read: boolean) => Promise<void>;
  onStartGame: (gameId: string) => void;
  onStartQuiz: (quizId: string) => void;
  onOpenAttemptResult: (attempt: AttemptRecord) => void;
  onChangeAvatar: (avatarId: string) => Promise<void>;
  onLogout: () => void;
}

export function MaterialDetailBody({
  material,
  category,
  linkedGames,
  linkedQuizzes,
  progressItem,
  isPreview = false,
  onMarkRead,
  onStartGame,
  onStartQuiz,
  onPrevMaterial,
  onNextMaterial,
}: {
  material: Material;
  category?: Category;
  linkedGames: GameSimulation[];
  linkedQuizzes: Quiz[];
  progressItem?: MaterialProgress;
  isPreview?: boolean;
  onMarkRead?: () => void;
  onStartGame?: (gameId: string) => void;
  onStartQuiz?: (quizId: string) => void;
  onPrevMaterial?: () => void;
  onNextMaterial?: () => void;
}) {
  const youtubeEmbed = extractYouTubeEmbedUrl(material.videoUrl);

  return (
    <div className="space-y-6">
      {/* Material Header Card */}
      <div className="bg-white rounded-3xl overflow-hidden border border-[#EFE7D6] shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-5 min-h-[220px] bg-[#FFF8E9]">
            <SafeImage
              src={material.imageUrl}
              alt={material.title}
              title={material.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#516072] mb-2">
                <span
                  className="w-2.5 h-2.5 rounded-sm inline-block"
                  style={{ backgroundColor: category?.color || '#54BCEB' }}
                />
                <span>{category?.name || 'Administrasi Perkantoran'}</span>
                <span aria-hidden="true">·</span>
                <span>Tingkat {material.difficulty}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{material.estimatedMinutes} menit belajar</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#182230]">
                {material.title}
              </h1>
              <p className="mt-3 text-sm sm:text-[15px] text-[#516072] leading-relaxed">
                {material.description}
              </p>
            </div>

            {!isPreview && (
              <div className="mt-6 pt-4 border-t border-[#EFE7D6] flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onMarkRead}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer ${
                    progressItem?.materialRead
                      ? 'bg-[#EEF9F1] text-[#1F7A3E] border border-[#71C98A]'
                      : 'bg-[#FFCA65] hover:bg-[#F5BC4E] text-[#182230]'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {progressItem?.materialRead
                      ? 'Materi Sudah Dipelajari'
                      : 'Tandai Selesai Dipelajari'}
                  </span>
                </button>

                {linkedGames.length > 0 && onStartGame && (
                  <button
                    type="button"
                    onClick={() => onStartGame(linkedGames[0].id)}
                    className="px-5 py-2.5 rounded-xl bg-[#54BCEB] hover:bg-[#3FAEDB] text-[#182230] font-bold text-sm inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Gamepad2 className="w-4 h-4" />
                    <span>Mulai Simulasi</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content + Sidebar Objectives */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EFE7D6] shadow-sm">
            <RichTextRenderer content={material.content} />
          </div>

          {/* PDF Section if present */}
          {material.pdfUrl && (
            <div className="bg-white rounded-3xl p-6 border border-[#EFE7D6] shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#FFDCE8] flex items-center justify-center text-[#182230]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-[#182230]">
                      Dokumen Pendukung (PDF)
                    </h2>
                    <p className="text-xs text-[#516072]">
                      {material.pdfName || 'Lampiran Materi PDF'}
                    </p>
                  </div>
                </div>
                <a
                  href={material.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={material.pdfName || 'materi.pdf'}
                  className="px-4 py-2 rounded-xl bg-[#EDF8FD] hover:bg-[#DDF2FB] text-[#182230] text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh PDF</span>
                </a>
              </div>
              <div className="rounded-2xl overflow-hidden border border-[#EFE7D6] bg-[#FFF8E9] h-[380px]">
                <iframe
                  title={`Dokumen PDF ${material.title}`}
                  src={material.pdfUrl}
                  className="w-full h-full"
                />
              </div>
            </div>
          )}

          {/* Video Section if present */}
          {material.videoUrl && (
            <div className="bg-white rounded-3xl p-6 border border-[#EFE7D6] shadow-sm space-y-3">
              <h2 className="font-display text-base font-bold text-[#182230] flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-[#54BCEB]" />
                <span>Video Pembelajaran</span>
              </h2>
              {youtubeEmbed ? (
                <div className="aspect-video rounded-2xl overflow-hidden border border-[#EFE7D6]">
                  <iframe
                    title={`Video ${material.title}`}
                    src={youtubeEmbed}
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
              ) : (
                <a
                  href={material.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EDF8FD] text-sm font-semibold text-[#182230] hover:underline"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>Buka Tautan Video Pembelajaran</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Objectives, Key Points, Linked Activities */}
        <aside className="lg:col-span-4 space-y-5">
          {material.objectives.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-[#EFE7D6] shadow-sm">
              <h2 className="font-display text-base font-bold text-[#182230] flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-[#54BCEB]" />
                <span>Tujuan Pembelajaran</span>
              </h2>
              <ul className="space-y-2.5 text-sm text-[#2F3B4B]">
                {material.objectives.map((obj, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="font-mono text-xs font-bold text-[#2B8CBE] mt-0.5">
                      {idx + 1}.
                    </span>
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {material.keyPoints.length > 0 && (
            <div className="bg-[#FFF8E9] rounded-3xl p-6 border border-[#EFE7D6]">
              <h2 className="font-display text-base font-bold text-[#182230] mb-3">
                Poin Penting
              </h2>
              <ul className="space-y-2 text-sm text-[#2F3B4B] list-disc pl-4">
                {material.keyPoints.map((kp, idx) => (
                  <li key={idx}>{kp}</li>
                ))}
              </ul>
            </div>
          )}

          {!isPreview && (
            <div className="bg-white rounded-3xl p-6 border border-[#EFE7D6] shadow-sm space-y-4">
              <h2 className="font-display text-base font-bold text-[#182230]">
                Praktik & Evaluasi Materi
              </h2>
              {linkedGames.length > 0 ? (
                <div className="space-y-2.5">
                  {linkedGames.map((g) => (
                    <div
                      key={g.id}
                      className="p-4 rounded-2xl bg-[#EDF8FD] border border-[#D4ECF8] space-y-2"
                    >
                      <p className="font-display font-bold text-sm text-[#182230]">
                        {g.title}
                      </p>
                      <p className="text-xs text-[#516072]">
                        {g.challenges.length} tantangan · {Math.round(g.timerSeconds / 60)} menit
                      </p>
                      <button
                        type="button"
                        onClick={() => onStartGame?.(g.id)}
                        className="w-full py-2.5 rounded-xl bg-[#54BCEB] hover:bg-[#3FAEDB] text-[#182230] font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Gamepad2 className="w-4 h-4" />
                        <span>Mulai Simulasi</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#516072]">
                  Belum ada game simulasi yang terhubung ke materi ini.
                </p>
              )}

              {linkedQuizzes.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-[#EFE7D6]">
                  {linkedQuizzes.map((q) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-2xl bg-[#EEF9F1] border border-[#CBEBD4] space-y-2"
                    >
                      <p className="font-display font-bold text-sm text-[#182230]">
                        {q.title}
                      </p>
                      <p className="text-xs text-[#516072]">
                        {q.questions.length} soal · Nilai lulus {q.passingScore}%
                      </p>
                      <button
                        type="button"
                        onClick={() => onStartQuiz?.(q.id)}
                        className="w-full py-2.5 rounded-xl bg-[#71C98A] hover:bg-[#5BB976] text-[#182230] font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ClipboardCheck className="w-4 h-4" />
                        <span>Kerjakan Kuis</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* Prev / Next Material Nav */}
      {!isPreview && (onPrevMaterial || onNextMaterial) && (
        <div className="flex items-center justify-between gap-4 pt-2">
          <button
            type="button"
            disabled={!onPrevMaterial}
            onClick={onPrevMaterial}
            className="px-4 py-2.5 rounded-xl bg-white border border-[#EFE7D6] text-sm font-semibold text-[#182230] inline-flex items-center gap-2 disabled:opacity-40 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Materi Sebelumnya</span>
          </button>
          <button
            type="button"
            disabled={!onNextMaterial}
            onClick={onNextMaterial}
            className="px-4 py-2.5 rounded-xl bg-white border border-[#EFE7D6] text-sm font-semibold text-[#182230] inline-flex items-center gap-2 disabled:opacity-40 cursor-pointer"
          >
            <span>Materi Selanjutnya</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export function StudentPortal({
  user,
  categories,
  materials,
  games,
  quizzes,
  progress,
  attempts,
  activeTab,
  selectedMaterialId,
  onChangeTab,
  onSelectMaterial,
  onMarkMaterialRead,
  onStartGame,
  onStartQuiz,
  onOpenAttemptResult,
  onChangeAvatar,
  onLogout,
}: StudentPortalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const catMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const progressMap = useMemo(() => {
    const map = new Map<string, MaterialProgress>();
    for (const p of progress) {
      if (p.userId === user.id) map.set(p.materialId, p);
    }
    return map;
  }, [progress, user.id]);

  // Overall progress percentage across published materials
  const overallProgress = useMemo(() => {
    if (materials.length === 0) return 0;
    let points = 0;
    for (const m of materials) {
      const p = progressMap.get(m.id);
      if (!p) continue;
      const hasGame = games.some((g) => g.materialId === m.id);
      const hasQuiz = quizzes.some((q) => q.materialId === m.id);
      const parts = 1 + (hasGame ? 1 : 0) + (hasQuiz ? 1 : 0);
      const done =
        (p.materialRead ? 1 : 0) +
        (hasGame && p.simulationCompleted ? 1 : 0) +
        (hasQuiz && p.quizCompleted ? 1 : 0);
      points += done / parts;
    }
    return Math.round((points / materials.length) * 100);
  }, [materials, progressMap, games, quizzes]);

  const userAttempts = useMemo(
    () =>
      attempts
        .filter((a) => a.userId === user.id)
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
    [attempts, user.id]
  );

  const avgScore = useMemo(() => {
    if (userAttempts.length === 0) return 0;
    return Math.round(
      userAttempts.reduce((sum, a) => sum + a.percentage, 0) / userAttempts.length
    );
  }, [userAttempts]);

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      if (selectedCatId !== 'all' && m.categoryId !== selectedCatId) return false;
      if (selectedDifficulty !== 'all' && m.difficulty !== selectedDifficulty) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.title.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [materials, selectedCatId, selectedDifficulty, searchQuery]);

  const unfinishedMaterials = useMemo(() => {
    return materials.filter((m) => {
      const p = progressMap.get(m.id);
      const hasGame = games.some((g) => g.materialId === m.id);
      if (!p) return true;
      if (!p.materialRead) return true;
      if (hasGame && !p.simulationCompleted) return true;
      return false;
    });
  }, [materials, progressMap, games]);

  const activeMaterialIndex = selectedMaterialId
    ? materials.findIndex((m) => m.id === selectedMaterialId)
    : -1;
  const activeMaterial =
    activeMaterialIndex >= 0 ? materials[activeMaterialIndex] : undefined;

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [selectedMaterialId, activeTab]);

  return (
    <div className="min-h-screen bg-[#FFF8E9] text-[#182230]">
      {/* Student Top Bar (3-zone contract) */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#EFE7D6]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => {
              onSelectMaterial(null);
              onChangeTab('beranda');
            }}
            className="font-display text-xl font-extrabold tracking-tight text-[#182230] whitespace-nowrap shrink-0 cursor-pointer"
          >
            Office Mystery
          </button>

          <nav aria-label="Menu Siswa" className="flex items-center gap-6 text-sm font-semibold">
            <button
              type="button"
              onClick={() => {
                onSelectMaterial(null);
                onChangeTab('beranda');
              }}
              className={`whitespace-nowrap shrink-0 py-1 cursor-pointer transition-colors ${
                activeTab === 'beranda' && !activeMaterial
                  ? 'text-[#182230] border-b-2 border-[#54BCEB]'
                  : 'text-[#516072] hover:text-[#182230]'
              }`}
            >
              Beranda
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectMaterial(null);
                onChangeTab('materi');
              }}
              className={`whitespace-nowrap shrink-0 py-1 cursor-pointer transition-colors ${
                activeTab === 'materi' || Boolean(activeMaterial)
                  ? 'text-[#182230] border-b-2 border-[#54BCEB]'
                  : 'text-[#516072] hover:text-[#182230]'
              }`}
            >
              Daftar Materi
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectMaterial(null);
                onChangeTab('riwayat');
              }}
              className={`whitespace-nowrap shrink-0 py-1 cursor-pointer transition-colors ${
                activeTab === 'riwayat' && !activeMaterial
                  ? 'text-[#182230] border-b-2 border-[#54BCEB]'
                  : 'text-[#516072] hover:text-[#182230]'
              }`}
            >
              Riwayat & Nilai
            </button>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 rounded-xl bg-[#FFF8E9] hover:bg-[#FFDCE8] text-[#182230] text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1240px] mx-auto px-4 sm:px-6 py-8">
        {/* Material Detail Mode */}
        {activeMaterial ? (
          <div className="space-y-5">
            <button
              type="button"
              onClick={() => onSelectMaterial(null)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#2B8CBE] hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Daftar Materi</span>
            </button>

            <MaterialDetailBody
              material={activeMaterial}
              category={catMap.get(activeMaterial.categoryId)}
              linkedGames={games.filter((g) => g.materialId === activeMaterial.id)}
              linkedQuizzes={quizzes.filter((q) => q.materialId === activeMaterial.id)}
              progressItem={progressMap.get(activeMaterial.id)}
              onMarkRead={() =>
                void onMarkMaterialRead(
                  activeMaterial.id,
                  !progressMap.get(activeMaterial.id)?.materialRead
                )
              }
              onStartGame={onStartGame}
              onStartQuiz={onStartQuiz}
              onPrevMaterial={
                activeMaterialIndex > 0
                  ? () => onSelectMaterial(materials[activeMaterialIndex - 1].id)
                  : undefined
              }
              onNextMaterial={
                activeMaterialIndex < materials.length - 1
                  ? () => onSelectMaterial(materials[activeMaterialIndex + 1].id)
                  : undefined
              }
            />
          </div>
        ) : activeTab === 'beranda' ? (
          /* BERANDA SISWA */
          <div className="space-y-8">
            {/* Player Welcome Hero Card */}
            <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EFE7D6] shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <button
                    type="button"
                    onClick={() => setShowAvatarPicker((s) => !s)}
                    title="Ubah karakter detektif"
                    aria-label="Ubah karakter detektif"
                    className="relative group cursor-pointer shrink-0"
                  >
                    <DetectiveAvatar avatarId={user.avatarId} size={72} />
                    <span className="block text-[11px] font-semibold text-[#2B8CBE] mt-1">
                      Ganti Avatar
                    </span>
                  </button>
                  <div>
                    {(() => {
                      const welcome = getWelcomeProfile({
                        name: user.name,
                        role: user.role,
                        institution: user.institution,
                        completedCount: userAttempts.length,
                        avgScore,
                      });
                      return (
                        <>
                          <p className="text-xs font-semibold text-[#2B8CBE]">
                            {welcome.eyebrow}
                          </p>
                          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#182230]">
                            {welcome.headline}
                          </h1>
                          <p className="text-sm text-[#516072] mt-0.5">
                            {welcome.institutionLabel} · Predikat saat ini:{' '}
                            <strong className="text-[#182230]">
                              {welcome.roleOrRankLabel}
                            </strong>
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Progress Bar Summary */}
                <div className="w-full md:w-80 bg-[#FFF8E9] rounded-2xl p-4 border border-[#EFE7D6]">
                  <div className="flex items-center justify-between text-xs font-semibold mb-2">
                    <span className="text-[#516072]">Total Progres Pembelajaran</span>
                    <span className="font-mono text-[#182230] tabular-nums">
                      {overallProgress}%
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-white border border-[#E6DEC9] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#54BCEB] to-[#71C98A] transition-all duration-300"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[#516072] mt-2 tabular-nums">
                    {userAttempts.length} aktivitas selesai · Rata-rata skor {avgScore}%
                  </p>
                </div>
              </div>

              {showAvatarPicker && (
                <div className="mt-5 pt-4 border-t border-[#EFE7D6] flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold text-[#516072]">
                    Pilih Karakter:
                  </span>
                  {AVATAR_OPTIONS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => {
                        void onChangeAvatar(av.id);
                        setShowAvatarPicker(false);
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 cursor-pointer ${
                        user.avatarId === av.id
                          ? 'border-[#54BCEB] bg-[#EDF8FD]'
                          : 'border-[#E6DEC9] bg-white'
                      }`}
                    >
                      <DetectiveAvatar avatarId={av.id} size={28} />
                      <span>{av.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Unfinished Activities */}
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-display text-xl font-bold text-[#182230]">
                  Misi & Aktivitas Belum Selesai
                </h2>
                <button
                  type="button"
                  onClick={() => onChangeTab('materi')}
                  className="text-sm font-semibold text-[#2B8CBE] hover:underline cursor-pointer"
                >
                  Lihat semua materi →
                </button>
              </div>

              {unfinishedMaterials.length === 0 ? (
                <div className="bg-white rounded-3xl p-6 border border-[#EFE7D6] flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#EEF9F1] flex items-center justify-center">
                    <Award className="w-6 h-6 text-[#2E854A]" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-[#182230]">
                      Hebat! Semua materi dan misi saat ini telah Anda selesaikan.
                    </p>
                    <p className="text-sm text-[#516072]">
                      Anda dapat mengulang simulasi atau kuis untuk meraih skor 100%.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {unfinishedMaterials.slice(0, 3).map((m) => {
                    const cat = catMap.get(m.categoryId);
                    const linkedGame = games.find((g) => g.materialId === m.id);
                    const p = progressMap.get(m.id);
                    return (
                      <div
                        key={m.id}
                        className="bg-white rounded-3xl p-5 border border-[#EFE7D6] shadow-sm flex flex-col justify-between gap-4"
                      >
                        <div>
                          <p className="text-xs font-semibold text-[#516072] mb-1">
                            {cat?.name || 'Materi'} · {m.difficulty}
                          </p>
                          <h3 className="font-display text-lg font-bold text-[#182230]">
                            {m.title}
                          </h3>
                          <p className="text-xs text-[#516072] mt-1.5 line-clamp-2">
                            {p?.materialRead
                              ? 'Bacaan selesai — lanjutkan ke Simulasi!'
                              : m.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label={`Pelajari ${m.title}`}
                            onClick={() => onSelectMaterial(m.id)}
                            className="flex-1 py-2.5 rounded-xl bg-[#FFCA65] hover:bg-[#F5BC4E] text-[#182230] font-bold text-xs cursor-pointer"
                          >
                            Pelajari
                          </button>
                          {linkedGame && (
                            <button
                              type="button"
                              aria-label={`Mulai Simulasi ${m.title}`}
                              onClick={() => onStartGame(linkedGame.id)}
                              className="flex-1 py-2.5 rounded-xl bg-[#54BCEB] hover:bg-[#3FAEDB] text-[#182230] font-bold text-xs cursor-pointer"
                            >
                              Mulai Simulasi
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Latest Published Materials & Recent History */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <section className="lg:col-span-7 space-y-4">
                <h2 className="font-display text-xl font-bold text-[#182230]">
                  Materi Terbaru Tersedia
                </h2>
                <div className="space-y-3">
                  {materials.slice(0, 4).map((m) => {
                    const cat = catMap.get(m.categoryId);
                    const p = progressMap.get(m.id);
                    return (
                      <div
                        key={m.id}
                        className="bg-white rounded-2xl p-4 border border-[#EFE7D6] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-20 h-16 rounded-xl overflow-hidden shrink-0 bg-[#FFF8E9]">
                            <SafeImage
                              src={m.imageUrl}
                              alt={m.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-[#516072]">
                              {cat?.name || 'Umum'} · {m.estimatedMinutes} menit ·{' '}
                              {p?.simulationCompleted
                                ? `Selesai (${p.simulationBestScore}%)`
                                : p?.materialRead
                                  ? 'Sudah dibaca'
                                  : 'Belum dimulai'}
                            </p>
                            <h3 className="font-display font-bold text-base text-[#182230] truncate">
                              {m.title}
                            </h3>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onSelectMaterial(m.id)}
                          className="px-4 py-2 rounded-xl bg-[#EDF8FD] hover:bg-[#54BCEB] text-[#182230] text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                        >
                          Pelajari
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="lg:col-span-5 space-y-4">
                <h2 className="font-display text-xl font-bold text-[#182230]">
                  Riwayat Pembelajaran
                </h2>
                <div className="bg-white rounded-3xl p-5 border border-[#EFE7D6]">
                  {userAttempts.length === 0 ? (
                    <p className="text-sm text-[#516072] py-4 text-center">
                      Belum ada simulasi atau kuis yang diselesaikan. Mulai misi pertama Anda!
                    </p>
                  ) : (
                    <div className="divide-y divide-[#EFE7D6]">
                      {userAttempts.slice(0, 5).map((att) => (
                        <div
                          key={att.id}
                          className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#182230] truncate">
                              {att.targetTitle}
                            </p>
                            <p className="text-xs text-[#516072]">
                              {att.kind === 'simulation' ? 'Simulasi' : 'Kuis'} ·{' '}
                              {att.predikat}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onOpenAttemptResult(att)}
                            className="font-mono text-sm font-bold text-[#2B8CBE] hover:underline shrink-0 tabular-nums cursor-pointer"
                          >
                            {att.percentage}%
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        ) : activeTab === 'materi' ? (
          /* DAFTAR MATERI */
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#182230]">
                  Daftar Materi Pembelajaran
                </h1>
                <p className="text-sm text-[#516072] mt-1">
                  Seluruh materi yang dipublikasikan guru muncul otomatis di sini beserta
                  simulasi dan kuisnya.
                </p>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-[#516072] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari materi perkantoran..."
                  aria-label="Cari materi pembelajaran"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E6DEC9] text-sm focus:border-[#54BCEB] outline-none"
                />
              </div>
            </div>

            {/* Category & Difficulty Filter Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white rounded-xl border border-[#EFE7D6]">
                <button
                  type="button"
                  onClick={() => setSelectedCatId('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    selectedCatId === 'all'
                      ? 'bg-[#54BCEB] text-[#182230]'
                      : 'text-[#516072] hover:text-[#182230]'
                  }`}
                >
                  Semua Kategori
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCatId(c.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                      selectedCatId === c.id
                        ? 'bg-[#54BCEB] text-[#182230]'
                        : 'text-[#516072] hover:text-[#182230]'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              <select
                aria-label="Filter tingkat kesulitan"
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-white border border-[#EFE7D6] text-xs font-semibold text-[#182230]"
              >
                <option value="all">Semua Tingkat</option>
                <option value="Pemula">Pemula</option>
                <option value="Menengah">Menengah</option>
                <option value="Mahir">Mahir</option>
              </select>
            </div>

            {filteredMaterials.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 border border-[#EFE7D6] text-center">
                <BookOpen className="w-8 h-8 text-[#54BCEB] mx-auto mb-2" />
                <p className="font-display font-bold text-lg text-[#182230]">
                  Tidak ada materi yang cocok
                </p>
                <p className="text-sm text-[#516072] mt-1">
                  Ubah kata kunci pencarian atau pilih kategori lain.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMaterials.map((m) => {
                  const cat = catMap.get(m.categoryId);
                  const p = progressMap.get(m.id);
                  const hasGame = games.some((g) => g.materialId === m.id);
                  const hasQuiz = quizzes.some((q) => q.materialId === m.id);
                  const statusText = p?.simulationCompleted
                    ? 'Simulasi Selesai'
                    : p?.materialRead
                      ? 'Sudah Dibaca'
                      : 'Belum Dipelajari';

                  return (
                    <article
                      key={m.id}
                      className="bg-white rounded-3xl overflow-hidden border border-[#EFE7D6] shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="aspect-[4/3] w-full overflow-hidden bg-[#FFF8E9]">
                          <SafeImage
                            src={m.imageUrl}
                            alt={m.title}
                            title={m.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-6">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#516072] font-medium mb-2">
                            <span>{cat?.name || 'Umum'}</span>
                            <span aria-hidden="true">·</span>
                            <span>{m.difficulty}</span>
                            <span aria-hidden="true">·</span>
                            <span>{statusText}</span>
                          </div>
                          <h2 className="font-display text-lg font-bold text-[#182230]">
                            {m.title}
                          </h2>
                          <p className="text-sm text-[#516072] mt-2 line-clamp-3 leading-relaxed">
                            {m.description}
                          </p>
                        </div>
                      </div>

                      <div className="px-6 pb-6 pt-2 space-y-3">
                        <div className="flex items-center justify-between text-xs text-[#516072]">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {m.estimatedMinutes} menit
                          </span>
                          <span>
                            {hasGame ? 'Simulasi Tersedia' : 'Bacaan'}{' '}
                            {hasQuiz ? '· Kuis' : ''}
                          </span>
                        </div>
                        <button
                          type="button"
                          aria-label={`Pelajari ${m.title}`}
                          onClick={() => onSelectMaterial(m.id)}
                          className="w-full py-3 rounded-2xl bg-[#FFCA65] hover:bg-[#F5BC4E] text-[#182230] font-bold text-sm transition-colors cursor-pointer"
                        >
                          PELAJARI
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* RIWAYAT & NILAI */
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#182230]">
                Riwayat & Pencapaian Belajar
              </h1>
              <p className="text-sm text-[#516072] mt-1">
                Pantau seluruh skor simulasi, nilai kuis, dan predikat yang telah Anda raih.
              </p>
            </div>

            {userAttempts.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 border border-[#EFE7D6] text-center">
                <p className="font-display font-bold text-lg">Belum Ada Riwayat</p>
                <p className="text-sm text-[#516072] mt-1">
                  Pelajari salah satu materi dan selesaikan simulasi atau kuis pertamamu.
                </p>
                <button
                  type="button"
                  onClick={() => onChangeTab('materi')}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-[#54BCEB] text-[#182230] font-bold text-sm cursor-pointer"
                >
                  Jelajahi Materi
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-[#EFE7D6] overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#FFF8E9] border-b border-[#EFE7D6] text-xs font-semibold text-[#516072]">
                      <th className="py-3.5 px-5">Aktivitas</th>
                      <th className="py-3.5 px-5">Jenis</th>
                      <th className="py-3.5 px-5">Skor</th>
                      <th className="py-3.5 px-5">Predikat</th>
                      <th className="py-3.5 px-5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE7D6]">
                    {userAttempts.map((att) => (
                      <tr key={att.id} className="hover:bg-[#FFF8E9]/50">
                        <td className="py-3.5 px-5">
                          <p className="font-semibold text-[#182230]">{att.targetTitle}</p>
                          <p className="text-xs text-[#516072]">{att.materialTitle}</p>
                        </td>
                        <td className="py-3.5 px-5 text-xs font-medium text-[#516072]">
                          {att.kind === 'simulation' ? 'Game Simulasi' : 'Kuis Evaluasi'}
                        </td>
                        <td className="py-3.5 px-5 font-mono font-bold text-[#182230] tabular-nums">
                          {att.percentage}%
                        </td>
                        <td className="py-3.5 px-5 font-semibold text-[#182230]">
                          {att.predikat}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => onOpenAttemptResult(att)}
                            className="px-3.5 py-1.5 rounded-xl bg-[#EDF8FD] hover:bg-[#54BCEB] text-[#182230] text-xs font-bold cursor-pointer"
                          >
                            Lihat Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
