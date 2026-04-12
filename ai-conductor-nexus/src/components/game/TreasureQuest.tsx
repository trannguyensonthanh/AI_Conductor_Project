import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Maximize2, Minimize2, Settings, Shield, Zap, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';

// ===== HỆ THỐNG VẬT LÝ ĐÃ ĐƯỢC CÂN BẰNG LẠI =====
// Tinh chỉnh để game không quá khó nhưng vẫn có độ thử thách
const BASE_W = 1280; // Mở rộng không gian hiển thị (chuẩn 16:9 HD)
const BASE_H = 720;
const GRAVITY = 0.6; // Trọng lực đầm hơn
const JUMP_FORCE = -12.5; // Nhảy cao và mượt hơn
const MOVE_SPEED = 4.5; // Chạy nhanh hơn một chút để action đã hơn

const TILE = 48; // Tỉ lệ các block lớn hơn
const PRONE_H = 24;
const STAND_H = 54;

type Dir = 'right' | 'left' | 'up' | 'up-right' | 'up-left' | 'down-right' | 'down-left';
type WeaponType = 'pistol' | 'shotgun' | 'laser' | 'rocket';
type MapId = 'jungle' | 'desert' | 'snow' | 'neon-city';
type SkinId = 'commando' | 'cyborg' | 'ninja' | 'phoenix' | 'ghost' | 'samurai';
// ĐÃ FIX: Chỉ có Sensor (Cảm biến) HOẶC AI. Không có BOTH.
type ControlMode = 'sensor' | 'ai';

interface Platform { x: number; y: number; w: number; h: number; type: 'ground' | 'metal' | 'bridge'; }
interface PowerUp { x: number; y: number; collected: boolean; type: 'spread' | 'rapid' | 'life'; frame: number; }
interface Enemy { x: number; y: number; w: number; h: number; vx: number; alive: boolean; type: 'soldier' | 'runner' | 'heavy'; hp: number; maxHp: number; frame: number; facingLeft: boolean; patrolMin: number; patrolMax: number; }
interface Bullet { x: number; y: number; vx: number; vy: number; active: boolean; isEnemy: boolean; weapon: WeaponType; life: number; scale: number; }
interface Explosion { x: number; y: number; frame: number; maxFrame: number; color: string; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; isSpark: boolean; }

// ===== SKIN SYSTEM (THIẾT KẾ LẠI SIÊU ĐẸP & GLOWING) =====
interface SkinConfig {
  name: string; description: string; emoji: string; preview: string;
  body: string; bodyDark: string; bodyAccent: string;
  skin: string; skinDark: string;
  headgear: string; headgearAccent: string;
  boots: string; belt: string;
  eyeColor: string; eyeGlow: string;
  gunMetal: string; gunAccent: string;
  trailColor: string; auraColor: string;
  hasAura: boolean; hasTrail: boolean;
}

const SKIN_CONFIGS: Record<SkinId, SkinConfig> = {
  commando: {
    name: 'COMMANDO', description: 'Lính đặc nhiệm dũng mãnh', emoji: '🎖️', preview: 'Classic',
    body: '#2d6a4f', bodyDark: '#1b4332', bodyAccent: '#52b788', skin: '#d4a373', skinDark: '#b5835a',
    headgear: '#d90429', headgearAccent: '#ef233c', boots: '#2b2d42', belt: '#8d99ae',
    eyeColor: '#ffffff', eyeGlow: 'rgba(255,255,255,0.5)', gunMetal: '#4a4e69', gunAccent: '#9a8c98',
    trailColor: 'rgba(82, 183, 136, 0.4)', auraColor: 'rgba(45, 106, 79, 0.1)', hasAura: false, hasTrail: true,
  },
  cyborg: {
    name: 'CYBER TIER-1', description: 'Chiến binh công nghệ cao', emoji: '🤖', preview: 'Cyber',
    body: '#14213d', bodyDark: '#000000', bodyAccent: '#00f5d4', skin: '#e5e5e5', skinDark: '#b7b7a4',
    headgear: '#000000', headgearAccent: '#00f5d4', boots: '#14213d', belt: '#00bbf9',
    eyeColor: '#00f5d4', eyeGlow: '#00f5d4', gunMetal: '#2b2d42', gunAccent: '#00bbf9',
    trailColor: '#00bbf9', auraColor: 'rgba(0, 245, 212, 0.15)', hasAura: true, hasTrail: true,
  },
  ninja: {
    name: 'SHADOW ASSASSIN', description: 'Thoắt ẩn thoắt hiện', emoji: '🥷', preview: 'Stealth',
    body: '#0d1b2a', bodyDark: '#000000', bodyAccent: '#7b2cbf', skin: '#c8a880', skinDark: '#9c6644',
    headgear: '#1b263b', headgearAccent: '#9d4edd', boots: '#000000', belt: '#3c096c',
    eyeColor: '#ff006e', eyeGlow: '#ff006e', gunMetal: '#415a77', gunAccent: '#c77dff',
    trailColor: '#9d4edd', auraColor: 'rgba(123, 44, 191, 0.1)', hasAura: false, hasTrail: true,
  },
  phoenix: {
    name: 'HELLFIRE PHOENIX', description: 'Ngọn lửa không bao giờ tắt', emoji: '🔥', preview: 'Fire',
    body: '#6a040f', bodyDark: '#370617', bodyAccent: '#ffba08', skin: '#f4a261', skinDark: '#e76f51',
    headgear: '#dc2f02', headgearAccent: '#f48c06', boots: '#370617', belt: '#9d0208',
    eyeColor: '#ffea00', eyeGlow: '#ffea00', gunMetal: '#370617', gunAccent: '#ffba08',
    trailColor: '#ffba08', auraColor: 'rgba(220, 47, 2, 0.2)', hasAura: true, hasTrail: true,
  },
  ghost: {
    name: 'SPECTRE OPS', description: 'Bóng ma chiến trường', emoji: '👻', preview: 'Ghost',
    body: '#343a40', bodyDark: '#212529', bodyAccent: '#adb5bd', skin: '#ced4da', skinDark: '#6c757d',
    headgear: '#495057', headgearAccent: '#f8f9fa', boots: '#000000', belt: '#6c757d',
    eyeColor: '#38b000', eyeGlow: '#70e000', gunMetal: '#212529', gunAccent: '#008000',
    trailColor: '#70e000', auraColor: 'rgba(56, 176, 0, 0.1)', hasAura: false, hasTrail: true,
  },
  samurai: {
    name: 'RONIN PRIME', description: 'Tinh hoa kiếm đạo', emoji: '⚔️', preview: 'Samurai',
    body: '#3c096c', bodyDark: '#240046', bodyAccent: '#ff9e00', skin: '#ffb703', skinDark: '#fb8500',
    headgear: '#10002b', headgearAccent: '#ff9e00', boots: '#10002b', belt: '#ff9e00',
    eyeColor: '#ffffff', eyeGlow: '#ff9e00', gunMetal: '#3c096c', gunAccent: '#ff9e00',
    trailColor: '#ff9e00', auraColor: 'rgba(255, 158, 0, 0.15)', hasAura: true, hasTrail: true,
  },
};

const MAP_CONFIGS: Record<MapId, { name: string; description: string; emoji: string; colors: any }> = {
  'jungle': {
    name: 'AMAZONIA', description: 'Rừng nhiệt đới rậm rạp', emoji: '🌴',
    colors: { bg1: '#071e11', bg2: '#123720', bg3: '#1b5a32', bg4: '#298246', ground1: '#1b4332', ground2: '#081c15', grass: '#40916c', accent: '#74c69d', particles: ['#52b788', '#74c69d', '#95d5b2'] }
  },
  'desert': {
    name: 'DUNE VALE', description: 'Sa mạc bão cát', emoji: '🏜️',
    colors: { bg1: '#3d1c04', bg2: '#7f4f24', bg3: '#a68a64', bg4: '#b08968', ground1: '#9c6644', ground2: '#7f4f24', grass: '#dda15e', accent: '#f4a261', particles: ['#e6ccb2', '#ddb892', '#b08968'] }
  },
  'snow': {
    name: 'FROSTBITE PEAK', description: 'Đỉnh núi tuyết tử thần', emoji: '❄️',
    colors: { bg1: '#011627', bg2: '#0b2545', bg3: '#13315c', bg4: '#134074', ground1: '#8d99ae', ground2: '#2b2d42', grass: '#edf2f4', accent: '#8ecae6', particles: ['#ffffff', '#caf0f8', '#ade8f4'] }
  },
  'neon-city': {
    name: 'CYBER METROPOLIS', description: 'Thành phố ảo ảnh', emoji: '🌃',
    colors: { bg1: '#0b090a', bg2: '#161a1d', bg3: '#2a003f', bg4: '#3c096c', ground1: '#240046', ground2: '#10002b', grass: '#00f5d4', accent: '#f72585', particles: ['#f72585', '#b5179e', '#7209b7', '#4361ee', '#4cc9f0'] }
  }
};

