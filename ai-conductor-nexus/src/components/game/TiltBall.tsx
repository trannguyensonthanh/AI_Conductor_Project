import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Maximize, Minimize, Play, Settings2, Volume2, VolumeX, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BALL_R = 14;
const COIN_R = 10;

// --- THEMES & SKINS ---
const ENVIRONMENTS = {
  cyber: { name: 'Cyber Neon', bg: '#000814', grid: '#00f0ff33', obsBorder: '#ff0055', obsFill: '#ff005533', coin: '#ffd700' },
  toxic: { name: 'Toxic Lab', bg: '#051005', grid: '#39ff1433', obsBorder: '#ffaa00', obsFill: '#ffaa0033', coin: '#00ffff' },
  void: { name: 'Deep Void', bg: '#0a0014', grid: '#a855f733', obsBorder: '#00ffff', obsFill: '#00ffff33', coin: '#ff00ff' },
};

const SKINS = {
  plasma: { name: 'Plasma Blue', color: '#ffffff', glow: '#00f0ff' },
  nuclear: { name: 'Nuclear Green', color: '#ffffff', glow: '#39ff14' },
  solar: { name: 'Solar Flare', color: '#ffffff', glow: '#ffaa00' },
};

type EnvKey = keyof typeof ENVIRONMENTS;
type SkinKey = keyof typeof SKINS;

interface Coin { x: number; y: number; collected: boolean; floatOffset: number; }
interface Obstacle { x: number; y: number; w: number; h: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; }

// --- LEVEL GENERATOR ---
function generateLevel(wave: number, w: number, h: number) {
  const obstacles: Obstacle[] = [];
  const coins: Coin[] = [];
  
  // Wave càng cao, chướng ngại vật càng nhiều (Tối đa 25)
  const obsCount = Math.min(25, 3 + wave * 2);
  const coinCount = Math.min(15, 4 + wave);

  // Sinh chướng ngại vật ngẫu nhiên (tránh khu vực Spawn ở giữa)
  for (let i = 0; i < obsCount; i++) {
    const ow = 40 + Math.random() * 80;
    const oh = 40 + Math.random() * 80;
    let ox, oy, isSafe;
    do {
      ox = Math.random() * (w - ow);
      oy = Math.random() * (h - oh);
      // Khu vực an toàn ở tâm màn hình (Radius 100)
      const distToCenter = Math.hypot((ox + ow/2) - w/2, (oy + oh/2) - h/2);
      isSafe = distToCenter > 100;
    } while (!isSafe);
    obstacles.push({ x: ox, y: oy, w: ow, h: oh });
  }

  // Sinh Coins (không đè lên chướng ngại vật)
  for (let i = 0; i < coinCount; i++) {
    let cx, cy, isClear;
    do {
      cx = 30 + Math.random() * (w - 60);
      cy = 30 + Math.random() * (h - 60);
      isClear = !obstacles.some(o => 
        cx + COIN_R > o.x - 10 && cx - COIN_R < o.x + o.w + 10 && 
        cy + COIN_R > o.y - 10 && cy - COIN_R < o.y + o.h + 10
      );
    } while (!isClear);
    coins.push({ x: cx, y: cy, collected: false, floatOffset: Math.random() * Math.PI * 2 });
  }

  return { obstacles, coins };
}

