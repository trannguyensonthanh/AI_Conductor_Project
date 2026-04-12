import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Maximize2, Minimize2, Play, Settings2, Trophy, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/stores/useAppStore'; // <<< STORE TỔNG

const CANVAS_W = 800; // Mở rộng canvas cho góc nhìn rộng hơn
const CANVAS_H = 450;
const GROUND_Y = CANVAS_H - 80;
const PLAYER_SIZE = 30;

// --- CONFIG THEMES & SKINS (Đã xoá màu duck/chướng ngại vật trên cao) ---
const ENVIRONMENTS = {
  cyberpunk: { name: 'Cyberpunk', bgTop: '#0a0020', bgBot: '#1a0a3a', grid: '#a855f7', obstacle: '#ffaa00' },
  synthwave: { name: 'Synthwave', bgTop: '#2b00ff', bgBot: '#ff007f', grid: '#00ffff', obstacle: '#ffff00' },
  toxic: { name: 'Toxic Zone', bgTop: '#051005', bgBot: '#103010', grid: '#39ff14', obstacle: '#00ffaa' },
};

const SKINS = {
  blue: { name: 'Cyber Blue', color: '#00f0ff' },
  pink: { name: 'Neon Pink', color: '#ff00ff' },
  green: { name: 'Matrix Green', color: '#39ff14' },
};

type EnvKey = keyof typeof ENVIRONMENTS;
type SkinKey = keyof typeof SKINS;

interface Obstacle { x: number; w: number; h: number; passed: boolean; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; }