const WEAPON_CONFIGS: Record<WeaponType, { name: string; emoji: string; description: string; cooldown: number; color: string; glow: string; size: number; spread: number; count: number; speed: number; damage: number }> = {
  'pistol': { name: 'FALCON P-9', emoji: '🔫', description: 'Cân bằng & Chuẩn xác', cooldown: 10, color: '#fca311', glow: '#ffb703', size: 4, spread: 0, count: 1, speed: 18, damage: 1 },
  'shotgun': { name: 'HELLHOUND', emoji: '💥', description: 'Cận chiến diện rộng', cooldown: 25, color: '#e63946', glow: '#d90429', size: 4, spread: 0.18, count: 6, speed: 15, damage: 1 },
  'laser': { name: 'PLASMA RIFLE', emoji: '⚡', description: 'Xuyên thấu chớp nhoáng', cooldown: 5, color: '#00f5d4', glow: '#00bbf9', size: 3, spread: 0, count: 1, speed: 25, damage: 1.5 },
  'rocket': { name: 'DOOMSDAY R-3', emoji: '🚀', description: 'Hủy diệt diện rộng', cooldown: 40, color: '#ef233c', glow: '#d90429', size: 8, spread: 0, count: 1, speed: 10, damage: 5 },
};

// Hàm sinh Map ngẫu nhiên thông minh hơn
function generateLevel(levelNum: number, mapId: MapId) {
  const levelWidth = 5000 + levelNum * 1500;
  const platforms: Platform[] = [];
  const powerUps: PowerUp[] = [];
  const enemies: Enemy[] = [];

  // Tạo nền tảng liên tục với các hố sâu (Gaps) ngẫu nhiên
  const gaps: {s: number, e: number}[] = [];
  for(let i = 1000; i < levelWidth - 1000; i += Math.random() * 800 + 800) {
    gaps.push({ s: i, e: i + TILE * (Math.floor(Math.random() * 4) + 3) });
  }

  for (let x = 0; x < levelWidth; x += TILE) {
    let isGap = false;
    for (const g of gaps) if (x >= g.s && x < g.e) isGap = true;
    if (isGap) {
       // Sinh cầu treo ở một số hố sâu
       if(Math.random() > 0.5) platforms.push({ x, y: BASE_H - TILE * 3, w: TILE, h: 12, type: 'bridge' });
       continue;
    }
    platforms.push({ x, y: BASE_H - TILE, w: TILE, h: TILE, type: 'ground' });
    platforms.push({ x, y: BASE_H - TILE * 2, w: TILE, h: TILE, type: 'ground' });
  }

  // Nền tảng bay trên không (Parkour elements)
  for (let x = 500; x < levelWidth - 800; x += Math.random() * 600 + 300) {
    const y = BASE_H - TILE * (Math.floor(Math.random() * 4) + 3);
    const count = Math.floor(Math.random() * 4) + 2;
    for (let i = 0; i < count; i++) {
      platforms.push({ x: x + i * TILE, y, w: TILE, h: 16, type: 'metal' });
    }
  }

  // Trải PowerUps
  for(let i = 800; i < levelWidth - 500; i += 1200) {
    const types: ('spread'|'rapid'|'life')[] = ['spread', 'rapid', 'life'];
    powerUps.push({ x: i, y: BASE_H - TILE * 4, collected: false, type: types[Math.floor(Math.random()*3)], frame: Math.random() * 10 });
  }

  // Quái vật (Được cân bằng lại để tránh spawn ở hố sâu)
  for(let i = 700; i < levelWidth - 800; i += 600) {
    let inGap = false;
    for (const g of gaps) if (i >= g.s - 100 && i <= g.e + 100) inGap = true;
    if(inGap) continue;

    const rand = Math.random();
    const type = rand > 0.8 ? 'heavy' : rand > 0.4 ? 'runner' : 'soldier';
    const speed = type === 'runner' ? 3 : type === 'heavy' ? 1 : 1.5;
    const hp = type === 'heavy' ? 8 : type === 'runner' ? 2 : 3;
    const w = type === 'heavy' ? 44 : 32;
    const h = type === 'heavy' ? 52 : 44;

    enemies.push({
      x: i, y: BASE_H - TILE * 2 - h, w, h, vx: -speed, alive: true, type,
      hp, maxHp: hp, frame: Math.random() * 100, facingLeft: true,
      patrolMin: i - 250, patrolMax: i + 250,
    });
  }

  return { platforms, powerUps, enemies, goalX: levelWidth - 200, levelWidth };
}

