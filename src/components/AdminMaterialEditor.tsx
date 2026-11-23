import React, { useRef, useState } from 'react';
import {
  Bold,
  Eye,
  FileUp,
  Heading2,
  ImagePlus,
  List,
  Plus,
  Save,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../utils/api';
import { MaterialDetailBody } from './StudentPortal';
import type { Category, Difficulty, Material, PublishStatus } from '../types';

interface AdminMaterialEditorProps {
  initial?: Material;
  categories: Category[];
  onCancel: () => void;
  onSave: (payload: Partial<Material>) => Promise<void>;
}

export function AdminMaterialEditor({
  initial,
  categories,
  onCancel,
  onSave,
}: AdminMaterialEditorProps) {
  const [title, setTitle] = useState(initial?.title || '');
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId || categories[0]?.id || ''
  );
  const [description, setDescription] = useState(initial?.description || '');
  const [content, setContent] = useState(
    initial?.content ||
      '## Pendahuluan Materi\n\nTuliskan penjelasan materi di sini menggunakan **teks tebal** atau poin penting.\n\n- Poin pertama\n- Poin kedua'
  );
  const [imageUrl, setImageUrl] = useState(
    initial?.imageUrl || '/src/assets/images/hero_office_mystery_1795397873973.jpg'
  );
  const [pdfUrl, setPdfUrl] = useState(initial?.pdfUrl || '');
  const [pdfName, setPdfName] = useState(initial?.pdfName || '');
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl || '');
  const [difficulty, setDifficulty] = useState<Difficulty>(
    initial?.difficulty || 'Pemula'
  );
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(
    initial?.estimatedMinutes || 10
  );
  const [objectives, setObjectives] = useState<string[]>(
    initial?.objectives?.length ? initial.objectives : ['Memahami konsep dasar materi']
  );
  const [keyPoints, setKeyPoints] = useState<string[]>(
    initial?.keyPoints?.length ? initial.keyPoints : ['Ketelitian pemeriksaan dokumen']
  );

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const contentRef = useRef<HTMLTextAreaElement | null>(null);

  function insertSnippet(snippet: string) {
    const el = contentRef.current;
    if (!el) {
      setContent((prev) => `${prev}\n${snippet}`);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end);
    let formatted = snippet;
    if (snippet === '**teks tebal**' && selected) formatted = `**${selected}**`;
    if (snippet === '## Judul Bagian' && selected) formatted = `## ${selected}`;
    if (snippet === '- Poin daftar' && selected) formatted = `- ${selected}`;

    const next = content.slice(0, start) + formatted + content.slice(end);
    setContent(next);
    window.setTimeout(() => {
      el.focus();
    }, 10);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploadingImage(true);
    try {
      const res = await api.uploadFile(file);
      setImageUrl(res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah gambar.');
    } finally {
      setUploadingImage(false);
    }
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploadingPdf(true);
    try {
      const res = await api.uploadFile(file);
      setPdfUrl(res.url);
      setPdfName(res.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah PDF.');
    } finally {
      setUploadingPdf(false);
    }
  }

  async function submitWithStatus(targetStatus: PublishStatus) {
    if (!title.trim()) {
      setError('Judul materi wajib diisi.');
      return;
    }
    if (!categoryId) {
      setError('Kategori materi wajib dipilih.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSave({
        id: initial?.id,
        title: title.trim(),
        categoryId,
        description: description.trim(),
        content,
        imageUrl,
        pdfUrl,
        pdfName,
        videoUrl: videoUrl.trim(),
        objectives: objectives.map((s) => s.trim()).filter(Boolean),
        keyPoints: keyPoints.map((s) => s.trim()).filter(Boolean),
        difficulty,
        estimatedMinutes,
        order: initial?.order,
        status: targetStatus,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan materi.');
    } finally {
      setSaving(false);
    }
  }

  const previewMaterial: Material = {
    id: initial?.id || 'preview',
    title: title || 'Pratinjau Materi Baru',
    categoryId,
    description: description || 'Deskripsi singkat materi pembelajaran.',
    content,
    imageUrl,
    pdfUrl,
    pdfName,
    videoUrl,
    objectives: objectives.filter(Boolean),
    keyPoints: keyPoints.filter(Boolean),
    difficulty,
    estimatedMinutes,
    order: 1,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EFE7D6] shadow-sm space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#EFE7D6]">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#182230]">
            {initial ? 'Edit Materi Pembelajaran' : 'Buat Materi Baru'}
          </h2>
          <p className="text-xs text-[#516072] mt-0.5">
            Susun teori, lampiran PDF, video, dan tujuan belajar tanpa perlu koding.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-[#FFF8E9] hover:bg-[#EFE7D6] text-xs font-bold text-[#182230] cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="px-4 py-2 rounded-xl bg-[#EDF8FD] hover:bg-[#DDF2FB] text-xs font-bold text-[#182230] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Preview</span>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => submitWithStatus('draft')}
            className="px-4 py-2 rounded-xl bg-[#FFCA65] hover:bg-[#F5BC4E] text-xs font-bold text-[#182230] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Draft</span>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => submitWithStatus('published')}
            className="px-5 py-2 rounded-xl bg-[#71C98A] hover:bg-[#5BB976] text-xs font-bold text-[#182230] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-5">
          <div>
            <label htmlFor="mat-title" className="block text-sm font-semibold text-[#182230] mb-1">
              Judul Materi
            </label>
            <input
              id="mat-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Komunikasi Perkantoran & Pelayanan Pelanggan"
              className="w-full px-4 py-2.5 rounded-xl border border-[#D8D0BE] text-sm focus:border-[#54BCEB] outline-none"
            />
          </div>

          <div>
            <label htmlFor="mat-desc" className="block text-sm font-semibold text-[#182230] mb-1">
              Deskripsi Singkat
            </label>
            <textarea
              id="mat-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ringkasan singkat mengenai materi yang akan dipelajari siswa..."
              className="w-full px-4 py-2.5 rounded-xl border border-[#D8D0BE] text-sm focus:border-[#54BCEB] outline-none"
            />
          </div>

          {/* Rich Text Editor with Formatting Toolbar */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label htmlFor="mat-content" className="text-sm font-semibold text-[#182230]">
                Isi Materi Pembelajaran
              </label>
              <div className="flex items-center gap-1 bg-[#FFF8E9] p-1 rounded-xl border border-[#EFE7D6]">
                <button
                  type="button"
                  onClick={() => insertSnippet('## Judul Bagian')}
                  className="px-2.5 py-1 rounded-lg hover:bg-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  title="Tambah Heading"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                  <span>Heading</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertSnippet('**teks tebal**')}
                  className="px-2.5 py-1 rounded-lg hover:bg-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  title="Tebalkan Teks"
                >
                  <Bold className="w-3.5 h-3.5" />
                  <span>Bold</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertSnippet('- Poin daftar')}
                  className="px-2.5 py-1 rounded-lg hover:bg-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  title="Tambah Bullet List"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Bullet</span>
                </button>
              </div>
            </div>
            <textarea
              ref={contentRef}
              id="mat-content"
              rows={11}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#D8D0BE] text-sm font-mono leading-relaxed focus:border-[#54BCEB] outline-none"
            />
          </div>

          {/* Objectives Builder */}
          <div className="p-4 rounded-2xl bg-[#FFF8E9] border border-[#EFE7D6] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#182230]">Tujuan Pembelajaran</span>
              <button
                type="button"
                onClick={() => setObjectives((o) => [...o, ''])}
                className="px-3 py-1 rounded-lg bg-white border border-[#D8D0BE] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Tujuan</span>
              </button>
            </div>
            {objectives.map((obj, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={obj}
                  onChange={(e) =>
                    setObjectives((prev) =>
                      prev.map((item, i) => (i === idx ? e.target.value : item))
                    )
                  }
                  placeholder={`Tujuan pembelajaran ${idx + 1}`}
                  className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#D8D0BE] text-sm"
                />
                <button
                  type="button"
                  aria-label="Hapus tujuan"
                  onClick={() =>
                    setObjectives((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="w-9 h-9 rounded-xl bg-white border border-[#D8D0BE] flex items-center justify-center text-[#9A2348] cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Key Points Builder */}
          <div className="p-4 rounded-2xl bg-[#EDF8FD] border border-[#CBE8F7] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#182230]">Poin Penting</span>
              <button
                type="button"
                onClick={() => setKeyPoints((k) => [...k, ''])}
                className="px-3 py-1 rounded-lg bg-white border border-[#CBE8F7] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Poin</span>
              </button>
            </div>
            {keyPoints.map((kp, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={kp}
                  onChange={(e) =>
                    setKeyPoints((prev) =>
                      prev.map((item, i) => (i === idx ? e.target.value : item))
                    )
                  }
                  placeholder={`Poin penting ${idx + 1}`}
                  className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#CBE8F7] text-sm"
                />
                <button
                  type="button"
                  aria-label="Hapus poin penting"
                  onClick={() =>
                    setKeyPoints((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="w-9 h-9 rounded-xl bg-white border border-[#CBE8F7] flex items-center justify-center text-[#9A2348] cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Settings & Uploads */}
        <div className="lg:col-span-4 space-y-5">
          <div className="p-5 rounded-2xl bg-[#FFF8E9] border border-[#EFE7D6] space-y-4">
            <div>
              <label htmlFor="mat-cat" className="block text-xs font-bold text-[#182230] mb-1">
                Kategori Materi
              </label>
              <select
                id="mat-cat"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#D8D0BE] text-sm"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="mat-diff" className="block text-xs font-bold text-[#182230] mb-1">
                  Kesulitan
                </label>
                <select
                  id="mat-diff"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#D8D0BE] text-sm"
                >
                  <option value="Pemula">Pemula</option>
                  <option value="Menengah">Menengah</option>
                  <option value="Mahir">Mahir</option>
                </select>
              </div>
              <div>
                <label htmlFor="mat-time" className="block text-xs font-bold text-[#182230] mb-1">
                  Durasi (Menit)
                </label>
                <input
                  id="mat-time"
                  type="number"
                  min={1}
                  max={180}
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(Number(e.target.value) || 10)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#D8D0BE] text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Image Upload */}
          <div className="p-5 rounded-2xl bg-white border border-[#EFE7D6] space-y-3">
            <p className="text-xs font-bold text-[#182230]">Gambar Pendukung</p>
            <img
              src={imageUrl}
              alt="Pratinjau sampul"
              className="w-full h-36 object-cover rounded-xl border border-[#EFE7D6]"
            />
            <label className="w-full py-2.5 px-3 rounded-xl bg-[#EDF8FD] hover:bg-[#DDF2FB] text-xs font-bold text-[#182230] flex items-center justify-center gap-2 cursor-pointer">
              <ImagePlus className="w-4 h-4" />
              <span>{uploadingImage ? 'Mengunggah...' : 'Unggah Gambar Baru'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="sr-only"
              />
            </label>
          </div>

          {/* PDF Upload */}
          <div className="p-5 rounded-2xl bg-white border border-[#EFE7D6] space-y-3">
            <p className="text-xs font-bold text-[#182230]">Lampiran Modul PDF (Opsional)</p>
            {pdfUrl && (
              <div className="p-2.5 rounded-xl bg-[#FFF8E9] text-xs flex items-center justify-between gap-2">
                <span className="truncate font-medium">{pdfName || 'Dokumen.pdf'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setPdfUrl('');
                    setPdfName('');
                  }}
                  className="text-[#9A2348] font-bold cursor-pointer"
                >
                  Hapus
                </button>
              </div>
            )}
            <label className="w-full py-2.5 px-3 rounded-xl bg-[#FFDCE8]/70 hover:bg-[#FFDCE8] text-xs font-bold text-[#182230] flex items-center justify-center gap-2 cursor-pointer">
              <FileUp className="w-4 h-4" />
              <span>{uploadingPdf ? 'Mengunggah PDF...' : 'Unggah File PDF'}</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={handlePdfUpload}
                className="sr-only"
              />
            </label>
          </div>

          {/* Video URL */}
          <div className="p-5 rounded-2xl bg-white border border-[#EFE7D6] space-y-2">
            <label htmlFor="mat-video" className="block text-xs font-bold text-[#182230]">
              Tautan Video Pembelajaran (Opsional)
            </label>
            <input
              id="mat-video"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-3 py-2 rounded-xl border border-[#D8D0BE] text-xs"
            />
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 bg-[#182230]/50 p-4 overflow-y-auto flex items-start justify-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-5xl bg-[#FFF8E9] rounded-3xl p-6 sm:p-8 my-6 relative">
            <div className="flex items-center justify-between mb-5">
              <span className="font-display font-bold text-lg text-[#182230]">
                Pratinjau Tampilan Siswa
              </span>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="w-9 h-9 rounded-xl bg-white flex items-center justify-center cursor-pointer"
                aria-label="Tutup pratinjau"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <MaterialDetailBody
              material={previewMaterial}
              category={categories.find((c) => c.id === categoryId)}
              linkedGames={[]}
              linkedQuizzes={[]}
              isPreview
            />
          </div>
        </div>
      )}
    </div>
  );
}