export function VoiceRunner({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // States
  const [gameState, setGameState] = useState<'idle' | 'setup' | 'playing' | 'over'>('idle');
  const [score, setScore] = useState(0);
  const [selectedEnv, setSelectedEnv] = useState<EnvKey>('cyberpunk');
  const [selectedSkin, setSelectedSkin] = useState<SkinKey>('blue');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Refs for Game Loop (Tránh re-render)
  const playerY = useRef(GROUND_Y - PLAYER_SIZE);
  const velocityY = useRef(0);
  const isJumping = useRef(false);
  const obstacles = useRef<Obstacle[]>([]);
  const particles = useRef<Particle[]>([]);
  const trail = useRef<{ x: number; y: number }[]>([]);
  const scoreRef = useRef(0);
  const gameStateRef = useRef(gameState);
  const animRef = useRef(0);
  const gridOffset = useRef(0);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Fullscreen handler
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Bàn phím làm dự phòng (Chỉ giữ lại nút Nhảy)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (gameStateRef.current === 'over' || gameStateRef.current === 'idle') {
            if(gameStateRef.current === 'over') startGame();
            return; 
        }
        if (!isJumping.current && gameStateRef.current === 'playing') { 
          velocityY.current = -12; 
          isJumping.current = true; 
          createParticles(80, playerY.current + PLAYER_SIZE, 10, SKINS[selectedSkin].color);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('keydown', onKeyDown); };
  }, [selectedSkin]);

  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    scoreRef.current = 0;
    playerY.current = GROUND_Y - PLAYER_SIZE;
    velocityY.current = 0;
    isJumping.current = false;
    obstacles.current = [];
    particles.current = [];
    trail.current = [];
  }, []);

  const createParticles = (x: number, y: number, count: number, color: string) => {
    for (let i = 0; i < count; i++) {
      particles.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 1) * 5,
        life: 1,
        color,
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
    let spawnTimer = 0;
    let frameCount = 0;

    const env = ENVIRONMENTS[selectedEnv];
    const skin = SKINS[selectedSkin];

    const loop = () => {
      if (gameStateRef.current !== 'playing') return;
      frameCount++;

      // Tăng tốc độ từ từ (Bắt đầu 3.5, max ~8)
      const currentSpeed = Math.min(8, 3.5 + scoreRef.current * 0.05);

      // 🔥 ĐIỀU KHIỂN BẰNG ÂM LƯỢNG ESP32 (Zero Latency) 🔥
      const currentMic = useAppStore.getState().micLevel;
      
      // Độ nhạy được cải thiện: mic > 30 là nhảy, tính toán lực nhảy mượt hơn
      if (currentMic > 60 && !isJumping.current) {
        const jumpForce = Math.max(-14, -10 - (currentMic / 100) * 5); 
        velocityY.current = jumpForce;
        isJumping.current = true;
        createParticles(80, playerY.current + PLAYER_SIZE, 15, skin.color);
      }

      // --- VẬT LÝ ---
      velocityY.current += 0.55; // Trọng lực
      playerY.current += velocityY.current;
      
      if (playerY.current >= GROUND_Y - PLAYER_SIZE) {
        if(isJumping.current) createParticles(80 + PLAYER_SIZE/2, GROUND_Y, 8, '#ffffff'); // Bụi khi chạm đất
        playerY.current = GROUND_Y - PLAYER_SIZE;
        velocityY.current = 0;
        isJumping.current = false;
      }

      // --- VẼ BACKGROUND PARALLAX ---
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      grad.addColorStop(0, env.bgTop);
      grad.addColorStop(1, env.bgBot);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Lưới chuyển động (Retro Grid)
      ctx.strokeStyle = env.grid + '44';
      ctx.lineWidth = 1;
      gridOffset.current = (gridOffset.current + currentSpeed * 0.5) % 40;
      
      ctx.beginPath();
      for(let i = 0; i < CANVAS_W; i+= 40) {
        ctx.moveTo(i - gridOffset.current, GROUND_Y);
        ctx.lineTo(i - gridOffset.current - 100, CANVAS_H); 
      }
      for(let i = GROUND_Y; i < CANVAS_H; i+= 15) {
        ctx.moveTo(0, i);
        ctx.lineTo(CANVAS_W, i);
      }
      ctx.stroke();

      // Mặt đất chính
      ctx.strokeStyle = env.grid;
      ctx.lineWidth = 3;
      ctx.shadowColor = env.grid;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_W, GROUND_Y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // --- VẼ THANH MIC ---
      ctx.fillStyle = '#ffffff22';
      ctx.fillRect(20, 50, 150, 10);
      ctx.fillStyle = currentMic > 30 ? skin.color : '#888';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8;
      ctx.fillRect(20, 50, Math.min(currentMic * 1.5, 150), 10);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff66';
      ctx.strokeRect(20, 50, 150, 10);
      ctx.fillStyle = '#fff';
      ctx.font = '12px "JetBrains Mono"';
      ctx.textAlign = 'left';
      ctx.fillText('ESP32 MIC LEVEL', 20, 42);

      // --- SINH CHƯỚNG NGẠI VẬT (Chỉ có vật cản dưới đất) ---
      spawnTimer++;
      const spawnRate = Math.max(70, 120 - scoreRef.current * 2); 
      if (spawnTimer > spawnRate) {
        spawnTimer = 0;
        obstacles.current.push({
          x: CANVAS_W + 50,
          w: 25 + Math.random() * 15,
          h: 25 + Math.random() * 15, // Chiều cao ngẫu nhiên nhưng đảm bảo nhảy qua được
          passed: false
        });
      }

      // --- CẬP NHẬT PLAYER HITBOX ---
      const pX = 80;
      const pY = playerY.current;

      // Cập nhật Trail
      if (frameCount % 2 === 0) {
        trail.current.push({ x: pX, y: pY });
        if (trail.current.length > 8) trail.current.shift();
      }

      // --- XỬ LÝ CHƯỚNG NGẠI VẬT & VA CHẠM ---
      obstacles.current = obstacles.current.filter((o) => {
        o.x -= currentSpeed;
        const oY = GROUND_Y - o.h;

        // Vẽ chướng ngại vật kiểu Neon Crate
        ctx.fillStyle = env.obstacle + 'aa';
        ctx.strokeStyle = env.obstacle;
        ctx.lineWidth = 2;
        ctx.shadowColor = env.obstacle;
        ctx.shadowBlur = 10;
        ctx.fillRect(o.x, oY, o.w, o.h);
        ctx.strokeRect(o.x, oY, o.w, o.h);
        // Inner detail
        ctx.beginPath();
        ctx.moveTo(o.x, oY);
        ctx.lineTo(o.x + o.w, oY + o.h);
        ctx.moveTo(o.x + o.w, oY);
        ctx.lineTo(o.x, oY + o.h);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Va chạm (Hitbox nới lỏng 3px cho người chơi dễ thở)
        const hitTol = 3; 
        if (pX + PLAYER_SIZE - hitTol > o.x && pX + hitTol < o.x + o.w && 
            pY + PLAYER_SIZE - hitTol > oY && pY + hitTol < oY + o.h) {
          createParticles(pX + PLAYER_SIZE/2, pY + PLAYER_SIZE/2, 30, skin.color);
          setGameState('over');
          return false;
        }

        // Ghi điểm
        if (!o.passed && o.x + o.w < pX) {
          o.passed = true;
          scoreRef.current++;
          setScore(scoreRef.current);
          createParticles(o.x, oY, 5, env.obstacle); // Hiệu ứng nhỏ khi vượt qua
        }

        return o.x + o.w > -50; // Xoá khi ra khỏi màn hình
      });

      // --- VẼ PARTICLES ---
      particles.current = particles.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        return p.life > 0;
      });
      ctx.globalAlpha = 1.0;

      // --- VẼ TRAIL (Vệt mờ di chuyển) ---
      trail.current.forEach((t, i) => {
        ctx.globalAlpha = (i / trail.current.length) * 0.3;
        ctx.fillStyle = skin.color;
        ctx.fillRect(t.x - (trail.current.length - i), t.y, PLAYER_SIZE, PLAYER_SIZE);
      });
      ctx.globalAlpha = 1.0;

      // --- VẼ NHÂN VẬT CHÍNH ---
      ctx.fillStyle = skin.color;
      ctx.shadowColor = skin.color;
      ctx.shadowBlur = 15;
      
      // Vẽ body bo góc
      ctx.lineJoin = 'round';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#fff';
      ctx.fillRect(pX, pY, PLAYER_SIZE, PLAYER_SIZE);
      ctx.strokeRect(pX+2, pY+2, PLAYER_SIZE-4, PLAYER_SIZE-4); 
      ctx.shadowBlur = 0;

      // Vẽ Mắt / Kính Cyberpunk
      ctx.fillStyle = '#000';
      ctx.fillRect(pX + PLAYER_SIZE - 12, pY + 6, 8, 6);
      ctx.fillStyle = '#00ffcc';
      ctx.fillRect(pX + PLAYER_SIZE - 10, pY + 7, 4, 4);

      // --- HUD SCORE & SPEED ---
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px "JetBrains Mono"';
      ctx.textAlign = 'right';
      ctx.fillText(scoreRef.current.toString().padStart(5, '0'), CANVAS_W - 20, 40);
      
      ctx.fillStyle = env.grid;
      ctx.font = '12px "JetBrains Mono"';
      ctx.fillText(`SPEED: ${currentSpeed.toFixed(1)} MAC`, CANVAS_W - 20, 60);

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [gameState, selectedEnv, selectedSkin]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4 w-full max-w-4xl mx-auto p-4">
      
      <div className="flex items-center justify-between w-full">
        <Button variant="ghost" size="sm" onClick={onBack} className="font-mono text-xs gap-2 hover:bg-white/10 text-white">
          <ArrowLeft className="w-4 h-4" /> ARCADE LOBBY
        </Button>
        <div className="flex items-center gap-2">
          <div className="flex gap-2 text-xs font-mono text-white/50 bg-black/40 px-3 py-1 rounded-full border border-white/10">
            <Zap className="w-4 h-4 text-yellow-400" /> V.RUNNER ENGINE v3.0
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="w-8 h-8 hover:bg-white/10 text-white/60 hover:text-white"
            title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div ref={containerRef} className="w-full relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,255,255,0.1)] bg-black">
        <canvas 
          ref={canvasRef} 
          width={CANVAS_W} 
          height={CANVAS_H} 
          className="w-full h-auto block object-cover"
        />
        
        {/* LỚP PHỦ UI BÊN TRÊN CANVAS */}
        <AnimatePresence mode="wait">
          
          {/* MÀN HÌNH CHÍNH (IDLE) */}
          {gameState === 'idle' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md">
              <h1 className="text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 mb-2 drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]">
                VOICE RUNNER
              </h1>
              <p className="text-white/70 font-mono text-sm mb-8 tracking-widest uppercase">Cyberpunk Edition</p>
              
              <div className="flex gap-4">
                <Button onClick={() => setGameState('setup')} variant="outline" size="lg" className="font-mono border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 gap-2">
                  <Settings2 className="w-5 h-5" /> CUSTOMIZE
                </Button>
                <Button onClick={startGame} size="lg" className="font-mono bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white border-none gap-2 shadow-[0_0_20px_rgba(255,0,255,0.4)]">
                  <Play className="w-5 h-5" /> START MISSION
                </Button>
              </div>
            </motion.div>
          )}

          {/* MÀN HÌNH CHỌN SKIN & MAP */}
          {gameState === 'setup' && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-lg p-6">
              
              <div className="flex w-full max-w-2xl gap-8">
                {/* Chọn Môi trường */}
                <div className="flex-1 space-y-3">
                  <h3 className="font-mono text-white/50 text-xs tracking-widest">SELECT ENVIRONMENT</h3>
                  {(Object.keys(ENVIRONMENTS) as EnvKey[]).map(key => (
                    <div key={key} onClick={() => setSelectedEnv(key)}
                      className={`cursor-pointer p-3 rounded-lg border transition-all ${selectedEnv === key ? 'border-cyan-400 bg-cyan-900/30' : 'border-white/10 hover:border-white/30'}`}>
                      <p className="font-mono text-sm text-white">{ENVIRONMENTS[key].name}</p>
                    </div>
                  ))}
                </div>

                {/* Chọn Skin */}
                <div className="flex-1 space-y-3">
                  <h3 className="font-mono text-white/50 text-xs tracking-widest">SELECT GEAR (SKIN)</h3>
                  {(Object.keys(SKINS) as SkinKey[]).map(key => (
                    <div key={key} onClick={() => setSelectedSkin(key)}
                      className={`cursor-pointer flex items-center gap-3 p-3 rounded-lg border transition-all ${selectedSkin === key ? 'border-fuchsia-400 bg-fuchsia-900/30' : 'border-white/10 hover:border-white/30'}`}>
                      <div className="w-6 h-6 rounded-sm shadow-lg" style={{ backgroundColor: SKINS[key].color, boxShadow: `0 0 10px ${SKINS[key].color}` }} />
                      <p className="font-mono text-sm text-white">{SKINS[key].name}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex gap-4">
                <Button onClick={() => setGameState('idle')} variant="ghost" className="font-mono text-white/50">CANCEL</Button>
                <Button onClick={startGame} className="font-mono bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,255,255,0.5)]">APPLY & PLAY</Button>
              </div>
            </motion.div>
          )}

          {/* MÀN HÌNH GAME OVER */}
          {gameState === 'over' && (
            <motion.div initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
              <h2 className="text-6xl font-black text-red-500 mb-2 drop-shadow-[0_0_20px_rgba(255,0,0,0.8)] tracking-widest">
                SYSTEM FAILURE
              </h2>
              <div className="flex items-center gap-3 mb-8 bg-white/5 px-6 py-3 rounded-xl border border-white/10">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <p className="text-3xl font-mono text-white">{score}</p>
              </div>
              <div className="flex gap-4">
                <Button onClick={() => setGameState('idle')} variant="outline" className="font-mono border-white/20 text-white/70 hover:bg-white/10">
                  MAIN MENU
                </Button>
                <Button onClick={startGame} size="lg" className="font-mono bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,255,255,0.5)]">
                  REBOOT (SPACE)
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hướng dẫn điều khiển */}
      <div className="flex justify-center gap-12 w-full text-xs font-mono text-white/40 mt-2 px-2">
        <p>🎤 <strong className="text-cyan-400">Mic &gt; 55%</strong> = Nhảy</p>
        <p>⌨️ <strong className="text-white">Space / Arrow Up</strong> = Bàn phím dự phòng</p>
      </div>
    </motion.div>
  );
}