import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Maximize, Minimize, Play, Settings2, Music, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CANVAS_W = 960;
const CANVAS_H = 540;
const LANE_COUNT = 5;
const LANE_W = CANVAS_W / LANE_COUNT;
const BLOCK_SIZE = 55;
const PADDLE_WIDTH = LANE_W * 1.5;

// --- CONFIG THEMES & SKINS ---
const ENVIRONMENTS = {
  cyber: { name: 'Cyber Grid', bgTop: '#000814', bgBot: '#001d3d', grid: '#00ffff', blockColors: ['#ff0055', '#00ffff', '#ff00ff', '#ffff00', '#39ff14'] },
  synth: { name: 'Synthwave', bgTop: '#2b00ff', bgBot: '#ff007f', grid: '#ffaa00', blockColors: ['#ffaa00', '#ff00ff', '#00ffff', '#ff4444', '#44ff88'] },
  toxic: { name: 'Toxic Core', bgTop: '#051005', bgBot: '#103010', grid: '#39ff14', blockColors: ['#39ff14', '#ffff00', '#00ffaa', '#ffaa00', '#ff00ff'] },
};

const SKINS = {
  cyan: { name: 'Plasma Cyan', core: '#ffffff', glow: '#00f0ff' },
  red: { name: 'Laser Red', core: '#ffffff', glow: '#ff0055' },
  violet: { name: 'Energy Violet', core: '#ffffff', glow: '#a855f7' },
};

type EnvKey = keyof typeof ENVIRONMENTS;
type SkinKey = keyof typeof SKINS;

interface Block { lane: number; y: number; speed: number; hit: boolean; id: number; color: string; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; }
interface FloatingText { x: number; y: number; text: string; life: number; color: string; }

