import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { loadDatabase, saveDatabase, UPLOADS_DIR } from './server/db.ts';
import type {
  ActivityLog,
  AttemptRecord,
  Category,
  GameSimulation,
  Material,
  MaterialProgress,
  PublicUser,
  Quiz,
  User,
} from './src/types.ts';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

function toPublicUser(user: User): PublicUser {
  const { password: _pwd, ...rest } = user;
  return rest;
}

function logActivity(
  db: ReturnType<typeof loadDatabase>,
  userId: string,
  action: string,
  targetTitle: string
) {
  const user = db.users.find((u) => u.id === userId);
  if (!user) return;
  const entry: ActivityLog = {
    id: `act_${crypto.randomUUID().slice(0, 8)}`,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action,
    targetTitle,
    timestamp: new Date().toISOString(),
  };
  db.activities.unshift(entry);
  db.activities = db.activities.slice(0, 100);
  user.lastActiveAt = entry.timestamp;
}

function requireAdmin(req: express.Request, res: express.Response): PublicUser | null {
  const userId = String(req.headers['x-user-id'] ?? '');
  const db = loadDatabase();
  const user = db.users.find((u) => u.id === userId);
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Akses ditolak. Khusus Admin / Guru.' });
    return null;
  }
  return toPublicUser(user);
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Auth: Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
    return;
  }
  const db = loadDatabase();
  const user = db.users.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
  );
  if (!user) {
    res.status(401).json({ error: 'Email atau kata sandi tidak sesuai.' });
    return;
  }
  user.lastActiveAt = new Date().toISOString();
  saveDatabase(db);
  res.json({ user: toPublicUser(user) });
});

