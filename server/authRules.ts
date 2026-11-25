import type { UserRole } from '../src/types';

export const DEFAULT_ADMIN_ACCESS_CODE = 'GURU2026';

export interface AdminGateResult {
  allowed: boolean;
  requiresAdminCode?: boolean;
  error?: string;
}

export function resolveAdminAccessCode(configuredCode?: string): string {
  const cleaned = configuredCode?.trim();
  return cleaned && cleaned.length >= 4 ? cleaned : DEFAULT_ADMIN_ACCESS_CODE;
}

export function validateAdminLoginGate(
  role: UserRole,
  providedCode: string | undefined,
  configuredCode?: string
): AdminGateResult {
  if (role !== 'admin') {
    return { allowed: true };
  }

  const normalizedProvided = (providedCode ?? '').trim();
  if (!normalizedProvided) {
    return {
      allowed: false,
      requiresAdminCode: true,
      error: 'Akses Guru / Admin memerlukan Kode Khusus Guru / Admin.',
    };
  }

  const expectedCode = resolveAdminAccessCode(configuredCode);
  if (normalizedProvided !== expectedCode) {
    return {
      allowed: false,
      requiresAdminCode: true,
      error: 'Kode Khusus Guru / Admin tidak sesuai. Periksa kembali kode Anda.',
    };
  }

  return { allowed: true };
}

export function validateNewAdminAccessCode(nextCode: string | undefined): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const normalized = (nextCode ?? '').trim();
  if (normalized.length < 4 || normalized.length > 32) {
    return {
      valid: false,
      normalized,
      error: 'Kode Khusus Guru / Admin harus terdiri dari 4 hingga 32 karakter.',
    };
  }
  if (/\s/.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: 'Kode Khusus Guru / Admin tidak boleh mengandung spasi.',
    };
  }
  return { valid: true, normalized };
}