export function TiltBall({ onBack }: { onBack: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [gameState, setGameState] = useState<'idle' | 'setup' | 'playing' | 'wave_clear' | 'over'>('idle');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(60);
  const [muted, setMuted] = useState(false);
  
  const [selectedEnv, setSelectedEnv] = useState<EnvKey>('cyber');
  const [selectedSkin, setSelectedSkin] = useState<SkinKey>('plasma');
  const [dim, setDim] = useState({ w: 800, h: 500 });

  // Game Data Refs
  const ballRef = useRef({ x: 400, y: 250, vx: 0, vy: 0 });
  const mapRef = useRef({ obstacles: [] as Obstacle[], coins: [] as Coin[] });
  const particlesRef = useRef<Particle[]>([]);
  const trailRef = useRef<{x: number, y: number}[]>([]);
  
  const waveRef = useRef(1);
  const scoreRef = useRef(0);
  const gameStateRef = useRef(gameState);
  const keysRef = useRef(new Set<string>());
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Fullscreen & Resize Logic
  useEffect(() => {
    const handleResize = () => {
      if (document.fullscreenElement) {
        setIsFullscreen(true);
        setDim({ w: window.innerWidth, h: window.innerHeight });
      } else {
        setIsFullscreen(false);
        setDim({ w: 800, h: 500 });
      }
      setGameState('idle'); // Bắt buộc về Menu để Map gen lại theo kích thước mới
    };

    document.addEventListener('fullscreenchange', handleResize);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('fullscreenchange', handleResize);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen().catch(e => console.log(e));
    } else {
      await document.exitFullscreen();
    }
  };

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keysRef.current.add(e.key);
    const offKey = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', offKey);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', offKey); };
  }, []);

  // Audio Retro Beeper
  const playBeep = useCallback((freq: number, dur: number, type: OscillatorType = 'square') => {
    if (muted) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime((volume / 100) * 0.15, ctx.currentTime);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.stop(ctx.currentTime + dur);
    } catch {}
  }, [volume, muted]);

  const spawnParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
        life: 1, color, size: Math.random() * 4 + 2
      });
    }
  };

  const initGame = (wave: number) => {
    waveRef.current = wave;
    if(wave === 1) scoreRef.current = 0;
    
    ballRef.current = { x: dim.w / 2, y: dim.h / 2, vx: 0, vy: 0 };
    mapRef.current = generateLevel(wave, dim.w, dim.h);
    particlesRef.current = [];
    trailRef.current = [];
    setGameState('playing');
  };

  // 🎮 MAIN GAME LOOP 🎮
  useEffect(() => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false })!;
    let animId: number;
    let frame = 0;

    const env = ENVIRONMENTS[selectedEnv];
    const skin = SKINS[selectedSkin];

    const loop = () => {
      if (gameStateRef.current !== 'playing') return;
      frame++;
      const b = ballRef.current;
      const keys = keysRef.current;
      let inputAx = 0, inputAy = 0;

      // --- 1. NHẬN ĐIỀU KHIỂN ---
      if (keys.has('ArrowLeft') || keys.has('a')) inputAx -= 0.6;
      if (keys.has('ArrowRight') || keys.has('d')) inputAx += 0.6;
      if (keys.has('ArrowUp') || keys.has('w')) inputAy -= 0.6;
      if (keys.has('ArrowDown') || keys.has('s')) inputAy += 0.6;

      // MPU6050 Input
      const { ax, ay } = useAppStore.getState().sensorData;
      const DEADZONE = 1.0; 
      const SENSITIVITY = 0.12; 
      if (Math.abs(ay) > DEADZONE) inputAx -= ay * SENSITIVITY; 
      if (Math.abs(ax) > DEADZONE) inputAy -= ax * SENSITIVITY; 

      // --- 2. VẬT LÝ DI CHUYỂN ---
      b.vx = (b.vx + inputAx) * 0.94; // Ma sát sàn
      b.vy = (b.vy + inputAy) * 0.94;
      b.x += b.vx;
      b.y += b.vy;

      // Update Trail
      if (Math.abs(b.vx) > 1 || Math.abs(b.vy) > 1) {
        if (frame % 2 === 0) trailRef.current.push({ x: b.x, y: b.y });
        if (trailRef.current.length > 10) trailRef.current.shift();
      }

      // --- 3. KIỂM TRA VA CHẠM (WALL & OBSTACLES) ---
      const BOUNCE = -0.5; // Giảm độ nảy để dễ kiểm soát hơn
      
      // Tường ngoài
      if (b.x < BALL_R) { b.x = BALL_R; b.vx *= BOUNCE; playBeep(150, 0.1, 'triangle'); }
      if (b.x > dim.w - BALL_R) { b.x = dim.w - BALL_R; b.vx *= BOUNCE; playBeep(150, 0.1, 'triangle'); }
      if (b.y < BALL_R) { b.y = BALL_R; b.vy *= BOUNCE; playBeep(150, 0.1, 'triangle'); }
      if (b.y > dim.h - BALL_R) { b.y = dim.h - BALL_R; b.vy *= BOUNCE; playBeep(150, 0.1, 'triangle'); }

      // Circle vs AABB (Chướng ngại vật)
      for (const o of mapRef.current.obstacles) {
        // Tìm điểm gần nhất trên hình chữ nhật so với tâm hình tròn
        const testX = Math.max(o.x, Math.min(b.x, o.x + o.w));
        const testY = Math.max(o.y, Math.min(b.y, o.y + o.h));
        
        const distX = b.x - testX;
        const distY = b.y - testY;
        const distance = Math.sqrt(distX * distX + distY * distY);

        if (distance < BALL_R) {
          // Va chạm xảy ra! Resolve Collision
          const overlap = BALL_R - distance;
          
          // Tránh chia cho 0
          if(distance === 0) { b.y -= BALL_R; b.vy *= BOUNCE; continue; }
          
          const nx = distX / distance;
          const ny = distY / distance;

          // Đẩy bóng ra khỏi vật cản
          b.x += nx * overlap;
          b.y += ny * overlap;

          // Tính toán phản xạ vận tốc
          const dotProduct = b.vx * nx + b.vy * ny;
          if (dotProduct < 0) { // Chỉ nảy nếu đang hướng vào vật cản
            b.vx -= (1 - BOUNCE) * dotProduct * nx;
            b.vy -= (1 - BOUNCE) * dotProduct * ny;
            playBeep(200, 0.1, 'triangle');
            spawnParticles(testX, testY, env.obsBorder, 5);
          }
        }
      }

      // --- 4. ĂN XU (COINS) ---
      let coinsLeft = 0;
      for (const c of mapRef.current.coins) {
        if (c.collected) continue;
        coinsLeft++;
        const dx = b.x - c.x; const dy = b.y - c.y;
        if (dx * dx + dy * dy < (BALL_R + COIN_R) * (BALL_R + COIN_R)) {
          c.collected = true;
          scoreRef.current += 10;
          playBeep(800 + Math.random()*400, 0.15, 'sine');
          spawnParticles(c.x, c.y, env.coin, 15);
        }
      }

      // CHUYỂN WAVE
      if (coinsLeft === 0) {
        playBeep(1200, 0.5, 'square');
        setGameState('wave_clear');
        return;
      }

      // --- RENDERER ---
      ctx.fillStyle = env.bg;
      ctx.fillRect(0, 0, dim.w, dim.h);

      // Grid Background
      ctx.strokeStyle = env.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < dim.w; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, dim.h); }
      for (let y = 0; y < dim.h; y += 40) { ctx.moveTo(0, y); ctx.lineTo(dim.w, y); }
      ctx.stroke();

      // Vẽ Chướng ngại vật
      ctx.shadowColor = env.obsBorder;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      for (const o of mapRef.current.obstacles) {
        ctx.fillStyle = env.obsFill;
        ctx.strokeStyle = env.obsBorder;
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.strokeRect(o.x, o.y, o.w, o.h);
        
        // Inner detail line
        ctx.beginPath();
        ctx.moveTo(o.x + 5, o.y + 5); ctx.lineTo(o.x + o.w - 5, o.y + o.h - 5);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // Vẽ Coins (Lơ lửng)
      ctx.fillStyle = env.coin;
      ctx.shadowColor = env.coin;
      ctx.shadowBlur = 15;
      for (const c of mapRef.current.coins) {
        if (c.collected) continue;
        const hoverY = c.y + Math.sin((Date.now() / 200) + c.floatOffset) * 4;
        
        ctx.beginPath();
        ctx.moveTo(c.x, hoverY - COIN_R);
        ctx.lineTo(c.x + COIN_R, hoverY);
        ctx.lineTo(c.x, hoverY + COIN_R);
        ctx.lineTo(c.x - COIN_R, hoverY);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(c.x, hoverY, COIN_R/3, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = env.coin; // Reset for next
      }

      // Vẽ Particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx; p.y += p.vy; p.life -= 0.04;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
        return p.life > 0;
      });
      ctx.globalAlpha = 1.0;

      // Vẽ Trail
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = BALL_R;
      if (trailRef.current.length > 1) {
        ctx.beginPath();
        for(let i=0; i<trailRef.current.length; i++) {
          ctx.strokeStyle = skin.glow + Math.floor((i / 10) * 255).toString(16).padStart(2, '0');
          if(i===0) ctx.moveTo(trailRef.current[i].x, trailRef.current[i].y);
          else ctx.lineTo(trailRef.current[i].x, trailRef.current[i].y);
        }
        ctx.stroke();
      }

      // Vẽ Bóng
      ctx.fillStyle = skin.color;
      ctx.shadowColor = skin.glow;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      // Highlight bóng
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(b.x - 4, b.y - 4, 3, 0, Math.PI*2); ctx.fill();

      // Draw HUD directly on Canvas (High Performance)
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px "JetBrains Mono"';
      ctx.textAlign = 'left';
      ctx.fillText(`SCORE: ${scoreRef.current}`, 20, 35);
      ctx.fillStyle = skin.glow;
      ctx.fillText(`WAVE: ${waveRef.current}`, 20, 65);
      
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffaa00';
      ctx.fillText(`COINS: ${coinsLeft}`, dim.w - 20, 35);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, selectedEnv, selectedSkin, dim, playBeep]);

  return (
    <div ref={containerRef} className={`flex flex-col items-center bg-background transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-[100] bg-black justify-center p-0' : 'relative w-full max-w-5xl p-4 gap-4'
    }`}>
      
      {/* Header UI */}
      <div className={`flex items-center justify-between w-full ${isFullscreen ? 'absolute top-0 z-50 bg-black/50 backdrop-blur-md px-6 py-3' : ''}`}>
        <Button variant="ghost" size="sm" onClick={onBack} className="font-mono text-xs gap-2 hover:bg-white/10">
          <ArrowLeft className="w-4 h-4" /> LOBBY
        </Button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 w-32 hidden md:flex">
            <Button variant="ghost" size="icon" className="w-7 h-7 text-white" onClick={() => setMuted(!muted)}>
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Slider value={[volume]} max={100} step={1} onValueChange={(v) => setVolume(v[0])} />
          </div>
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white hover:bg-white/10">
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} 
        className={`relative flex justify-center items-center w-full ${isFullscreen ? 'h-full flex-1' : ''}`}
      >
        <div className={`relative overflow-hidden bg-black ${isFullscreen ? 'w-full h-full' : 'rounded-xl border border-white/10 shadow-[0_0_40px_rgba(0,255,255,0.1)]'}`}
             style={{ width: isFullscreen ? '100%' : dim.w, height: isFullscreen ? '100%' : dim.h }}>
          
          <canvas ref={canvasRef} width={dim.w} height={dim.h} className="block w-full h-full object-cover" />
          
          <AnimatePresence mode="wait">
            {/* IDLE MENU */}
            {gameState === 'idle' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
                <Target className="w-16 h-16 text-cyan-400 mb-4 drop-shadow-[0_0_15px_rgba(0,255,255,0.8)]" />
                <h1 className="text-5xl font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2 drop-shadow-[0_0_10px_rgba(0,255,255,0.4)]">
                  TILT BALL
                </h1>
                <p className="text-white/60 font-mono text-sm mb-8 tracking-widest uppercase">Nghiêng thế giới - Ăn trọn xu</p>
                <div className="flex gap-4">
                  <Button onClick={() => setGameState('setup')} variant="outline" size="lg" className="font-mono border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 gap-2">
                    <Settings2 className="w-5 h-5" /> TÙY CHỈNH
                  </Button>
                  <Button onClick={() => initGame(1)} size="lg" className="font-mono bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(0,255,255,0.4)] gap-2">
                    <Play className="w-5 h-5" /> BẮT ĐẦU
                  </Button>
                </div>
              </motion.div>
            )}

            {/* SETUP MENU */}
            {gameState === 'setup' && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-6">
                <div className="flex w-full max-w-2xl gap-8">
                  <div className="flex-1 space-y-3">
                    <h3 className="font-mono text-cyan-400 text-xs tracking-widest border-b border-cyan-500/30 pb-2">CHỌN MÔI TRƯỜNG</h3>
                    {(Object.keys(ENVIRONMENTS) as EnvKey[]).map(key => (
                      <div key={key} onClick={() => setSelectedEnv(key)}
                        className={`cursor-pointer p-3 rounded-lg border transition-all ${selectedEnv === key ? 'border-cyan-400 bg-cyan-900/40' : 'border-white/10 hover:border-white/30'}`}>
                        <p className="font-mono text-sm text-white">{ENVIRONMENTS[key].name}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 space-y-3">
                    <h3 className="font-mono text-cyan-400 text-xs tracking-widest border-b border-cyan-500/30 pb-2">CHỌN LÕI BÓNG</h3>
                    {(Object.keys(SKINS) as SkinKey[]).map(key => (
                      <div key={key} onClick={() => setSelectedSkin(key)}
                        className={`cursor-pointer flex items-center gap-3 p-3 rounded-lg border transition-all ${selectedSkin === key ? 'border-cyan-400 bg-cyan-900/40' : 'border-white/10 hover:border-white/30'}`}>
                        <div className="w-6 h-6 rounded-full" style={{ backgroundColor: SKINS[key].color, boxShadow: `0 0 15px ${SKINS[key].glow}` }} />
                        <p className="font-mono text-sm text-white">{SKINS[key].name}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-8 flex gap-4">
                  <Button onClick={() => setGameState('idle')} variant="ghost" className="font-mono text-white/50">HỦY</Button>
                  <Button onClick={() => initGame(1)} className="font-mono bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,255,255,0.5)]">XÁC NHẬN & CHƠI</Button>
                </div>
              </motion.div>
            )}

            {/* WAVE CLEAR MENU */}
            {gameState === 'wave_clear' && (
              <motion.div initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-cyan-950/80 backdrop-blur-md">
                <h2 className="text-5xl font-black text-cyan-400 mb-2 drop-shadow-[0_0_20px_rgba(0,255,255,0.8)] tracking-widest">
                  WAVE {waveRef.current} CLEARED
                </h2>
                <div className="flex gap-8 mb-8">
                  <div className="flex flex-col items-center bg-black/50 px-6 py-3 rounded-xl border border-cyan-500/30">
                    <p className="text-xs font-mono text-cyan-300">SCORE</p>
                    <p className="text-3xl font-mono text-white">{scoreRef.current}</p>
                  </div>
                </div>
                <Button onClick={() => initGame(waveRef.current + 1)} size="lg" className="font-mono bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(0,255,255,0.5)]">
                  TIẾN VÀO WAVE TIẾP THEO
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {!isFullscreen && (
        <div className="flex justify-center gap-8 w-full text-xs font-mono text-white/40 px-4">
          <p>🎮 <strong className="text-cyan-400">ESP32 MPU6050</strong> (Nghiêng mạch 4 hướng)</p>
          <p>⌨️ <strong className="text-white">WASD / Arrow Keys</strong> (Dự phòng)</p>
        </div>
      )}
    </div>
  );
}