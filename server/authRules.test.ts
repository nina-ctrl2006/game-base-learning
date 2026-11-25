import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ADMIN_ACCESS_CODE,
  resolveAdminAccessCode,
  validateAdminLoginGate,
  validateNewAdminAccessCode,
} from './authRules';

test('siswa role bypasses admin access code gate and logs in with password only', () => {
  const res = validateAdminLoginGate('siswa', undefined, 'GURU2026');
  assert.equal(res.allowed, true);
});

test('admin role is rejected when access code is empty or whitespace', () => {
  const emptyRes = validateAdminLoginGate('admin', '', 'GURU2026');
  assert.equal(emptyRes.allowed, false);
  assert.equal(emptyRes.requiresAdminCode, true);

  const spaceRes = validateAdminLoginGate('admin', '   ', 'GURU2026');
  assert.equal(spaceRes.allowed, false);
  assert.equal(spaceRes.requiresAdminCode, true);
});

test('admin role is rejected when access code does not match', () => {
  const res = validateAdminLoginGate('admin', 'SALAH999', 'GURU2026');
  assert.equal(res.allowed, false);
  assert.equal(res.requiresAdminCode, true);
});

test('admin role passes with exact code (trimmed) and falls back to default when unconfigured', () => {
  const exactRes = validateAdminLoginGate('admin', ' GURU2026 ', undefined);
  assert.equal(exactRes.allowed, true);
  assert.equal(resolveAdminAccessCode(undefined), DEFAULT_ADMIN_ACCESS_CODE);

  const customRes = validateAdminLoginGate('admin', 'MPLB2027', 'MPLB2027');
  assert.equal(customRes.allowed, true);
});

test('new admin access code validation enforces length and no whitespace', () => {
  assert.equal(validateNewAdminAccessCode('123').valid, false);
  assert.equal(validateNewAdminAccessCode('GURU 2026').valid, false);
  assert.equal(validateNewAdminAccessCode('ADMIN77').valid, true);
  assert.equal(validateNewAdminAccessCode('  SMK123  ').normalized, 'SMK123');
});