export function RhythmSaber({ onBack }: { onBack: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [gameState, setGameState] = useState<'idle' | 'setup' | 'playing' | 'over'>('idle');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [selectedEnv, setSelectedEnv] = useState<EnvKey>('cyber');
  const [selectedSkin, setSelectedSkin] = useState<SkinKey>('cyan');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Core Game Refs
  const blocksRef = useRef<Block[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const textsRef = useRef<FloatingText[]>([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const missesRef = useRef(0);
  const gameStateRef = useRef(gameState);
  const screenShake = useRef(0);
  const gridOffset = useRef(0);
  let blockId = useRef(0);

  // Controls Refs
  const playerX = useRef(CANVAS_W / 2);
  const velXRef = useRef(0);
  const keysPressed = useRef<Set<string>>(new Set());
  const mouseX = useRef<number | null>(null);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen().catch(e => console.log(e));
    else document.exitFullscreen();
  };
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Keyboard & Mouse Controls (Fallback)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key);
      if (e.key === ' ' && (gameStateRef.current === 'idle' || gameStateRef.current === 'over')) {
        e.preventDefault(); startGame();
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

  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0); setCombo(0);
    scoreRef.current = 0; comboRef.current = 0; missesRef.current = 0;
    blocksRef.current = []; particlesRef.current = []; textsRef.current = [];
    playerX.current = CANVAS_W / 2;
  }, []);

  const createParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 20; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10,
        life: 1, color, size: Math.random() * 4 + 2
      });
    }
  };

  const createText = (x: number, y: number, text: string, color: string) => {
    textsRef.current.push({ x, y, text, life: 1, color });
  };

  // MAIN GAME LOOP
  useEffect(() => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false })!;
    let animId: number;
    let spawnTimer = 0;

    const env = ENVIRONMENTS[selectedEnv];
    const skin = SKINS[selectedSkin];
    const hitZoneY = CANVAS_H - 90;

    const loop = () => {
      if (gameStateRef.current !== 'playing') return;

      const speedControl = 8;
      if (keysPressed.current.has('ArrowLeft') || keysPressed.current.has('a')) playerX.current -= speedControl;
      if (keysPressed.current.has('ArrowRight') || keysPressed.current.has('d')) playerX.current += speedControl;
      if (mouseX.current !== null) playerX.current += (mouseX.current - playerX.current) * 0.15;

      const { gz } = useAppStore.getState().sensorData;
      const SENSITIVITY_X = 15.0;
      const DEADZONE = 0.25;
      const SMOOTHING = 0.85;
      const rawDeltaX = Math.abs(gz) > DEADZONE ? -gz * SENSITIVITY_X : 0;
      velXRef.current = velXRef.current * SMOOTHING + rawDeltaX * (1 - SMOOTHING);
      playerX.current += velXRef.current;
      playerX.current = Math.max(PADDLE_WIDTH / 2, Math.min(CANVAS_W - PADDLE_WIDTH / 2, playerX.current));

      const difficultyMult = 1 + (scoreRef.current * 0.015);

      ctx.save();
      if (screenShake.current > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake.current, (Math.random() - 0.5) * screenShake.current);
        screenShake.current *= 0.9;
      }

      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      grad.addColorStop(0, env.bgTop); grad.addColorStop(1, env.bgBot);
      ctx.fillStyle = grad; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      gridOffset.current = (gridOffset.current + 3 * difficultyMult) % 60;
      ctx.strokeStyle = env.grid + '33';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= LANE_COUNT; i++) {
        ctx.moveTo(i * LANE_W, 0); ctx.lineTo(i * LANE_W, CANVAS_H);
      }
      for (let i = 0; i < CANVAS_H; i += 60) {
        ctx.moveTo(0, i + gridOffset.current); ctx.lineTo(CANVAS_W, i + gridOffset.current);
      }
      ctx.stroke();

      ctx.strokeStyle = skin.glow + '88';
      ctx.lineWidth = 4;
      ctx.setLineDash([15, 15]);
      ctx.beginPath(); ctx.moveTo(0, hitZoneY); ctx.lineTo(CANVAS_W, hitZoneY); ctx.stroke();
      ctx.setLineDash([]);

      spawnTimer++;
      const spawnRate = Math.max(25, 70 - scoreRef.current * 0.5);
      if (spawnTimer > spawnRate) {
        spawnTimer = 0;
        const lane = Math.floor(Math.random() * LANE_COUNT);
        blocksRef.current.push({
          lane, y: -BLOCK_SIZE,
          speed: (2.5 + Math.random() * 1.5) * difficultyMult,
          hit: false, id: blockId.current++,
          color: env.blockColors[lane]
        });
      }

      ctx.globalCompositeOperation = 'lighter';
      blocksRef.current = blocksRef.current.filter((b) => {
        if (b.hit) return false;
        b.y += b.speed;
        const bx = b.lane * LANE_W + LANE_W / 2;
        const by = b.y + BLOCK_SIZE / 2;
        const hitTolY = Math.max(40, b.speed * 1.5);
        if (Math.abs(by - hitZoneY) < hitTolY) {
          if (Math.abs(bx - playerX.current) < PADDLE_WIDTH / 2 + BLOCK_SIZE / 2) {
            b.hit = true;
            const points = 10 + comboRef.current * 2;
            scoreRef.current += points;
            comboRef.current++;
            setScore(scoreRef.current); setCombo(comboRef.current);
            createParticles(bx, by, b.color);
            createText(bx, by - 20, `+${points}`, b.color);
            if (comboRef.current % 10 === 0) createText(CANVAS_W / 2, CANVAS_H / 2, `COMBO x${comboRef.current}!`, '#fff');
            return false;
          }
        }
        ctx.fillStyle = b.color + 'aa';
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 15;
        ctx.fillRect(bx - BLOCK_SIZE / 2, b.y, BLOCK_SIZE, BLOCK_SIZE);
        ctx.strokeRect(bx - BLOCK_SIZE / 2, b.y, BLOCK_SIZE, BLOCK_SIZE);
        ctx.fillStyle = '#fff';
        ctx.fillRect(bx - BLOCK_SIZE / 4, b.y + BLOCK_SIZE / 4, BLOCK_SIZE / 2, BLOCK_SIZE / 2);
        ctx.shadowBlur = 0;
        if (b.y > CANVAS_H) {
          missesRef.current++;
          comboRef.current = 0; setCombo(0);
          screenShake.current = 15;
          createText(bx, CANVAS_H - 30, 'MISS', '#ff0000');
          if (missesRef.current >= 10) setGameState('over');
          return false;
        }
        return true;
      });

      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx; p.y += p.vy; p.life -= 0.03;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        return p.life > 0;
      });

      textsRef.current = textsRef.current.filter(t => {
        t.y -= 2; t.life -= 0.02;
        ctx.fillStyle = t.color;
        ctx.globalAlpha = Math.max(0, t.life);
        ctx.font = 'bold 24px "JetBrains Mono"';
        ctx.textAlign = 'center';
        ctx.shadowColor = t.color; ctx.shadowBlur = 10;
        ctx.fillText(t.text, t.x, t.y);
        ctx.shadowBlur = 0;
        return t.life > 0;
      });
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';

      const px = playerX.current;
      ctx.shadowColor = skin.glow;
      ctx.shadowBlur = 30;
      ctx.fillStyle = skin.glow;
      ctx.beginPath();
      ctx.roundRect(px - PADDLE_WIDTH / 2, hitZoneY - 15, PADDLE_WIDTH, 30, 15);
      ctx.fill();
      ctx.shadowBlur = 10;
      ctx.fillStyle = skin.core;
      ctx.beginPath();
      ctx.roundRect(px - (PADDLE_WIDTH / 2) + 10, hitZoneY - 5, PADDLE_WIDTH - 20, 10, 5);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();

      ctx.fillStyle = '#fff'; ctx.font = 'bold 28px "JetBrains Mono"'; ctx.textAlign = 'left';
      ctx.fillText(scoreRef.current.toString().padStart(5, '0'), 20, 40);
      if (comboRef.current > 2) {
        ctx.fillStyle = skin.glow; ctx.font = 'bold 20px "JetBrains Mono"';
        ctx.fillText(`COMBO x${comboRef.current}`, 20, 70);
      }
      const missRatio = missesRef.current / 10;
      ctx.fillStyle = '#ff000044';
      ctx.fillRect(CANVAS_W - 220, 20, 200, 15);
      ctx.fillStyle = '#ff0055';
      ctx.shadowColor = '#ff0055'; ctx.shadowBlur = 10;
      ctx.fillRect(CANVAS_W - 220, 20, 200 * (1 - missRatio), 15);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff'; ctx.font = '12px "JetBrains Mono"'; ctx.textAlign = 'right';
      ctx.fillText(`INTEGRITY: ${10 - missesRef.current}/10`, CANVAS_W - 20, 50);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, selectedEnv, selectedSkin]);

  return (
    <div ref={containerRef} className={`flex flex-col bg-black ${isFullscreen ? 'w-screen h-screen' : 'w-full items-center'}`}>

      {/* Header Controls - absolute khi fullscreen */}
      <div className={`flex items-center justify-between px-4 py-3 z-50 ${isFullscreen ? 'absolute top-0 left-0 right-0 bg-black/60 backdrop-blur-md' : 'w-full max-w-5xl'}`}>
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
            : { maxWidth: `${CANVAS_W}px`, aspectRatio: `${CANVAS_W}/${CANVAS_H}`, margin: '0 auto', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 0 40px rgba(168,85,247,0.15)' }
          }
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className={`w-full h-full block ${gameState === 'playing' ? 'cursor-none' : ''}`}
          />

          <AnimatePresence mode="wait">
            {/* MAN HINH CHINH */}
            {gameState === 'idle' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
                <Activity className="w-16 h-16 text-fuchsia-500 mb-4 drop-shadow-[0_0_15px_rgba(255,0,255,0.8)]" />
                <h1 className="text-5xl font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 mb-2 drop-shadow-[0_0_10px_rgba(255,0,255,0.4)]">
                  RHYTHM SABER
                </h1>
                <p className="text-white/60 font-mono text-sm mb-8 tracking-widest uppercase">Ch&#233;m nh&#7883;p &#273;i&#7879;u kh&#244;ng gian</p>
                <div className="flex gap-4">
                  <Button onClick={() => setGameState('setup')} variant="outline" size="lg" className="font-mono border-fuchsia-500 text-fuchsia-400 hover:bg-fuchsia-500/20 gap-2">
                    <Settings2 className="w-5 h-5" /> SETUP
                  </Button>
                  <Button onClick={startGame} size="lg" className="font-mono bg-fuchsia-600 hover:bg-fuchsia-500 text-white border-none gap-2 shadow-[0_0_20px_rgba(255,0,255,0.4)]">
                    <Play className="w-5 h-5" /> START BEAT
                  </Button>
                </div>
              </motion.div>
            )}

            {/* MAN HINH SETUP */}
            {gameState === 'setup' && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-6">
                <div className="flex w-full max-w-2xl gap-8">
                  <div className="flex-1 space-y-3">
                    <h3 className="font-mono text-fuchsia-400 text-xs tracking-widest border-b border-fuchsia-500/30 pb-2">CH&#7884;N S&#194;N KH&#7844;U</h3>
                    {(Object.keys(ENVIRONMENTS) as EnvKey[]).map(key => (
                      <div key={key} onClick={() => setSelectedEnv(key)}
                        className={`cursor-pointer p-3 rounded-lg border transition-all ${selectedEnv === key ? 'border-fuchsia-400 bg-fuchsia-900/40' : 'border-white/10 hover:border-white/30'}`}>
                        <p className="font-mono text-sm text-white">{ENVIRONMENTS[key].name}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 space-y-3">
                    <h3 className="font-mono text-fuchsia-400 text-xs tracking-widest border-b border-fuchsia-500/30 pb-2">CH&#7884;N KI&#7870;M &#193;NH S&#193;NG</h3>
                    {(Object.keys(SKINS) as SkinKey[]).map(key => (
                      <div key={key} onClick={() => setSelectedSkin(key)}
                        className={`cursor-pointer flex items-center gap-3 p-3 rounded-lg border transition-all ${selectedSkin === key ? 'border-cyan-400 bg-cyan-900/40' : 'border-white/10 hover:border-white/30'}`}>
                        <div className="w-8 h-3 rounded-full" style={{ backgroundColor: SKINS[key].core, boxShadow: `0 0 10px ${SKINS[key].glow}` }} />
                        <p className="font-mono text-sm text-white">{SKINS[key].name}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-8 flex gap-4">
                  <Button onClick={() => setGameState('idle')} variant="ghost" className="font-mono text-white/50">H&#7�;Y</Button>
                  <Button onClick={startGame} className="font-mono bg-fuchsia-500 hover:bg-fuchsia-400 text-white shadow-[0_0_15px_rgba(255,0,255,0.5)]">X&#193;C NH&#7852;N &amp; CH&#416;I</Button>
                </div>
              </motion.div>
            )}

            {/* MAN HINH GAME OVER */}
            {gameState === 'over' && (
              <motion.div initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/90 backdrop-blur-md">
                <h2 className="text-6xl font-black text-red-500 mb-2 drop-shadow-[0_0_20px_rgba(255,0,0,0.8)] tracking-widest">
                  TRACK FAILED
                </h2>
                <div className="flex flex-col items-center gap-1 mb-8 bg-black/50 px-8 py-4 rounded-xl border border-red-500/30 shadow-[0_0_30px_rgba(255,0,0,0.2)]">
                  <p className="text-sm font-mono text-red-300">TOTAL SCORE</p>
                  <p className="text-5xl font-mono text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{score}</p>
                </div>
                <div className="flex gap-4">
                  <Button onClick={() => setGameState('idle')} variant="outline" className="font-mono border-white/20 text-white/70 hover:bg-white/10">MENU CH&#205;NH</Button>
                  <Button onClick={startGame} size="lg" className="font-mono bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(255,0,0,0.5)]">CH&#416;I L&#7840;I (SPACE)</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer HDSD */}
      {!isFullscreen && (
        <div className="flex justify-center gap-8 w-full text-xs font-mono text-white/40 mt-4 px-4 pb-4">
          <p>&#127918; <strong className="text-fuchsia-400">ESP32 MPU6050</strong> (Nghi&#234;ng m&#7841;ch tr&#225;i ph&#7843;i)</p>
          <p>&#128433;&#65039; <strong className="text-white">Chu&#7897;t / &#8592; &#8594;</strong> (B&#224;n ph&#237;m d&#7921; ph&#242;ng)</p>
        </div>
      )}
    </div>
  );
}