import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Maximize, Minimize, Play, Settings2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mở rộng Canvas theo chuẩn 16:9 để chơi Fullscreen đẹp hơn
const CANVAS_W = 960;
const CANVAS_H = 540;
const PLAYER_SIZE = 18;

// --- CONFIG THEMES & SKINS ---
const ENVIRONMENTS = {
  space: { name: 'Deep Space', bg1: '#050510', bg2: '#1a0b2e', starColor: '#ffffff', obsCore: '#ff5555', obsGlow: '#ff0000' },
  cyber: { name: 'Cyber Grid', bg1: '#000814', bg2: '#001d3d', starColor: '#00ffff', obsCore: '#ff00ff', obsGlow: '#cc00ff' },
  toxic: { name: 'Toxic Nebula', bg1: '#051005', bg2: '#103010', starColor: '#39ff14', obsCore: '#ffff00', obsGlow: '#ffaa00' },
};

const SKINS = {
  falcon: { name: 'Blue Falcon', primary: '#00f0ff', secondary: '#0055ff', shape: 'swept' },
  striker: { name: 'Red Striker', primary: '#ff0055', secondary: '#aa0000', shape: 'delta' },
  mantis: { name: 'Green Mantis', primary: '#39ff14', secondary: '#008800', shape: 'twin' },
};

type EnvKey = keyof typeof ENVIRONMENTS;
type SkinKey = keyof typeof SKINS;

interface Obstacle { x: number; y: number; speed: number; size: number; rotation: number; rotSpeed: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; }
interface Star { x: number; y: number; speed: number; size: number; }

