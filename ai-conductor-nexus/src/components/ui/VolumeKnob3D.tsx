import { useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface VolumeKnob3DProps {
  volume: number;
  onVolumeChange: (v: number) => void;
  onClose: () => void;
}

export function VolumeKnob3D({ volume, onVolumeChange, onClose }: VolumeKnob3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef((volume / 100) * 270 - 135); // Map 0-100% to -135 to +135 degrees
  const animRef = useRef(0);

  // Lấy lệnh giọng nói từ Store
  const lastVoiceCommand = useAppStore((s) => s.lastVoiceCommand);
  const setLastVoiceCommand = useAppStore((s) => s.setLastVoiceCommand);

  // Convert canvas angle to volume 0-100
  const angleToVolume = (angle: number) => {
    return Math.round(Math.max(0, Math.min(100, ((angle + 135) / 270) * 100)));
  };

  // Convert volume 0-100 back to angle [-135, 135]
  const volumeToAngle = (vol: number) => {
    return (vol / 100) * 270 - 135;
  };

  const drawKnob = useCallback((angle: number, vol: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2 - 20;
    const R = 80;

    ctx.clearRect(0, 0, W, H);

    // ---- Ambient glow ----
    const glow = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * 1.6);
    const hue = 185 + vol * 0.8; // Cyan to purple as volume increases
    glow.addColorStop(0, `hsla(${hue}, 100%, 60%, ${0.05 + vol * 0.002})`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // ---- Outer arc track (background) ----
    ctx.beginPath();
    ctx.arc(cx, cy, R + 14, (135 * Math.PI) / 180, (45 * Math.PI) / 180);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();

    // ---- Volume fill arc ----
    if (vol > 0) {
      const startAngle = (135 * Math.PI) / 180;
      const endAngle = startAngle + (vol / 100) * (270 * Math.PI) / 180;
      const arcGrad = ctx.createLinearGradient(cx - R, cy, cx + R, cy);
      arcGrad.addColorStop(0, `hsl(${hue - 20}, 100%, 50%)`);
      arcGrad.addColorStop(1, `hsl(${hue + 30}, 100%, 65%)`);
      ctx.beginPath();
      ctx.arc(cx, cy, R + 14, startAngle, endAngle);
      ctx.strokeStyle = arcGrad;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // ---- Segment tick marks ----
    for (let i = 0; i <= 10; i++) {
      const tickAngle = (135 + i * 27) * (Math.PI / 180);
      const inner = R + 20;
      const outer = R + 26;
      const tx1 = cx + Math.cos(tickAngle) * inner;
      const ty1 = cy + Math.sin(tickAngle) * inner;
      const tx2 = cx + Math.cos(tickAngle) * outer;
      const ty2 = cy + Math.sin(tickAngle) * outer;
      ctx.beginPath();
      ctx.moveTo(tx1, ty1);
      ctx.lineTo(tx2, ty2);
      ctx.strokeStyle = i <= vol / 10 ? `hsl(${hue}, 80%, 55%)` : 'rgba(255,255,255,0.12)';
      ctx.lineWidth = i % 5 === 0 ? 2 : 1;
      ctx.stroke();
    }

    // ---- Knob body 3D gradient ----
    const bodyGrad = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.25, R * 0.1, cx, cy, R);
    bodyGrad.addColorStop(0, 'rgba(80,80,100,0.98)');
    bodyGrad.addColorStop(0.4, 'rgba(40,40,60,0.98)');
    bodyGrad.addColorStop(1, 'rgba(15,15,25,0.98)');
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 24;
    ctx.fill();
    ctx.shadowBlur = 0;

    // ---- Knob border ring ----
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    const ringGrad = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    ringGrad.addColorStop(0, `hsla(${hue}, 80%, 60%, 0.6)`);
    ringGrad.addColorStop(0.5, 'rgba(255,255,255,0.06)');
    ringGrad.addColorStop(1, `hsla(${hue}, 80%, 40%, 0.3)`);
    ctx.strokeStyle = ringGrad;
    ctx.lineWidth = 2;
    ctx.stroke();

    // ---- Inner reflective highlight ----
    const hlGrad = ctx.createRadialGradient(cx - R * 0.28, cy - R * 0.33, 0, cx - R * 0.1, cy - R * 0.15, R * 0.45);
    hlGrad.addColorStop(0, 'rgba(255,255,255,0.18)');
    hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = hlGrad;
    ctx.fill();

    // ---- Groove lines on knob ----
    for (let i = 0; i < 12; i++) {
      const ga = (i / 12) * Math.PI * 2;
      const gr1 = R * 0.65;
      const gr2 = R * 0.9;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ga) * gr1, cy + Math.sin(ga) * gr1);
      ctx.lineTo(cx + Math.cos(ga) * gr2, cy + Math.sin(ga) * gr2);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // ---- Indicator pointer (rotates with angle) ----
    const indicAngle = (angle * Math.PI) / 180;
    const ip1x = cx + Math.cos(indicAngle) * (R * 0.45);
    const ip1y = cy + Math.sin(indicAngle) * (R * 0.45);
    const ip2x = cx + Math.cos(indicAngle) * (R * 0.82);
    const ip2y = cy + Math.sin(indicAngle) * (R * 0.82);
    ctx.beginPath();
    ctx.moveTo(ip1x, ip1y);
    ctx.lineTo(ip2x, ip2y);
    ctx.strokeStyle = `hsl(${hue}, 100%, 70%)`;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
    ctx.shadowBlur = 10;
    ctx.stroke();
    
    // Dot at tip
    ctx.beginPath();
    ctx.arc(ip2x, ip2y, 4, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${hue}, 100%, 75%)`;
    ctx.fill();
    ctx.shadowBlur = 0;

    // ---- Center cap ----
    const capGrad = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 14);
    capGrad.addColorStop(0, 'rgba(100,100,130,1)');
    capGrad.addColorStop(1, 'rgba(30,30,45,1)');
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fillStyle = capGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // ---- Volume percentage text ----
    ctx.fillStyle = `hsl(${hue}, 100%, 70%)`;
    ctx.font = 'bold 26px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
    ctx.shadowBlur = 12;
    ctx.fillText(`${vol}%`, cx, H - 44);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('MPU & VOICE VOLUME KNOB', cx, H - 22);
  },[]);

  // ==============================================================
  // 🔥 AI VOICE CONTROL: ĐIỀU CHỈNH VOLUME BẰNG GIỌNG NÓI 🔥
  // ==============================================================
  useEffect(() => {
    if (lastVoiceCommand === 'NONE') return;

    let newVol = volume;
    let actionTaken = false;

    // Xử lý các con số (Set cứng mức Volume)
    const voiceMap: Record<string, number> = {
      'ONE': 20, 'TWO': 40, 'THREE': 60, 'FOUR': 80, 'FIVE': 100
    };

    if (voiceMap[lastVoiceCommand] !== undefined) {
      newVol = voiceMap[lastVoiceCommand];
      toast({ title: `🔊 VOLUME: ${newVol}%`, description: `Khẩu lệnh: ${lastVoiceCommand}` });
      actionTaken = true;
    } 
    // Xử lý To / Nhỏ (Tăng giảm tương đối)
    else if (lastVoiceCommand === 'BIG') {
      newVol = Math.min(100, volume + 20);
      toast({ title: "🔊 TĂNG ÂM LƯỢNG", description: `Khẩu lệnh: BIG (+20%)` });
      actionTaken = true;
    } 
    else if (lastVoiceCommand === 'SMALL') {
      newVol = Math.max(0, volume - 20);
      toast({ title: "🔉 GIẢM ÂM LƯỢNG", description: `Khẩu lệnh: SMALL (-20%)` });
      actionTaken = true;
    }

    if (actionTaken) {
      // 1. Cập nhật góc của núm vặn (Canvas)
      angleRef.current = volumeToAngle(newVol);
      
      // 2. Gửi lệnh cập nhật Volume ra ngoài (Cho thẻ <audio> hoặc <video>)
      onVolumeChange(newVol);
      
      // 3. Vẽ lại núm vặn ngay lập tức
      drawKnob(angleRef.current, newVol);
      
      // 4. Nuốt lệnh để chống lặp
      setLastVoiceCommand('NONE');
    }
  }, [lastVoiceCommand, volume, onVolumeChange, drawKnob, setLastVoiceCommand]);

  // ==============================================================
  // 🔥 MPU6050 CONTROL: ĐIỀU CHỈNH BẰNG CÁCH XOAY CỔ TAY 🔥
  // ==============================================================
  useEffect(() => {
    const DEADZONE = 0.4;
    const SENSITIVITY = 1.5; 

    const loop = () => {
      // Lấy data gia tốc/con quay từ Store (Real-time 100Hz)
      const { ay } = useAppStore.getState().sensorData;

      const effectiveGy = Math.abs(ay) > DEADZONE ? ay : 0;

      if (effectiveGy !== 0) {
        angleRef.current += effectiveGy * SENSITIVITY;
        angleRef.current = Math.max(-135, Math.min(135, angleRef.current));
        
        const newVol = angleToVolume(angleRef.current);
        onVolumeChange(newVol);
        drawKnob(angleRef.current, newVol);
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [onVolumeChange, drawKnob]);

  // Initial draw
  useEffect(() => {
    drawKnob(angleRef.current, volume);
  },[volume, drawKnob]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }}
      transition={{ type: 'spring', damping: 18, stiffness: 280 }}
      className="fixed inset-0 flex items-center justify-center z-[9000] bg-black/60 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative flex flex-col items-center gap-2 glass rounded-2xl p-6 border border-primary/30"
        style={{ boxShadow: '0 0 60px hsl(var(--primary) / 0.2)' }}>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <p className="font-mono text-xs text-muted-foreground tracking-widest mb-2">
          🎛️ MULTIMODAL VOLUME CONTROL
        </p>

        <canvas
          ref={canvasRef}
          width={240}
          height={240}
          style={{ imageRendering: 'auto' }}
        />

        <p className="font-mono text-[10px] text-muted-foreground text-center mt-1 leading-relaxed">
          <span className="text-primary font-bold">Cử chỉ:</span> Xoay cổ tay (Nghiêng mạch) &rarr; Tăng/Giảm<br />
          <span className="text-neon-purple font-bold">Giọng nói:</span> Hô "ONE" - "FIVE" hoặc "BIG" / "SMALL"
        </p>
      </div>
    </motion.div>
  );
}