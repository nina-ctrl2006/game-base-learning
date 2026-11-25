import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FolderKanban,
  Gamepad2,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { DetectiveAvatar } from './Avatars';
import { AdminMaterialEditor } from './AdminMaterialEditor';
import { AdminGameEditor } from './AdminGameEditor';
import { api } from '../utils/api';
import { getWelcomeProfile } from '../utils/gameLogic';
import type {
  ActivityLog,
  AttemptRecord,
  Category,
  GameSimulation,
  Material,
  MaterialProgress,
  PublicUser,
  Quiz,
  QuizQuestion,
  UserRole,
} from '../types';

export type AdminSection =
  | 'overview'
  | 'materials'
  | 'games'
  | 'quizzes'
  | 'users'
  | 'reports';

interface AdminDashboardProps {
  currentUser: PublicUser;
  adminAccessCode?: string;
  categories: Category[];
  materials: Material[];
  games: GameSimulation[];
  quizzes: Quiz[];
  users: PublicUser[];
  attempts: AttemptRecord[];
  progress: MaterialProgress[];
  activities: ActivityLog[];
  onRefresh: () => Promise<void>;
  onLogout: () => void;
}

export function AdminDashboard({
  currentUser,
  adminAccessCode = 'GURU2026',
  categories,
  materials,
  games,
  quizzes,
  users,
  attempts,
  progress,
  activities,
  onRefresh,
  onLogout,
}: AdminDashboardProps) {
  const [section, setSection] = useState<AdminSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Material editor state
  const [editingMaterial, setEditingMaterial] = useState<Material | 'new' | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#54BCEB');

  // Game editor state
  const [editingGame, setEditingGame] = useState<GameSimulation | 'new' | null>(null);

  // Quiz editor state
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  // User modal state
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('siswa');
  const [userInstitution, setUserInstitution] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [nextAccessCode, setNextAccessCode] = useState('');
  const [accessCodeError, setAccessCodeError] = useState('');
  const [savingAccessCode, setSavingAccessCode] = useState(false);

  const catMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );
  const matMap = useMemo(
    () => new Map(materials.map((m) => [m.id, m])),
    [materials]
  );

  const totalQuizQuestions = useMemo(
    () => quizzes.reduce((sum, q) => sum + q.questions.length, 0),
    [quizzes]
  );

  const students = useMemo(
    () => users.filter((u) => u.role === 'siswa'),
    [users]
  );

  const reportStats = useMemo(() => {
    const simAttempts = attempts.filter((a) => a.kind === 'simulation');
    const quizAttempts = attempts.filter((a) => a.kind === 'quiz');
    const avgSim = simAttempts.length
      ? Math.round(simAttempts.reduce((s, a) => s + a.percentage, 0) / simAttempts.length)
      : 0;
    const avgQuiz = quizAttempts.length
      ? Math.round(quizAttempts.reduce((s, a) => s + a.percentage, 0) / quizAttempts.length)
      : 0;

    // Count most studied material
    const counts = new Map<string, number>();
    for (const p of progress) {
      counts.set(p.materialId, (counts.get(p.materialId) || 0) + 1);
    }
    for (const a of attempts) {
      counts.set(a.materialId, (counts.get(a.materialId) || 0) + 1);
    }
    let topMaterialName = materials[0]?.title || '-';
    let topCount = -1;
    counts.forEach((c, mId) => {
      if (c > topCount) {
        topCount = c;
        topMaterialName = matMap.get(mId)?.title || topMaterialName;
      }
    });

    const publishedMats = materials.filter((m) => m.status === 'published').length;
    const totalExpected = Math.max(1, students.length * publishedMats);
    const completedPairs = progress.filter(
      (p) => p.materialRead || p.simulationCompleted || p.quizCompleted
    ).length;
    const completionRate = Math.min(100, Math.round((completedPairs / totalExpected) * 100));

    return { avgSim, avgQuiz, topMaterialName, completionRate };
  }, [attempts, progress, materials, matMap, students.length]);

  function notify(msg: string) {
    setStatusMessage(msg);
    window.setTimeout(() => setStatusMessage(''), 3500);
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await api.saveCategory({ name: newCatName.trim(), color: newCatColor });
    setNewCatName('');
    await onRefresh();
    notify('Kategori baru berhasil ditambahkan.');
  }

  async function handleDeleteCategory(id: string) {
    await api.deleteCategory(id);
    await onRefresh();
    notify('Kategori berhasil dihapus.');
  }

  async function handleReorderMaterial(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= materials.length) return;
    const next = [...materials];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    await api.reorderMaterials(next.map((m) => m.id));
    await onRefresh();
  }

  async function handleToggleMaterialPublish(m: Material) {
    await api.saveMaterial({
      ...m,
      status: m.status === 'published' ? 'draft' : 'published',
    });
    await onRefresh();
    notify(
      m.status === 'published'
        ? `Materi "${m.title}" dikembalikan ke Draft.`
        : `Materi "${m.title}" dipublikasikan ke halaman Siswa.`
    );
  }

  async function handleToggleGamePublish(g: GameSimulation) {
    await api.saveGame({
      ...g,
      status: g.status === 'published' ? 'draft' : 'published',
    });
    await onRefresh();
    notify(
      g.status === 'published'
        ? `Simulasi "${g.title}" disimpan sebagai Draft.`
        : `Simulasi "${g.title}" dipublikasikan.`
    );
  }

  async function handleCreateNewQuiz() {
    const defaultMat = materials[0]?.id || '';
    const newQuiz: Quiz = {
      id: '',
      materialId: defaultMat,
      title: 'Kuis Evaluasi Baru',
      description: 'Uji pemahaman siswa terkait materi yang dipelajari.',
      timerSeconds: 240,
      passingScore: 70,
      status: 'draft',
      questions: [
        {
          id: `qq_${Date.now()}`,
          order: 1,
          type: 'multiple_choice',
          question: 'Tuliskan pertanyaan kuis di sini...',
          options: ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'],
          correctIndex: 0,
          points: 25,
          explanation: 'Pembahasan singkat jawaban benar.',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingQuiz(newQuiz);
  }

  async function handleSaveQuiz(status: 'draft' | 'published') {
    if (!editingQuiz) return;
    await api.saveQuiz({ ...editingQuiz, status });
    setEditingQuiz(null);
    await onRefresh();
    notify('Kuis berhasil disimpan.');
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    await api.saveUser({
      name: userName,
      email: userEmail,
      password: userPassword || 'siswa123',
      role: userRole,
      institution: userInstitution || 'SMK MPLB',
    });
    setUserFormOpen(false);
    setUserName('');
    setUserEmail('');
    setUserPassword('');
    setUserInstitution('');
    await onRefresh();
    notify('Pengguna baru berhasil ditambahkan.');
  }

  async function handleUpdateAccessCode(e: React.FormEvent) {
    e.preventDefault();
    setAccessCodeError('');
    setSavingAccessCode(true);
    try {
      await api.updateAdminAccessCode(nextAccessCode);
      setNextAccessCode('');
      await onRefresh();
      notify('Kode Khusus Guru / Admin berhasil diperbarui.');
    } catch (err) {
      setAccessCodeError(
        err instanceof Error ? err.message : 'Gagal memperbarui kode khusus.'
      );
    } finally {
      setSavingAccessCode(false);
    }
  }

  function handleExportCsv() {
    const header = ['Nama Siswa', 'Materi', 'Aktivitas', 'Jenis', 'Skor (%)', 'Predikat', 'Tanggal'];
    const rows = attempts.map((a) => [
      `"${a.userName}"`,
      `"${a.materialTitle}"`,
      `"${a.targetTitle}"`,
      a.kind === 'simulation' ? 'Simulasi' : 'Kuis',
      String(a.percentage),
      `"${a.predikat}"`,
      a.completedAt.slice(0, 10),
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'laporan-office-mystery.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  const navItems: { id: AdminSection; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Dashboard Utama', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'materials', label: 'Manajemen Materi', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'games', label: 'Editor Game & Simulasi', icon: <Gamepad2 className="w-4 h-4" /> },
    { id: 'quizzes', label: 'Manajemen Kuis', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'users', label: 'Manajemen Pengguna', icon: <Users className="w-4 h-4" /> },
    { id: 'reports', label: 'Laporan Pembelajaran', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  const SidebarContent = (
    <div className="flex flex-col h-full justify-between p-5 bg-white border-r border-[#EFE7D6]">
      <div className="space-y-6">
        <div>
          <p className="font-display text-xl font-extrabold text-[#182230]">
            Office Mystery
          </p>
          <p className="text-xs font-medium text-[#516072]">Panel Guru & Admin</p>
        </div>

        <nav aria-label="Menu Admin" className="space-y-1.5">
          {navItems.map((item) => {
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSection(item.id);
                  setEditingMaterial(null);
                  setEditingGame(null);
                  setEditingQuiz(null);
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#54BCEB] text-[#182230]'
                    : 'text-[#516072] hover:bg-[#FFF8E9] hover:text-[#182230]'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-[#EFE7D6] space-y-3">
        <div className="flex items-center gap-3">
          <DetectiveAvatar avatarId={currentUser.avatarId} size={38} />
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#182230] truncate">{currentUser.name}</p>
            <p className="text-[11px] text-[#516072] truncate">Administrator / Guru</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="w-full py-2.5 px-3 rounded-xl bg-[#FFF8E9] hover:bg-[#FFDCE8] text-xs font-bold text-[#182230] flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar Akun</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FFF8E9] text-[#182230] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[264px] shrink-0 sticky top-0 h-screen">
        {SidebarContent}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-72 h-full">{SidebarContent}</div>
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setMobileMenuOpen(false)}
            className="flex-1 bg-[#182230]/40"
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white border-b border-[#EFE7D6] px-6 h-16 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka navigasi admin"
              className="lg:hidden w-9 h-9 rounded-xl bg-[#FFF8E9] flex items-center justify-center"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="font-display font-bold text-lg text-[#182230]">
              {navItems.find((n) => n.id === section)?.label}
            </span>
          </div>

          {statusMessage && (
            <div
              role="status"
              className="px-4 py-1.5 rounded-xl bg-[#EEF9F1] border border-[#71C98A] text-xs font-semibold text-[#1F7A3E]"
            >
              {statusMessage}
            </div>
          )}
        </header>

        <main className="p-5 sm:p-8 max-w-[1200px] w-full mx-auto space-y-6">
          {/* A. DASHBOARD UTAMA */}
          {section === 'overview' && (
            <div className="space-y-6">
              {(() => {
                const welcome = getWelcomeProfile({
                  name: currentUser.name,
                  role: currentUser.role,
                  institution: currentUser.institution,
                });
                return (
                  <section className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EFE7D6] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                      <DetectiveAvatar avatarId={currentUser.avatarId} size={60} />
                      <div>
                        <p className="text-xs font-semibold text-[#6D3B9E]">
                          {welcome.eyebrow}
                        </p>
                        <h1 className="font-display text-2xl font-extrabold text-[#182230]">
                          {welcome.headline}
                        </h1>
                        <p className="text-sm text-[#516072] mt-0.5">
                          {welcome.institutionLabel} ·{' '}
                          <strong className="text-[#182230]">
                            {welcome.roleOrRankLabel}
                          </strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSection('materials');
                          setEditingMaterial('new');
                        }}
                        className="px-4 py-2.5 rounded-xl bg-[#54BCEB] hover:bg-[#3FAEDB] text-[#182230] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tambah Materi</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSection('games');
                          setEditingGame('new');
                        }}
                        className="px-4 py-2.5 rounded-xl bg-[#FFCA65] hover:bg-[#F5BC4E] text-[#182230] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Gamepad2 className="w-4 h-4" />
                        <span>Buat Simulasi</span>
                      </button>
                    </div>
                  </section>
                );
              })()}

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-[#EFE7D6]">
                  <p className="text-xs font-semibold text-[#516072]">Total Materi</p>
                  <p className="font-mono text-3xl font-extrabold mt-1 tabular-nums">
                    {materials.length}
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-[#EFE7D6]">
                  <p className="text-xs font-semibold text-[#516072]">Total Kategori</p>
                  <p className="font-mono text-3xl font-extrabold mt-1 tabular-nums">
                    {categories.length}
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-[#EFE7D6]">
                  <p className="text-xs font-semibold text-[#516072]">Game & Simulasi</p>
                  <p className="font-mono text-3xl font-extrabold mt-1 tabular-nums">
                    {games.length}
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-[#EFE7D6]">
                  <p className="text-xs font-semibold text-[#516072]">Total Soal Kuis</p>
                  <p className="font-mono text-3xl font-extrabold mt-1 tabular-nums">
                    {totalQuizQuestions}
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-[#EFE7D6] col-span-2 md:col-span-1">
                  <p className="text-xs font-semibold text-[#516072]">Total Pengguna</p>
                  <p className="font-mono text-3xl font-extrabold mt-1 tabular-nums">
                    {users.length}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Learning Stats */}
                <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-[#EFE7D6] space-y-4">
                  <h2 className="font-display text-lg font-bold">Statistik Pembelajaran</h2>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1.5">
                        <span>Rata-rata Skor Simulasi</span>
                        <span className="font-mono tabular-nums">{reportStats.avgSim}%</span>
                      </div>
                      <div className="h-3 rounded-full bg-[#FFF8E9] overflow-hidden">
                        <div
                          className="h-full bg-[#54BCEB] rounded-full"
                          style={{ width: `${reportStats.avgSim}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1.5">
                        <span>Rata-rata Nilai Kuis</span>
                        <span className="font-mono tabular-nums">{reportStats.avgQuiz}%</span>
                      </div>
                      <div className="h-3 rounded-full bg-[#FFF8E9] overflow-hidden">
                        <div
                          className="h-full bg-[#71C98A] rounded-full"
                          style={{ width: `${reportStats.avgQuiz}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1.5">
                        <span>Tingkat Penyelesaian Siswa</span>
                        <span className="font-mono tabular-nums">{reportStats.completionRate}%</span>
                      </div>
                      <div className="h-3 rounded-full bg-[#FFF8E9] overflow-hidden">
                        <div
                          className="h-full bg-[#BB8AE8] rounded-full"
                          style={{ width: `${reportStats.completionRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-[#EFE7D6] text-xs text-[#516072]">
                    Materi paling aktif dipelajari:{' '}
                    <strong className="text-[#182230]">{reportStats.topMaterialName}</strong>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-[#EFE7D6] space-y-4">
                  <h2 className="font-display text-lg font-bold">Aktivitas Terbaru</h2>
                  <div className="divide-y divide-[#EFE7D6] max-h-[280px] overflow-y-auto">
                    {activities.slice(0, 8).map((act) => (
                      <div key={act.id} className="py-2.5 first:pt-0 last:pb-0">
                        <p className="text-xs font-bold text-[#182230]">
                          {act.userName} · <span className="font-normal text-[#516072]">{act.action}</span>
                        </p>
                        <p className="text-xs text-[#2B8CBE] truncate">{act.targetTitle}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* B. MANAJEMEN MATERI & KATEGORI */}
          {section === 'materials' && (
            editingMaterial ? (
              <AdminMaterialEditor
                initial={editingMaterial === 'new' ? undefined : editingMaterial}
                categories={categories}
                onCancel={() => setEditingMaterial(null)}
                onSave={async (payload) => {
                  await api.saveMaterial(payload);
                  setEditingMaterial(null);
                  await onRefresh();
                  notify('Materi pembelajaran berhasil disimpan.');
                }}
              />
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="font-display text-2xl font-extrabold">Manajemen Materi</h1>
                    <p className="text-sm text-[#516072]">
                      Kelola kategori, susun urutan materi, unggah PDF/gambar, dan publikasikan.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingMaterial('new')}
                    className="px-5 py-2.5 rounded-xl bg-[#54BCEB] hover:bg-[#3FAEDB] text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Materi Baru</span>
                  </button>
                </div>

                {/* Category Manager */}
                <div className="bg-white rounded-3xl p-5 border border-[#EFE7D6] space-y-4">
                  <div className="flex items-center gap-2 font-display font-bold text-base">
                    <FolderKanban className="w-4 h-4 text-[#54BCEB]" />
                    <span>Kategori Materi</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="px-3 py-1.5 rounded-xl bg-[#FFF8E9] border border-[#EFE7D6] text-xs font-semibold flex items-center gap-2"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-sm"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span>{cat.name}</span>
                        <button
                          type="button"
                          aria-label={`Hapus kategori ${cat.name}`}
                          onClick={() => void handleDeleteCategory(cat.id)}
                          className="text-[#9A2348] hover:underline cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleAddCategory} className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="Nama kategori baru..."
                      aria-label="Nama kategori baru"
                      className="px-3.5 py-2 rounded-xl border border-[#D8D0BE] text-xs w-60"
                    />
                    <input
                      type="color"
                      value={newCatColor}
                      onChange={(e) => setNewCatColor(e.target.value)}
                      aria-label="Warna kategori"
                      className="w-9 h-9 rounded-lg border border-[#D8D0BE] cursor-pointer"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#FFCA65] text-xs font-bold cursor-pointer"
                    >
                      Tambah Kategori
                    </button>
                  </form>
                </div>

                {/* Materials Table */}
                <div className="bg-white rounded-3xl border border-[#EFE7D6] overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#FFF8E9] border-b border-[#EFE7D6] text-xs font-semibold text-[#516072]">
                        <th className="py-3.5 px-4">Urutan</th>
                        <th className="py-3.5 px-4">Judul Materi</th>
                        <th className="py-3.5 px-4">Kategori</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFE7D6]">
                      {materials.map((m, idx) => (
                        <tr key={m.id} className="hover:bg-[#FFF8E9]/40">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => void handleReorderMaterial(idx, -1)}
                                aria-label={`Naikkan urutan ${m.title}`}
                                className="w-7 h-7 rounded-lg border border-[#D8D0BE] flex items-center justify-center disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === materials.length - 1}
                                onClick={() => void handleReorderMaterial(idx, 1)}
                                aria-label={`Turunkan urutan ${m.title}`}
                                className="w-7 h-7 rounded-lg border border-[#D8D0BE] flex items-center justify-center disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-[#182230]">{m.title}</p>
                            <p className="text-xs text-[#516072]">
                              {m.difficulty} · {m.estimatedMinutes} menit
                            </p>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-[#516072]">
                            {catMap.get(m.categoryId)?.name || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-bold">
                            {m.status === 'published' ? (
                              <span className="text-[#1F7A3E]">Dipublikasikan</span>
                            ) : (
                              <span className="text-[#B57B14]">Draft</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => void handleToggleMaterialPublish(m)}
                                className="px-3 py-1.5 rounded-lg bg-[#EEF9F1] text-xs font-bold cursor-pointer"
                              >
                                {m.status === 'published' ? 'Jadikan Draft' : 'Publikasikan'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingMaterial(m)}
                                aria-label={`Edit ${m.title}`}
                                className="px-3 py-1.5 rounded-lg bg-[#EDF8FD] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                aria-label={`Hapus ${m.title}`}
                                onClick={async () => {
                                  await api.deleteMaterial(m.id);
                                  await onRefresh();
                                  notify('Materi dihapus.');
                                }}
                                className="w-8 h-8 rounded-lg bg-[#FFDCE8]/70 text-[#9A2348] flex items-center justify-center cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* C. EDITOR GAME & SIMULATOR */}
          {section === 'games' && (
            editingGame ? (
              <AdminGameEditor
                initial={editingGame === 'new' ? undefined : editingGame}
                materials={materials}
                onCancel={() => setEditingGame(null)}
                onSave={async (payload) => {
                  await api.saveGame(payload);
                  setEditingGame(null);
                  await onRefresh();
                  notify('Game simulasi berhasil disimpan.');
                }}
              />
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="font-display text-2xl font-extrabold">
                      Editor Game & Simulasi Dinamis
                    </h1>
                    <p className="text-sm text-[#516072]">
                      Buat simulasi kerja kantor baru terhubung ke materi mana pun dengan 8 tipe
                      aktivitas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingGame('new')}
                    className="px-5 py-2.5 rounded-xl bg-[#54BCEB] hover:bg-[#3FAEDB] text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Buat Game Simulasi</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {games.map((g) => (
                    <div
                      key={g.id}
                      className="bg-white rounded-3xl p-6 border border-[#EFE7D6] flex flex-col justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#516072] mb-1.5">
                          <span>{matMap.get(g.materialId)?.title || 'Materi Terkait'}</span>
                          <span className={g.status === 'published' ? 'text-[#1F7A3E]' : 'text-[#B57B14]'}>
                            {g.status === 'published' ? 'Dipublikasikan' : 'Draft'}
                          </span>
                        </div>
                        <h2 className="font-display text-lg font-bold text-[#182230]">
                          {g.title}
                        </h2>
                        <p className="text-sm text-[#516072] mt-1">{g.description}</p>
                        <p className="text-xs font-mono text-[#182230] mt-3 tabular-nums">
                          {g.challenges.length} tantangan · {Math.round(g.timerSeconds / 60)} menit ·{' '}
                          {g.difficulty}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#EFE7D6]">
                        <button
                          type="button"
                          onClick={() => void handleToggleGamePublish(g)}
                          className="px-3.5 py-2 rounded-xl bg-[#EEF9F1] text-xs font-bold cursor-pointer"
                        >
                          {g.status === 'published' ? 'Jadikan Draft' : 'Publikasikan'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingGame(g)}
                          className="px-3.5 py-2 rounded-xl bg-[#EDF8FD] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit & Tantangan</span>
                        </button>
                        <button
                          type="button"
                          aria-label={`Hapus game ${g.title}`}
                          onClick={async () => {
                            await api.deleteGame(g.id);
                            await onRefresh();
                            notify('Game simulasi dihapus.');
                          }}
                          className="ml-auto w-9 h-9 rounded-xl bg-[#FFDCE8]/70 text-[#9A2348] flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {/* D. MANAJEMEN KUIS */}
          {section === 'quizzes' && (
            editingQuiz ? (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EFE7D6] space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#EFE7D6]">
                  <h2 className="font-display text-2xl font-bold">Editor Kuis Evaluasi</h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingQuiz(null)}
                      className="px-4 py-2 rounded-xl bg-[#FFF8E9] text-xs font-bold cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveQuiz('draft')}
                      className="px-4 py-2 rounded-xl bg-[#FFCA65] text-xs font-bold cursor-pointer"
                    >
                      Simpan Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveQuiz('published')}
                      className="px-5 py-2 rounded-xl bg-[#71C98A] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Publikasikan</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1">Judul Kuis</label>
                    <input
                      type="text"
                      value={editingQuiz.title}
                      onChange={(e) =>
                        setEditingQuiz({ ...editingQuiz, title: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D8D0BE] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Materi Terkait</label>
                    <select
                      value={editingQuiz.materialId}
                      onChange={(e) =>
                        setEditingQuiz({ ...editingQuiz, materialId: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D8D0BE] text-sm bg-white"
                    >
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Timer (Detik)</label>
                    <input
                      type="number"
                      value={editingQuiz.timerSeconds}
                      onChange={(e) =>
                        setEditingQuiz({
                          ...editingQuiz,
                          timerSeconds: Number(e.target.value) || 240,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D8D0BE] text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Nilai Kelulusan (%)</label>
                    <input
                      type="number"
                      value={editingQuiz.passingScore}
                      onChange={(e) =>
                        setEditingQuiz({
                          ...editingQuiz,
                          passingScore: Number(e.target.value) || 70,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D8D0BE] text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <h3 className="font-display font-bold text-base">
                    Daftar Soal ({editingQuiz.questions.length})
                  </h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const q: QuizQuestion = {
                          id: `qq_${Date.now()}`,
                          order: editingQuiz.questions.length + 1,
                          type: 'multiple_choice',
                          question: 'Pertanyaan pilihan ganda baru...',
                          options: ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'],
                          correctIndex: 0,
                          points: 25,
                          explanation: 'Pembahasan soal.',
                        };
                        setEditingQuiz({
                          ...editingQuiz,
                          questions: [...editingQuiz.questions, q],
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#54BCEB] text-xs font-bold cursor-pointer"
                    >
                      + Pilihan Ganda
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const q: QuizQuestion = {
                          id: `qq_${Date.now()}`,
                          order: editingQuiz.questions.length + 1,
                          type: 'true_false',
                          question: 'Pernyataan benar atau salah...',
                          options: ['Benar', 'Salah'],
                          correctIndex: 0,
                          points: 25,
                          explanation: 'Pembahasan soal.',
                        };
                        setEditingQuiz({
                          ...editingQuiz,
                          questions: [...editingQuiz.questions, q],
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#71C98A] text-xs font-bold cursor-pointer"
                    >
                      + Benar/Salah
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {editingQuiz.questions.map((q, qi) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-2xl bg-[#FFF8E9] border border-[#EFE7D6] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">
                          Soal {qi + 1} ·{' '}
                          {q.type === 'true_false' ? 'Benar/Salah' : 'Pilihan Ganda'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingQuiz({
                              ...editingQuiz,
                              questions: editingQuiz.questions.filter((_, i) => i !== qi),
                            })
                          }
                          className="text-xs font-bold text-[#9A2348] cursor-pointer"
                        >
                          Hapus Soal
                        </button>
                      </div>
                      <input
                        type="text"
                        value={q.question}
                        onChange={(e) => {
                          const next = [...editingQuiz.questions];
                          next[qi] = { ...q, question: e.target.value };
                          setEditingQuiz({ ...editingQuiz, questions: next });
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#D8D0BE] text-sm"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`quiz_ans_${q.id}`}
                              checked={q.correctIndex === oi}
                              onChange={() => {
                                const next = [...editingQuiz.questions];
                                next[qi] = { ...q, correctIndex: oi };
                                setEditingQuiz({ ...editingQuiz, questions: next });
                              }}
                            />
                            <input
                              type="text"
                              value={opt}
                              disabled={q.type === 'true_false'}
                              onChange={(e) => {
                                const nextOpts = [...q.options];
                                nextOpts[oi] = e.target.value;
                                const next = [...editingQuiz.questions];
                                next[qi] = { ...q, options: nextOpts };
                                setEditingQuiz({ ...editingQuiz, questions: next });
                              }}
                              className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-[#D8D0BE] text-xs"
                            />
                          </div>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={q.explanation}
                        onChange={(e) => {
                          const next = [...editingQuiz.questions];
                          next[qi] = { ...q, explanation: e.target.value };
                          setEditingQuiz({ ...editingQuiz, questions: next });
                        }}
                        placeholder="Pembahasan jawaban..."
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#D8D0BE] text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="font-display text-2xl font-extrabold">Manajemen Kuis</h1>
                    <p className="text-sm text-[#516072]">
                      Kelola soal pilihan ganda dan benar/salah yang terhubung ke setiap materi.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCreateNewQuiz()}
                    className="px-5 py-2.5 rounded-xl bg-[#54BCEB] text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Buat Kuis Baru</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {quizzes.map((q) => (
                    <div
                      key={q.id}
                      className="bg-white rounded-3xl p-6 border border-[#EFE7D6] flex flex-col justify-between gap-4"
                    >
                      <div>
                        <div className="flex justify-between text-xs font-semibold text-[#516072] mb-1">
                          <span>{matMap.get(q.materialId)?.title || '-'}</span>
                          <span className={q.status === 'published' ? 'text-[#1F7A3E]' : 'text-[#B57B14]'}>
                            {q.status === 'published' ? 'Dipublikasikan' : 'Draft'}
                          </span>
                        </div>
                        <h2 className="font-display text-lg font-bold">{q.title}</h2>
                        <p className="text-xs font-mono text-[#516072] mt-2 tabular-nums">
                          {q.questions.length} soal · Lulus {q.passingScore}%
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-3 border-t border-[#EFE7D6]">
                        <button
                          type="button"
                          onClick={async () => {
                            await api.saveQuiz({
                              ...q,
                              status: q.status === 'published' ? 'draft' : 'published',
                            });
                            await onRefresh();
                            notify(
                              q.status === 'published'
                                ? `Kuis "${q.title}" dijadikan Draft.`
                                : `Kuis "${q.title}" dipublikasikan.`
                            );
                          }}
                          className="px-3.5 py-2 rounded-xl bg-[#EEF9F1] text-xs font-bold cursor-pointer"
                        >
                          {q.status === 'published' ? 'Jadikan Draft' : 'Publikasikan'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingQuiz(q)}
                          className="px-3.5 py-2 rounded-xl bg-[#EDF8FD] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Soal</span>
                        </button>
                        <button
                          type="button"
                          aria-label={`Hapus kuis ${q.title}`}
                          onClick={async () => {
                            await api.deleteQuiz(q.id);
                            await onRefresh();
                            notify('Kuis dihapus.');
                          }}
                          className="ml-auto w-9 h-9 rounded-xl bg-[#FFDCE8]/70 text-[#9A2348] flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {/* E. MANAJEMEN PENGGUNA */}
          {section === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-extrabold">Manajemen Pengguna</h1>
                  <p className="text-sm text-[#516072]">
                    Daftar guru/admin dan siswa peserta beserta progres pembelajarannya.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUserFormOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#54BCEB] text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Pengguna</span>
                </button>
              </div>

              {/* Keamanan Akses Guru / Admin */}
              <div className="bg-white rounded-3xl p-6 border border-[#EFE7D6]">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                  <div className="space-y-1.5 max-w-xl">
                    <h2 className="font-display text-lg font-extrabold flex items-center gap-2 text-[#182230]">
                      <ShieldCheck className="w-5 h-5 text-[#6D3B9E]" />
                      <span>Kode Khusus Login Guru / Admin</span>
                    </h2>
                    <p className="text-xs text-[#516072] leading-relaxed">
                      Kode ini wajib dimasukkan saat login ke akun Guru / Admin agar siswa tidak
                      bisa masuk secara tidak sengaja jika salah menekan tombol.
                    </p>
                    <div className="pt-1 flex items-center gap-2">
                      <span className="text-xs text-[#516072]">Kode aktif saat ini:</span>
                      <code
                        data-testid="active-admin-code"
                        className="px-3 py-1 rounded-lg bg-[#F5EEFC] text-[#3C2258] font-mono text-sm font-bold tracking-wider"
                      >
                        {showAccessCode ? adminAccessCode : '••••••••'}
                      </code>
                      <button
                        type="button"
                        onClick={() => setShowAccessCode((prev) => !prev)}
                        aria-label={
                          showAccessCode
                            ? 'Sembunyikan kode khusus aktif'
                            : 'Lihat kode khusus aktif'
                        }
                        className="w-8 h-8 rounded-lg bg-[#FFF8E9] hover:bg-[#FFCA65]/40 flex items-center justify-center text-[#182230] cursor-pointer"
                      >
                        {showAccessCode ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <form
                    onSubmit={handleUpdateAccessCode}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 lg:min-w-[390px]"
                  >
                    <label htmlFor="admin-access-code-input" className="sr-only">
                      Kode Khusus Guru / Admin Baru
                    </label>
                    <div className="relative flex-1">
                      <KeyRound className="w-4 h-4 text-[#6D3B9E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="admin-access-code-input"
                        type="text"
                        required
                        minLength={4}
                        maxLength={32}
                        value={nextAccessCode}
                        onChange={(e) => setNextAccessCode(e.target.value)}
                        placeholder="Kode baru (4–32 karakter)"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#D8D0BE] bg-white text-sm focus:border-[#BB8AE8] outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={savingAccessCode}
                      className="px-4 py-2.5 rounded-xl bg-[#BB8AE8] hover:bg-[#AA74DC] text-[#182230] font-bold text-sm cursor-pointer disabled:opacity-60 whitespace-nowrap"
                    >
                      {savingAccessCode ? 'Menyimpan...' : 'Ubah Kode'}
                    </button>
                  </form>
                </div>
                {accessCodeError && (
                  <p role="alert" className="mt-3 text-xs font-semibold text-[#9A2348]">
                    {accessCodeError}
                  </p>
                )}
              </div>

              {userFormOpen && (
                <form
                  onSubmit={handleAddUser}
                  className="bg-white rounded-3xl p-6 border border-[#EFE7D6] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Nama Lengkap"
                    className="px-3.5 py-2.5 rounded-xl border border-[#D8D0BE] text-sm"
                  />
                  <input
                    type="email"
                    required
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="Email"
                    className="px-3.5 py-2.5 rounded-xl border border-[#D8D0BE] text-sm"
                  />
                  <input
                    type="password"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder="Kata sandi (default: siswa123)"
                    className="px-3.5 py-2.5 rounded-xl border border-[#D8D0BE] text-sm"
                  />
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as UserRole)}
                    className="px-3.5 py-2.5 rounded-xl border border-[#D8D0BE] text-sm bg-white"
                  >
                    <option value="siswa">Siswa / Pemain</option>
                    <option value="admin">Admin / Guru</option>
                  </select>
                  <input
                    type="text"
                    value={userInstitution}
                    onChange={(e) => setUserInstitution(e.target.value)}
                    placeholder="Sekolah / Instansi"
                    className="px-3.5 py-2.5 rounded-xl border border-[#D8D0BE] text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-[#71C98A] font-bold text-sm cursor-pointer"
                    >
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserFormOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-[#FFF8E9] font-bold text-sm cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              )}

              <div className="bg-white rounded-3xl border border-[#EFE7D6] overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#FFF8E9] border-b border-[#EFE7D6] text-xs font-semibold text-[#516072]">
                      <th className="py-3.5 px-5">Pengguna</th>
                      <th className="py-3.5 px-5">Role</th>
                      <th className="py-3.5 px-5">Instansi</th>
                      <th className="py-3.5 px-5">Progres</th>
                      <th className="py-3.5 px-5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE7D6]">
                    {users.map((u) => {
                      const uAttempts = attempts.filter((a) => a.userId === u.id);
                      const uProgress = progress.filter((p) => p.userId === u.id && p.materialRead);
                      const pct = materials.length
                        ? Math.round((uProgress.length / materials.length) * 100)
                        : 0;
                      return (
                        <tr key={u.id}>
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <DetectiveAvatar avatarId={u.avatarId} size={36} />
                              <div>
                                <p className="font-bold text-[#182230]">{u.name}</p>
                                <p className="text-xs text-[#516072]">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-xs font-bold">
                            {u.role === 'admin' ? 'Admin / Guru' : 'Siswa'}
                          </td>
                          <td className="py-3.5 px-5 text-xs text-[#516072]">{u.institution}</td>
                          <td className="py-3.5 px-5 text-xs font-mono tabular-nums">
                            {u.role === 'siswa'
                              ? `${pct}% materi · ${uAttempts.length} selesai`
                              : 'Pengelola'}
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            {u.id !== currentUser.id && (
                              <button
                                type="button"
                                onClick={async () => {
                                  await api.deleteUser(u.id);
                                  await onRefresh();
                                  notify('Pengguna dihapus.');
                                }}
                                aria-label={`Hapus ${u.name}`}
                                className="px-3 py-1.5 rounded-lg bg-[#FFDCE8]/70 text-[#9A2348] text-xs font-bold cursor-pointer"
                              >
                                Hapus
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* F. LAPORAN PEMBELAJARAN */}
          {section === 'reports' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-extrabold">Laporan Pembelajaran</h1>
                  <p className="text-sm text-[#516072]">
                    Rekapitulasi nilai kuis, skor simulasi, tingkat penyelesaian, dan riwayat siswa.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="px-4 py-2.5 rounded-xl bg-[#71C98A] hover:bg-[#5BB976] text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Laporan CSV</span>
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-[#EFE7D6]">
                  <p className="text-xs text-[#516072]">Siswa Aktif</p>
                  <p className="font-mono text-2xl font-extrabold mt-1 tabular-nums">
                    {students.length}
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-[#EFE7D6]">
                  <p className="text-xs text-[#516072]">Rata-rata Kuis</p>
                  <p className="font-mono text-2xl font-extrabold mt-1 tabular-nums">
                    {reportStats.avgQuiz}%
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-[#EFE7D6]">
                  <p className="text-xs text-[#516072]">Rata-rata Simulasi</p>
                  <p className="font-mono text-2xl font-extrabold mt-1 tabular-nums">
                    {reportStats.avgSim}%
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-[#EFE7D6]">
                  <p className="text-xs text-[#516072]">Tingkat Penyelesaian</p>
                  <p className="font-mono text-2xl font-extrabold mt-1 tabular-nums">
                    {reportStats.completionRate}%
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-[#EFE7D6] overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#FFF8E9] border-b border-[#EFE7D6] text-xs font-semibold text-[#516072]">
                      <th className="py-3.5 px-5">Nama Siswa</th>
                      <th className="py-3.5 px-5">Aktivitas & Materi</th>
                      <th className="py-3.5 px-5">Jenis</th>
                      <th className="py-3.5 px-5">Skor</th>
                      <th className="py-3.5 px-5">Predikat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE7D6]">
                    {attempts.map((att) => (
                      <tr key={att.id}>
                        <td className="py-3.5 px-5 font-semibold">{att.userName}</td>
                        <td className="py-3.5 px-5">
                          <p className="font-medium text-[#182230]">{att.targetTitle}</p>
                          <p className="text-xs text-[#516072]">{att.materialTitle}</p>
                        </td>
                        <td className="py-3.5 px-5 text-xs text-[#516072]">
                          {att.kind === 'simulation' ? 'Simulasi' : 'Kuis'}
                        </td>
                        <td className="py-3.5 px-5 font-mono font-bold tabular-nums">
                          {att.percentage}%
                        </td>
                        <td className="py-3.5 px-5 text-xs font-bold">{att.predikat}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
