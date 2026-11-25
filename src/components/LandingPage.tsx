import React from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  Gamepad2,
  GraduationCap,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { SafeImage } from './Avatars';
import type { Material } from '../types';

interface LandingPageProps {
  materialsCount: number;
  gamesCount: number;
  materials: Material[];
  onOpenAuth: (mode?: 'login' | 'admin' | 'register') => void;
  onQuickDemoLogin: (role: 'admin' | 'siswa') => void;
}

export function LandingPage({
  materialsCount,
  gamesCount,
  materials,
  onOpenAuth,
  onQuickDemoLogin,
}: LandingPageProps) {
  const missionCards = [
    {
      num: '01',
      title: 'Data Pegawai Ganda',
      topic: 'Pengelolaan Data',
      desc: 'Periksa tabel induk pegawai, deteksi NIP duplikat, dan selamatkan integritas penggajian kantor.',
      image: '/src/assets/images/materi_data_1795397877161.jpg',
      accent: '#BB8AE8',
    },
    {
      num: '02',
      title: 'Dokumen Hilang',
      topic: 'Kearsipan',
      desc: 'Lacak surat yang salah tempat, klasifikasikan kode arsip, dan urutkan SOP penyimpanan yang benar.',
      image: '/src/assets/images/materi_kearsipan_1795397875440.jpg',
      accent: '#54BCEB',
    },
    {
      num: '03',
      title: 'Inventaris Kantor',
      topic: 'Pengelolaan Inventaris',
      desc: 'Lakukan stock opname antara catatan buku inventaris dengan jumlah fisik barang serta telusuri selisihnya.',
      image: '/src/assets/images/materi_inventaris_1795397875092.jpg',
      accent: '#71C98A',
    },
    {
      num: '04',
      title: 'Dokumen Rahasia',
      topic: 'Keamanan Informasi',
      desc: 'Tetapkan tingkat kerahasiaan dokumen dan hak akses pegawai agar informasi sensitif terhindar dari kebocoran.',
      image: '/src/assets/images/materi_keamanan_1795397875048.jpg',
      accent: '#FFCA65',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FFF8E9] text-[#182230]">
      {/* Top Bar: 3-zone contract */}
      <header className="sticky top-0 z-30 bg-white/95 border-b border-[#E9E2D2]">
        <div className="max-w-[1240px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="font-display text-xl font-extrabold tracking-tight text-[#182230] whitespace-nowrap shrink-0"
          >
            Office Mystery
          </a>

          <nav
            aria-label="Navigasi utama"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#516072]"
          >
            <a
              href="#tentang"
              className="hover:text-[#182230] transition-colors whitespace-nowrap shrink-0"
            >
              Tentang
            </a>
            <a
              href="#misi"
              className="hover:text-[#182230] transition-colors whitespace-nowrap shrink-0"
            >
              Misi Utama
            </a>
            <a
              href="#alur"
              className="hover:text-[#182230] transition-colors whitespace-nowrap shrink-0"
            >
              Alur Belajar
            </a>
            <a
              href="#sasaran"
              className="hover:text-[#182230] transition-colors whitespace-nowrap shrink-0"
            >
              Sasaran
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="px-5 py-2.5 rounded-xl bg-[#54BCEB] hover:bg-[#3FAEDB] text-[#182230] font-semibold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Masuk Platform
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero Split Section */}
        <section id="tentang" className="max-w-[1240px] mx-auto px-6 pt-12 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-6 bg-white rounded-3xl p-8 lg:p-10 shadow-sm border border-[#EFE7D6] flex flex-col justify-between">
              <div>
                <p className="text-sm font-semibold text-[#2B8CBE] mb-3">
                  Platform Pembelajaran & Game Simulator Perkantoran
                </p>
                <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-extrabold leading-[1.14] text-[#182230] text-balance">
                  Misi Penyelamatan Data di Dunia Kerja Perkantoran
                </h1>
                <p className="mt-4 text-base leading-relaxed text-[#516072] max-w-[54ch]">
                  Jadilah staf administrasi penyelamat data! Pelajari materi perkantoran,
                  pecahkan misteri dokumen kantor melalui simulasi interaktif, dan ukur
                  ketelitian Anda lewat evaluasi nyata.
                </p>
              </div>

              <div className="mt-8 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    data-start="true"
                    onClick={() => onQuickDemoLogin('siswa')}
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#FFCA65] hover:bg-[#F5BC4E] text-[#182230] font-bold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
                  >
                    <span>Mulai Bermain sebagai Siswa</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAuth('admin')}
                    className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-[#EDF8FD] hover:bg-[#DDF2FB] text-[#182230] font-semibold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Masuk Dashboard Guru / Admin</span>
                  </button>
                </div>
                <p className="text-xs text-[#516072]">
                  Sudah punya akun khusus atau ingin mendaftar baru?{' '}
                  <button
                    type="button"
                    onClick={() => onOpenAuth('register')}
                    className="font-semibold text-[#2B8CBE] hover:underline cursor-pointer"
                  >
                    Daftar Akun Siswa
                  </button>
                </p>
              </div>
            </div>

            <div className="lg:col-span-6 rounded-3xl overflow-hidden bg-white shadow-sm border border-[#EFE7D6] min-h-[300px]">
              <SafeImage
                src="/src/assets/images/hero_office_mystery_1795397873973.jpg"
                alt="Tim staf administrasi Office Mystery memeriksa dokumen dan folder arsip di kantor"
                title="Office Mystery: Misi Penyelamatan Data"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* 4-Column Summary Strip Below Hero */}
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-[#EFE7D6]">
              <p className="font-mono text-2xl font-bold text-[#182230] tabular-nums">
                {materialsCount} Modul
              </p>
              <p className="text-sm text-[#516072] mt-1">
                Materi aktif siap dipelajari dan ditambah kapan saja oleh guru
              </p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#EFE7D6]">
              <p className="font-mono text-2xl font-bold text-[#182230] tabular-nums">
                {gamesCount} Misi
              </p>
              <p className="text-sm text-[#516072] mt-1">
                Game simulator investigasi kantor terhubung langsung ke materi
              </p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#EFE7D6]">
              <p className="font-mono text-2xl font-bold text-[#182230] tabular-nums">
                8 Mekanisme
              </p>
              <p className="text-sm text-[#516072] mt-1">
                Drag & drop, cari kesalahan data, urutkan SOP, hingga studi kasus
              </p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#EFE7D6]">
              <p className="font-mono text-2xl font-bold text-[#182230] tabular-nums">
                4 Predikat
              </p>
              <p className="text-sm text-[#516072] mt-1">
                Evaluasi skor otomatis mulai Trainee hingga Master Administrator
              </p>
            </div>
          </div>
        </section>

        {/* 4 Core Missions Showcase */}
        <section id="misi" className="max-w-[1240px] mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#182230]">
                Empat Misi Utama Penyelamatan Data
              </h2>
              <p className="text-[#516072] mt-2 max-w-[62ch]">
                Setiap misi menggabungkan teori administrasi perkantoran dengan simulasi
                praktik kerja. Guru juga dapat menambahkan materi dan simulasi topik baru
                langsung melalui editor tanpa koding.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onQuickDemoLogin('siswa')}
              className="text-sm font-semibold text-[#2B8CBE] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              Lihat semua {materials.length} materi tersedia →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {missionCards.map((card) => (
              <article
                key={card.num}
                className="bg-white rounded-3xl overflow-hidden border border-[#EFE7D6] shadow-sm flex flex-col"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-[#FFF8E9]">
                  <SafeImage
                    src={card.image}
                    alt={card.title}
                    title={card.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#516072] mb-2">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: card.accent }}
                        aria-hidden="true"
                      />
                      <span>Misi {card.num}</span>
                      <span aria-hidden="true">·</span>
                      <span>{card.topic}</span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-[#182230]">
                      {card.title}
                    </h3>
                    <p className="mt-2 text-sm text-[#516072] leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Integrated Learning & Dual-System Workflow */}
        <section id="alur" className="bg-white border-y border-[#EFE7D6] py-14">
          <div className="max-w-[1240px] mx-auto px-6">
            <div className="max-w-2xl mb-10">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#182230]">
                Dua Sistem Terintegrasi untuk Guru dan Siswa
              </h2>
              <p className="text-[#516072] mt-2">
                Seluruh materi, file PDF, game simulasi, dan kuis yang dipublikasikan
                admin langsung tersinkronisasi ke ruang belajar siswa.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="rounded-3xl bg-[#FFF8E9] p-7 border border-[#EFE7D6]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-[#54BCEB] flex items-center justify-center text-[#182230]">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-[#182230]">
                      Alur Belajar Siswa / Pemain
                    </h3>
                    <p className="text-xs text-[#516072]">
                      Eksplorasi teori lalu praktikkan di meja kerja simulasi
                    </p>
                  </div>
                </div>
                <ol className="space-y-3 text-sm text-[#2F3B4B]">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#71C98A] mt-0.5 shrink-0" />
                    <span>Pilih materi pembelajaran yang dipublikasikan guru sesuai minat atau tingkat kesulitan.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <FileSearch className="w-4 h-4 text-[#54BCEB] mt-0.5 shrink-0" />
                    <span>Pelajari penjelasan terstruktur, tujuan belajar, lampiran PDF, dan video pendukung.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Gamepad2 className="w-4 h-4 text-[#FFCA65] mt-0.5 shrink-0" />
                    <span>Mainkan Game Simulator dengan 8 jenis tantangan investigasi perkantoran dan timer aktif.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Award className="w-4 h-4 text-[#BB8AE8] mt-0.5 shrink-0" />
                    <span>Kerjakan kuis evaluasi, dapatkan predikat pencapaian, pembahasan, dan rekomendasi belajar.</span>
                  </li>
                </ol>
              </div>

              <div className="rounded-3xl bg-[#EDF8FD] p-7 border border-[#D4ECF8]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-[#BB8AE8] flex items-center justify-center text-[#182230]">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-[#182230]">
                      Kendali Penuh Guru / Admin
                    </h3>
                    <p className="text-xs text-[#516072]">
                      Buat materi dan game simulator baru tanpa menyentuh kode
                    </p>
                  </div>
                </div>
                <ol className="space-y-3 text-sm text-[#2F3B4B]">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#2B8CBE] mt-0.5 shrink-0" />
                    <span>Susun materi baru dengan editor teks, unggah gambar & dokumen PDF, dan atur kategori.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#2B8CBE] mt-0.5 shrink-0" />
                    <span>Rakit game simulasi dinamis dengan beberapa tantangan dari 8 tipe aktivitas interaktif.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#2B8CBE] mt-0.5 shrink-0" />
                    <span>Kelola soal kuis evaluasi, preview sebelum terbit, lalu publikasikan secara instan.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#2B8CBE] mt-0.5 shrink-0" />
                    <span>Pantau progres setiap siswa, skor simulasi, nilai kuis, dan unduh laporan pembelajaran.</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* Target Audience */}
        <section id="sasaran" className="max-w-[1240px] mx-auto px-6 py-14">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#182230] text-center">
            Dirancang Khusus untuk Pembelajaran Administrasi Modern
          </h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-7 border border-[#EFE7D6]">
              <div className="w-11 h-11 rounded-2xl bg-[#FFCA65]/40 flex items-center justify-center mb-4">
                <GraduationCap className="w-5 h-5 text-[#182230]" />
              </div>
              <h3 className="font-display text-lg font-bold">Siswa SMK MPLB</h3>
              <p className="text-sm text-[#516072] mt-2 leading-relaxed">
                Membantu siswa jurusan Manajemen Perkantoran dan Layanan Bisnis berlatih
                ketelitian kearsipan, inventaris, dan tata kelola data sebelum PKL.
              </p>
            </div>
            <div className="bg-white rounded-3xl p-7 border border-[#EFE7D6]">
              <div className="w-11 h-11 rounded-2xl bg-[#71C98A]/35 flex items-center justify-center mb-4">
                <Users className="w-5 h-5 text-[#182230]" />
              </div>
              <h3 className="font-display text-lg font-bold">
                Mahasiswa Administrasi Perkantoran
              </h3>
              <p className="text-sm text-[#516072] mt-2 leading-relaxed">
                Media praktikum digital berbasis studi kasus perkantoran nyata untuk
                mata kuliah manajemen arsip, perkantoran digital, dan keamanan informasi.
              </p>
            </div>
            <div className="bg-white rounded-3xl p-7 border border-[#EFE7D6]">
              <div className="w-11 h-11 rounded-2xl bg-[#FFDCE8] flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5 text-[#182230]" />
              </div>
              <h3 className="font-display text-lg font-bold">Masyarakat & Staf Umum</h3>
              <p className="text-sm text-[#516072] mt-2 leading-relaxed">
                Terbuka bagi siapa saja yang ingin meningkatkan keterampilan dasar
                pengelolaan dokumen, audit data, dan kesadaran keamanan informasi kantor.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#EFE7D6] bg-white py-8">
        <div className="max-w-[1240px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#516072]">
          <p className="font-medium text-[#182230]">
            Office Mystery: Misi Penyelamatan Data
          </p>
          <p>
            Platform Pembelajaran Digital Administrasi Perkantoran · Kelompok 12 Pendidikan Administrasi Perkantoran UNJ
          </p>
        </div>
      </footer>
    </div>
  );
}
