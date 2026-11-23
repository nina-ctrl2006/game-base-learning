import React, { useState } from 'react';
import { Lock, LogIn, UserPlus, X } from 'lucide-react';
import { AVATAR_OPTIONS, DetectiveAvatar } from './Avatars';
import { api } from '../utils/api';
import type { PublicUser } from '../types';

interface AuthModalProps {
  initialMode: 'login' | 'register';
  onClose: () => void;
  onSuccess: (user: PublicUser) => void;
}

export function AuthModal({ initialMode, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [institution, setInstitution] = useState('');
  const [avatarId, setAvatarId] = useState('detective_blue');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await api.login(email, password);
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
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan autentikasi.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDemo(demoEmail: string, demoPassword: string) {
    setError('');
    setLoading(true);
    try {
      const res = await api.login(demoEmail, demoPassword);
      onSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk akun demo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#182230]/40 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-[#EFE7D6] p-6 sm:p-8 relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup jendela login"
          className="absolute top-5 right-5 w-9 h-9 rounded-xl bg-[#FFF8E9] hover:bg-[#FFCA65]/40 flex items-center justify-center text-[#182230] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-5">
          <h2 id="auth-modal-title" className="font-display text-2xl font-bold text-[#182230]">
            {mode === 'login' ? 'Masuk ke Office Mystery' : 'Daftar Akun Siswa'}
          </h2>
          <p className="text-sm text-[#516072] mt-1">
            {mode === 'login'
              ? 'Gunakan akun Guru/Admin atau Siswa untuk mengakses platform.'
              : 'Buat akun baru untuk menyimpan progres belajar dan skor misi Anda.'}
          </p>
        </div>

        {/* Mode Switch */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-[#FFF8E9] rounded-xl mb-5 border border-[#EFE7D6]">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
              mode === 'login' ? 'bg-white text-[#182230] shadow-sm' : 'text-[#516072]'
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={`py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
              mode === 'register' ? 'bg-white text-[#182230] shadow-sm' : 'text-[#516072]'
            }`}
          >
            Daftar Baru
          </button>
        </div>

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
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@sekolah.id"
              className="w-full px-4 py-2.5 rounded-xl border border-[#D8D0BE] bg-white text-sm focus:border-[#54BCEB] outline-none"
            />
          </div>

          <div>
            <label htmlFor="auth-pass" className="block text-sm font-medium text-[#182230] mb-1">
              Kata Sandi
            </label>
            <input
              id="auth-pass"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan kata sandi"
              className="w-full px-4 py-2.5 rounded-xl border border-[#D8D0BE] bg-white text-sm focus:border-[#54BCEB] outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#54BCEB] hover:bg-[#3FAEDB] text-[#182230] font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
          >
            {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            <span>{loading ? 'Memproses...' : mode === 'login' ? 'Masuk Sekarang' : 'Buat Akun Siswa'}</span>
          </button>
        </form>

        {/* Demo Quick Access */}
        <div className="mt-6 pt-5 border-t border-[#EFE7D6]">
          <p className="text-xs font-semibold text-[#516072] flex items-center gap-1.5 mb-3">
            <Lock className="w-3.5 h-3.5" />
            <span>Akses Cepat Akun Pengujian (Demo)</span>
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemo('siswa@officemystery.id', 'siswa123')}
              className="px-3 py-2.5 rounded-xl bg-[#EEF9F1] hover:bg-[#DCF3E3] text-[#182230] text-xs font-semibold text-left transition-colors cursor-pointer"
            >
              <span className="block font-bold">Siswa / Pemain</span>
              <span className="block text-[11px] text-[#516072] truncate">siswa@officemystery.id</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemo('admin@officemystery.id', 'admin123')}
              className="px-3 py-2.5 rounded-xl bg-[#F5EEFC] hover:bg-[#E9DAF8] text-[#182230] text-xs font-semibold text-left transition-colors cursor-pointer"
            >
              <span className="block font-bold">Admin / Guru</span>
              <span className="block text-[11px] text-[#516072] truncate">admin@officemystery.id</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
