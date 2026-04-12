import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';

const W = 640,
  H = 440;

interface Monster {
  id: number;
  x: number;
  y: number;
  size: number;
  hp: number;
  maxHp: number;
  speed: number;
  color: string;
  dx: number;
  dy: number;
}

interface Slash {
  x: number;
  y: number;
  t: number;
  hit: boolean;
}

let monsterId = 0;

function spawnMonster(wave: number): Monster {
  const edge = Math.floor(Math.random() * 4);
  let x = 0,
    y = 0;
  if (edge === 0) {
    x = Math.random() * W;
    y = -30;
  } else if (edge === 1) {
    x = W + 30;
    y = Math.random() * H;
  } else if (edge === 2) {
    x = Math.random() * W;
    y = H + 30;
  } else {
    x = -30;
    y = Math.random() * H;
  }

  const hp = 1 + Math.floor(wave / 3);
  const colors = ['#ff2244', '#ff6600', '#aa00ff', '#00ff88', '#ffaa00'];
  return {
    id: ++monsterId,
    x,
    y,
    size: 18 + Math.random() * 10,
    hp,
    maxHp: hp,
    speed: 0.8 + Math.random() * 0.5 + wave * 0.1,
    color: colors[Math.floor(Math.random() * colors.length)],
    dx: 0,
    dy: 0,
  };
}