// ==== HỆ THỐNG VẼ ĐỒ HỌA (GRAPHICS RENDERER) ====

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, cam: number, time: number, mapId: MapId) {
  const c = MAP_CONFIGS[mapId].colors;

  // Background Gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, c.bg1);
  grad.addColorStop(0.3, c.bg2);
  grad.addColorStop(0.7, c.bg3);
  grad.addColorStop(1, c.bg4);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Mây hoặc Sao
  if(mapId === 'neon-city' || mapId === 'snow') {
    ctx.fillStyle = c.accent;
    for (let i = 0; i < 80; i++) {
      const sx = (i * 153 + 50) % w;
      const sy = (i * 87 + 20) % (h * 0.6);
      const twinkle = 0.2 + Math.sin(time * 0.05 + i * 3) * 0.8;
      ctx.globalAlpha = twinkle;
      ctx.beginPath(); ctx.arc(sx, sy, 1 + (i % 2), 0, Math.PI * 2); ctx.fill();
    }
  }

  ctx.globalAlpha = 1;

  // Vẽ núi / Layer Background xa (Parallax x0.2)
  for (let i = 0; i < 15; i++) {
    const mx = (i * 300 - cam * 0.2) % (w + 600) - 300;
    const mh = 150 + Math.sin(i) * 80;
    const mGrad = ctx.createLinearGradient(mx, h - mh, mx, h);
    mGrad.addColorStop(0, c.ground1);
    mGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = mGrad;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(mx - 200, h);
    ctx.lineTo(mx, h - mh);
    ctx.lineTo(mx + 200, h);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Hạt môi trường
  const pColors = c.particles;
  for (let i = 0; i < 40; i++) {
    const px = (i * 107 + time * (mapId === 'snow' ? 1.5 : 0.5) + cam * 0.05) % (w + 100) - 50;
    const py = (i * 73 + time * (mapId === 'snow' ? 2 : 0.5)) % h;
    ctx.globalAlpha = 0.3 + Math.sin(time * 0.05 + i) * 0.3;
    ctx.fillStyle = pColors[i % pColors.length];
    ctx.beginPath(); ctx.arc(px, py, 2 + (i % 3), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTile(ctx: CanvasRenderingContext2D, p: Platform, cam: number, mapId: MapId) {
  const x = p.x - cam;
  if (x + p.w < -50 || x > BASE_W + 50) return;
  const c = MAP_CONFIGS[mapId].colors;

  if (p.type === 'ground') {
    if (p.y === BASE_H - TILE) {
      // Top layer ground
      const gGrad = ctx.createLinearGradient(x, p.y, x, p.y + p.h);
      gGrad.addColorStop(0, c.ground1);
      gGrad.addColorStop(1, c.ground2);
      ctx.fillStyle = gGrad;
      ctx.fillRect(x, p.y, p.w, p.h);
      
      // Cỏ / Neon viền
      ctx.fillStyle = c.grass;
      ctx.fillRect(x, p.y, p.w, 6);
      if(mapId === 'neon-city') {
        ctx.shadowColor = c.grass;
        ctx.shadowBlur = 15;
        ctx.fillRect(x, p.y, p.w, 2);
        ctx.shadowBlur = 0;
      } else {
        for (let g = 0; g < 6; g++) {
          ctx.fillRect(x + g * 8 + 4, p.y - 4 - (g % 2)*2, 3, 6 + (g % 2)*2);
        }
      }
    } else {
      ctx.fillStyle = c.ground2;
      ctx.fillRect(x, p.y, p.w, p.h);
    }
    // Lưới block (Grid border)
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, p.y, p.w, p.h);

  } else if (p.type === 'metal') {
    const mGrad = ctx.createLinearGradient(x, p.y, x, p.y + p.h);
    mGrad.addColorStop(0, '#6c757d');
    mGrad.addColorStop(0.5, '#495057');
    mGrad.addColorStop(1, '#212529');
    ctx.fillStyle = mGrad;
    ctx.fillRect(x, p.y, p.w, p.h);
    
    ctx.fillStyle = c.accent;
    ctx.shadowColor = c.accent;
    ctx.shadowBlur = 10;
    ctx.fillRect(x + 5, p.y + p.h/2 - 1, p.w - 10, 2);
    ctx.shadowBlur = 0;
  } else if (p.type === 'bridge') {
    ctx.fillStyle = '#9c6644';
    ctx.fillRect(x, p.y, p.w, p.h);
    ctx.strokeStyle = '#7f4f24';
    ctx.strokeRect(x, p.y, p.w, p.h);
  }
}

// Hàm vẽ Nhân vật (Cải tiến với chi tiết cực cao)
function drawSkinnedPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, facingRight: boolean, frame: number, isJumping: boolean, isProne: boolean, aimDir: Dir, skin: SkinConfig, time: number) {
  ctx.save();
  const dir = facingRight ? 1 : -1;
  const cx = x + w / 2;

  // Aura
  if (skin.hasAura) {
    ctx.shadowColor = skin.trailColor;
    ctx.shadowBlur = 30 + Math.sin(time * 0.1) * 10;
    ctx.fillStyle = skin.auraColor;
    ctx.beginPath(); ctx.arc(cx, y + h / 2, 45, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Animation Legs
  const legAnim = isJumping ? 8 : Math.sin(frame * 0.3) * 6;

  // Vẽ chân
  ctx.fillStyle = skin.bodyDark;
  ctx.fillRect(cx - 8 * dir - 5, y + h - 20 + legAnim, 10, 20 - legAnim);
  ctx.fillRect(cx + 3 * dir - 5, y + h - 20 - legAnim, 10, 20 + legAnim);
  ctx.fillStyle = skin.boots;
  ctx.fillRect(cx - 9 * dir - 6, y + h - 6, 12, 6);
  ctx.fillRect(cx + 2 * dir - 6, y + h - 6, 12, 6);

  // Thân hình
  const torsoGrad = ctx.createLinearGradient(cx, y + 15, cx, y + 35);
  torsoGrad.addColorStop(0, skin.bodyAccent);
  torsoGrad.addColorStop(0.5, skin.body);
  torsoGrad.addColorStop(1, skin.bodyDark);
  ctx.fillStyle = torsoGrad;
  ctx.beginPath(); ctx.roundRect(cx - 12, y + 15, 24, 22, 4); ctx.fill();

  // Belt & Giáp
  ctx.fillStyle = skin.belt;
  ctx.fillRect(cx - 12, y + 32, 24, 5);
  ctx.fillStyle = skin.headgearAccent;
  ctx.fillRect(cx - 4, y + 31, 8, 7);

  // Đầu
  ctx.fillStyle = skin.skin;
  ctx.beginPath(); ctx.arc(cx, y + 8, 12, 0, Math.PI * 2); ctx.fill();
  
  // Mũ/Tóc
  ctx.fillStyle = skin.headgear;
  ctx.beginPath(); ctx.arc(cx, y + 6, 13, Math.PI, 0); ctx.fill();
  ctx.fillRect(cx - 13, y + 6, 26, 4);
  
  // Mắt Glowing
  if (skin.eyeGlow) {
    ctx.shadowColor = skin.eyeGlow;
    ctx.shadowBlur = 10;
  }
  ctx.fillStyle = skin.eyeColor;
  ctx.fillRect(cx + (facingRight ? 4 : -10), y + 6, 6, 4);
  ctx.shadowBlur = 0;

  // Cánh tay & Vũ khí
  const armAngle = getArmAngle(aimDir, facingRight);
  ctx.save();
  ctx.translate(cx + (facingRight ? 10 : -10), y + 20);
  ctx.rotate(armAngle);
  
  // Tay áo
  ctx.fillStyle = skin.body;
  ctx.beginPath(); ctx.roundRect(-4, -4, 18, 8, 3); ctx.fill();
  // Súng
  ctx.fillStyle = skin.gunMetal;
  ctx.fillRect(10, -6, 24, 8);
  ctx.fillStyle = skin.gunAccent;
  ctx.fillRect(26, -5, 10, 4); // Nòng súng
  // Tay cầm súng
  ctx.fillStyle = skin.skinDark;
  ctx.beginPath(); ctx.arc(12, 2, 4, 0, Math.PI*2); ctx.fill();

  ctx.restore();
  ctx.restore();
}

function getArmAngle(dir: Dir, facingRight: boolean): number {
  const f = facingRight ? 1 : -1;
  switch (dir) {
    case 'up': return -Math.PI / 2 * f;
    case 'up-right': return facingRight ? -Math.PI / 4 : -Math.PI * 3 / 4;
    case 'up-left': return facingRight ? -Math.PI * 3 / 4 : -Math.PI / 4;
    case 'down-right': return facingRight ? Math.PI / 4 : Math.PI * 3 / 4;
    case 'down-left': return facingRight ? Math.PI * 3 / 4 : Math.PI / 4;
    default: return 0;
  }
}

// Cải tiến hiệu ứng Đạn
function drawBullet(ctx: CanvasRenderingContext2D, b: Bullet, cam: number) {
  const bx = b.x - cam;
  const wc = WEAPON_CONFIGS[b.weapon];
  const scale = b.scale || 1; 

  ctx.shadowBlur = 15 * scale;
  if (b.isEnemy) {
    ctx.fillStyle = '#ff0054';
    ctx.shadowColor = '#ff0054';
    ctx.beginPath(); ctx.arc(bx, b.y, 5, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.shadowColor = wc.glow;
    if (b.weapon === 'laser') {
      ctx.strokeStyle = wc.color;
      ctx.lineWidth = 4 * scale;
      ctx.beginPath();
      ctx.moveTo(bx - b.vx * 1.5, b.y - b.vy * 1.5);
      ctx.lineTo(bx + b.vx*0.2, b.y + b.vy*0.2);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(bx, b.y, 3 * scale, 0, Math.PI * 2); ctx.fill();
    } else if (b.weapon === 'rocket') {
      ctx.fillStyle = '#343a40'; // Thân rocket
      ctx.fillRect(bx - 12 * scale, b.y - 4 * scale, 24 * scale, 8 * scale);
      ctx.fillStyle = wc.color; // Đầu đạn
      ctx.beginPath(); ctx.arc(bx + 12 * scale, b.y, 4 * scale, -Math.PI/2, Math.PI/2); ctx.fill();
      ctx.fillStyle = '#fca311'; // Lửa đuôi
      ctx.beginPath(); ctx.arc(bx - 14 * scale, b.y, 6 * scale, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = wc.color;
      ctx.beginPath(); ctx.ellipse(bx - b.vx*0.3, b.y - b.vy*0.3, wc.size * 1.5 * scale, wc.size * scale, Math.atan2(b.vy, b.vx), 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(bx, b.y, wc.size * 0.5 * scale, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.shadowBlur = 0;
}

// Cải tiến Kẻ địch
function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, cam: number, time: number) {
  const x = e.x - cam;
  const y = e.y;
  const cx = x + e.w / 2;

  // Bóng đổ
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(cx, y + e.h, e.w * 0.5, 6, 0, 0, Math.PI * 2); ctx.fill();

  const la = Math.sin(e.frame * 0.2) * 4;

  if (e.type === 'heavy') {
    ctx.fillStyle = '#9d0208'; // Giáp ngực
    ctx.beginPath(); ctx.roundRect(x, y + 10, e.w, e.h - 20, 6); ctx.fill();
    ctx.fillStyle = '#03071e';
    ctx.fillRect(x + 5, y + 15, e.w - 10, 15);
    // Mắt
    ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(e.facingLeft ? x + 5 : x + e.w - 15, y + 20, 10, 4);
    ctx.shadowBlur = 0;
    // Chân
    ctx.fillStyle = '#370617';
    ctx.fillRect(cx - 10, y + e.h - 10 + la, 8, 10 - la);
    ctx.fillRect(cx + 2, y + e.h - 10 - la, 8, 10 + la);

  } else if (e.type === 'runner') {
    ctx.fillStyle = '#0077b6';
    ctx.beginPath(); ctx.roundRect(x + 4, y + 10, e.w - 8, e.h - 20, 4); ctx.fill();
    // Đầu
    ctx.fillStyle = '#023e8a';
    ctx.beginPath(); ctx.arc(cx, y + 5, 8, 0, Math.PI*2); ctx.fill();
    ctx.shadowColor = '#00f5d4'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#00f5d4';
    ctx.beginPath(); ctx.arc(e.facingLeft ? cx - 4 : cx + 4, y + 5, 3, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    // Chân chạy nhanh
    const fLa = Math.sin(e.frame * 0.5) * 8;
    ctx.fillStyle = '#03045e';
    ctx.fillRect(cx - 6, y + e.h - 10 + fLa, 4, 10 - fLa);
    ctx.fillRect(cx + 2, y + e.h - 10 - fLa, 4, 10 + fLa);
  } else { // Soldier
    ctx.fillStyle = '#5c4d7d';
    ctx.fillRect(x + 6, y + 12, e.w - 12, e.h - 24);
    ctx.fillStyle = '#2d232e';
    ctx.beginPath(); ctx.arc(cx, y + 8, 10, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffb703';
    ctx.fillRect(e.facingLeft ? cx - 8 : cx + 2, y + 6, 6, 4);
    // Chân
    ctx.fillStyle = '#2d232e';
    ctx.fillRect(cx - 8, y + e.h - 12 + la, 6, 12 - la);
    ctx.fillRect(cx + 2, y + e.h - 12 - la, 6, 12 + la);
  }

  // Thanh máu xịn xò
  if (e.hp < e.maxHp && e.hp > 0) {
    const barW = e.w + 10;
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(cx - barW/2 - 2, y - 12, barW + 4, 6);
    const hpPct = e.hp / e.maxHp;
    const hpColor = hpPct > 0.5 ? '#00f5d4' : hpPct > 0.25 ? '#fee440' : '#d90429';
    ctx.shadowColor = hpColor; ctx.shadowBlur = 8;
    ctx.fillStyle = hpColor;
    ctx.fillRect(cx - barW/2, y - 11, barW * hpPct, 4);
    ctx.shadowBlur = 0;
  }
}

// Hiệu ứng Nổ mạnh mẽ
function drawExplosion(ctx: CanvasRenderingContext2D, ex: Explosion) {
  const progress = ex.frame / ex.maxFrame;
  const r = 20 + progress * 60;
  const alpha = 1 - Math.pow(progress, 2);
  
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ex.color;
  ctx.beginPath(); ctx.arc(ex.x, ex.y, r, 0, Math.PI * 2); ctx.fill();
  
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(ex.x, ex.y, r * 0.4, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = ex.color;
  ctx.lineWidth = 4 * (1 - progress);
  ctx.beginPath(); ctx.arc(ex.x, ex.y, r * 1.2, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
}

// Giao diện In-game (HUD) Premium
function drawHUD(ctx: CanvasRenderingContext2D, w: number, score: number, lives: number, weapon: WeaponType, mapName: string, skinName: string) {
  // Thanh Bar Gradient
  const barGrad = ctx.createLinearGradient(0, 0, 0, 50);
  barGrad.addColorStop(0, 'rgba(0,0,0,0.9)');
  barGrad.addColorStop(1, 'rgba(0,0,0,0.1)');
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, 0, w, 50);

  // Điểm số
  ctx.font = 'bold 24px "JetBrains Mono", monospace';
  ctx.fillStyle = '#00f5d4';
  ctx.shadowColor = '#00f5d4'; ctx.shadowBlur = 10;
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE: ${score.toLocaleString()}`, 20, 35);
  ctx.shadowBlur = 0;

  // Mạng (Trái tim điện tử)
  ctx.fillStyle = '#ef233c';
  ctx.shadowColor = '#ef233c'; ctx.shadowBlur = 10;
  ctx.textAlign = 'center';
  let heartStr = '';
  for (let i = 0; i < lives; i++) heartStr += '❤️ ';
  ctx.fillText(heartStr.trim(), w / 2 - 150, 35);
  ctx.shadowBlur = 0;

  // Vũ khí hiện tại
  const wc = WEAPON_CONFIGS[weapon];
  ctx.fillStyle = wc.color;
  ctx.shadowColor = wc.glow; ctx.shadowBlur = 10;
  ctx.fillText(`${wc.emoji} ${wc.name}`, w / 2 + 150, 35);
  ctx.shadowBlur = 0;

  // Thông tin Map & Skin
  ctx.fillStyle = '#adb5bd';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`[ ${mapName} | OP: ${skinName} ]`, w - 20, 32);
}

// Hàm vẽ Power-up siêu nổi bật
function drawPowerUp(ctx: CanvasRenderingContext2D, x: number, y: number, type: string, frame: number) {
  const bob = Math.sin(frame * 0.1) * 6;
  const py = y + bob;
  const glow = type === 'spread' ? '#ff0054' : type === 'rapid' ? '#00bbf9' : '#00f5d4';
  
  ctx.shadowColor = glow;
  ctx.shadowBlur = 20 + Math.sin(frame * 0.2) * 10;
  
  // Vòng ngoài
  ctx.strokeStyle = glow;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, py, 20, 0, Math.PI * 2); ctx.stroke();
  
  // Lõi
  ctx.fillStyle = type === 'spread' ? '#d90429' : type === 'rapid' ? '#0077b6' : '#38b000';
  ctx.beginPath(); ctx.roundRect(x - 14, py - 10, 28, 20, 4); ctx.fill();
  
  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath(); ctx.roundRect(x - 10, py - 8, 20, 6, 2); ctx.fill();
  
  // Ký hiệu
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(type === 'spread' ? 'S' : type === 'rapid' ? 'R' : 'HP', x, py + 1);
  ctx.shadowBlur = 0;
}

// Hệ thống hạt (Particles) tối ưu hiệu năng
function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[], cam: number) {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    
    if (p.isSpark) {
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.fillRect(p.x - cam, p.y, p.size * 2, p.size * 0.5); // Tia lửa dài
      ctx.shadowBlur = 0;
    } else {
      ctx.beginPath(); ctx.arc(p.x - cam, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function addTrailParticles(particles: Particle[], x: number, y: number, h: number, skin: SkinConfig, moving: boolean) {
  if (!skin.hasTrail || !moving) return;
  if (Math.random() > 0.5) return;
  particles.push({
    x: x + 14 + (Math.random() - 0.5) * 12,
    y: y + h - 6 + Math.random() * 6,
    vx: (Math.random() - 0.5) * 2,
    vy: -Math.random() * 2,
    life: 15, maxLife: 15,
    color: skin.trailColor, size: 2 + Math.random() * 3, isSpark: false
  });
}

// =========================================================================
// ==================== MAIN REACT COMPONENT ===============================
// =========================================================================

export function TreasureQuest({ onBack }: { onBack: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'won' | 'dead'>('menu');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedMap, setSelectedMap] = useState<MapId>('neon-city'); // Mặc định map đẹp nhất
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponType>('laser');
  const [selectedSkin, setSelectedSkin] = useState<SkinId>('cyborg');
  const [menuTab, setMenuTab] = useState<'controls' | 'map' | 'weapon' | 'skin'>('controls');

  // ĐÃ FIX: Chỉ có 'ai' hoặc 'sensor'. Không có both để tránh xung đột
  const [jumpMode, setJumpMode] = useState<ControlMode>('ai');
  const [shootMode, setShootMode] = useState<ControlMode>('ai');
  
  const aiEventsRef = useRef({ swipeUp: 0, push: 0 });
  const lastProcessedGestureId = useRef(0); 

  // ==================== HÀM BẮN ĐẠN & VOICE COMMAND ====================
  const shoot = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    const p = playerRef.current;
    if (p.shootCooldown > 0) return;
    const wc = WEAPON_CONFIGS[p.weapon];
    const bx = p.facingRight ? p.x + p.w + 10 : p.x - 10;
    const by = p.y + 20; // Căn giữa súng
    
    const actualCount = wc.count + bulletBonusRef.current; 
    const currentScale = bulletScaleRef.current;

    for (let i = 0; i < actualCount; i++) {
      let vx = 0, vy = 0;
      const spreadAngle = actualCount > 1 ? (i - (actualCount - 1) / 2) * (wc.spread || 0.15) : 0;
      const d = p.aimDir;
      
      if (d === 'up') { vx = 0; vy = -1; }
      else if (d === 'up-right') { vx = 0.7; vy = -0.7; }
      else if (d === 'up-left') { vx = -0.7; vy = -0.7; }
      else if (d === 'down-right') { vx = 0.7; vy = 0.7; }
      else if (d === 'down-left') { vx = -0.7; vy = 0.7; }
      else { vx = p.facingRight ? 1 : -1; vy = 0; }
      
      const cos = Math.cos(spreadAngle);
      const sin = Math.sin(spreadAngle);
      const rvx = vx * cos - vy * sin;
      const rvy = vx * sin + vy * cos;
      
      bulletsRef.current.push({ x: bx, y: by, vx: rvx * wc.speed, vy: rvy * wc.speed, active: true, isEnemy: false, weapon: p.weapon, life: 0, scale: currentScale });
    }
    p.shootCooldown = wc.cooldown;
    
    // Hiệu ứng tia lửa (Muzzle flash)
    for (let i = 0; i < 5 + actualCount; i++) { 
      particlesRef.current.push({
        x: bx, y: by,
        vx: (Math.random() - 0.5) * 8 + (p.facingRight ? 5 : -5),
        vy: (Math.random() - 0.5) * 8,
        life: 8, maxLife: 8,
        color: wc.glow, size: 2 + Math.random() * 3, isSpark: true
      });
    }
  }, []);

  // Voice Command Listener
  const lastVoiceCommand = useAppStore((s) => s.lastVoiceCommand);
  const setLastVoiceCommand = useAppStore((s) => s.setLastVoiceCommand);
  const bulletScaleRef = useRef(1.0);
  const bulletBonusRef = useRef(0);

  useEffect(() => {
    if (gameState !== 'playing' || lastVoiceCommand === 'NONE') return;

    let actionTaken = false;
    if (lastVoiceCommand === 'BIG') {
      bulletScaleRef.current = Math.min(3.0, bulletScaleRef.current + 0.5); 
      toast({ title: "🔥 NÂNG CẤP: ĐẠN KHỔNG LỒ" }); actionTaken = true;
    } else if (lastVoiceCommand === 'SMALL') {
      bulletScaleRef.current = Math.max(0.5, bulletScaleRef.current - 0.5); 
      toast({ title: "💨 HẠ CẤP: ĐẠN XUYÊN THẤU" }); actionTaken = true;
    } else if (['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'].includes(lastVoiceCommand)) {
      const mapNum: Record<string, number> = { 'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5 };
      bulletBonusRef.current = mapNum[lastVoiceCommand] - 1;
      toast({ title: `🔫 XẢ ĐẠN x${mapNum[lastVoiceCommand]}` }); actionTaken = true;
    } else if (lastVoiceCommand === 'SHOOT') {
      shoot(); actionTaken = true;
    }

    if (actionTaken) setLastVoiceCommand('NONE');
  }, [lastVoiceCommand, gameState, shoot, setLastVoiceCommand]);
  
  // ==================== STATE REFS ====================
  const playerRef = useRef({ x: 80, y: 300, vx: 0, vy: 0, w: 32, h: STAND_H, onGround: false, facingRight: true, frame: 0, invincible: 0, prone: false, aimDir: 'right' as Dir, weapon: 'pistol' as WeaponType, shootCooldown: 0 });
  const cameraRef = useRef(0);
  const levelRef = useRef(generateLevel(1, 'neon-city'));
  const bulletsRef = useRef<Bullet[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const gameStateRef = useRef(gameState);
  const keysRef = useRef<Set<string>>(new Set());
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const timeRef = useRef(0);
  const mapRef = useRef<MapId>('neon-city');
  const weaponRef = useRef<WeaponType>('laser');
  const skinRef = useRef<SkinId>('cyborg');
  const jumpModeRef = useRef(jumpMode);
  const shootModeRef = useRef(shootMode);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { jumpModeRef.current = jumpMode; }, [jumpMode]);
  useEffect(() => { shootModeRef.current = shootMode; }, [shootMode]);

  // ==================== FULLSCREEN FIX ====================
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ==================== GAME CONTROL ====================
  const startGame = useCallback(() => {
    mapRef.current = selectedMap;
    weaponRef.current = selectedWeapon;
    skinRef.current = selectedSkin;
    levelRef.current = generateLevel(1, selectedMap);
    const p = playerRef.current;
    Object.assign(p, { x: 80, y: 300, vx: 0, vy: 0, w: 32, h: STAND_H, onGround: false, facingRight: true, frame: 0, invincible: 0, prone: false, aimDir: 'right' as Dir, weapon: selectedWeapon, shootCooldown: 0 });
    cameraRef.current = 0;
    bulletsRef.current = [];
    explosionsRef.current = [];
    particlesRef.current = [];
    scoreRef.current = 0;
    livesRef.current = 3;
    timeRef.current = 0;
    setScore(0);
    setLives(3);
    setGameState('playing');
  }, [selectedMap, selectedWeapon, selectedSkin]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (e.key === ' ' && gameStateRef.current === 'menu') { e.preventDefault(); startGame(); }
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [startGame]);

  // ==================== GAME LOOP CHÍNH ====================
  useEffect(() => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let animId: number;

    const loop = () => {
      if (gameStateRef.current !== 'playing') return;
      const p = playerRef.current;
      const lv = levelRef.current;
      const currentMap = mapRef.current;
      const currentSkin = SKIN_CONFIGS[skinRef.current];
      timeRef.current++;
      if (p.shootCooldown > 0) p.shootCooldown--;

      const keys = keysRef.current;
      // Backup keyboard
      let left = keys.has('ArrowLeft') || keys.has('a');
      let right = keys.has('ArrowRight') || keys.has('d');
      let isJumping = keys.has('ArrowUp') || keys.has('w') || keys.has(' ');
      let isShooting = keys.has('f') || keys.has('j') || keys.has('k');

      // ===== LẤY DỮ LIỆU TỪ MPU VÀ AI =====
      const state = useAppStore.getState();
      const { ay, az, gx, gy, gz } = state.sensorData;
      const jMode = jumpModeRef.current;
      const sMode = shootModeRef.current;

      // 1. NHẬN DIỆN LỆNH GESTURE (TAY AI) MỚI NHẤT
      const latestGesture = state.gestureLog[0];
      if (latestGesture && latestGesture.id !== lastProcessedGestureId.current) {
        lastProcessedGestureId.current = latestGesture.id; // Đánh dấu đã đọc
        
        if (latestGesture.command === 'SWIPE_UP') {
          aiEventsRef.current.swipeUp = 12; // Lưu frame nhảy (khoảng 0.2s)
        } else if (latestGesture.command === 'PUSH') {
          aiEventsRef.current.push = 12; // Lưu frame bắn (khoảng 0.2s)
        }
      }

      // 2. DI CHUYỂN TRÁI PHẢI (Luôn dùng MPU Gyro/Accel)
      const TILT_DEADZONE = 3.5; 
      if (ay < -TILT_DEADZONE) { left = true; right = false; p.facingRight = false; }
      else if (ay > TILT_DEADZONE) { right = true; left = false; p.facingRight = true; }

      // 3. XỬ LÝ NHẢY VÀ BẮN DỰA THEO SETTINGS
      if (jMode === 'ai' && aiEventsRef.current.swipeUp > 0) {
        isJumping = true; aiEventsRef.current.swipeUp--;
      } else if (jMode === 'sensor' && Math.abs(az - 9.8) > 5.5) { // Hất mạch
        isJumping = true;
      }

      if (sMode === 'ai' && aiEventsRef.current.push > 0) {
        isShooting = true; aiEventsRef.current.push--;
      } else if (sMode === 'sensor' && (Math.abs(gx) > 7.0 || Math.abs(gz) > 7.0 || Math.abs(gy) > 7.0)) { // Lắc cổ tay
        isShooting = true;
      }

      // VẬT LÝ DI CHUYỂN
      p.aimDir = p.facingRight ? 'right' : 'left';
      if (left) { p.vx = -MOVE_SPEED; p.facingRight = false; }
      else if (right) { p.vx = MOVE_SPEED; p.facingRight = true; }
      else p.vx *= 0.8; // Trượt mượt khi dừng
      p.vx = Math.max(-MOVE_SPEED * 1.5, Math.min(MOVE_SPEED * 1.5, p.vx));

      // NHẢY
      if (isJumping && p.onGround) {
        p.vy = JUMP_FORCE;
        p.onGround = false;
        // Hiệu ứng bụi khi nhảy
        for(let i = 0; i<5; i++) particlesRef.current.push({x: p.x+p.w/2, y: p.y+p.h, vx: (Math.random()-0.5)*4, vy: -Math.random()*2, life: 10, maxLife: 10, color: '#ced4da', size: 3, isSpark: false});
      }

      // BẮN
      if (isShooting && p.shootCooldown <= 0) shoot();

      p.vy += GRAVITY;
      p.x += p.vx;
      p.y += p.vy;
      p.frame++;
      if (p.invincible > 0) p.invincible--;
      if (p.x < 0) p.x = 0;
      if (p.x > lv.levelWidth - p.w) p.x = lv.levelWidth - p.w;

      addTrailParticles(particlesRef.current, p.x, p.y, p.h, currentSkin, Math.abs(p.vx) > 1);

      // VA CHẠM TƯỜNG/ĐẤT
      p.onGround = false;
      for (const pl of lv.platforms) {
        if (p.x + p.w > pl.x && p.x < pl.x + pl.w && p.y + p.h > pl.y && p.y + p.h < pl.y + pl.h + 15 && p.vy >= 0) {
          p.y = pl.y - p.h; p.vy = 0; p.onGround = true;
        }
        if (pl.type !== 'bridge' && p.x + p.w > pl.x + 4 && p.x < pl.x + pl.w - 4 && p.y + p.h > pl.y + 10 && p.y < pl.y + pl.h) {
          if (p.vx > 0 && p.x + p.w - pl.x < 15) { p.x = pl.x - p.w; p.vx = 0; }
          if (p.vx < 0 && pl.x + pl.w - p.x < 15) { p.x = pl.x + pl.w; p.vx = 0; }
        }
      }

      // CHẾT (RỚT VỰC)
      if (p.y > BASE_H + 100) {
        livesRef.current--; setLives(livesRef.current);
        if (livesRef.current <= 0) { setGameState('dead'); return; }
        p.x = Math.max(cameraRef.current + 100, 80);
        p.y = 100; p.vx = 0; p.vy = 0; p.invincible = 150;
      }

      // ĂN ITEM
      for (const pu of lv.powerUps) {
        if (pu.collected) continue;
        pu.frame++;
        if (Math.abs(p.x + p.w / 2 - pu.x) < 30 && Math.abs(p.y + p.h / 2 - pu.y) < 30) {
          pu.collected = true;
          if (pu.type === 'life') { livesRef.current++; setLives(livesRef.current); }
          scoreRef.current += 1000; setScore(scoreRef.current);
          for (let i = 0; i < 20; i++) particlesRef.current.push({ x: pu.x, y: pu.y, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, life: 30, maxLife: 30, color: '#00f5d4', size: 4, isSpark: true });
        }
      }

      // KẺ ĐỊCH
      for (const e of lv.enemies) {
        if (!e.alive) continue;
        e.frame++; e.x += e.vx; e.facingLeft = e.vx < 0;
        if (e.x < e.patrolMin || e.x > e.patrolMax) { e.vx = -e.vx; e.facingLeft = e.vx < 0; }
        
        if (p.invincible <= 0 && p.x + p.w > e.x && p.x < e.x + e.w && p.y + p.h > e.y && p.y < e.y + e.h) {
          livesRef.current--; setLives(livesRef.current);
          p.invincible = 150; p.vy = -8; p.vx = p.x < e.x ? -5 : 5; // Bị dội ngược
          if (livesRef.current <= 0) { setGameState('dead'); return; }
        }
      }

      // ĐẠN BẮN
      for (const b of bulletsRef.current) {
        if (!b.active) continue;
        b.x += b.vx; b.y += b.vy; b.life++;
        
        if (!b.isEnemy) {
          const wc = WEAPON_CONFIGS[b.weapon];
          for (const e of lv.enemies) {
            if (!e.alive) continue;
            if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
              e.hp -= wc.damage;
              b.active = false;
              
              // Máu chảy (Partical)
              for (let i = 0; i < 5; i++) particlesRef.current.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 10, maxLife: 10, color: '#ef233c', size: 3, isSpark: false });

              if (e.hp <= 0) {
                e.alive = false;
                scoreRef.current += e.type === 'heavy' ? 1000 : e.type === 'runner' ? 500 : 300;
                setScore(scoreRef.current);
                explosionsRef.current.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, frame: 0, maxFrame: 30, color: '#fca311' });
              }
            }
          }
        }
        
        // Đạn nổ vào tường
        for (const pl of lv.platforms) {
          if (pl.type === 'bridge') continue;
          if (b.x > pl.x && b.x < pl.x + pl.w && b.y > pl.y && b.y < pl.y + pl.h) {
            b.active = false;
            for (let i = 0; i < 4; i++) particlesRef.current.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 8, maxLife: 8, color: '#fff', size: 2, isSpark: true });
            
            if (b.weapon === 'rocket') {
              explosionsRef.current.push({ x: b.x, y: b.y, frame: 0, maxFrame: 25, color: '#d90429' });
              for (const e of lv.enemies) {
                if (!e.alive) continue;
                if (Math.hypot(e.x + e.w / 2 - b.x, e.y + e.h / 2 - b.y) < 80) { e.hp -= 3; if (e.hp <= 0) { e.alive = false; explosionsRef.current.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, frame: 0, maxFrame: 25, color: '#fca311' }); } }
              }
            }
          }
        }
        if (b.x < cameraRef.current - 100 || b.x > cameraRef.current + BASE_W + 100 || b.y < -100 || b.y > BASE_H + 100) b.active = false;
      }
      bulletsRef.current = bulletsRef.current.filter(b => b.active);

      // Quản lý Mảng rác (Garbage collection)
      for (const ex of explosionsRef.current) ex.frame++;
      explosionsRef.current = explosionsRef.current.filter(ex => ex.frame < ex.maxFrame);
      for (const pt of particlesRef.current) { pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.15; pt.vx *= 0.9; pt.life--; }
      particlesRef.current = particlesRef.current.filter(pt => pt.life > 0);

      // THẮNG (TỚI ĐÍCH)
      if (p.x + p.w > lv.goalX) {
        scoreRef.current += 5000; setScore(scoreRef.current);
        setGameState('won'); return;
      }

      // CAMERA SIÊU MƯỢT
      const targetCam = p.x - BASE_W * 0.4;
      cameraRef.current += (targetCam - cameraRef.current) * 0.1;
      if (cameraRef.current < 0) cameraRef.current = 0;
      if (cameraRef.current > lv.levelWidth - BASE_W) cameraRef.current = lv.levelWidth - BASE_W;
      const cam = cameraRef.current;

      // ======================= VẼ LÊN CANVAS =======================
      ctx.clearRect(0,0,BASE_W, BASE_H);
      drawBackground(ctx, BASE_W, BASE_H, cam, timeRef.current, currentMap);
      for (const pl of lv.platforms) drawTile(ctx, pl, cam, currentMap);

      // Cột mốc Đích đến
      const markerX = lv.goalX - cam;
      if (markerX > -50 && markerX < BASE_W + 50) {
        ctx.shadowColor = '#00f5d4'; ctx.shadowBlur = 20; ctx.fillStyle = '#00f5d4';
        ctx.fillRect(markerX, BASE_H - TILE * 2 - 150, 8, 150);
        ctx.shadowBlur = 0;
      }

      for (const pu of lv.powerUps) if (!pu.collected) drawPowerUp(ctx, pu.x - cam, pu.y, pu.type, pu.frame);
      for (const e of lv.enemies) if (e.alive && e.x - cam > -100 && e.x - cam < BASE_W + 100) drawEnemy(ctx, e, cam, timeRef.current);
      for (const b of bulletsRef.current) drawBullet(ctx, b, cam);
      drawParticles(ctx, particlesRef.current, cam);
      for (const ex of explosionsRef.current) drawExplosion(ctx, { ...ex, x: ex.x - cam });

      if (p.invincible <= 0 || Math.floor(p.invincible / 5) % 2 === 0) {
        drawSkinnedPlayer(ctx, p.x - cam, p.y, p.w, p.h, p.facingRight, p.frame, !p.onGround, p.prone, p.aimDir, currentSkin, timeRef.current);
      }

      drawHUD(ctx, BASE_W, scoreRef.current, livesRef.current, playerRef.current.weapon, MAP_CONFIGS[currentMap].name, currentSkin.name);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, shoot]);

  // Vẽ Render Preview Skin liên tục ở Menu
  const mapIds: MapId[] = ['neon-city', 'jungle', 'desert', 'snow'];
  const weaponIds: WeaponType[] = ['laser', 'shotgun', 'rocket', 'pistol'];
  const skinIds: SkinId[] = ['cyborg', 'samurai', 'commando', 'phoenix', 'ninja', 'ghost'];

  const skinPreviewRef = useRef<HTMLCanvasElement>(null);
  const skinAnimRef = useRef<number>(0);
  useEffect(() => {
    if (gameState !== 'menu' || menuTab !== 'skin') { cancelAnimationFrame(skinAnimRef.current); return; }
    const renderPreview = () => {
      const cvs = skinPreviewRef.current;
      if (!cvs) { skinAnimRef.current = requestAnimationFrame(renderPreview); return; }
      const ctx = cvs.getContext('2d')!;
      const t = Date.now() * 0.01;
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      drawSkinnedPlayer(ctx, cvs.width/2 - 16, 15, 32, STAND_H, true, t, false, false, 'right', SKIN_CONFIGS[selectedSkin], t);
      skinAnimRef.current = requestAnimationFrame(renderPreview);
    };
    skinAnimRef.current = requestAnimationFrame(renderPreview);
    return () => cancelAnimationFrame(skinAnimRef.current);
  }, [selectedSkin, gameState, menuTab]);

  // ==================== RENDER UI REACT ====================
  return (
    <motion.div ref={containerRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className={`flex flex-col items-center gap-4 ${isFullscreen ? 'bg-black w-screen h-screen fixed inset-0 z-[9999]' : 'w-full'}`}>
      
      {!isFullscreen && (
        <div className="w-full flex justify-between items-center px-4 pt-2 max-w-[1280px]">
          <Button variant="ghost" onClick={onBack} className="font-mono gap-2 hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" /> ESCAPE
          </Button>
          <div className="flex gap-2">
            <h3 className="font-mono text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 hidden md:block">
               ULTRA ASSAULT: CYBER OPS
            </h3>
          </div>
          <Button variant="outline" onClick={toggleFullscreen} className="font-mono gap-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20">
            <Maximize2 className="w-4 h-4" /> FULLSCREEN
          </Button>
        </div>
      )}

      {/* CONTAINER CANVAS SẼ CHIẾM TOÀN MÀN HÌNH NẾU FULLSCREEN */}
      <div className={`relative ${isFullscreen ? 'w-full h-full flex items-center justify-center bg-black' : 'w-full max-w-[1280px] px-4'}`}>
        <canvas ref={canvasRef} width={BASE_W} height={BASE_H}
          className={`${isFullscreen ? 'w-full h-full object-contain' : 'w-full rounded-2xl shadow-[0_0_50px_rgba(0,245,212,0.15)] border border-white/10'}`} 
        />
        
        {isFullscreen && (
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="absolute top-6 right-6 bg-black/50 hover:bg-red-500/50 text-white z-50 rounded-full w-12 h-12 backdrop-blur-md">
            <Minimize2 className="w-6 h-6" />
          </Button>
        )}

        {/* UI OVERLAY CỦA MENU/THẮNG/THUA CHUẨN KÍNH MỜ (GLASSMORPHISM) */}
        <AnimatePresence>
          {gameState === 'menu' && (
            <motion.div initial={{ opacity: 0, backdropFilter: 'blur(0px)' }} animate={{ opacity: 1, backdropFilter: 'blur(12px)' }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-2xl overflow-y-auto py-8">
              <div className="text-5xl mb-2 drop-shadow-[0_0_15px_rgba(0,245,212,0.8)]">⚔️</div>
              <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00f5d4] to-[#7209b7] mb-6 font-mono tracking-widest text-center" style={{ filter: 'drop-shadow(0 0 10px rgba(0,245,212,0.5))' }}>
                CYBER ASSAULT
              </h2>
              
              <div className="flex bg-black/50 p-1.5 rounded-xl border border-white/10 mb-6 backdrop-blur-md">
                {(['controls', 'skin', 'map', 'weapon'] as const).map(tab => {
                  const icons = { controls: <Settings size={16}/>, skin: <Shield size={16}/>, map: <Target size={16}/>, weapon: <Zap size={16}/> };
                  return (
                    <button key={tab} onClick={() => setMenuTab(tab)}
                      className={`px-6 py-2.5 rounded-lg text-sm font-mono font-bold tracking-wider transition-all flex items-center gap-2 ${
                        menuTab === tab ? 'bg-gradient-to-r from-cyan-500/30 to-purple-500/30 text-cyan-300 border border-cyan-500/50 shadow-[0_0_15px_rgba(0,245,212,0.3)]' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}>
                      {icons[tab]} {tab.toUpperCase()}
                    </button>
                  );
                })}
              </div>

              {/* ===== TAB: CÀI ĐẶT ĐIỀU KHIỂN (ĐÃ FIX CHỈ CHỌN 1 TRONG 2) ===== */}
              {menuTab === 'controls' && (
                <motion.div initial={{y: 20, opacity: 0}} animate={{y:0, opacity:1}} className="w-full max-w-[600px] grid grid-cols-2 gap-4">
                  <div className="bg-gray-900/80 p-5 rounded-2xl border border-white/10">
                    <p className="text-sm text-cyan-400 font-mono font-bold mb-4 flex items-center gap-2"><ArrowLeft className="rotate-90"/> ACTION: JUMP</p>
                    <div className="flex flex-col gap-3">
                      {(['ai', 'sensor'] as const).map(mode => (
                        <button key={`jump-${mode}`} onClick={() => setJumpMode(mode)}
                          className={`w-full py-3 px-4 text-sm font-mono rounded-xl border transition-all text-left flex justify-between items-center ${jumpMode === mode ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300 shadow-[0_0_15px_rgba(0,245,212,0.2)]' : 'border-gray-700 text-gray-400 hover:border-gray-500 bg-black/50'}`}>
                          {mode === 'ai' ? '🖐️ Gesture AI (Swipe Up)' : '📳 MPU Sensor (Hất mạch)'}
                          <div className={`w-4 h-4 rounded-full border-2 ${jumpMode === mode ? 'border-cyan-400 bg-cyan-400' : 'border-gray-600'}`}/>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-900/80 p-5 rounded-2xl border border-white/10">
                    <p className="text-sm text-red-400 font-mono font-bold mb-4 flex items-center gap-2"><Zap /> ACTION: SHOOT</p>
                    <div className="flex flex-col gap-3">
                      {(['ai', 'sensor'] as const).map(mode => (
                        <button key={`shoot-${mode}`} onClick={() => setShootMode(mode)}
                          className={`w-full py-3 px-4 text-sm font-mono rounded-xl border transition-all text-left flex justify-between items-center ${shootMode === mode ? 'border-red-500 bg-red-500/20 text-red-300 shadow-[0_0_15px_rgba(239,35,60,0.2)]' : 'border-gray-700 text-gray-400 hover:border-gray-500 bg-black/50'}`}>
                          {mode === 'ai' ? '👊 Gesture AI (Push)' : '📳 MPU Sensor (Lắc tay)'}
                          <div className={`w-4 h-4 rounded-full border-2 ${shootMode === mode ? 'border-red-400 bg-red-400' : 'border-gray-600'}`}/>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ===== CÁC TAB KHÁC ===== */}
              {menuTab === 'skin' && (
                <motion.div initial={{scale: 0.95, opacity: 0}} animate={{scale:1, opacity:1}} className="w-full max-w-[650px]">
                  <div className="flex items-center gap-6 mb-6 bg-gradient-to-r from-gray-900/90 to-black/90 p-4 rounded-2xl border border-white/10">
                    <canvas ref={skinPreviewRef} width={100} height={90} className="rounded-xl border border-cyan-500/30 bg-black shadow-[0_0_20px_rgba(0,245,212,0.2)]" />
                    <div>
                      <p className="text-2xl font-mono font-black text-white">{SKIN_CONFIGS[selectedSkin].name}</p>
                      <p className="text-sm text-cyan-400 font-mono mt-1">{SKIN_CONFIGS[selectedSkin].description}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {skinIds.map(id => (
                      <button key={id} onClick={() => setSelectedSkin(id)}
                        className={`p-4 rounded-xl border font-mono text-center transition-all duration-300 ${selectedSkin === id ? 'border-cyan-500 bg-cyan-500/10 scale-105 shadow-[0_0_20px_rgba(0,245,212,0.3)]' : 'border-white/10 bg-black/40 hover:bg-white/5 hover:border-white/30'}`}>
                        <div className="text-3xl mb-2">{SKIN_CONFIGS[id].emoji}</div>
                        <div className={`text-xs font-bold ${selectedSkin === id ? 'text-cyan-300' : 'text-gray-400'}`}>{SKIN_CONFIGS[id].name}</div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {menuTab === 'map' && (
                <motion.div initial={{scale: 0.95, opacity: 0}} animate={{scale:1, opacity:1}} className="w-full max-w-[650px] grid grid-cols-2 gap-4">
                  {mapIds.map(id => (
                    <button key={id} onClick={() => setSelectedMap(id)}
                      className={`p-6 rounded-2xl border font-mono text-left transition-all duration-300 relative overflow-hidden group ${selectedMap === id ? 'border-purple-500 bg-purple-500/10 scale-105 shadow-[0_0_25px_rgba(114,9,183,0.4)]' : 'border-white/10 bg-black/40 hover:bg-white/5 hover:border-white/30'}`}>
                      <div className="text-4xl mb-3 relative z-10">{MAP_CONFIGS[id].emoji}</div>
                      <div className={`text-lg font-bold relative z-10 ${selectedMap === id ? 'text-purple-300' : 'text-gray-300'}`}>{MAP_CONFIGS[id].name}</div>
                      <div className="text-xs text-gray-500 relative z-10 mt-1">{MAP_CONFIGS[id].description}</div>
                      {selectedMap === id && <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent z-0"/>}
                    </button>
                  ))}
                </motion.div>
              )}

              {menuTab === 'weapon' && (
                <motion.div initial={{scale: 0.95, opacity: 0}} animate={{scale:1, opacity:1}} className="w-full max-w-[650px] grid grid-cols-2 gap-4">
                  {weaponIds.map(id => (
                    <button key={id} onClick={() => setSelectedWeapon(id)}
                      className={`p-6 rounded-2xl border font-mono text-left transition-all duration-300 relative overflow-hidden ${selectedWeapon === id ? 'border-red-500 bg-red-500/10 scale-105 shadow-[0_0_25px_rgba(239,35,60,0.4)]' : 'border-white/10 bg-black/40 hover:bg-white/5 hover:border-white/30'}`}>
                      <div className="text-4xl mb-3">{WEAPON_CONFIGS[id].emoji}</div>
                      <div className={`text-lg font-bold ${selectedWeapon === id ? 'text-red-400' : 'text-gray-300'}`}>{WEAPON_CONFIGS[id].name}</div>
                      <div className="text-xs text-gray-500 mt-1">{WEAPON_CONFIGS[id].description}</div>
                    </button>
                  ))}
                </motion.div>
              )}

              <Button onClick={startGame} size="lg" className="mt-8 font-mono text-xl px-12 py-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_30px_rgba(0,245,212,0.5)] border-0 rounded-xl transition-all hover:scale-105">
                🚀 START DEPLOYMENT
              </Button>
            </motion.div>
          )}

          {/* MÀN HÌNH CHIẾN THẮNG */}
          {gameState === 'won' && (
            <motion.div initial={{ opacity: 0, backdropFilter: 'blur(0px)' }} animate={{ opacity: 1, backdropFilter: 'blur(20px)' }} className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-2xl">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: [0, 10, -10, 0] }} transition={{type:'spring', bounce: 0.5}} className="text-7xl mb-6 drop-shadow-[0_0_30px_rgba(255,215,0,0.8)]">🏆</motion.div>
              <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-600 mb-4 font-mono">MISSION ACCOMPLISHED</h2>
              <p className="text-2xl text-cyan-300 mb-8 font-mono bg-cyan-900/30 px-6 py-2 rounded-lg border border-cyan-500/30">FINAL SCORE: {score.toLocaleString()}</p>
              <div className="flex gap-4">
                <Button onClick={() => setGameState('menu')} variant="outline" className="font-mono text-lg py-6 px-8 border-white/20 text-gray-300 hover:bg-white/10">MAIN MENU</Button>
                <Button onClick={startGame} className="font-mono text-lg py-6 px-10 bg-yellow-500 hover:bg-yellow-400 text-black font-bold shadow-[0_0_20px_rgba(255,215,0,0.5)] border-0">NEXT DEPLOYMENT</Button>
              </div>
            </motion.div>
          )}

          {/* MÀN HÌNH GAME OVER */}
          {gameState === 'dead' && (
            <motion.div initial={{ opacity: 0, backdropFilter: 'blur(0px)' }} animate={{ opacity: 1, backdropFilter: 'blur(20px)' }} className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 rounded-2xl border border-red-500/30">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-7xl mb-6 drop-shadow-[0_0_30px_rgba(239,35,60,0.8)]">💀</motion.div>
              <h2 className="text-5xl font-black text-red-500 mb-4 font-mono tracking-widest drop-shadow-[0_0_15px_rgba(239,35,60,0.5)]">KIA - GAME OVER</h2>
              <p className="text-xl text-gray-400 mb-8 font-mono">Score Achieved: <span className="text-red-400 font-bold">{score.toLocaleString()}</span></p>
              <div className="flex gap-4">
                <Button onClick={() => setGameState('menu')} variant="outline" className="font-mono text-lg py-6 px-8 border-white/20 text-gray-300 hover:bg-white/10">ABORT MISSION</Button>
                <Button onClick={startGame} className="font-mono text-lg py-6 px-10 bg-red-600 hover:bg-red-500 text-white font-bold shadow-[0_0_20px_rgba(239,35,60,0.6)] border-0">RETRY DROP</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}