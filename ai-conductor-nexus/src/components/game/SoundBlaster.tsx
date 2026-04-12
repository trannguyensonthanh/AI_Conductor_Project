import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/stores/useAppStore';

const CANVAS_W = 600;
const CANVAS_H = 500;
const CROSSHAIR_SIZE = 20;

interface Target {
  x: number;
  y: number;
  r: number;
  speed: number;
  angle: number;
  hp: number;
  maxHp: number;
  color: string;
  points: number;
}

export function SoundBlaster({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle');
  const [score, setScore] = useState(0);
  const [volume, setVolume] = useState(50);
  const [ammo, setAmmo] = useState(30);

  const sensorData = useAppStore((s) => s.sensorData);
  const crosshair = useRef({ x: CANVAS_W / 2, y: CANVAS_H / 2 });
  const targets = useRef<Target[]>([]);
  const scoreRef = useRef(0);
  const ammoRef = useRef(30);
  const gameStateRef = useRef(gameState);
  const volumeRef = useRef(volume);
  const animRef = useRef(0);
  const micLevel = useRef(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const waveRef = useRef(1);
  const killCount = useRef(0);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  // Mouse aim
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      crosshair.current.x = ((e.clientX - rect.left) / rect.width) * CANVAS_W;
      crosshair.current.y = ((e.clientY - rect.top) / rect.height) * CANVAS_H;
    };
    canvas.addEventListener('mousemove', onMove);
    return () => canvas.removeEventListener('mousemove', onMove);
  }, []);

  // Sensor aim
  useEffect(() => {
    if (gameStateRef.current !== 'playing') return;
    crosshair.current.x = Math.max(0, Math.min(CANVAS_W, crosshair.current.x + sensorData.ax * 8));
    crosshair.current.y = Math.max(0, Math.min(CANVAS_H, crosshair.current.y + sensorData.ay * 8));
  }, [sensorData.ax, sensorData.ay]);

  // Mic setup
  const setupMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      audioCtxRef.current = ctx;
    } catch {
      audioCtxRef.current = new AudioContext();
    }
  }, []);

  // Mic reading
  useEffect(() => {
    if (gameState !== 'playing') return;
    let shooting = false;
    const read = () => {
      if (analyserRef.current) {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        micLevel.current = data.reduce((a, b) => a + b, 0) / data.length;
        // Auto-shoot on loud sound
        if (micLevel.current > 60 && !shooting) {
          shooting = true;
          shoot();
          setTimeout(() => { shooting = false; }, 200);
        }
      }
      if (gameStateRef.current === 'playing') requestAnimationFrame(read);
    };
    read();
  }, [gameState]);

  const playSound = useCallback((freq: number, dur: number) => {
    if (!audioCtxRef.current || volumeRef.current === 0) return;
    const osc = audioCtxRef.current.createOscillator();
    const gain = audioCtxRef.current.createGain();
    osc.connect(gain);
    gain.connect(audioCtxRef.current.destination);
    osc.frequency.value = freq;
    osc.type = 'square';
    gain.gain.value = volumeRef.current / 500;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + dur);
    osc.stop(audioCtxRef.current.currentTime + dur);
  }, []);

  const shoot = useCallback(() => {
    if (ammoRef.current <= 0) return;
    ammoRef.current--;
    setAmmo(ammoRef.current);
    playSound(1200, 0.05);

    const cx = crosshair.current.x, cy = crosshair.current.y;
    for (const t of targets.current) {
      const dx = cx - t.x, dy = cy - t.y;
      if (Math.sqrt(dx * dx + dy * dy) < t.r) {
        t.hp--;
        if (t.hp <= 0) {
          scoreRef.current += t.points;
          setScore(scoreRef.current);
          killCount.current++;
          playSound(800, 0.1);
          t.r = 0; // mark dead
          // Bonus ammo
          ammoRef.current += 2;
          setAmmo(ammoRef.current);
        }
        break;
      }
    }
  }, [playSound]);

  // Click/keyboard to shoot
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onClick = () => {
      if (gameStateRef.current !== 'playing') return;
      shoot();
    };
    canvas.addEventListener('click', onClick);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        if (gameStateRef.current !== 'playing') startGame();
        else shoot();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { canvas.removeEventListener('click', onClick); window.removeEventListener('keydown', onKey); };
  }, [shoot]);

  const spawnWave = useCallback((wave: number) => {
    const count = 3 + wave * 2;
    const colors = ['#ff4444', '#ff8844', '#ffaa00', '#a855f7', '#ff44aa'];
    for (let i = 0; i < count; i++) {
      targets.current.push({
        x: Math.random() * (CANVAS_W - 80) + 40,
        y: Math.random() * (CANVAS_H - 120) + 40,
        r: 20 + Math.random() * 15,
        speed: 0.5 + wave * 0.2 + Math.random(),
        angle: Math.random() * Math.PI * 2,
        hp: 1 + Math.floor(wave / 3),
        maxHp: 1 + Math.floor(wave / 3),
        color: colors[i % colors.length],
        points: 10 * wave,
      });
    }
  }, []);

  const startGame = useCallback(() => {
    setupMic();
    setGameState('playing');
    setScore(0);
    setAmmo(30);
    scoreRef.current = 0;
    ammoRef.current = 30;
    waveRef.current = 1;
    killCount.current = 0;
    targets.current = [];
    spawnWave(1);
  }, [setupMic, spawnWave]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const loop = () => {
      if (gameStateRef.current !== 'playing') return;

      // BG
      ctx.fillStyle = '#060618';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Grid
      ctx.strokeStyle = '#ffffff08';
      for (let x = 0; x < CANVAS_W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke(); }
      for (let y = 0; y < CANVAS_H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke(); }

      // Update & draw targets
      targets.current = targets.current.filter((t) => {
        if (t.r <= 0) return false;
        t.x += Math.cos(t.angle) * t.speed;
        t.y += Math.sin(t.angle) * t.speed;
        if (t.x < t.r || t.x > CANVAS_W - t.r) t.angle = Math.PI - t.angle;
        if (t.y < t.r || t.y > CANVAS_H - t.r) t.angle = -t.angle;
        t.x = Math.max(t.r, Math.min(CANVAS_W - t.r, t.x));
        t.y = Math.max(t.r, Math.min(CANVAS_H - t.r, t.y));

        // Outer glow
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r + 5, 0, Math.PI * 2);
        ctx.fillStyle = t.color + '20';
        ctx.fill();

        // Main
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.fillStyle = t.color;
        ctx.shadowColor = t.color;
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0;

        // HP bar
        if (t.maxHp > 1) {
          const bw = t.r * 2;
          ctx.fillStyle = '#333';
          ctx.fillRect(t.x - bw / 2, t.y - t.r - 10, bw, 4);
          ctx.fillStyle = '#44ff88';
          ctx.fillRect(t.x - bw / 2, t.y - t.r - 10, bw * (t.hp / t.maxHp), 4);
        }

        return true;
      });

      // Next wave
      if (targets.current.length === 0) {
        waveRef.current++;
        spawnWave(waveRef.current);
        ammoRef.current += 10;
        setAmmo(ammoRef.current);
      }

      // Game over check
      if (ammoRef.current <= 0 && targets.current.length > 0) {
        // Grace: if no targets hit in 2s, game over
        setTimeout(() => {
          if (ammoRef.current <= 0 && targets.current.length > 0) setGameState('over');
        }, 1000);
      }

      // Mic bar
      ctx.fillStyle = `hsl(${120 + micLevel.current}, 80%, 50%)`;
      ctx.fillRect(15, CANVAS_H - 25, micLevel.current * 1.5, 6);
      ctx.strokeStyle = '#ffffff22';
      ctx.strokeRect(15, CANVAS_H - 25, 150, 6);
      ctx.fillStyle = '#00f0ff';
      ctx.font = '9px "JetBrains Mono"';
      ctx.textAlign = 'left';
      ctx.fillText('MIC (Hét để bắn)', 15, CANVAS_H - 30);

      // HUD
      ctx.fillStyle = '#00f0ff';
      ctx.font = '14px "JetBrains Mono"';
      ctx.textAlign = 'left';
      ctx.fillText(`SCORE: ${scoreRef.current}`, 15, 25);
      ctx.fillStyle = '#a855f7';
      ctx.fillText(`WAVE: ${waveRef.current}`, 15, 45);
      ctx.fillStyle = ammoRef.current < 5 ? '#ff4444' : '#ffaa00';
      ctx.textAlign = 'right';
      ctx.fillText(`AMMO: ${ammoRef.current}`, CANVAS_W - 15, 25);

      // Crosshair
      const cx = crosshair.current.x, cy = crosshair.current.y;
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, CROSSHAIR_SIZE, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - CROSSHAIR_SIZE - 5, cy);
      ctx.lineTo(cx - CROSSHAIR_SIZE + 8, cy);
      ctx.moveTo(cx + CROSSHAIR_SIZE - 8, cy);
      ctx.lineTo(cx + CROSSHAIR_SIZE + 5, cy);
      ctx.moveTo(cx, cy - CROSSHAIR_SIZE - 5);
      ctx.lineTo(cx, cy - CROSSHAIR_SIZE + 8);
      ctx.moveTo(cx, cy + CROSSHAIR_SIZE - 8);
      ctx.lineTo(cx, cy + CROSSHAIR_SIZE + 5);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1;

      // Center dot
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fill();

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [gameState, spawnWave]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
      <div className="flex items-center justify-between w-full max-w-[640px]">
        <Button variant="ghost" size="sm" onClick={onBack} className="font-mono text-xs gap-2">
          <ArrowLeft className="w-4 h-4" /> BACK TO ARCADE
        </Button>
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-muted-foreground" />
          <Slider value={[volume]} max={100} step={1} onValueChange={(v) => setVolume(v[0])} className="w-24" />
        </div>
      </div>
      <div className="glass neon-border rounded-xl p-4 relative">
        <h3 className="font-mono text-xs tracking-widest text-muted-foreground mb-3 text-center">
          SOUND BLASTER // Hét mic (I2S) hoặc click/SPACE để bắn • MPU6050 để ngắm
        </h3>
        <div className="relative">
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="rounded-lg border border-border/50 cursor-crosshair" />
          <AnimatePresence>
            {gameState === 'idle' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 rounded-lg">
                <h2 className="text-2xl font-bold neon-text mb-2 font-mono">🔫 SOUND BLASTER</h2>
                <p className="text-sm text-muted-foreground mb-1 font-mono">Ngắm bằng chuột/MPU6050</p>
                <p className="text-xs text-muted-foreground mb-1 font-mono">Hét vào mic I2S hoặc click để bắn!</p>
                <p className="text-xs text-muted-foreground mb-4 font-mono">Wave system • Ammo management</p>
                <Button onClick={startGame} className="font-mono">START (SPACE)</Button>
              </motion.div>
            )}
            {gameState === 'over' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 rounded-lg">
                <h2 className="text-2xl font-bold text-neon-red mb-2 font-mono">GAME OVER</h2>
                <p className="text-lg neon-text mb-1 font-mono">Score: {score}</p>
                <p className="text-sm text-muted-foreground mb-4 font-mono">Wave: {waveRef.current}</p>
                <Button onClick={startGame} className="font-mono">RETRY (SPACE)</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
