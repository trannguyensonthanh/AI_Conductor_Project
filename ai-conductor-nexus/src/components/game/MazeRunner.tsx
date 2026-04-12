import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Maximize, Minimize, Play, Settings2, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CELL = 40; // Kích thước 1 ô block
const BALL_R = 12;

// --- CONFIG THEMES & SKINS ---
const ENVIRONMENTS = {
  cyber: { name: 'Cyber Grid', bg: '#000a14', wall: '#001d3d', glow: '#00ffff', fog: 'rgba(0, 5, 15, 0.95)' },
  toxic: { name: 'Toxic Zone', bg: '#051005', wall: '#103010', glow: '#39ff14', fog: 'rgba(5, 15, 5, 0.95)' },
  inferno: { name: 'Inferno', bg: '#140505', wall: '#3d0a0a', glow: '#ff5500', fog: 'rgba(20, 5, 5, 0.95)' },
};

const SKINS = {
  plasma: { name: 'Plasma Core', color: '#ffffff', glow: '#00f0ff' },
  radioactive: { name: 'Nuclear', color: '#ffffff', glow: '#39ff14' },
  blood: { name: 'Blood Moon', color: '#ffffff', glow: '#ff0055' },
};

type EnvKey = keyof typeof ENVIRONMENTS;
type SkinKey = keyof typeof SKINS;

interface Particle { x: number; y: number; life: number; size: number; color: string; }

// Trình tạo Mê cung (Recursive Backtracking) - Đã tinh chỉnh để luôn ra số lẻ
function generateMaze(w: number, h: number) {
  let cols = Math.floor(w / CELL);
  let rows = Math.floor(h / CELL);
  if (cols % 2 === 0) cols--;
  if (rows % 2 === 0) rows--;

  const grid: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(true));
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));

  function carve(r: number, c: number) {
    visited[r][c] = true;
    grid[r][c] = false;
    const dirs = [[0, 2], [0, -2], [2, 0], [-2, 0]].sort(() => Math.random() - 0.5);
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
        grid[r + dr / 2][c + dc / 2] = false;
        carve(nr, nc);
      }
    }
  }
  carve(1, 1);
  grid[1][1] = false;
  grid[rows - 2][cols - 2] = false;
  return { grid, cols, rows };
}

