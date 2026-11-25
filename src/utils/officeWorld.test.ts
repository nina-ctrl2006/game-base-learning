import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCollectibleStars,
  buildOfficeStations,
  findNearestStation,
  stepPlayerMovement,
} from './officeWorld';
import type { Challenge } from '../types';

const mockChallenges: Challenge[] = [
  {
    id: 'c1',
    order: 1,
    type: 'drag_and_drop',
    title: 'Sortir Berkas',
    prompt: 'Pilah berkas',
    points: 30,
    explanation: '-',
  },
  {
    id: 'c2',
    order: 2,
    type: 'matching',
    title: 'Hubungkan Kabel',
    prompt: 'Cocokkan',
    points: 30,
    explanation: '-',
  },
  {
    id: 'c3',
    order: 3,
    type: 'ordering',
    title: 'Urutkan SOP',
    prompt: 'Urutkan',
    points: 40,
    explanation: '-',
  },
];

test('buildOfficeStations lays out desks inside world bounds', () => {
  const stations = buildOfficeStations(mockChallenges);
  assert.equal(stations.length, 3);
  assert.equal(stations[0].deskLabel, 'Meja Sortir');
  assert.equal(stations[1].deskLabel, 'Panel Kabel');
  assert.equal(stations[2].deskLabel, 'Jalur SOP');
  assert.ok(stations[0].x < stations[1].x && stations[1].x < stations[2].x);
});

test('buildCollectibleStars spawns stars between stations and near entrance', () => {
  const stations = buildOfficeStations(mockChallenges);
  const stars = buildCollectibleStars(stations);
  assert.equal(stars.length, 3);
  assert.ok(stars.every((s) => !s.collected));
});

test('stepPlayerMovement moves via keyboard and click target cleanly', () => {
  const step1 = stepPlayerMovement({
    pos: { x: 100, y: 150 },
    keys: { up: false, down: false, left: false, right: true },
    walkTarget: null,
    dt: 0.05,
  });
  assert.equal(step1.moving, true);
  assert.ok(step1.pos.x > 100);

  const step2 = stepPlayerMovement({
    pos: { x: 100, y: 150 },
    keys: { up: false, down: false, left: false, right: false },
    walkTarget: { x: 104, y: 150 },
    dt: 0.05,
  });
  assert.equal(step2.reachedTarget, true);
  assert.equal(step2.pos.x, 104);
});

test('findNearestStation detects active desk proximity accurately', () => {
  const stations = buildOfficeStations(mockChallenges);
  const near = findNearestStation({ x: stations[1].x + 10, y: stations[1].y }, stations);
  assert.equal(near?.challengeId, 'c2');
  const far = findNearestStation({ x: 10, y: 350 }, stations);
  assert.equal(far, null);
});