// Auth: Register
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, institution, avatarId } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    institution?: string;
    avatarId?: string;
  };
  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    res.status(400).json({ error: 'Nama, email, dan kata sandi wajib diisi.' });
    return;
  }
  const db = loadDatabase();
  const exists = db.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (exists) {
    res.status(409).json({ error: 'Email sudah terdaftar. Silakan masuk dengan akun tersebut.' });
    return;
  }
  const now = new Date().toISOString();
  const newUser: User = {
    id: `usr_${crypto.randomUUID().slice(0, 8)}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: password.trim(),
    role: 'siswa',
    avatarId: avatarId || 'detective_blue',
    institution: institution?.trim() || 'Peserta Umum',
    createdAt: now,
    lastActiveAt: now,
  };
  db.users.push(newUser);
  logActivity(db, newUser.id, 'Mendaftar sebagai Siswa / Pemain baru', 'Office Mystery');
  saveDatabase(db);
  res.status(201).json({ user: toPublicUser(newUser) });
});

// Bootstrap data (role-aware)
app.get('/api/bootstrap', (req, res) => {
  const userId = String(req.headers['x-user-id'] ?? '');
  const db = loadDatabase();
  const currentUser = db.users.find((u) => u.id === userId);
  const isAdmin = currentUser?.role === 'admin';

  res.json({
    currentUser: currentUser ? toPublicUser(currentUser) : null,
    categories: [...db.categories].sort((a, b) => a.order - b.order),
    materials: (isAdmin
      ? db.materials
      : db.materials.filter((m) => m.status === 'published')
    ).sort((a, b) => a.order - b.order),
    games: isAdmin ? db.games : db.games.filter((g) => g.status === 'published'),
    quizzes: isAdmin ? db.quizzes : db.quizzes.filter((q) => q.status === 'published'),
    attempts: isAdmin
      ? db.attempts
      : currentUser
        ? db.attempts.filter((a) => a.userId === currentUser.id)
        : [],
    progress: isAdmin
      ? db.progress
      : currentUser
        ? db.progress.filter((p) => p.userId === currentUser.id)
        : [],
    users: isAdmin ? db.users.map(toPublicUser) : [],
    activities: isAdmin
      ? db.activities
      : currentUser
        ? db.activities.filter((a) => a.userId === currentUser.id)
        : [],
  });
});

// Upload PDF / Image
app.post('/api/upload', (req, res) => {
  const { filename, mimeType, dataBase64 } = req.body as {
    filename?: string;
    mimeType?: string;
    dataBase64?: string;
  };
  if (!filename || !dataBase64) {
    res.status(400).json({ error: 'Berkas tidak valid.' });
    return;
  }
  const allowedExt = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif'];
  const ext = path.extname(filename).toLowerCase() || (mimeType?.includes('pdf') ? '.pdf' : '.png');
  if (!allowedExt.includes(ext)) {
    res.status(400).json({ error: 'Format file harus PDF atau gambar (PNG/JPG/WEBP).' });
    return;
  }
  const cleanBase64 = dataBase64.includes(',') ? dataBase64.split(',')[1] : dataBase64;
  const buffer = Buffer.from(cleanBase64, 'base64');
  const savedName = `${Date.now()}_${crypto.randomUUID().slice(0, 6)}${ext}`;
  const targetPath = path.join(UPLOADS_DIR, savedName);
  fs.writeFileSync(targetPath, buffer);
  res.json({
    url: `/api/uploads/${savedName}`,
    name: filename,
  });
});

app.get('/api/uploads/:filename', (req, res) => {
  const safeName = path.basename(req.params.filename);
  const fullPath = path.join(UPLOADS_DIR, safeName);
  if (!fs.existsSync(fullPath)) {
    res.status(404).json({ error: 'File tidak ditemukan.' });
    return;
  }
  if (safeName.endsWith('.pdf')) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
  }
  res.sendFile(fullPath);
});

// Categories CRUD (Admin)
app.post('/api/categories', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  const body = req.body as Partial<Category>;
  if (!body.name?.trim()) {
    res.status(400).json({ error: 'Nama kategori wajib diisi.' });
    return;
  }
  const db = loadDatabase();
  const item: Category = {
    id: body.id || `cat_${crypto.randomUUID().slice(0, 8)}`,
    name: body.name.trim(),
    description: body.description?.trim() || '',
    color: body.color || '#54BCEB',
    order: body.order ?? db.categories.length + 1,
  };
  const idx = db.categories.findIndex((c) => c.id === item.id);
  if (idx >= 0) db.categories[idx] = item;
  else db.categories.push(item);
  logActivity(db, admin.id, idx >= 0 ? 'Memperbarui kategori' : 'Menambah kategori baru', item.name);
  saveDatabase(db);
  res.json({ category: item });
});

app.delete('/api/categories/:id', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  const db = loadDatabase();
  const target = db.categories.find((c) => c.id === req.params.id);
  db.categories = db.categories.filter((c) => c.id !== req.params.id);
  if (target) logActivity(db, admin.id, 'Menghapus kategori', target.name);
  saveDatabase(db);
  res.json({ ok: true });
});

// Materials CRUD (Admin)
app.post('/api/materials', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  const body = req.body as Partial<Material>;
  if (!body.title?.trim() || !body.categoryId) {
    res.status(400).json({ error: 'Judul dan kategori materi wajib diisi.' });
    return;
  }
  const db = loadDatabase();
  const now = new Date().toISOString();
  const existingIdx = body.id ? db.materials.findIndex((m) => m.id === body.id) : -1;
  const item: Material = {
    id: existingIdx >= 0 ? db.materials[existingIdx].id : `mat_${crypto.randomUUID().slice(0, 8)}`,
    title: body.title.trim(),
    categoryId: body.categoryId,
    description: body.description?.trim() || '',
    content: body.content || '',
    imageUrl: body.imageUrl || '/src/assets/images/hero_office_mystery_1795397873973.jpg',
    pdfUrl: body.pdfUrl || '',
    pdfName: body.pdfName || '',
    videoUrl: body.videoUrl || '',
    objectives: Array.isArray(body.objectives) ? body.objectives.filter(Boolean) : [],
    keyPoints: Array.isArray(body.keyPoints) ? body.keyPoints.filter(Boolean) : [],
    difficulty: body.difficulty || 'Pemula',
    estimatedMinutes: Number(body.estimatedMinutes) || 10,
    order: existingIdx >= 0 ? body.order ?? db.materials[existingIdx].order : db.materials.length + 1,
    status: body.status === 'published' ? 'published' : 'draft',
    createdAt: existingIdx >= 0 ? db.materials[existingIdx].createdAt : now,
    updatedAt: now,
  };
  if (existingIdx >= 0) db.materials[existingIdx] = item;
  else db.materials.push(item);

  logActivity(
    db,
    admin.id,
    `${existingIdx >= 0 ? 'Memperbarui' : 'Membuat'} materi (${item.status === 'published' ? 'Publik' : 'Draft'})`,
    item.title
  );
  saveDatabase(db);
  res.json({ material: item });
});

app.post('/api/materials/reorder', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  const { orderedIds } = req.body as { orderedIds?: string[] };
  if (!Array.isArray(orderedIds)) {
    res.status(400).json({ error: 'Daftar urutan tidak valid.' });
    return;
  }
  const db = loadDatabase();
  orderedIds.forEach((id, idx) => {
    const m = db.materials.find((x) => x.id === id);
    if (m) m.order = idx + 1;
  });
  saveDatabase(db);
  res.json({ ok: true });
});

app.delete('/api/materials/:id', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  const db = loadDatabase();
  const target = db.materials.find((m) => m.id === req.params.id);
  db.materials = db.materials.filter((m) => m.id !== req.params.id);
  if (target) logActivity(db, admin.id, 'Menghapus materi', target.title);
  saveDatabase(db);
  res.json({ ok: true });
});

// Games / Simulations CRUD (Admin)
app.post('/api/games', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  const body = req.body as Partial<GameSimulation>;
  if (!body.title?.trim() || !body.materialId) {
    res.status(400).json({ error: 'Judul game dan materi terkait wajib diisi.' });
    return;
  }
  const db = loadDatabase();
  const now = new Date().toISOString();
  const existingIdx = body.id ? db.games.findIndex((g) => g.id === body.id) : -1;
  const item: GameSimulation = {
    id: existingIdx >= 0 ? db.games[existingIdx].id : `game_${crypto.randomUUID().slice(0, 8)}`,
    materialId: body.materialId,
    title: body.title.trim(),
    description: body.description?.trim() || '',
    story: body.story?.trim() || '',
    instructions: body.instructions?.trim() || '',
    timerSeconds: Number(body.timerSeconds) || 300,
    difficulty: body.difficulty || 'Pemula',
    status: body.status === 'published' ? 'published' : 'draft',
    challenges: Array.isArray(body.challenges) ? body.challenges : [],
    createdAt: existingIdx >= 0 ? db.games[existingIdx].createdAt : now,
    updatedAt: now,
  };
  if (existingIdx >= 0) db.games[existingIdx] = item;
  else db.games.push(item);

  logActivity(
    db,
    admin.id,
    `${existingIdx >= 0 ? 'Memperbarui' : 'Membuat'} game simulasi (${item.status === 'published' ? 'Publik' : 'Draft'})`,
    item.title
  );
  saveDatabase(db);
  res.json({ game: item });
});

app.delete('/api/games/:id', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  const db = loadDatabase();
  const target = db.games.find((g) => g.id === req.params.id);
  db.games = db.games.filter((g) => g.id !== req.params.id);
  if (target) logActivity(db, admin.id, 'Menghapus game simulasi', target.title);
  saveDatabase(db);
  res.json({ ok: true });
});

// Quizzes CRUD (Admin)
app.post('/api/quizzes', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  const body = req.body as Partial<Quiz>;
  if (!body.title?.trim() || !body.materialId) {
    res.status(400).json({ error: 'Judul kuis dan materi terkait wajib diisi.' });
    return;
  }
  const db = loadDatabase();
  const now = new Date().toISOString();
  const existingIdx = body.id ? db.quizzes.findIndex((q) => q.id === body.id) : -1;
  const item: Quiz = {
    id: existingIdx >= 0 ? db.quizzes[existingIdx].id : `quiz_${crypto.randomUUID().slice(0, 8)}`,
    materialId: body.materialId,
    title: body.title.trim(),
    description: body.description?.trim() || '',
    timerSeconds: Number(body.timerSeconds) || 240,
    passingScore: Number(body.passingScore) || 70,
    status: body.status === 'published' ? 'published' : 'draft',
    questions: Array.isArray(body.questions) ? body.questions : [],
    createdAt: existingIdx >= 0 ? db.quizzes[existingIdx].createdAt : now,
    updatedAt: now,
  };
  if (existingIdx >= 0) db.quizzes[existingIdx] = item;
  else db.quizzes.push(item);

  logActivity(
    db,
    admin.id,
    `${existingIdx >= 0 ? 'Memperbarui' : 'Membuat'} kuis (${item.status === 'published' ? 'Publik' : 'Draft'})`,
    item.title
  );
  saveDatabase(db);
  res.json({ quiz: item });
});

app.delete('/api/quizzes/:id', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  const db = loadDatabase();
  const target = db.quizzes.find((q) => q.id === req.params.id);
  db.quizzes = db.quizzes.filter((q) => q.id !== req.params.id);
  if (target) logActivity(db, admin.id, 'Menghapus kuis', target.title);
  saveDatabase(db);
  res.json({ ok: true });
});

// Users Management (Admin + Profile Avatar Update)
app.post('/api/users', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  const body = req.body as Partial<User>;
  if (!body.name?.trim() || !body.email?.trim()) {
    res.status(400).json({ error: 'Nama dan email wajib diisi.' });
    return;
  }
  const db = loadDatabase();
  const now = new Date().toISOString();
  const existingIdx = body.id ? db.users.findIndex((u) => u.id === body.id) : -1;
  if (existingIdx >= 0) {
    const prev = db.users[existingIdx];
    db.users[existingIdx] = {
      ...prev,
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      role: body.role === 'admin' ? 'admin' : 'siswa',
      institution: body.institution?.trim() || prev.institution,
      password: body.password?.trim() ? body.password.trim() : prev.password,
    };
    logActivity(db, admin.id, 'Memperbarui data pengguna', body.name.trim());
    saveDatabase(db);
    res.json({ user: toPublicUser(db.users[existingIdx]) });
    return;
  }
  if (db.users.some((u) => u.email.toLowerCase() === body.email!.trim().toLowerCase())) {
    res.status(409).json({ error: 'Email sudah digunakan.' });
    return;
  }
  const created: User = {
    id: `usr_${crypto.randomUUID().slice(0, 8)}`,
    name: body.name.trim(),
    email: body.email.trim().toLowerCase(),
    password: body.password?.trim() || 'siswa123',
    role: body.role === 'admin' ? 'admin' : 'siswa',
    avatarId: body.avatarId || 'detective_blue',
    institution: body.institution?.trim() || 'SMK MPLB',
    createdAt: now,
    lastActiveAt: now,
  };
  db.users.push(created);
  logActivity(db, admin.id, 'Menambahkan pengguna baru', created.name);
  saveDatabase(db);
  res.status(201).json({ user: toPublicUser(created) });
});

app.patch('/api/users/profile', (req, res) => {
  const userId = String(req.headers['x-user-id'] ?? '');
  const { avatarId, name } = req.body as { avatarId?: string; name?: string };
  const db = loadDatabase();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    res.status(401).json({ error: 'Pengguna tidak ditemukan.' });
    return;
  }
  if (avatarId) user.avatarId = avatarId;
  if (name?.trim()) user.name = name.trim();
  saveDatabase(db);
  res.json({ user: toPublicUser(user) });
});

app.delete('/api/users/:id', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  if (req.params.id === admin.id) {
    res.status(400).json({ error: 'Tidak dapat menghapus akun Anda sendiri.' });
    return;
  }
  const db = loadDatabase();
  db.users = db.users.filter((u) => u.id !== req.params.id);
  saveDatabase(db);
  res.json({ ok: true });
});

// Student Progress & Attempts
app.post('/api/progress', (req, res) => {
  const userId = String(req.headers['x-user-id'] ?? '');
  const { materialId, materialRead } = req.body as {
    materialId?: string;
    materialRead?: boolean;
  };
  const db = loadDatabase();
  const user = db.users.find((u) => u.id === userId);
  if (!user || !materialId) {
    res.status(400).json({ error: 'Permintaan progres tidak valid.' });
    return;
  }
  const now = new Date().toISOString();
  let prog = db.progress.find((p) => p.userId === userId && p.materialId === materialId);
  if (!prog) {
    prog = {
      userId,
      materialId,
      materialRead: Boolean(materialRead),
      simulationCompleted: false,
      simulationBestScore: 0,
      quizCompleted: false,
      quizBestScore: 0,
      updatedAt: now,
    };
    db.progress.push(prog);
  } else {
    if (typeof materialRead === 'boolean') prog.materialRead = materialRead;
    prog.updatedAt = now;
  }
  const mat = db.materials.find((m) => m.id === materialId);
  if (materialRead && mat) {
    logActivity(db, userId, 'Menyelesaikan bacaan materi', mat.title);
  }
  saveDatabase(db);
  res.json({ progress: prog });
});

app.post('/api/attempts', (req, res) => {
  const userId = String(req.headers['x-user-id'] ?? '');
  const db = loadDatabase();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    res.status(401).json({ error: 'Silakan masuk terlebih dahulu.' });
    return;
  }
  const body = req.body as Omit<AttemptRecord, 'id' | 'userId' | 'userName' | 'completedAt'>;
  const now = new Date().toISOString();
  const attempt: AttemptRecord = {
    ...body,
    id: `att_${crypto.randomUUID().slice(0, 8)}`,
    userId: user.id,
    userName: user.name,
    completedAt: now,
  };
  db.attempts.unshift(attempt);

  // Update progress record
  let prog: MaterialProgress | undefined = db.progress.find(
    (p) => p.userId === user.id && p.materialId === attempt.materialId
  );
  if (!prog) {
    prog = {
      userId: user.id,
      materialId: attempt.materialId,
      materialRead: true,
      simulationCompleted: false,
      simulationBestScore: 0,
      quizCompleted: false,
      quizBestScore: 0,
      updatedAt: now,
    };
    db.progress.push(prog);
  }
  if (attempt.kind === 'simulation') {
    prog.simulationCompleted = true;
    prog.simulationBestScore = Math.max(prog.simulationBestScore, attempt.percentage);
  } else {
    prog.quizCompleted = true;
    prog.quizBestScore = Math.max(prog.quizBestScore, attempt.percentage);
  }
  prog.updatedAt = now;

  logActivity(
    db,
    user.id,
    `Menyelesaikan ${attempt.kind === 'simulation' ? 'Simulasi' : 'Kuis'} (Skor ${attempt.percentage}%)`,
    attempt.targetTitle
  );
  saveDatabase(db);
  res.status(201).json({ attempt, progress: prog });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Office Mystery server running on http://localhost:${PORT}`);
  });
}

startServer();