export function MazeRunner({ onBack }: { onBack: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [gameState, setGameState] = useState<'idle' | 'setup' | 'playing' | 'won'>('idle');
  const [time, setTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // State quản lý UI Map/Skin
  const [selectedEnv, setSelectedEnv] = useState<EnvKey>('cyber');
  const [selectedSkin, setSelectedSkin] = useState<SkinKey>('plasma');

  // Quản lý kích thước động (Dynamic Canvas)
  const [dim, setDim] = useState({ w: 800, h: 500, cols: 0, rows: 0 });

  const ballPos = useRef({ x: 1.5 * CELL, y: 1.5 * CELL });
  const velRef = useRef({ x: 0, y: 0 }); 
  const mazeRef = useRef<boolean[][]>([]);
  const trailRef = useRef<{x: number, y: number}[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const gameStateRef = useRef(gameState);
  const keysPressed = useRef<Set<string>>(new Set());
  const startTime = useRef(0);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Handle Fullscreen & Resize
  useEffect(() => {
    const handleResize = () => {
      if (document.fullscreenElement) {
        setIsFullscreen(true);
        setDim({ w: window.innerWidth, h: window.innerHeight, cols: 0, rows: 0 });
      } else {
        setIsFullscreen(false);
        setDim({ w: 800, h: 500, cols: 0, rows: 0 }); // Kích thước mặc định khi windowed
      }
      // Trả về màn hình IDLE nếu thay đổi kích thước để tạo lại Map
      setGameState('idle');
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
      // Gọi requestFullscreen trên container thay vì document
      await containerRef.current?.requestFullscreen().catch(e => console.log(e));
    } else {
      await document.exitFullscreen();
    }
  };

  // Keyboard controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key);
      if (e.key === ' ' && (gameStateRef.current === 'idle' || gameStateRef.current === 'won')) {
        e.preventDefault(); setGameState('setup');
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.key);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, []);

  function isBlocked(nx: number, ny: number, grid: boolean[][], rows: number, cols: number) {
    const r = BALL_R - 2;
    const checks = [[nx - r, ny - r], [nx + r, ny - r], [nx - r, ny + r], [nx + r, ny + r]];
    return checks.some(([cx, cy]) => {
      const col = Math.floor(cx / CELL);
      const row = Math.floor(cy / CELL);
      if (row < 0 || row >= rows || col < 0 || col >= cols) return true;
      return grid[row][col];
    });
  }

  const spawnSparks = (x: number, y: number, color: string) => {
    for(let i=0; i<5; i++) {
      particlesRef.current.push({
        x: x + (Math.random()-0.5)*10, y: y + (Math.random()-0.5)*10,
        life: 1, size: Math.random()*3 + 1, color
      });
    }
  };

  const startGame = useCallback(() => {
    const { grid, cols, rows } = generateMaze(dim.w, dim.h);
    mazeRef.current = grid;
    setDim(prev => ({ ...prev, cols, rows }));
    
    ballPos.current = { x: 1.5 * CELL, y: 1.5 * CELL };
    velRef.current = { x: 0, y: 0 };
    trailRef.current = [];
    particlesRef.current = [];
    startTime.current = Date.now();
    setTime(0);
    setGameState('playing');
  }, [dim.w, dim.h]);

  // 🎮 GAME LOOP 🎮
  useEffect(() => {
    if (gameState !== 'playing' || dim.cols === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false })!;
    let animId: number;

    const env = ENVIRONMENTS[selectedEnv];
    const skin = SKINS[selectedSkin];

    const loop = () => {
      if (gameStateRef.current !== 'playing') return;
      const maze = mazeRef.current;
      const { cols, rows } = dim;
      
      const elapsedSec = (Date.now() - startTime.current) / 1000;

      // --- CÂN BẰNG ĐỘ KHÓ (PROGRESSIVE DIFFICULTY) ---
      // 1. Tốc độ tăng dần theo thời gian (Từ x1.0 đến x1.8)
      const speedMult = Math.min(1.8, 1.0 + elapsedSec * 0.015);
      
      // 2. Tầm nhìn (Fog Radius) thu hẹp dần (Từ 800px xuống 120px)
      const visionRadius = Math.max(120, 800 - elapsedSec * 15);

      // --- INPUTS ---
      const keySpeed = 5 * speedMult; 
      let targetVx = 0; let targetVy = 0;
      
      if (keysPressed.current.has('ArrowLeft') || keysPressed.current.has('a')) targetVx -= keySpeed;
      if (keysPressed.current.has('ArrowRight') || keysPressed.current.has('d')) targetVx += keySpeed;
      if (keysPressed.current.has('ArrowUp') || keysPressed.current.has('w')) targetVy -= keySpeed;
      if (keysPressed.current.has('ArrowDown') || keysPressed.current.has('s')) targetVy += keySpeed;

      // MPU6050 Input
      const { ax, ay } = useAppStore.getState().sensorData;
      const DEADZONE = 1.0;    
      const SENSITIVITY = 1.2 * speedMult; // Tăng nhạy theo thời gian
      const SMOOTHING = 0.85;

      if (Math.abs(ay) > DEADZONE) targetVx -= ay * SENSITIVITY; 
      if (Math.abs(ax) > DEADZONE) targetVy -= ax * SENSITIVITY; 

      velRef.current.x = velRef.current.x * SMOOTHING + targetVx * (1 - SMOOTHING);
      velRef.current.y = velRef.current.y * SMOOTHING + targetVy * (1 - SMOOTHING);

      // --- MOVEMENT & WALL SLIDING ---
      let nx = ballPos.current.x + velRef.current.x;
      let ny = ballPos.current.y + velRef.current.y;

      if (!isBlocked(nx, ballPos.current.y, maze, rows, cols)) {
        ballPos.current.x = nx;
      } else {
        if(Math.abs(velRef.current.x) > 2) spawnSparks(ballPos.current.x, ballPos.current.y, skin.glow);
        velRef.current.x = 0; 
      }

      if (!isBlocked(ballPos.current.x, ny, maze, rows, cols)) {
        ballPos.current.y = ny;
      } else {
        if(Math.abs(velRef.current.y) > 2) spawnSparks(ballPos.current.x, ballPos.current.y, skin.glow);
        velRef.current.y = 0; 
      }

      // Update Trail
      if (Math.abs(velRef.current.x) > 0.5 || Math.abs(velRef.current.y) > 0.5) {
        trailRef.current.push({ x: ballPos.current.x, y: ballPos.current.y });
        if(trailRef.current.length > 15) trailRef.current.shift();
      }

      // --- RENDERER ---
      ctx.fillStyle = env.bg;
      ctx.fillRect(0, 0, dim.w, dim.h);

      // Vẽ Mê cung (Cyber Grid style)
      ctx.fillStyle = env.wall;
      ctx.strokeStyle = env.glow;
      ctx.lineWidth = 1;
      
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (maze[r][c]) {
            const wx = c * CELL; const wy = r * CELL;
            ctx.fillRect(wx, wy, CELL, CELL);
            
            // Vẽ line viền cho đẹp (Chỉ vẽ viền tiếp giáp đường đi)
            ctx.beginPath();
            if(r>0 && !maze[r-1][c]) { ctx.moveTo(wx, wy); ctx.lineTo(wx+CELL, wy); } // Top
            if(r<rows-1 && !maze[r+1][c]) { ctx.moveTo(wx, wy+CELL); ctx.lineTo(wx+CELL, wy+CELL); } // Bot
            if(c>0 && !maze[r][c-1]) { ctx.moveTo(wx, wy); ctx.lineTo(wx, wy+CELL); } // Left
            if(c<cols-1 && !maze[r][c+1]) { ctx.moveTo(wx+CELL, wy); ctx.lineTo(wx+CELL, wy+CELL); } // Right
            ctx.stroke();
          }
        }
      }

      // Vẽ Đích (Goal Portal)
      const goalX = (cols - 2) * CELL + CELL / 2;
      const goalY = (rows - 2) * CELL + CELL / 2;
      const pulse = 10 + Math.sin(Date.now() / 150) * 4;
      
      ctx.fillStyle = '#fff';
      ctx.shadowColor = env.glow;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(goalX, goalY, pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Vẽ Trail
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = BALL_R * 1.5;
      for(let i=1; i<trailRef.current.length; i++) {
        ctx.strokeStyle = skin.glow + Math.floor((i / 15) * 255).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.moveTo(trailRef.current[i-1].x, trailRef.current[i-1].y);
        ctx.lineTo(trailRef.current[i].x, trailRef.current[i].y);
        ctx.stroke();
      }

      // Vẽ Bi (Player)
      ctx.fillStyle = skin.color;
      ctx.shadowColor = skin.glow;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(ballPos.current.x, ballPos.current.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Vẽ Particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.life -= 0.05;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
        return p.life > 0;
      });
      ctx.globalAlpha = 1.0;

      // --- FOG OF WAR (Sương mù thu hẹp) ---
      // Tạo một canvas overlay để khoét lỗ sáng
      const fogGrad = ctx.createRadialGradient(
        ballPos.current.x, ballPos.current.y, visionRadius * 0.2, 
        ballPos.current.x, ballPos.current.y, visionRadius
      );
      fogGrad.addColorStop(0, 'rgba(0,0,0,0)'); // Trong suốt ở giữa
      fogGrad.addColorStop(1, env.fog);         // Đen kịt ở viền

      ctx.fillStyle = fogGrad;
      ctx.fillRect(0, 0, dim.w, dim.h);

      // Che hẳn phần ngoài bán kính sương mù
      ctx.fillStyle = env.fog;
      ctx.beginPath();
      ctx.rect(0, 0, dim.w, dim.h);
      ctx.arc(ballPos.current.x, ballPos.current.y, visionRadius, 0, Math.PI*2, true);
      ctx.fill('evenodd');

      // --- KIỂM TRA THẮNG ---
      const dx = ballPos.current.x - goalX;
      const dy = ballPos.current.y - goalY;
      if (Math.sqrt(dx * dx + dy * dy) < BALL_R + 15) {
        setTime(elapsedSec);
        setGameState('won');
        return;
      }

      // HUD
      ctx.fillStyle = skin.glow;
      ctx.font = 'bold 16px "JetBrains Mono"';
      ctx.textAlign = 'right';
      ctx.fillText(`TIME: ${elapsedSec.toFixed(1)}s`, dim.w - 20, 30);
      ctx.textAlign = 'left';
      ctx.fillText(`SPEED: x${speedMult.toFixed(2)}`, 20, 30);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, dim]);

  return (
    // THAY ĐỔI QUAN TRỌNG: Dùng fixed + inset-0 + z-50 khi isFullscreen = true
    <div 
      ref={containerRef} 
      className={`flex flex-col items-center bg-background transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-[100] bg-black justify-center p-0' : 'relative w-full max-w-5xl p-4 gap-4'
      }`}
    >
      {/* Header UI */}
      <div className={`flex items-center justify-between w-full ${isFullscreen ? 'absolute top-0 z-50 bg-black/50 backdrop-blur-md px-6 py-3' : ''}`}>
        <Button variant="ghost" size="sm" onClick={onBack} className="font-mono text-xs gap-2 hover:bg-white/10">
          <ArrowLeft className="w-4 h-4" /> LOBBY
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white hover:bg-white/10">
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} 
        className={`relative flex justify-center items-center w-full ${isFullscreen ? 'h-full flex-1' : ''}`}
      >
        <div className={`relative overflow-hidden bg-black ${isFullscreen ? 'w-full h-full' : 'rounded-xl border border-white/10 shadow-[0_0_40px_rgba(0,255,255,0.1)]'}`}
             style={{ width: isFullscreen ? '100%' : dim.w, height: isFullscreen ? '100%' : dim.h }}>
          
          <canvas ref={canvasRef} width={dim.w} height={dim.h} className="block w-full h-full object-cover" />
          
          <AnimatePresence mode="wait">
            {gameState === 'idle' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
                <Compass className="w-16 h-16 text-cyan-400 mb-4 drop-shadow-[0_0_15px_rgba(0,255,255,0.8)]" />
                <h1 className="text-5xl font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 mb-2 drop-shadow-[0_0_10px_rgba(0,255,255,0.4)]">
                  MAZE RUNNER
                </h1>
                <p className="text-white/60 font-mono text-sm mb-8 tracking-widest uppercase">Mê Cung Bóng Đêm</p>
                <div className="flex gap-4">
                  <Button onClick={() => setGameState('setup')} variant="outline" size="lg" className="font-mono border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 gap-2">
                    <Settings2 className="w-5 h-5" /> TÙY CHỈNH
                  </Button>
                  <Button onClick={() => setGameState('setup')} size="lg" className="font-mono bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(0,255,255,0.4)] gap-2">
                    <Play className="w-5 h-5" /> TIẾN VÀO
                  </Button>
                </div>
              </motion.div>
            )}

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
                    <h3 className="font-mono text-cyan-400 text-xs tracking-widest border-b border-cyan-500/30 pb-2">CHỌN LÕI NĂNG LƯỢNG</h3>
                    {(Object.keys(SKINS) as SkinKey[]).map(key => (
                      <div key={key} onClick={() => setSelectedSkin(key)}
                        className={`cursor-pointer flex items-center gap-3 p-3 rounded-lg border transition-all ${selectedSkin === key ? 'border-emerald-400 bg-emerald-900/40' : 'border-white/10 hover:border-white/30'}`}>
                        <div className="w-6 h-6 rounded-full" style={{ backgroundColor: SKINS[key].color, boxShadow: `0 0 15px ${SKINS[key].glow}` }} />
                        <p className="font-mono text-sm text-white">{SKINS[key].name}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-8 flex gap-4">
                  <Button onClick={() => setGameState('idle')} variant="ghost" className="font-mono text-white/50">HỦY</Button>
                  <Button onClick={startGame} className="font-mono bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,255,255,0.5)]">KHỞI ĐỘNG</Button>
                </div>
              </motion.div>
            )}

            {gameState === 'won' && (
              <motion.div initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/90 backdrop-blur-md">
                <h2 className="text-5xl font-black text-emerald-400 mb-2 drop-shadow-[0_0_20px_rgba(52,211,153,0.8)] tracking-widest">
                  THOÁT THÀNH CÔNG
                </h2>
                <div className="flex flex-col items-center gap-1 mb-8 bg-black/50 px-8 py-4 rounded-xl border border-emerald-500/30">
                  <p className="text-sm font-mono text-emerald-300">THỜI GIAN KỶ LỤC</p>
                  <p className="text-5xl font-mono text-white">{time.toFixed(2)}s</p>
                </div>
                <div className="flex gap-4">
                  <Button onClick={() => setGameState('idle')} variant="outline" className="font-mono">MENU</Button>
                  <Button onClick={startGame} size="lg" className="font-mono bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(52,211,153,0.5)]">CHƠI LẠI (SPACE)</Button>
                </div>
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