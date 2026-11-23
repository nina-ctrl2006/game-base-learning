import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateChallenge,
  evaluateQuizQuestion,
  formatDuration,
  getPredikat,
  getRecommendations,
  shuffleWithSeed,
} from './gameLogic';
import type { Challenge, QuizQuestion } from '../types';

test('getPredikat maps score thresholds accurately', () => {
  assert.equal(getPredikat(100).title, 'Master Administrator');
  assert.equal(getPredikat(90).title, 'Master Administrator');
  assert.equal(getPredikat(89).title, 'Expert Staff');
  assert.equal(getPredikat(80).title, 'Expert Staff');
  assert.equal(getPredikat(79).title, 'Junior Administrator');
  assert.equal(getPredikat(70).title, 'Junior Administrator');
  assert.equal(getPredikat(69).title, 'Trainee Administrator');
  assert.equal(getPredikat(0).title, 'Trainee Administrator');
});

test('evaluateChallenge handles multiple_choice and true_false', () => {
  const mc: Challenge = {
    id: 'c1',
    order: 1,
    type: 'multiple_choice',
    title: 'Klasifikasi Surat',
    prompt: 'Pilih kode yang tepat',
    points: 20,
    explanation: 'KP untuk kepegawaian',
    options: ['KU', 'KP', 'HK'],
    correctIndex: 1,
  };
  assert.equal(evaluateChallenge(mc, 1).isCorrect, true);
  assert.equal(evaluateChallenge(mc, 1).earnedPoints, 20);
  assert.equal(evaluateChallenge(mc, 0).isCorrect, false);

  const tf: Challenge = {
    id: 'c2',
    order: 2,
    type: 'true_false',
    title: 'Akses Rahasia',
    prompt: 'Evaluasi pernyataan',
    statement: 'Dokumen gaji boleh dibagikan di grup umum.',
    correctAnswer: false,
    points: 15,
    explanation: 'Dokumen gaji bersifat rahasia.',
  };
  assert.equal(evaluateChallenge(tf, false).isCorrect, true);
  assert.equal(evaluateChallenge(tf, true).earnedPoints, 0);
});

test('evaluateChallenge handles drag_and_drop, matching, and ordering', () => {
  const dnd: Challenge = {
    id: 'c3',
    order: 3,
    type: 'drag_and_drop',
    title: 'Sortir Folder',
    prompt: 'Masukkan ke folder',
    points: 20,
    explanation: 'Sesuai jenis arsip',
    zones: [
      { id: 'z1', label: 'Keuangan' },
      { id: 'z2', label: 'Kepegawaian' },
    ],
    items: [
      { id: 'i1', label: 'Kuitansi', correctZoneId: 'z1' },
      { id: 'i2', label: 'SK Cuti', correctZoneId: 'z2' },
    ],
  };
  assert.equal(evaluateChallenge(dnd, { i1: 'z1', i2: 'z2' }).isCorrect, true);
  assert.equal(evaluateChallenge(dnd, { i1: 'z1', i2: 'z1' }).earnedPoints, 10);

  const match: Challenge = {
    id: 'c4',
    order: 4,
    type: 'matching',
    title: 'Pasangkan Kode',
    prompt: 'Cocokkan',
    points: 20,
    explanation: 'Sesuai pedoman',
    pairs: [
      { id: 'p1', left: '01', right: 'Kepegawaian' },
      { id: 'p2', left: '02', right: 'Keuangan' },
    ],
  };
  assert.equal(
    evaluateChallenge(match, { p1: 'Kepegawaian', p2: 'Keuangan' }).earnedPoints,
    20
  );

  const orderChallenge: Challenge = {
    id: 'c5',
    order: 5,
    type: 'ordering',
    title: 'Urutan SOP',
    prompt: 'Urutkan',
    points: 30,
    explanation: 'SOP urut',
    steps: [
      { id: 's1', text: 'Terima' },
      { id: 's2', text: 'Catat' },
      { id: 's3', text: 'Simpan' },
    ],
  };
  assert.equal(evaluateChallenge(orderChallenge, ['s1', 's2', 's3']).isCorrect, true);
  assert.equal(evaluateChallenge(orderChallenge, ['s1', 's3', 's2']).isCorrect, false);
});

test('evaluateChallenge handles find_the_error, case_simulation, and decision_making', () => {
  const errChallenge: Challenge = {
    id: 'c6',
    order: 6,
    type: 'find_the_error',
    title: 'Audit Pegawai',
    prompt: 'Temukan baris ganda',
    points: 20,
    explanation: 'Baris r2 duplikat',
    tableTitle: 'Pegawai',
    columns: ['NIP', 'Nama'],
    rows: [
      { id: 'r1', cells: ['101', 'Budi'], isError: false },
      { id: 'r2', cells: ['101', 'Budi'], isError: true, errorReason: 'NIP ganda' },
    ],
  };
  assert.equal(evaluateChallenge(errChallenge, ['r2']).isCorrect, true);
  assert.equal(evaluateChallenge(errChallenge, ['r1']).earnedPoints, 0);

  const decision: Challenge = {
    id: 'c7',
    order: 7,
    type: 'decision_making',
    title: 'Dilema Akses',
    prompt: 'Pilih tindakan',
    points: 20,
    explanation: 'Verifikasi wajib',
    choices: [
      { id: 'a', label: 'Berikan langsung', consequence: 'Bocor', scoreRatio: 0, isOptimal: false },
      { id: 'b', label: 'Verifikasi izin atasan', consequence: 'Aman', scoreRatio: 1, isOptimal: true },
    ],
  };
  assert.equal(evaluateChallenge(decision, 'b').isCorrect, true);
  assert.equal(evaluateChallenge(decision, 'a').earnedPoints, 0);
});

test('evaluateQuizQuestion and helpers work deterministically', () => {
  const q: QuizQuestion = {
    id: 'q1',
    order: 1,
    type: 'multiple_choice',
    question: 'Apa kepanjangan SOP?',
    options: ['Standard Operating Procedure', 'Sistem Operasi Perkantoran'],
    correctIndex: 0,
    points: 25,
    explanation: 'SOP adalah Standard Operating Procedure.',
  };
  assert.equal(evaluateQuizQuestion(q, 0).earnedPoints, 25);
  assert.equal(evaluateQuizQuestion(q, null).earnedPoints, 0);
  assert.equal(formatDuration(125), '02:05');

  const shuffled = shuffleWithSeed([1, 2, 3, 4, 5], 42);
  assert.equal(shuffled.length, 5);

  const recs = getRecommendations(
    60,
    [
      {
        itemId: '1',
        title: 'Audit',
        typeLabel: 'Cari Kesalahan Data',
        isCorrect: false,
        earnedPoints: 0,
        maxPoints: 20,
        userAnswerSummary: '-',
        correctAnswerSummary: '-',
        explanation: '-',
      },
    ],
    'Pengelolaan Data'
  );
  assert.ok(recs.length >= 2);
});
