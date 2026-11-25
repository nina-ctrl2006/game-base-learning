import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeLiveSimulationStats,
  getChallengeHint,
  getStreakReaction,
  getVisualSceneSummary,
  isChallengeAnswered,
} from './simulatorHelpers';
import type { Challenge } from '../types';

const sampleChallenges: Challenge[] = [
  {
    id: 'ch_1',
    order: 1,
    type: 'multiple_choice',
    title: 'Pilih Langkah',
    prompt: 'Apa langkah benar?',
    points: 20,
    explanation: 'Penjelasan.',
    options: ['A', 'B'],
    correctIndex: 1,
  },
  {
    id: 'ch_2',
    order: 2,
    type: 'find_the_error',
    title: 'Audit Tabel',
    prompt: 'Temukan error',
    points: 30,
    explanation: 'Penjelasan.',
    columns: ['NIP', 'Nama'],
    rows: [
      { id: 'r1', cells: ['101', 'Ani'], isError: false },
      { id: 'r2', cells: ['101', 'Budi'], isError: true, errorReason: 'NIP Ganda' },
      { id: 'r3', cells: ['103', 'Cici'], isError: true, errorReason: 'Format Salah' },
    ],
  },
];

test('isChallengeAnswered detects answered states accurately', () => {
  assert.equal(isChallengeAnswered(sampleChallenges[0], undefined), false);
  assert.equal(isChallengeAnswered(sampleChallenges[0], 1), true);
  assert.equal(isChallengeAnswered(sampleChallenges[1], []), false);
  assert.equal(isChallengeAnswered(sampleChallenges[1], ['r2']), true);
});

test('computeLiveSimulationStats calculates live checked score and counts', () => {
  const stats = computeLiveSimulationStats(
    sampleChallenges,
    { ch_1: 1, ch_2: ['r2'] },
    { ch_1: true }
  );
  assert.equal(stats.earnedPoints, 20);
  assert.equal(stats.maxCheckedPoints, 20);
  assert.equal(stats.totalPossiblePoints, 50);
  assert.equal(stats.checkedCount, 1);
  assert.equal(stats.correctCount, 1);
  assert.equal(stats.answeredCount, 2);
});

test('getChallengeHint returns helpful context-aware clues', () => {
  const hint = getChallengeHint(sampleChallenges[1]);
  assert.match(hint, /2 baris data yang bermasalah/);
});

test('getStreakReaction escalates encouragement on combos', () => {
  assert.match(getStreakReaction(1, true, 20), /Tepat sasaran/);
  assert.match(getStreakReaction(3, true, 20), /Hattrick x3/);
  assert.match(getStreakReaction(0, false, 0), /Belum tepat/);
});

test('getVisualSceneSummary reports live status and tones accurately', () => {
  const scanning = getVisualSceneSummary(sampleChallenges[1], ['r2'], false);
  assert.equal(scanning.sceneTitle, 'Monitor Audit & Pemindai Tabel');
  assert.equal(scanning.statusLabel, '1 Baris Ditandai Audit');
  assert.equal(scanning.statusTone, 'active');

  const verified = getVisualSceneSummary(sampleChallenges[0], 1, true, true);
  assert.equal(verified.statusLabel, 'Terverifikasi Tepat');
  assert.equal(verified.statusTone, 'success');
});

import {
  applySmartScanner,
  calculateSpeedBonus,
  computeOfficeIntegrity,
  getNpcDispatch,
} from './simulatorHelpers';

test('computeOfficeIntegrity tracks office reputation across checked cases', () => {
  assert.deepEqual(computeOfficeIntegrity([]), { percentage: 100, label: 'Prima' });
  assert.deepEqual(computeOfficeIntegrity([false, false]), { percentage: 56, label: 'Waspada' });
  assert.deepEqual(computeOfficeIntegrity([false, false, false, false]), {
    percentage: 20,
    label: 'Kritis',
  });
  assert.deepEqual(computeOfficeIntegrity([false, true, true]), {
    percentage: 98,
    label: 'Prima',
  });
});

test('getNpcDispatch returns contextual NPC reactions', () => {
  const initial = getNpcDispatch(sampleChallenges[1], {
    isChecked: false,
    answered: false,
    streak: 0,
  });
  assert.equal(initial.npcName, 'Pak Hendra');
  assert.equal(initial.mood, 'info');

  const comboWin = getNpcDispatch(sampleChallenges[0], {
    isChecked: true,
    isCorrect: true,
    answered: true,
    streak: 3,
  });
  assert.equal(comboWin.mood, 'success');
  assert.match(comboWin.message, /Kombo x3/);
});

test('applySmartScanner produces valid tactical assists across challenge types', () => {
  const mcScan = applySmartScanner(sampleChallenges[0], undefined);
  assert.deepEqual(mcScan.eliminatedOptionIndices, [0]);

  const errScan = applySmartScanner(sampleChallenges[1], ['r2']);
  assert.equal(errScan.flaggedErrorRowId, 'r3');
});

test('calculateSpeedBonus rewards fast accurate completion', () => {
  assert.equal(calculateSpeedBonus(10, true), 10);
  assert.equal(calculateSpeedBonus(25, true), 5);
  assert.equal(calculateSpeedBonus(45, true), 0);
  assert.equal(calculateSpeedBonus(8, false), 0);
});

