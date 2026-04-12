import { useEffect, useRef } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { Mic, MicOff } from 'lucide-react';

const MAX_HISTORY = 100;
const BAR_W = 4;
const BAR_GAP = 2;
const CANVAS_H = 120;

export function MicChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) { 
        animRef.current = requestAnimationFrame(draw); 
        return; 
      }

      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      const ctx = canvas.getContext('2d')!;
      const W = canvas.width;
      const H = canvas.height;
      
      const { micHistory, micLevel } = useAppStore.getState();

      ctx.clearRect(0, 0, W, H);

      // ─── Background grid ───────────────────────────────────
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let y = 0; y <= 4; y++) {
        const py = (y / 4) * H;
        ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke();
      }

      // ─── Bars (waveform style) ──────────────────────────────
      const totalBars = Math.floor(W / (BAR_W + BAR_GAP));
      const slice = micHistory.slice(-totalBars);

      for (let i = 0; i < slice.length; i++) {
        const entry = slice[i];
        // Tính chiều cao cột dựa trên % level
        const barH = Math.max(2, (entry.level / 100) * H);
        const x = i * (BAR_W + BAR_GAP);
        const y = H - barH;

        const hue = 140 - entry.level * 1.2; 
        const alpha = 0.5 + (i / slice.length) * 0.5;
        ctx.fillStyle = `hsla(${hue}, 90%, 55%, ${alpha})`;

        if (entry.level > 70) {
          ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
          ctx.shadowBlur = 6;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.roundRect(x, y, BAR_W, barH, [2, 2, 0, 0]);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // ─── Live level indicator line ─────────────────────────
      if (micHistory.length > 0) {
        const lvY = H - (micLevel / 100) * H;
        ctx.strokeStyle = `hsl(140, 100%, 60%)`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(0, lvY); ctx.lineTo(W, lvY); ctx.stroke();
        ctx.setLineDash([]);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const micLevel = useAppStore((s) => s.micLevel);
  const micHistory = useAppStore((s) => s.micHistory);
  
  // Timeout mất tín hiệu: Nếu 1 giây (1000ms) không có điểm mới -> Báo mất kết nối
  const isActive = micHistory.length > 0 && Date.now() - (micHistory.at(-1)?.time ?? 0) < 1000;

  const getLevelLabel = (l: number) => {
    if (l === 0) return { label: 'SILENT', color: 'text-muted-foreground' };
    if (l < 20) return { label: 'WHISPER', color: 'text-emerald-400' };
    if (l < 50) return { label: 'NORMAL', color: 'text-green-400' };
    if (l < 75) return { label: 'LOUD', color: 'text-yellow-400' };
    return { label: 'VERY LOUD', color: 'text-red-400' };
  };
  const { label, color } = getLevelLabel(micLevel);

  return (
    <div className="glass neon-border rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isActive ? (
            <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />
          ) : (
            <MicOff className="w-4 h-4 text-red-500 animate-pulse" />
          )}
          <h3 className="font-mono text-xs tracking-widest text-muted-foreground">
            MICROPHONE // I2S
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[10px] font-bold ${color}`}>{label}</span>
          <span className="font-mono text-xs text-primary font-bold">{micLevel}%</span>
        </div>
      </div>

      {/* Canvas waveform */}
      <div className="relative rounded-lg overflow-hidden bg-black/30" style={{ height: CANVAS_H }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ imageRendering: 'pixelated' }}
        />
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all">
            <p className="font-mono text-[10px] text-red-400/80 animate-pulse">
              NO AUDIO SIGNAL...
            </p>
          </div>
        )}
      </div>

      {/* Level bar */}
      <div className="space-y-1">
        <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-75"
            style={{
              width: `${micLevel}%`,
              background: `linear-gradient(to right,
                hsl(140,90%,50%) 0%,
                hsl(80,90%,55%) 50%,
                hsl(${Math.max(0, 40 - micLevel * 0.3)},90%,55%) 100%
              )`,
              boxShadow: micLevel > 60 ? `0 0 8px hsl(${Math.max(0, 80 - micLevel)},90%,55%)` : 'none',
            }}
          />
        </div>
        <div className="flex justify-between font-mono text-[9px] text-muted-foreground/50">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'PEAK RAW', value: isActive ? (micHistory.at(-1)?.raw?.toString() ?? '0') : '—' },
          { label: 'UI FPS', value: isActive ? '20 Hz' : '—' },
          { label: 'BUFFER', value: isActive ? `${micHistory.length}/${MAX_HISTORY}` : '0' },
        ].map((s) => (
          <div key={s.label} className="bg-black/20 rounded-lg p-2">
            <p className="font-mono text-[8px] text-muted-foreground">{s.label}</p>
            <p className="font-mono text-xs text-primary font-bold">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}