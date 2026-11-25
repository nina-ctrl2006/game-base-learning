import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Compass, Sparkles, Star } from 'lucide-react';
import type { Challenge } from '../types';
import {
  buildCollectibleStars,
  buildOfficeStations,
  findNearestStation,
  getOfficeProps,
  stepPlayerMovement,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type CollectibleStar,
  type OfficeStation,
  type WorldPoint,
} from '../utils/officeWorld';
import { playClickSfx, playPowerUpSfx } from '../utils/soundFx';

interface OfficeFloorCanvasProps {
  challenges: Challenge[];
  currentIndex: number;
  checkedMap: Record<string, boolean>;
  correctMap: Record<string, boolean>;
  answeredMap: Record<string, boolean>;
  userAvatarId?: string;
  isPaused: boolean;
  onSelectStation: (index: number) => void;
  onCollectStar: (starId: string) => void;
}

interface CanvasParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const AVATAR_COAT_COLORS: Record<string, string> = {
  detective_blue: '#54BCEB',
  detective_mint: '#71C98A',
  detective_yellow: '#FFCA65',
  detective_purple: '#BB8AE8',
  detective_mentor: '#FFDCE8',
};

export function OfficeFloorCanvas({
  challenges,
  currentIndex,
  checkedMap,
  correctMap,
  answeredMap,
  userAvatarId = 'detective_blue',
  isPaused,
  onSelectStation,
  onCollectStar,
}: OfficeFloorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stations = useMemo(() => buildOfficeStations(challenges), [challenges]);
  const propsList = useMemo(() => getOfficeProps(), []);

  // Mutable simulation refs (never cause 60Hz React re-renders)
  const stationsRef = useRef<OfficeStation[]>(stations);
  const currentIndexRef = useRef(currentIndex);
  const checkedRef = useRef(checkedMap);
  const correctRef = useRef(correctMap);
  const answeredRef = useRef(answeredMap);
  const pausedRef = useRef(isPaused);
  const coatColorRef = useRef(AVATAR_COAT_COLORS[userAvatarId] || '#54BCEB');
  const onSelectRef = useRef(onSelectStation);
  const onCollectStarRef = useRef(onCollectStar);

  stationsRef.current = stations;
  currentIndexRef.current = currentIndex;
  checkedRef.current = checkedMap;
  correctRef.current = correctMap;
  answeredRef.current = answeredMap;
  pausedRef.current = isPaused;
  coatColorRef.current = AVATAR_COAT_COLORS[userAvatarId] || '#54BCEB';
  onSelectRef.current = onSelectStation;
  onCollectStarRef.current = onCollectStar;

  const initialPos: WorldPoint = stations[currentIndex]
    ? {
        x: Math.max(42, stations[currentIndex].x - 56),
        y: stations[currentIndex].y + 8,
      }
    : { x: 80, y: 200 };

  const playerPosRef = useRef<WorldPoint>(initialPos);
  const walkTargetRef = useRef<WorldPoint | null>(null);
  const clickRippleRef = useRef<{ x: number; y: number; life: number } | null>(null);
  const facingRightRef = useRef(true);
  const walkCycleRef = useRef(0);
  const starsRef = useRef<CollectibleStar[]>(buildCollectibleStars(stations));
  const particlesRef = useRef<CanvasParticle[]>([]);
  const keysRef = useRef({ up: false, down: false, left: false, right: false });
  const nearestRef = useRef<number | null>(null);

  const [collectedCount, setCollectedCount] = useState(0);
  const [totalStars, setTotalStars] = useState(() => starsRef.current.length);
  const [nearbyStationIdx, setNearbyStationIdx] = useState<number | null>(null);

  // Reset stars only if challenge list changes (e.g., restart / new mission)
  useEffect(() => {
    const freshStars = buildCollectibleStars(stations);
    starsRef.current = freshStars;
    setCollectedCount(0);
    setTotalStars(freshStars.length);
  }, [stations]);

  // Smoothly walk character to newly selected station when switching via stepper/buttons
  useEffect(() => {
    const st = stationsRef.current[currentIndex];
    if (!st) return;
    const targetX = Math.max(42, st.x - 56);
    const targetY = st.y + 8;
    const dist = Math.hypot(
      playerPosRef.current.x - targetX,
      playerPosRef.current.y - targetY
    );
    if (dist > 64) {
      walkTargetRef.current = { x: targetX, y: targetY };
    }
  }, [currentIndex]);

  // Keyboard listeners for WASD / Arrow movement + E to enter nearby station
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') {
        keysRef.current.up = true;
        walkTargetRef.current = null;
      } else if (k === 's' || e.key === 'ArrowDown') {
        // Note: only move if not on a true_false screen where S is shortcut? Let ArrowDown always move, WASD move freely except let's keep W/A/S/D for movement with Arrows!
        keysRef.current.down = true;
        walkTargetRef.current = null;
      } else if (k === 'a' || e.key === 'ArrowLeft') {
        keysRef.current.left = true;
        walkTargetRef.current = null;
      } else if (k === 'd' || e.key === 'ArrowRight') {
        keysRef.current.right = true;
        walkTargetRef.current = null;
      } else if (k === 'e' && nearestRef.current !== null && !pausedRef.current) {
        playClickSfx();
        onSelectRef.current(nearestRef.current);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') keysRef.current.up = false;
      else if (k === 's' || e.key === 'ArrowDown') keysRef.current.down = false;
      else if (k === 'a' || e.key === 'ArrowLeft') keysRef.current.left = false;
      else if (k === 'd' || e.key === 'ArrowRight') keysRef.current.right = false;
    };

    const clearKeys = () => {
      keysRef.current = { up: false, down: false, left: false, right: false };
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearKeys);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearKeys);
    };
  }, []);

  // Main 60fps Canvas Loop (mounted once)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();
    let elapsed = 0;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = WORLD_WIDTH * dpr;
      canvas.height = WORLD_HEIGHT * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resizeCanvas();

    const drawRoundRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
      fill: string,
      stroke?: string,
      lineWidth = 2
    ) => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    };

    const renderFrame = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);

      if (!pausedRef.current) {
        elapsed += dt;

        // 1. Update Player Movement
        const step = stepPlayerMovement({
          pos: playerPosRef.current,
          keys: keysRef.current,
          walkTarget: walkTargetRef.current,
          dt,
          speed: 240,
        });
        playerPosRef.current = step.pos;
        if (step.moving) {
          facingRightRef.current = step.facingRight;
          walkCycleRef.current += dt * 11;
        }
        if (step.reachedTarget) {
          walkTargetRef.current = null;
        }

        // 2. Check Collectible Stars
        for (const st of starsRef.current) {
          if (st.collected) continue;
          const d = Math.hypot(playerPosRef.current.x - st.x, playerPosRef.current.y - st.y);
          if (d < 30) {
            st.collected = true;
            playPowerUpSfx();
            onCollectStarRef.current(st.id);
            setCollectedCount(starsRef.current.filter((s) => s.collected).length);

            const burstColors = ['#FFCA65', '#54BCEB', '#71C98A', '#BB8AE8'];
            for (let p = 0; p < 14; p++) {
              const ang = (Math.PI * 2 * p) / 14;
              const spd = 45 + Math.random() * 65;
              particlesRef.current.push({
                x: st.x,
                y: st.y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd - 15,
                life: 0.55,
                maxLife: 0.55,
                color: burstColors[p % burstColors.length],
                size: 4 + Math.random() * 2.5,
              });
            }
          }
        }

        // 3. Nearest Station Detection
        const nearest = findNearestStation(playerPosRef.current, stationsRef.current);
        const nextIdx = nearest ? nearest.index : null;
        if (nextIdx !== nearestRef.current) {
          nearestRef.current = nextIdx;
          setNearbyStationIdx(nextIdx);
        }

        // 4. Particles & Click Ripple
        particlesRef.current = particlesRef.current
          .map((pt) => ({
            ...pt,
            x: pt.x + pt.vx * dt,
            y: pt.y + pt.vy * dt,
            life: pt.life - dt,
          }))
          .filter((pt) => pt.life > 0);

        if (clickRippleRef.current) {
          clickRippleRef.current.life -= dt;
          if (clickRippleRef.current.life <= 0) clickRippleRef.current = null;
        }
      }

      // === DRAW OFFICE WORLD ===
      ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      // Warm Cream Tile Floor
      ctx.fillStyle = '#FFFDF8';
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      ctx.strokeStyle = '#F3ECDC';
      ctx.lineWidth = 1;
      for (let gx = 40; gx < WORLD_WIDTH; gx += 46) {
        ctx.beginPath();
        ctx.moveTo(gx, 56);
        ctx.lineTo(gx, WORLD_HEIGHT);
        ctx.stroke();
      }
      for (let gy = 56; gy < WORLD_HEIGHT; gy += 46) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(WORLD_WIDTH, gy);
        ctx.stroke();
      }

      // Top Office Wall Band
      ctx.fillStyle = '#EDF8FD';
      ctx.fillRect(0, 0, WORLD_WIDTH, 54);
      ctx.strokeStyle = '#D5ECF8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 54);
      ctx.lineTo(WORLD_WIDTH, 54);
      ctx.stroke();

      // Office Props (Rug, Bookshelf, Cabinet, Plants, Watercooler)
      for (const prop of propsList) {
        if (prop.kind === 'rug') {
          drawRoundRect(prop.x, prop.y, prop.w, prop.h, 24, '#EDF8FD', '#CBE8F7', 2);
          drawRoundRect(prop.x + 12, prop.y + 12, prop.w - 24, prop.h - 24, 16, '#F7FCFF');
        } else if (prop.kind === 'bookshelf') {
          drawRoundRect(prop.x, prop.y, prop.w, prop.h, 8, '#FFCA65', '#C98A1A', 2);
          // Colorful books
          const bookColors = ['#54BCEB', '#71C98A', '#BB8AE8', '#FFDCE8'];
          for (let b = 0; b < 6; b++) {
            drawRoundRect(prop.x + 10 + b * 17, prop.y + 6, 12, 20, 3, bookColors[b % 4]);
          }
        } else if (prop.kind === 'cabinet') {
          drawRoundRect(prop.x, prop.y, prop.w, prop.h, 8, '#54BCEB', '#2B8CBE', 2);
          for (let d = 0; d < 3; d++) {
            drawRoundRect(prop.x + 10 + d * 40, prop.y + 7, 32, 18, 4, '#FFFFFF');
          }
        } else if (prop.kind === 'watercooler') {
          drawRoundRect(prop.x, prop.y, prop.w, prop.h, 8, '#FFFFFF', '#54BCEB', 2);
          ctx.beginPath();
          ctx.arc(prop.x + prop.w / 2, prop.y + 13, 9, 0, Math.PI * 2);
          ctx.fillStyle = '#54BCEB';
          ctx.fill();
        } else if (prop.kind === 'plant') {
          ctx.beginPath();
          ctx.arc(prop.x + 19, prop.y + 19, 17, 0, Math.PI * 2);
          ctx.fillStyle = '#71C98A';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#2E854A';
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(prop.x + 19, prop.y + 19, 7, 0, Math.PI * 2);
          ctx.fillStyle = '#A8E3B7';
          ctx.fill();
        }
      }

      // Path lines connecting stations in sequence
      if (stationsRef.current.length > 1) {
        ctx.save();
        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = '#D9D0BD';
        ctx.lineWidth = 3;
        ctx.beginPath();
        stationsRef.current.forEach((st, idx) => {
          if (idx === 0) ctx.moveTo(st.x, st.y);
          else ctx.lineTo(st.x, st.y);
        });
        ctx.stroke();
        ctx.restore();
      }

      // Draw Desk Stations
      for (const st of stationsRef.current) {
        const isCurrent = st.index === currentIndexRef.current;
        const isChecked = Boolean(checkedRef.current[st.challengeId]);
        const isCorrect = Boolean(correctRef.current[st.challengeId]);
        const isAnswered = Boolean(answeredRef.current[st.challengeId]);
        const isNear = nearestRef.current === st.index;

        // Pulsing floor halo
        const pulse = Math.sin(elapsed * 4 + st.index) * 3;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.radius + (isCurrent ? pulse : 0), 0, Math.PI * 2);
        if (isChecked) {
          ctx.fillStyle = isCorrect ? 'rgba(113, 201, 138, 0.22)' : 'rgba(255, 202, 101, 0.26)';
          ctx.strokeStyle = isCorrect ? '#2E854A' : '#D08A13';
        } else if (isCurrent || isNear) {
          ctx.fillStyle = 'rgba(84, 188, 235, 0.22)';
          ctx.strokeStyle = '#2B8CBE';
        } else {
          ctx.fillStyle = 'rgba(255, 248, 233, 0.75)';
          ctx.strokeStyle = '#D8D0BE';
        }
        ctx.lineWidth = isCurrent ? 3 : 2;
        ctx.fill();
        ctx.stroke();

        // Desk Sprite
        drawRoundRect(
          st.x - 36,
          st.y - 20,
          72,
          36,
          10,
          '#FFFFFF',
          isCurrent ? '#54BCEB' : '#182230',
          2.5
        );
        // Desk Accent Runner & Monitor
        drawRoundRect(st.x - 28, st.y - 14, 28, 18, 4, st.accentColor, '#182230', 1.5);
        drawRoundRect(st.x + 6, st.y - 12, 20, 14, 3, '#EDF8FD', '#2B8CBE', 1.5);

        // Mini NPC Helper standing behind desk
        const npcBob = Math.sin(elapsed * 3.5 + st.index * 1.3) * 2;
        ctx.beginPath();
        ctx.arc(st.x, st.y - 31 + npcBob, 9, 0, Math.PI * 2);
        ctx.fillStyle = st.accentColor;
        ctx.fill();
        ctx.strokeStyle = '#182230';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Status Marker (! / ✓ / ●)
        ctx.beginPath();
        ctx.arc(st.x + 28, st.y - 24, 10, 0, Math.PI * 2);
        ctx.fillStyle = isChecked
          ? isCorrect
            ? '#71C98A'
            : '#FFCA65'
          : isAnswered
            ? '#BB8AE8'
            : '#54BCEB';
        ctx.fill();
        ctx.strokeStyle = '#182230';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#182230';
        ctx.font = 'bold 11px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const marker = isChecked ? (isCorrect ? '✓' : '!') : isAnswered ? '●' : `${st.index + 1}`;
        ctx.fillText(marker, st.x + 28, st.y - 23.5);

        // Desk Label Pill
        drawRoundRect(st.x - 46, st.y + 22, 92, 20, 8, '#FFFFFF', '#E6DEC9', 1.5);
        ctx.fillStyle = '#182230';
        ctx.font = 'bold 10.5px sans-serif';
        ctx.fillText(`${st.index + 1}. ${st.deskLabel}`, st.x, st.y + 32.5);
      }

      // Draw Collectible Stars ("Bintang Ketelitian")
      for (const star of starsRef.current) {
        if (star.collected) continue;
        const bobY = star.y + Math.sin(elapsed * 4 + star.bobOffset) * 4;
        ctx.save();
        ctx.translate(star.x, bobY);
        ctx.rotate(Math.sin(elapsed * 2 + star.bobOffset) * 0.22);

        // Soft glow ring
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 202, 101, 0.35)';
        ctx.fill();

        // 5-point star shape
        ctx.beginPath();
        for (let p = 0; p < 10; p++) {
          const r = p % 2 === 0 ? 10 : 4.6;
          const a = (Math.PI / 5) * p - Math.PI / 2;
          if (p === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fillStyle = '#FFCA65';
        ctx.fill();
        ctx.strokeStyle = '#9A6300';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.restore();
      }

      // Click Walk Target Ripple
      if (clickRippleRef.current) {
        const rip = clickRippleRef.current;
        const r = (1 - rip.life / 0.45) * 20 + 6;
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(84, 188, 235, ${Math.max(0, rip.life * 2)})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // Draw Player Detective Character
      const px = playerPosRef.current.x;
      const py = playerPosRef.current.y;
      const bob = Math.abs(Math.sin(walkCycleRef.current)) * 3;
      const stride = Math.sin(walkCycleRef.current) * 4;

      // Ground shadow
      ctx.beginPath();
      ctx.ellipse(px, py + 15, 13, 5.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(24, 34, 48, 0.16)';
      ctx.fill();

      // Feet / walk legs
      ctx.fillStyle = '#182230';
      ctx.beginPath();
      ctx.arc(px - 5 + stride * 0.6, py + 13, 3.5, 0, Math.PI * 2);
      ctx.arc(px + 5 - stride * 0.6, py + 13, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Coat / Body
      drawRoundRect(
        px - 11,
        py - 5 - bob,
        22,
        18,
        8,
        coatColorRef.current,
        '#182230',
        2.2
      );

      // Head
      ctx.beginPath();
      ctx.arc(px, py - 13 - bob, 10.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFE4C9';
      ctx.fill();
      ctx.strokeStyle = '#182230';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Detective Cap Brim
      const eyeOffset = facingRightRef.current ? 3 : -3;
      drawRoundRect(px - 11, py - 24 - bob, 22, 7, 4, '#182230');
      ctx.fillStyle = '#182230';
      ctx.beginPath();
      ctx.arc(px + eyeOffset - 2, py - 13 - bob, 1.6, 0, Math.PI * 2);
      ctx.arc(px + eyeOffset + 3, py - 13 - bob, 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Floating "Anda" label
      drawRoundRect(px - 18, py - 40 - bob, 36, 14, 6, '#182230');
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ANDA', px, py - 33 - bob);

      // Draw Particles
      for (const pt of particlesRef.current) {
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      rafId = window.requestAnimationFrame(renderFrame);
    };

    rafId = window.requestAnimationFrame(renderFrame);
    return () => window.cancelAnimationFrame(rafId);
  }, [propsList]);

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas || pausedRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = WORLD_WIDTH / rect.width;
    const scaleY = WORLD_HEIGHT / rect.height;
    const worldX = (e.clientX - rect.left) * scaleX;
    const worldY = (e.clientY - rect.top) * scaleY;

    // Check if player clicked on a desk station
    const clickedStation = findNearestStation({ x: worldX, y: worldY }, stations);
    clickRippleRef.current = { x: worldX, y: worldY, life: 0.45 };

    if (clickedStation) {
      playClickSfx();
      walkTargetRef.current = {
        x: Math.max(42, clickedStation.x - 56),
        y: clickedStation.y + 8,
      };
      onSelectStation(clickedStation.index);
    } else {
      walkTargetRef.current = { x: worldX, y: worldY };
    }
  }

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#EFE7D6] shadow-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-[#2B8CBE]" />
          <p className="text-xs font-extrabold uppercase tracking-wide text-[#182230]">
            Arena Kantor Interaktif ({stations.length} Meja Kasus)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <span
            data-testid="office-stars-counter"
            className="px-2.5 py-1 rounded-lg bg-[#FFF7E3] border border-[#F6DF9F] font-mono font-bold text-[#8E5B08] inline-flex items-center gap-1.5 tabular-nums"
          >
            <Star className="w-3.5 h-3.5 fill-[#FFCA65] text-[#C98A1A]" />
            <span>
              Bintang Ketelitian: {collectedCount}/{totalStars}
            </span>
          </span>
          {nearbyStationIdx !== null && nearbyStationIdx !== currentIndex && (
            <button
              type="button"
              onClick={() => {
                playClickSfx();
                onSelectStation(nearbyStationIdx);
              }}
              className="px-3 py-1 rounded-lg bg-[#54BCEB] hover:bg-[#3FAEDB] text-[#182230] font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Buka Meja {nearbyStationIdx + 1} [E]</span>
            </button>
          )}
        </div>
      </div>

      {/* Playable 2D Office Canvas */}
      <div className="rounded-2xl overflow-hidden border-2 border-[#EFE7D6] bg-[#FFFDF8]">
        <canvas
          ref={canvasRef}
          data-testid="office-floor-canvas"
          onClick={handleCanvasClick}
          className="w-full h-auto block cursor-pointer select-none"
          aria-label="Peta lantai kantor interaktif 2D. Gunakan tombol panah atau klik meja untuk menggerakkan detektif."
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-[#516072]">
        <span>
          Gerakkan detektif dengan <strong>Tombol Panah / WASD</strong> atau{' '}
          <strong>klik lantai / meja kasus</strong> untuk mengumpulkan Bintang Ketelitian (+5 XP).
        </span>
        <span className="font-semibold text-[#182230]">
          Meja Aktif: Kasus {currentIndex + 1} ({stations[currentIndex]?.deskLabel || 'Meja Kerja'})
        </span>
      </div>
    </div>
  );
}
