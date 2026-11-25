import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, Lock, LogIn, ShieldCheck, UserPlus, X } from 'lucide-react';
import { AVATAR_OPTIONS, DetectiveAvatar } from './Avatars';
import { ApiRequestError, api } from '../utils/api';
import type { PublicUser } from '../types';

export type AuthModalMode = 'login' | 'admin' | 'register';

interface AuthModalProps {
  initialMode: AuthModalMode;
  onClose: () => void;
  onSuccess: (user: PublicUser) => void;
}

export function AuthModal({ initialMode, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [institution, setInstitution] = useState('');
  const [avatarId, setAvatarId] = useState('detective_blue');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setError('');
  }, [initialMode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login' || mode === 'admin') {
        const res = await api.login(
          email,
          password,
          mode === 'admin' ? adminCode : undefined
        );
        if (mode === 'admin' && res.user.role !== 'admin') {
          setError('Akun ini terdaftar sebagai Siswa, bukan akun Guru / Admin.');
          return;
        }
        onSuccess(res.user);
      } else {
        const res = await api.register({
          name,
          email,
          password,
          institution,
          avatarId,
        });
        onSuccess(res.user);
      }
    } catch (err) {
      if (err instanceof ApiRequestError && err.requiresAdminCode && mode === 'login') {
        setMode('admin');
        setError(
          'Akun ini memiliki akses Guru / Admin. Masukkan Kode Khusus Guru / Admin untuk melanjutkan.'
        );
      } else {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan autentikasi.');
      }
    } finally {
      setLoading(false);
    }
  }

  function switchMode(nextMode: AuthModalMode) {
    setMode(nextMode);
    setError('');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center bg-[#182230]/40 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-[#EFE7D6] p-6 sm:p-8 relative my-auto">
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup jendela login"
          className="absolute top-5 right-5 w-9 h-9 rounded-xl bg-[#FFF8E9] hover:bg-[#FFCA65]/40 flex items-center justify-center text-[#182230] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-5 pr-8">
          <h2 id="auth-modal-title" className="font-display text-2xl font-bold text-[#182230]">
            {mode === 'admin'
              ? 'Masuk Guru / Admin'
              : mode === 'register'
                ? 'Daftar Akun Siswa'
                : 'Masuk Ruang Siswa'}
          </h2>
          <p className="text-sm text-[#516072] mt-1">
            {mode === 'admin'
              ? 'Akses khusus pengelola materi & simulasi. Memerlukan Kode Khusus Guru / Admin agar siswa tidak salah masuk.'
              : mode === 'register'
                ? 'Daftarkan akun siswa Anda. Data & kata sandi akan tersimpan untuk login berikutnya.'
                : 'Masuk menggunakan Email & Kata Sandi akun siswa yang sudah Anda daftarkan.'}
          </p>
        </div>

        {/* Mode Switch */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-[#FFF8E9] rounded-xl mb-5 border border-[#EFE7D6]">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`py-2 px-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
              mode === 'login' ? 'bg-[#EDF8FD] text-[#182230] shadow-sm' : 'text-[#516072]'
            }`}
          >
            Masuk Siswa
          </button>
          <button
            type="button"
            onClick={() => switchMode('admin')}
            className={`py-2 px-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
              mode === 'admin' ? 'bg-[#F5EEFC] text-[#182230] shadow-sm' : 'text-[#516072]'
            }`}
          >
            Guru / Admin
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`py-2 px-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
              mode === 'register' ? 'bg-white text-[#182230] shadow-sm' : 'text-[#516072]'
            }`}
          >
            Daftar Baru
          </button>
        </div>

        {mode === 'admin' ? (
          <div className="mb-4 rounded-2xl bg-[#F5EEFC] border border-[#BB8AE8]/40 px-4 py-3 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#6D3B9E] shrink-0 mt-0.5" />
            <div className="text-xs text-[#3C2258] leading-relaxed">
              <p className="font-bold">Gerbang Khusus Guru &amp; Admin</p>
              <p className="mt-0.5">
                Masukkan Email, Kata Sandi, serta Kode Khusus Guru / Admin (dapat dilihat &amp; diubah melalui Dashboard Admin → Keamanan Akses). Siswa yang salah menekan tombol dapat{' '}
                <button type="button" onClick={() => switchMode('login')} className="font-bold underline cursor-pointer">
                  kembali ke tab Masuk Siswa
                </button>.
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-4 rounded-2xl bg-[#EDF8FD] border border-[#54BCEB]/50 px-4 py-3 flex items-start gap-3">
            <Lock className="w-5 h-5 text-[#1E6F96] shrink-0 mt-0.5" />
            <div className="text-xs text-[#183B4E] leading-relaxed">
              <p className="font-bold">
                {mode === 'register' ? 'Buat Akun Siswa Pribadi' : 'Login Akun Siswa Terdaftar'}
              </p>
              <p className="mt-0.5">
                {mode === 'register' ? (
                  <>
                    Akun dan kata sandi Anda langsung tersimpan tanpa kode khusus. Sudah punya akun?{' '}
                    <button type="button" onClick={() => switchMode('login')} className="font-bold underline cursor-pointer">
                      Masuk di sini
                    </button>.
                  </>
                ) : (
                  <>
                    Masuk memakai Email &amp; Kata Sandi yang sudah didaftarkan (tanpa kode khusus). Belum punya akun?{' '}
                    <button type="button" onClick={() => switchMode('register')} className="font-bold underline cursor-pointer">
                      Daftar Baru
                    </button>.
                  </>
                )}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl bg-[#FFDCE8] px-4 py-3 text-sm font-medium text-[#7A1C3D]"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label htmlFor="reg-name" className="block text-sm font-medium text-[#182230] mb-1">
                  Nama Lengkap
                </label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Siti Rahmawati"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D8D0BE] bg-white text-sm focus:border-[#54BCEB] outline-none"
                />
              </div>
              <div>
                <label htmlFor="reg-inst" className="block text-sm font-medium text-[#182230] mb-1">
                  Sekolah / Instansi
                </label>
                <input
                  id="reg-inst"
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="Contoh: SMK MPLB / Mahasiswa UNJ"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D8D0BE] bg-white text-sm focus:border-[#54BCEB] outline-none"
                />
              </div>
              <div>
                <span className="block text-sm font-medium text-[#182230] mb-2">
                  Pilih Karakter Detektif
                </span>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {AVATAR_OPTIONS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setAvatarId(av.id)}
                      aria-label={av.label}
                      className={`p-1 rounded-2xl border-2 transition-transform cursor-pointer ${
                        avatarId === av.id
                          ? 'border-[#54BCEB] scale-105 bg-[#EDF8FD]'
                          : 'border-transparent hover:border-[#D8D0BE]'
                      }`}
                    >
                      <DetectiveAvatar avatarId={av.id} size={40} />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-sm font-medium text-[#182230] mb-1">
              {mode === 'admin' ? 'Email Guru / Admin' : 'Email Siswa'}
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={mode === 'admin' ? 'admin@officemystery.id' : 'nama@sekolah.id'}
              className="w-full px-4 py-2.5 rounded-xl border border-[#D8D0BE] bg-white text-sm focus:border-[#54BCEB] outline-none"
            />
          </div>

          <div>
            <label htmlFor="auth-pass" className="block text-sm font-medium text-[#182230] mb-1">
              Kata Sandi
            </label>
            <div className="relative">
              <input
                id="auth-pass"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  mode === 'register'
                    ? 'Buat kata sandi untuk akun Anda'
                    : 'Masukkan kata sandi'
                }
                className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-[#D8D0BE] bg-white text-sm focus:border-[#54BCEB] outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-[#516072] hover:bg-[#EFE7D6]/60 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'admin' && (
            <div>
              <label
                htmlFor="auth-admin-code"
                className="flex items-center gap-1.5 text-sm font-semibold text-[#182230] mb-1"
              >
                <KeyRound className="w-4 h-4 text-[#6D3B9E]" />
                <span>Kode Khusus Guru / Admin</span>
              </label>
              <div className="relative">
                <input
                  id="auth-admin-code"
                  type={showAdminCode ? 'text' : 'password'}
                  required
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  placeholder="Masukkan kode khusus Guru / Admin"
                  autoComplete="off"
                  className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-[#BB8AE8] bg-[#FCF9FF] text-sm focus:border-[#6D3B9E] outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminCode((prev) => !prev)}
                  aria-label={
                    showAdminCode ? 'Sembunyikan kode khusus' : 'Tampilkan kode khusus'
                  }
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-[#516072] hover:bg-[#EFE7D6]/60 cursor-pointer"
                >
                  {showAdminCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-[#516072] mt-1">
                Diperlukan untuk membuka dashboard pengelola materi, game, dan laporan siswa.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 ${
              mode === 'admin'
                ? 'bg-[#BB8AE8] hover:bg-[#AA74DC] text-[#182230]'
                : 'bg-[#54BCEB] hover:bg-[#3FAEDB] text-[#182230]'
            }`}
          >
            {mode === 'admin' ? (
              <ShieldCheck className="w-4 h-4" />
            ) : mode === 'login' ? (
              <LogIn className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            <span>
              {loading
                ? 'Memverifikasi...'
                : mode === 'admin'
                  ? 'Verifikasi & Masuk Dashboard Guru'
                  : mode === 'login'
                    ? 'Masuk dengan Email & Sandi'
                    : 'Daftar & Simpan Akun Siswa'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