export function MonsterSlayer({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [lives, setLives] = useState(5);
  const [gameOver, setGameOver] = useState(false);
  const [volume, setVolume] = useState(60);
  const [muted, setMuted] = useState(false);

  const monstersRef = useRef<Monster[]>([]);
  const slashesRef = useRef<Slash[]>([]);
  const playerRef = useRef({ x: W / 2, y: H / 2 });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastGesture = useAppStore((s) => s.lastGesture);

  const playSound = useCallback(
    (freq: number, dur: number, type: OscillatorType = 'square') => {
      if (muted) return;
      try {
        if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.value = (volume / 100) * 0.2;
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.stop(ctx.currentTime + dur);
      } catch {}
    },
    [volume, muted],
  );

  // Mouse tracking
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      playerRef.current.x = ((e.clientX - rect.left) / rect.width) * W;
      playerRef.current.y = ((e.clientY - rect.top) / rect.height) * H;
    };
    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * W;
      const my = ((e.clientY - rect.top) / rect.height) * H;
      doSlash(mx, my);
    };
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('click', onClick);
    return () => {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('click', onClick);
    };
  }, []);

  // Gesture attacks
  useEffect(() => {
    // Khi AI nhận diện cú đấm (PUSH)
    if (lastGesture === 'PUSH') {
      // Tung chiêu chém ngay tại vị trí con trỏ chuột hiện tại (hoặc giữa màn hình nếu thích)
      doSlash(playerRef.current.x, playerRef.current.y);

      // Hiệu ứng màn hình rung nhẹ khi đấm (Tùy chọn cho ngầu)
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.transform = 'scale(0.98)';
        setTimeout(() => (canvas.style.transform = 'scale(1)'), 100);
      }
    }
  }, [lastGesture]);

  const doSlash = (x: number, y: number) => {
    let hit = false;
    for (const m of monstersRef.current) {
      const dx = m.x - x,
        dy = m.y - y;
      if (dx * dx + dy * dy < (m.size + 30) * (m.size + 30)) {
        m.hp--;
        hit = true;
        if (m.hp <= 0) {
          setScore((s) => s + m.maxHp * 10);
          playSound(600, 0.2, 'sawtooth');
        } else {
          playSound(400, 0.1);
        }
      }
    }
    slashesRef.current.push({ x, y, t: Date.now(), hit });
    if (!hit) playSound(150, 0.05);
  };

  // Spawn monsters
  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(
      () => {
        if (monstersRef.current.length < 5 + wave) {
          monstersRef.current.push(spawnMonster(wave));
        }
      },
      1500 - Math.min(wave * 100, 800),
    );
    return () => clearInterval(interval);
  }, [wave, gameOver]);

  // Wave progression
  useEffect(() => {
    if (score > 0 && score % 100 === 0) {
      setWave((w) => w + 1);
      playSound(1000, 0.3, 'sine');
    }
  }, [score]);

  const restart = () => {
    monstersRef.current = [];
    slashesRef.current = [];
    setScore(0);
    setWave(1);
    setLives(5);
    setGameOver(false);
  };

  // Game loop
  useEffect(() => {
    if (gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const loop = () => {
      if (gameOver) return;
      const p = playerRef.current;

      // Update monsters
      const alive: Monster[] = [];
      let livesLost = 0;
      for (const m of monstersRef.current) {
        if (m.hp <= 0) continue;
        const dx = p.x - m.x,
          dy = p.y - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
          m.x += (dx / dist) * m.speed;
          m.y += (dy / dist) * m.speed;
        }
        // Check if monster reached player
        if (dist < m.size + 15) {
          livesLost++;
          playSound(100, 0.2, 'sawtooth');
          continue; // remove this monster
        }
        alive.push(m);
      }
      monstersRef.current = alive;
      if (livesLost > 0) {
        setLives((l) => {
          const newL = l - livesLost;
          if (newL <= 0) setGameOver(true);
          return Math.max(0, newL);
        });
      }

      // Clean old slashes
      const now = Date.now();
      slashesRef.current = slashesRef.current.filter((s) => now - s.t < 300);

      // Draw
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = 'rgba(168,85,247,0.04)';
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Monsters
      for (const m of monstersRef.current) {
        ctx.save();
        ctx.shadowColor = m.color;
        ctx.shadowBlur = 15;
        ctx.fillStyle = m.color;
        ctx.beginPath();
        // Draw as "monster" shape
        const s = m.size;
        ctx.moveTo(m.x, m.y - s);
        ctx.lineTo(m.x + s * 0.8, m.y + s * 0.5);
        ctx.lineTo(m.x + s * 0.3, m.y + s * 0.2);
        ctx.lineTo(m.x + s * 0.5, m.y + s);
        ctx.lineTo(m.x, m.y + s * 0.6);
        ctx.lineTo(m.x - s * 0.5, m.y + s);
        ctx.lineTo(m.x - s * 0.3, m.y + s * 0.2);
        ctx.lineTo(m.x - s * 0.8, m.y + s * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        // HP bar
        if (m.maxHp > 1) {
          const bw = s * 1.5;
          ctx.fillStyle = '#333';
          ctx.fillRect(m.x - bw / 2, m.y - s - 10, bw, 4);
          ctx.fillStyle = '#00ff88';
          ctx.fillRect(m.x - bw / 2, m.y - s - 10, bw * (m.hp / m.maxHp), 4);
        }

        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(m.x - s * 0.2, m.y - s * 0.2, 3, 0, Math.PI * 2);
        ctx.arc(m.x + s * 0.2, m.y - s * 0.2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Player crosshair
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x - 20, p.y);
      ctx.lineTo(p.x + 20, p.y);
      ctx.moveTo(p.x, p.y - 20);
      ctx.lineTo(p.x, p.y + 20);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1;

      // Slashes
      for (const sl of slashesRef.current) {
        const age = (now - sl.t) / 300;
        ctx.globalAlpha = 1 - age;
        ctx.strokeStyle = sl.hit ? '#ffd700' : '#ff4466';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const r = 20 + age * 30;
        for (let a = 0; a < 4; a++) {
          const angle = (a / 4) * Math.PI * 2 + age * 2;
          ctx.moveTo(sl.x, sl.y);
          ctx.lineTo(sl.x + Math.cos(angle) * r, sl.y + Math.sin(angle) * r);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
      }

      requestAnimationFrame(loop);
    };
    const id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [gameOver, playSound]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="font-mono gap-2"
          onClick={onBack}
        >
          <ArrowLeft className="w-4 h-4" /> BACK
        </Button>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-muted-foreground">
            WAVE {wave}
          </span>
          <span className="font-mono text-primary neon-text">
            SCORE: {score}
          </span>
          <span className="font-mono text-xs text-neon-red">❤️ {lives}</span>
          <div className="flex items-center gap-2 w-28">
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={() => setMuted(!muted)}
            >
              {muted ? (
                <VolumeX className="w-3 h-3" />
              ) : (
                <Volume2 className="w-3 h-3" />
              )}
            </Button>
            <Slider
              value={[volume]}
              max={100}
              step={1}
              onValueChange={(v) => setVolume(v[0])}
            />
          </div>
        </div>
      </div>

      <div className="glass neon-border rounded-xl overflow-hidden flex items-center justify-center p-4">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="rounded-lg cursor-crosshair"
          />
          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 rounded-lg gap-4">
              <p className="font-mono text-2xl text-neon-red">💀 GAME OVER</p>
              <p className="font-mono text-primary">
                Score: {score} | Wave: {wave}
              </p>
              <Button onClick={restart} className="font-mono">
                TRY AGAIN
              </Button>
            </div>
          )}
        </div>
      </div>

      <p className="font-mono text-[10px] text-muted-foreground text-center">
        Click để chém quái vật. Cử chỉ FIST (nắm tay) để tấn công! Bảo vệ bản
        thân khỏi quái vật.
      </p>
    </div>
  );
}
