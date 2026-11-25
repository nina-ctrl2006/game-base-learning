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
} from '../types';

export interface BootstrapPayload {
  currentUser: PublicUser | null;
  adminAccessCode?: string;
  categories: Category[];
  materials: Material[];
  games: GameSimulation[];
  quizzes: Quiz[];
  attempts: AttemptRecord[];
  progress: MaterialProgress[];
  users: PublicUser[];
  activities: ActivityLog[];
}

export class ApiRequestError extends Error {
  requiresAdminCode?: boolean;
  constructor(message: string, requiresAdminCode?: boolean) {
    super(message);
    this.name = 'ApiRequestError';
    this.requiresAdminCode = requiresAdminCode;
  }
}

const SESSION_KEY = 'om_current_user_id';
let inMemoryUserId = '';

export function getStoredUserId(): string {
  try {
    return localStorage.getItem(SESSION_KEY) || inMemoryUserId;
  } catch {
    return inMemoryUserId;
  }
}

export function setStoredUserId(userId: string): void {
  inMemoryUserId = userId;
  try {
    if (userId) localStorage.setItem(SESSION_KEY, userId);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore storage restriction; inMemoryUserId preserves active session
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const userId = getStoredUserId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (userId) {
    headers['x-user-id'] = userId;
  }
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errBody = data as {
      error?: string;
      requiresAdminCode?: boolean;
    };
    throw new ApiRequestError(
      errBody.error || `Permintaan gagal (${res.status})`,
      errBody.requiresAdminCode
    );
  }
  return data as T;
}

export const api = {
  login(email: string, password: string, adminCode?: string) {
    return request<{ user: PublicUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, adminCode }),
    });
  },

  register(payload: {
    name: string;
    email: string;
    password: string;
    institution?: string;
    avatarId?: string;
  }) {
    return request<{ user: PublicUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  bootstrap() {
    return request<BootstrapPayload>('/api/bootstrap');
  },

  async uploadFile(file: File): Promise<{ url: string; name: string }> {
    const dataBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Gagal membaca berkas.'));
      reader.readAsDataURL(file);
    });
    return request<{ url: string; name: string }>('/api/upload', {
      method: 'POST',
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type,
        dataBase64,
      }),
    });
  },

  saveCategory(category: Partial<Category>) {
    return request<{ category: Category }>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });
  },

  deleteCategory(id: string) {
    return request<{ ok: boolean }>(`/api/categories/${id}`, { method: 'DELETE' });
  },

  saveMaterial(material: Partial<Material>) {
    return request<{ material: Material }>('/api/materials', {
      method: 'POST',
      body: JSON.stringify(material),
    });
  },

  reorderMaterials(orderedIds: string[]) {
    return request<{ ok: boolean }>('/api/materials/reorder', {
      method: 'POST',
      body: JSON.stringify({ orderedIds }),
    });
  },

  deleteMaterial(id: string) {
    return request<{ ok: boolean }>(`/api/materials/${id}`, { method: 'DELETE' });
  },

  saveGame(game: Partial<GameSimulation>) {
    return request<{ game: GameSimulation }>('/api/games', {
      method: 'POST',
      body: JSON.stringify(game),
    });
  },

  deleteGame(id: string) {
    return request<{ ok: boolean }>(`/api/games/${id}`, { method: 'DELETE' });
  },

  saveQuiz(quiz: Partial<Quiz>) {
    return request<{ quiz: Quiz }>('/api/quizzes', {
      method: 'POST',
      body: JSON.stringify(quiz),
    });
  },

  deleteQuiz(id: string) {
    return request<{ ok: boolean }>(`/api/quizzes/${id}`, { method: 'DELETE' });
  },

  saveUser(user: Partial<User>) {
    return request<{ user: PublicUser }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  },

  updateProfile(payload: { avatarId?: string; name?: string }) {
    return request<{ user: PublicUser }>('/api/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteUser(id: string) {
    return request<{ ok: boolean }>(`/api/users/${id}`, { method: 'DELETE' });
  },

  updateAdminAccessCode(adminAccessCode: string) {
    return request<{ adminAccessCode: string }>('/api/admin/access-code', {
      method: 'PATCH',
      body: JSON.stringify({ adminAccessCode }),
    });
  },

  markMaterialRead(materialId: string, materialRead = true) {
    return request<{ progress: MaterialProgress }>('/api/progress', {
      method: 'POST',
      body: JSON.stringify({ materialId, materialRead }),
    });
  },

  submitAttempt(attempt: Omit<AttemptRecord, 'id' | 'userId' | 'userName' | 'completedAt'>) {
    return request<{ attempt: AttemptRecord; progress: MaterialProgress }>('/api/attempts', {
      method: 'POST',
      body: JSON.stringify(attempt),
    });
  },
};
