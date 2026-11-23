import React, { useCallback, useEffect, useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentPortal, type StudentTab } from './components/StudentPortal';
import { GameSimulator } from './components/GameSimulator';
import { QuizRunner } from './components/QuizRunner';
import { ResultView } from './components/ResultView';
import {
  api,
  getStoredUserId,
  setStoredUserId,
  type BootstrapPayload,
} from './utils/api';
import {
  readSnapshotFromIndexedDb,
  saveSnapshotToIndexedDb,
} from './utils/indexedDb';
import type { AttemptRecord, PublicUser } from './types';

type ActiveView =
  | { type: 'landing' }
  | { type: 'admin' }
  | { type: 'student' }
  | { type: 'simulation'; gameId: string }
  | { type: 'quiz'; quizId: string }
  | { type: 'result'; attempt: AttemptRecord };

export default function App() {
  const [data, setData] = useState<BootstrapPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | null>(
    null
  );
  const [studentTab, setStudentTab] = useState<StudentTab>('beranda');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [view, setView] = useState<ActiveView>({ type: 'landing' });

  const loadBootstrap = useCallback(async () => {
    try {
      const fresh = await api.bootstrap();
      setData(fresh);
      void saveSnapshotToIndexedDb('bootstrap', fresh);

      if (fresh.currentUser) {
        setView((prev) => {
          if (prev.type === 'landing') {
            return fresh.currentUser!.role === 'admin'
              ? { type: 'admin' }
              : { type: 'student' };
          }
          return prev;
        });
      }
    } catch {
      const cached = await readSnapshotFromIndexedDb<BootstrapPayload>('bootstrap');
      if (cached) setData(cached);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Support ?autostart=1 for automated quick start as student
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1' && !getStoredUserId()) {
      api
        .login('siswa@officemystery.id', 'siswa123')
        .then((res) => {
          setStoredUserId(res.user.id);
          return loadBootstrap();
        })
        .catch(() => loadBootstrap());
    } else {
      void loadBootstrap();
    }
  }, [loadBootstrap]);

  async function handleAuthSuccess(user: PublicUser) {
    setStoredUserId(user.id);
    setAuthModalMode(null);
    await loadBootstrap();
    setSelectedMaterialId(null);
    setStudentTab('beranda');
    setView(user.role === 'admin' ? { type: 'admin' } : { type: 'student' });
  }

  async function handleQuickDemoLogin(role: 'admin' | 'siswa') {
    const email =
      role === 'admin' ? 'admin@officemystery.id' : 'siswa@officemystery.id';
    const pass = role === 'admin' ? 'admin123' : 'siswa123';
    const res = await api.login(email, pass);
    await handleAuthSuccess(res.user);
  }

  function handleLogout() {
    setStoredUserId('');
    setSelectedMaterialId(null);
    setView({ type: 'landing' });
    void loadBootstrap();
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#FFF8E9] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl px-8 py-6 border border-[#EFE7D6] text-center">
          <p className="font-display font-bold text-lg text-[#182230]">
            Memuat Office Mystery...
          </p>
          <p className="text-xs text-[#516072] mt-1">
            Menyiapkan ruang belajar dan simulasi perkantoran
          </p>
        </div>
      </div>
    );
  }

  const currentUser = data?.currentUser ?? null;

  // Enforce Role Protection: block Admin view for non-admin users
  if (view.type === 'admin' && currentUser?.role === 'admin' && data) {
    return (
      <AdminDashboard
        currentUser={currentUser}
        categories={data.categories}
        materials={data.materials}
        games={data.games}
        quizzes={data.quizzes}
        users={data.users}
        attempts={data.attempts}
        progress={data.progress}
        activities={data.activities}
        onRefresh={loadBootstrap}
        onLogout={handleLogout}
      />
    );
  }

  if (view.type === 'simulation' && currentUser && data) {
    const game = data.games.find((g) => g.id === view.gameId);
    if (game) {
      const material = data.materials.find((m) => m.id === game.materialId);
      return (
        <GameSimulator
          game={game}
          material={material}
          onExit={() => setView({ type: 'student' })}
          onCompleteAttempt={async (attemptPayload) => {
            const res = await api.submitAttempt(attemptPayload);
            await loadBootstrap();
            setView({ type: 'result', attempt: res.attempt });
            return res.attempt;
          }}
        />
      );
    }
  }

  if (view.type === 'quiz' && currentUser && data) {
    const quiz = data.quizzes.find((q) => q.id === view.quizId);
    if (quiz) {
      const material = data.materials.find((m) => m.id === quiz.materialId);
      return (
        <QuizRunner
          quiz={quiz}
          material={material}
          onExit={() => setView({ type: 'student' })}
          onCompleteAttempt={async (attemptPayload) => {
            const res = await api.submitAttempt(attemptPayload);
            await loadBootstrap();
            setView({ type: 'result', attempt: res.attempt });
            return res.attempt;
          }}
        />
      );
    }
  }

  if (view.type === 'result' && currentUser && data) {
    const prog = data.progress.find(
      (p) =>
        p.userId === currentUser.id && p.materialId === view.attempt.materialId
    );
    return (
      <ResultView
        attempt={view.attempt}
        relatedSimulationScore={prog?.simulationCompleted ? prog.simulationBestScore : undefined}
        relatedQuizScore={prog?.quizCompleted ? prog.quizBestScore : undefined}
        onPlayAgain={() => {
          if (view.attempt.kind === 'simulation') {
            setView({ type: 'simulation', gameId: view.attempt.targetId });
          } else {
            setView({ type: 'quiz', quizId: view.attempt.targetId });
          }
        }}
        onBackToMaterial={() => {
          setSelectedMaterialId(view.attempt.materialId);
          setStudentTab('materi');
          setView({ type: 'student' });
        }}
      />
    );
  }

  if (view.type === 'student' && currentUser && data) {
    return (
      <StudentPortal
        user={currentUser}
        categories={data.categories}
        materials={data.materials}
        games={data.games}
        quizzes={data.quizzes}
        progress={data.progress}
        attempts={data.attempts}
        activeTab={studentTab}
        selectedMaterialId={selectedMaterialId}
        onChangeTab={setStudentTab}
        onSelectMaterial={setSelectedMaterialId}
        onMarkMaterialRead={async (materialId, read) => {
          await api.markMaterialRead(materialId, read);
          await loadBootstrap();
        }}
        onStartGame={(gameId) => setView({ type: 'simulation', gameId })}
        onStartQuiz={(quizId) => setView({ type: 'quiz', quizId })}
        onOpenAttemptResult={(attempt) => setView({ type: 'result', attempt })}
        onChangeAvatar={async (avatarId) => {
          await api.updateProfile({ avatarId });
          await loadBootstrap();
        }}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <>
      <LandingPage
        materialsCount={data?.materials.length ?? 5}
        gamesCount={data?.games.length ?? 4}
        materials={data?.materials ?? []}
        onOpenAuth={(mode = 'login') => setAuthModalMode(mode)}
        onQuickDemoLogin={(role) => void handleQuickDemoLogin(role)}
      />
      {authModalMode && (
        <AuthModal
          initialMode={authModalMode}
          onClose={() => setAuthModalMode(null)}
          onSuccess={(u) => void handleAuthSuccess(u)}
        />
      )}
    </>
  );
}