export function CosmicDodge({ onBack }: { onBack: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [gameState, setGameState] = useState<'idle' | 'setup' | 'playing' | 'over'>('idle');
  const [score, setScore] = useState(0);
  const [selectedEnv, setSelectedEnv] = useState<EnvKey>('space');
  const [selectedSkin, setSelectedSkin] = useState<SkinKey>('falcon');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Core Game Refs
  const playerX = useRef(CANVAS_W / 2);
  const obstacles = useRef<Obstacle[]>([]);
  const particles = useRef<Particle[]>([]);
  const stars = useRef<Star[]>([]);
  const scoreRef = useRef(0);
  const gameStateRef = useRef(gameState);
  
  // Control Refs
  const keysPressed = useRef<Set<string>>(new Set());
  const mouseX = useRef<number | null>(null);
  const velXRef = useRef(0);
  const screenShake = useRef(0);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Khởi tạo nền sao (Parallax Background)
  useEffect(() => {
    stars.current = Array.from({ length: 100 }).map(() => ({
      x: Math.random() * CANVAS_W,
      y: Math.random() * CANVAS_H,
      speed: 0.5 + Math.random() * 2,
      size: Math.random() * 2,
    }));
  }, []);

  // Controls (Keyboard & Mouse)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key);
      if (e.key === ' ' && (gameStateRef.current === 'idle' || gameStateRef.current === 'over')) {
        e.preventDefault();
        startGame();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.key);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMouseMove = (e: MouseEvent) => {
      if (gameStateRef.current !== 'playing') return;
      const rect = canvas.getBoundingClientRect();
      mouseX.current = ((e.clientX - rect.left) / rect.width) * CANVAS_W;
    };
    const onMouseLeave = () => { mouseX.current = null; };
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
    return () => { canvas.removeEventListener('mousemove', onMouseMove); canvas.removeEventListener('mouseleave', onMouseLeave); };
  }, []);

  // Toggle Fullscreen Function
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    scoreRef.current = 0;
    playerX.current = CANVAS_W / 2;
    obstacles.current = [];
    particles.current = [];
    screenShake.current = 0;
  }, []);

  const createExplosion = (x: number, y: number, color: string, count: number = 30) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      particles.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color: color,
        size: Math.random() * 4 + 2
      });
    }
  };

  // 🎮 MAIN GAME LOOP 🎮
  useEffect(() => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false })!;
    let animId: number;
    let spawnTimer = 0;
    let frameCount = 0;

    const env = ENVIRONMENTS[selectedEnv];
    const skin = SKINS[selectedSkin];

    const loop = () => {
      if (gameStateRef.current !== 'playing') return;
      frameCount++;

      // --- MPU6050 & ĐIỀU KHIỂN ---
      const speed = 7;
      if (keysPressed.current.has('ArrowLeft') || keysPressed.current.has('a')) playerX.current -= speed;
      if (keysPressed.current.has('ArrowRight') || keysPressed.current.has('d')) playerX.current += speed;

      if (mouseX.current !== null) {
        playerX.current += (mouseX.current - playerX.current) * 0.15;
      }

      // MPU6050 Logic 
      const state = useAppStore.getState();
      const { gz } = state.sensorData;
      const SENSITIVITY_X = 15.0;
      const DEADZONE = 0.25;
      const SMOOTHING = 0.85;
      const rawDeltaX = Math.abs(gz) > DEADZONE ? -gz * SENSITIVITY_X : 0;
      velXRef.current = velXRef.current * SMOOTHING + rawDeltaX * (1 - SMOOTHING);
      playerX.current += velXRef.current;

      playerX.current = Math.max(PLAYER_SIZE, Math.min(CANVAS_W - PLAYER_SIZE, playerX.current));

      // --- RENDER BACKGROUND ---
      ctx.save();
      
      // Screen Shake Effect
      if (screenShake.current > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake.current, (Math.random() - 0.5) * screenShake.current);
        screenShake.current *= 0.9;
      }

      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      grad.addColorStop(0, env.bg1);
      grad.addColorStop(1, env.bg2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // --- ĐỘ KHÓ (DIFFICULTY SCALING) ---
      // Base multiplier tăng dần theo điểm
      const difficultyMult = 1 + (scoreRef.current * 0.02);

      // Draw Parallax Stars
      ctx.fillStyle = env.starColor;
      stars.current.forEach(star => {
        star.y += star.speed * difficultyMult * 2;
        if (star.y > CANVAS_H) { star.y = 0; star.x = Math.random() * CANVAS_W; }
        ctx.globalAlpha = star.speed / 3;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });
      ctx.globalAlpha = 1.0;

      // --- SPAWN OBSTACLES ---
      spawnTimer++;
      // Giãn nhịp độ lúc đầu (100 frame mới ra 1 viên), cap ở 25 frame
      const spawnRate = Math.max(25, 100 - scoreRef.current * 1.5);
      
      if (spawnTimer > spawnRate) {
        spawnTimer = 0;
        obstacles.current.push({
          x: Math.random() * (CANVAS_W - 60) + 30,
          y: -40,
          // Tốc độ rơi từ 1.5 đến 3.5, nhân với độ khó
          speed: (1.5 + Math.random() * 2.0) * difficultyMult,
          // Kích thước chuẩn, không quá to
          size: 15 + Math.random() * 15,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.1
        });
      }

      // --- CẬP NHẬT OBSTACLES ---
      ctx.globalCompositeOperation = 'lighter'; // Blend mode xịn xò
      
      obstacles.current = obstacles.current.filter((o) => {
        o.y += o.speed;
        o.rotation += o.rotSpeed;
        
        // Hitbox kiểm tra (Khoan dung hơn: Nhỏ hơn size thực tế một chút)
        const hitRadius = (PLAYER_SIZE + o.size / 2) * 0.8; 
        const dx = o.x - playerX.current;
        const dy = o.y - (CANVAS_H - 50);

        if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
          createExplosion(playerX.current, CANVAS_H - 50, skin.primary, 50);
          screenShake.current = 20;
          setGameState('over');
          return false;
        }

        // Vẽ Thiên thạch / Vật cản (Hình đa giác xoay có Glow)
        ctx.save();
        ctx.translate(o.x, o.y);
        ctx.rotate(o.rotation);
        
        ctx.shadowColor = env.obsGlow;
        ctx.shadowBlur = 15;
        ctx.fillStyle = env.obsCore;
        
        ctx.beginPath();
        for(let i=0; i<6; i++) {
          const angle = (i * Math.PI * 2) / 6;
          const r = o.size / 2 * (0.8 + Math.random() * 0.2); // Hơi gồ ghề
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fill();
        
        // Core trắng bên trong
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, o.size/4, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();

        if (o.y > CANVAS_H + 30) {
          scoreRef.current++;
          setScore(scoreRef.current);
          return false;
        }
        return true;
      });
      ctx.globalCompositeOperation = 'source-over';

      // --- VẼ PARTICLES ---
      particles.current = particles.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        return p.life > 0;
      });
      ctx.globalAlpha = 1.0;

      // --- VẼ PHI THUYỀN (PLAYER) ---
      const px = playerX.current;
      const py = CANVAS_H - 50;

      // Engine Engine Flame (Sinh particle liên tục)
      if (frameCount % 2 === 0) {
        particles.current.push({
          x: px + (Math.random() - 0.5) * 10,
          y: py + PLAYER_SIZE,
          vx: (Math.random() - 0.5) * 1,
          vy: Math.random() * 3 + 2,
          life: 1, color: skin.primary, size: Math.random() * 3 + 1
        });
      }

      ctx.shadowColor = skin.primary;
      ctx.shadowBlur = 20;
      ctx.fillStyle = skin.primary;

      ctx.beginPath();
      if (skin.shape === 'swept') {
        ctx.moveTo(px, py - PLAYER_SIZE);
        ctx.lineTo(px - PLAYER_SIZE, py + PLAYER_SIZE);
        ctx.lineTo(px, py + PLAYER_SIZE - 5);
        ctx.lineTo(px + PLAYER_SIZE, py + PLAYER_SIZE);
      } else if (skin.shape === 'delta') {
        ctx.moveTo(px, py - PLAYER_SIZE - 5);
        ctx.lineTo(px - PLAYER_SIZE - 5, py + PLAYER_SIZE);
        ctx.lineTo(px + PLAYER_SIZE + 5, py + PLAYER_SIZE);
      } else { // twin
        ctx.moveTo(px - 5, py - PLAYER_SIZE);
        ctx.lineTo(px - PLAYER_SIZE, py + PLAYER_SIZE);
        ctx.lineTo(px - 5, py + PLAYER_SIZE - 8);
        ctx.lineTo(px + 5, py + PLAYER_SIZE - 8);
        ctx.lineTo(px + PLAYER_SIZE, py + PLAYER_SIZE);
        ctx.lineTo(px + 5, py - PLAYER_SIZE);
      }
      ctx.closePath();
      ctx.fill();

      // Buồng lái (Cockpit)
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(px, py + 2, 4, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // --- HUD HIỂN THỊ ---
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillText(scoreRef.current.toString().padStart(4, '0'), CANVAS_W / 2, 40);
      ctx.shadowBlur = 0;
      
      // Vẽ thanh báo mức độ khó (Speed Level)
      const levelPercent = Math.min(100, (difficultyMult - 1) * 50);
      ctx.fillStyle = '#ffffff33';
      ctx.fillRect(CANVAS_W / 2 - 50, 55, 100, 4);
      ctx.fillStyle = skin.primary;
      ctx.fillRect(CANVAS_W / 2 - 50, 55, levelPercent, 4);

      ctx.restore(); // Khôi phục ctx transform cho screen shake

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, selectedEnv, selectedSkin]);

  return (
    <div ref={containerRef} className={`flex flex-col bg-black ${isFullscreen ? 'w-screen h-screen' : 'w-full items-center'}`}>
      
      {/* Header Controls - absolute khi fullscreen để không chiếm chỗ */}
      <div className={`flex items-center justify-between px-4 py-3 z-50 ${
        isFullscreen 
          ? 'absolute top-0 left-0 right-0 bg-black/60 backdrop-blur-md' 
          : 'w-full max-w-5xl'
      }`}>
        <Button variant="ghost" size="sm" onClick={onBack} className="font-mono text-xs gap-2 hover:bg-white/10 text-white">
          <ArrowLeft className="w-4 h-4" /> LOBBY
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white hover:bg-white/10">
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </Button>
      </div>

      {/* Canvas area */}
      <div className={isFullscreen ? 'flex-1 w-full relative' : 'w-full max-w-5xl px-4 mt-4 relative'}>
        <div
          className="relative overflow-hidden bg-black"
          style={isFullscreen
            ? { width: '100%', height: '100%' }
            : { maxWidth: `${CANVAS_W}px`, aspectRatio: `${CANVAS_W}/${CANVAS_H}`, margin: '0 auto', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 0 40px rgba(0,255,255,0.1)' }
          }
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className={`w-full h-full block ${gameState === 'playing' ? 'cursor-none' : ''}`}
          />

          {/* LỚP PHỦ UI BÊN TRÊN CANVAS */}
          <AnimatePresence mode="wait">

            {/* MÀN HÌNH CHÍNH (IDLE) */}
            {gameState === 'idle' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                <ShieldAlert className="w-16 h-16 text-cyan-400 mb-4 drop-shadow-[0_0_15px_rgba(0,255,255,0.8)]" />
                <h1 className="text-5xl font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-2 drop-shadow-[0_0_10px_rgba(0,255,255,0.4)]">
                  COSMIC DODGE
                </h1>
                <p className="text-white/60 font-mono text-sm mb-8 tracking-widest">NÉ TRANH THIÊN THẠCH VÔ TẬN</p>
                
                <div className="flex gap-4">
                  <Button onClick={() => setGameState('setup')} variant="outline" size="lg" className="font-mono border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 gap-2">
                    <Settings2 className="w-5 h-5" /> CHUẨN BỊ
                  </Button>
                  <Button onClick={startGame} size="lg" className="font-mono bg-cyan-600 hover:bg-cyan-500 text-white border-none gap-2 shadow-[0_0_20px_rgba(0,255,255,0.4)]">
                    <Play className="w-5 h-5" /> KHỞI HÀNH
                  </Button>
                </div>
              </motion.div>
            )}

            {/* MÀN HÌNH CHUẨN BỊ (SETUP) */}
            {gameState === 'setup' && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-6">
                
                <div className="flex w-full max-w-2xl gap-8">
                  <div className="flex-1 space-y-3">
                    <h3 className="font-mono text-cyan-400 text-xs tracking-widest border-b border-cyan-500/30 pb-2">CHỌN KHU VỰC</h3>
                    {(Object.keys(ENVIRONMENTS) as EnvKey[]).map(key => (
                      <div key={key} onClick={() => setSelectedEnv(key)}
                        className={`cursor-pointer p-3 rounded-lg border transition-all ${selectedEnv === key ? 'border-cyan-400 bg-cyan-900/40' : 'border-white/10 hover:border-white/30'}`}>
                        <p className="font-mono text-sm text-white">{ENVIRONMENTS[key].name}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex-1 space-y-3">
                    <h3 className="font-mono text-cyan-400 text-xs tracking-widest border-b border-cyan-500/30 pb-2">CHỌN PHI THUYỀN</h3>
                    {(Object.keys(SKINS) as SkinKey[]).map(key => (
                      <div key={key} onClick={() => setSelectedSkin(key)}
                        className={`cursor-pointer flex items-center gap-3 p-3 rounded-lg border transition-all ${selectedSkin === key ? 'border-fuchsia-400 bg-fuchsia-900/40' : 'border-white/10 hover:border-white/30'}`}>
                        <div className="w-5 h-5 rounded-full" style={{ backgroundColor: SKINS[key].primary, boxShadow: `0 0 10px ${SKINS[key].primary}` }} />
                        <p className="font-mono text-sm text-white">{SKINS[key].name}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 flex gap-4">
                  <Button onClick={() => setGameState('idle')} variant="ghost" className="font-mono text-white/50">HỦY</Button>
                  <Button onClick={startGame} className="font-mono bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,255,255,0.5)]">XÁC NHẬN & CHƠI</Button>
                </div>
              </motion.div>
            )}

            {/* MÀN HÌNH GAME OVER */}
            {gameState === 'over' && (
              <motion.div initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/80 backdrop-blur-sm">
                <h2 className="text-6xl font-black text-red-500 mb-2 drop-shadow-[0_0_20px_rgba(255,0,0,0.8)] tracking-widest">
                  THUYỀN NỔ TUNG
                </h2>
                <div className="flex flex-col items-center gap-1 mb-8 bg-black/50 px-8 py-4 rounded-xl border border-red-500/30 shadow-[0_0_30px_rgba(255,0,0,0.2)]">
                  <p className="text-sm font-mono text-red-300">ĐIỂM SINH TỒN</p>
                  <p className="text-5xl font-mono text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{score}</p>
                </div>
                <div className="flex gap-4">
                  <Button onClick={() => setGameState('idle')} variant="outline" className="font-mono border-white/20 text-white/70 hover:bg-white/10">
                    VỀ MENU
                  </Button>
                  <Button onClick={startGame} size="lg" className="font-mono bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(255,0,0,0.5)]">
                    CHƠI LẠI (SPACE)
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer HDSD - chỉ hiện khi không fullscreen */}
      {!isFullscreen && (
        <div className="flex justify-center gap-8 w-full text-xs font-mono text-white/40 mt-4 px-4 pb-4">
          <p>🎮 <strong className="text-cyan-400">ESP32 MPU6050</strong> (Nghiêng tay lái)</p>
          <p>🖱️ <strong className="text-white">Chuột / ← → / A D</strong> (Bàn phím dự phòng)</p>
        </div>
      )}
    </div>
  );
}