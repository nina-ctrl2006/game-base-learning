import type { Challenge } from '../types';
import { CHALLENGE_TYPE_META } from './gameLogic';

export const WORLD_WIDTH = 920;
export const WORLD_HEIGHT = 360;

export interface WorldPoint {
  x: number;
  y: number;
}

export interface OfficeStation {
  challengeId: string;
  index: number;
  title: string;
  typeLabel: string;
  deskLabel: string;
  accentColor: string;
  x: number;
  y: number;
  radius: number;
}

export interface CollectibleStar {
  id: string;
  x: number;
  y: number;
  collected: boolean;
  bobOffset: number;
}

export interface OfficeProp {
  kind: 'plant' | 'bookshelf' | 'cabinet' | 'rug' | 'watercooler';
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

export function buildOfficeStations(challenges: Challenge[]): OfficeStation[] {
  const count = challenges.length;
  if (count === 0) return [];

  const marginX = 125;
  const usableW = WORLD_WIDTH - marginX * 2;

  return challenges.map((ch, idx) => {
    const t = count === 1 ? 0.5 : idx / (count - 1);
    const x = Math.round(marginX + t * usableW);
    const y = idx % 2 === 0 ? 128 : 234;
    const meta = CHALLENGE_TYPE_META[ch.type];

    const deskLabelByType: Record<Challenge['type'], string> = {
      drag_and_drop: 'Meja Sortir',
      matching: 'Panel Kabel',
      ordering: 'Jalur SOP',
      find_the_error: 'Meja Audit',
      decision_making: 'Ruang Kontrol',
      case_simulation: 'Meja Direksi',
      true_false: 'Pos Validasi',
      multiple_choice: 'Meja Kasus',
    };

    return {
      challengeId: ch.id,
      index: idx,
      title: ch.title,
      typeLabel: meta.label,
      deskLabel: deskLabelByType[ch.type],
      accentColor: meta.badgeTint,
      x,
      y,
      radius: 56,
    };
  });
}

export function buildCollectibleStars(stations: OfficeStation[]): CollectibleStar[] {
  const stars: CollectibleStar[] = [];
  for (let i = 0; i < stations.length - 1; i++) {
    const a = stations[i];
    const b = stations[i + 1];
    stars.push({
      id: `star_${i}_a`,
      x: Math.round((a.x + b.x) / 2),
      y: Math.round((a.y + b.y) / 2),
      collected: false,
      bobOffset: i * 1.4,
    });
  }
  // Always add one extra star near reception entrance if stations exist
  if (stations.length > 0) {
    stars.push({
      id: 'star_entrance',
      x: 72,
      y: 268,
      collected: false,
      bobOffset: 2.2,
    });
  }
  return stars;
}

export function getOfficeProps(): OfficeProp[] {
  return [
    { kind: 'rug', x: 250, y: 120, w: 420, h: 120, color: '#EDF8FD' },
    { kind: 'bookshelf', x: 36, y: 26, w: 120, h: 32, color: '#D4B88C' },
    { kind: 'cabinet', x: 740, y: 26, w: 130, h: 32, color: '#54BCEB' },
    { kind: 'watercooler', x: 446, y: 28, w: 32, h: 34, color: '#71C98A' },
    { kind: 'plant', x: 34, y: 292, w: 38, h: 38, color: '#71C98A' },
    { kind: 'plant', x: 852, y: 292, w: 38, h: 38, color: '#71C98A' },
  ];
}

export function clampPlayerPosition(x: number, y: number): WorldPoint {
  return {
    x: Math.max(36, Math.min(WORLD_WIDTH - 36, x)),
    y: Math.max(66, Math.min(WORLD_HEIGHT - 36, y)),
  };
}

export function stepPlayerMovement(params: {
  pos: WorldPoint;
  keys: { up: boolean; down: boolean; left: boolean; right: boolean };
  walkTarget: WorldPoint | null;
  dt: number;
  speed?: number;
}): { pos: WorldPoint; moving: boolean; facingRight: boolean; reachedTarget: boolean } {
  const speed = params.speed ?? 230;
  let dx = 0;
  let dy = 0;

  if (params.keys.left) dx -= 1;
  if (params.keys.right) dx += 1;
  if (params.keys.up) dy -= 1;
  if (params.keys.down) dy += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    const nx = dx / len;
    const ny = dy / len;
    const next = clampPlayerPosition(
      params.pos.x + nx * speed * params.dt,
      params.pos.y + ny * speed * params.dt
    );
    return {
      pos: next,
      moving: true,
      facingRight: dx >= 0,
      reachedTarget: false,
    };
  }

  if (params.walkTarget) {
    const vx = params.walkTarget.x - params.pos.x;
    const vy = params.walkTarget.y - params.pos.y;
    const dist = Math.hypot(vx, vy);
    const stepDist = speed * params.dt;
    if (dist <= Math.max(6, stepDist)) {
      return {
        pos: clampPlayerPosition(params.walkTarget.x, params.walkTarget.y),
        moving: false,
        facingRight: vx >= 0,
        reachedTarget: true,
      };
    }
    const next = clampPlayerPosition(
      params.pos.x + (vx / dist) * stepDist,
      params.pos.y + (vy / dist) * stepDist
    );
    return {
      pos: next,
      moving: true,
      facingRight: vx >= 0,
      reachedTarget: false,
    };
  }

  return {
    pos: params.pos,
    moving: false,
    facingRight: true,
    reachedTarget: false,
  };
}

export function findNearestStation(
  pos: WorldPoint,
  stations: OfficeStation[]
): OfficeStation | null {
  let best: OfficeStation | null = null;
  let bestDist = Infinity;
  for (const st of stations) {
    const d = Math.hypot(pos.x - st.x, pos.y - st.y);
    if (d <= st.radius + 14 && d < bestDist) {
      best = st;
      bestDist = d;
    }
  }
  return best;
}
