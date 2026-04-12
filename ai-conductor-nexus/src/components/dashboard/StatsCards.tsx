
import { Activity, Cpu, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/stores/useAppStore';



export function StatsCards() {
  const [uptime, setUptime] = useState('0h 0m');
  const [seconds, setSeconds] = useState(0);
  const gestureLog = useAppStore((s) => s.gestureLog);
  const isConnected = useAppStore((s) => s.isConnected);

  // Đếm số lệnh
  const handCount = gestureLog.filter(log => log.source === 'HAND').length;
  const voiceCount = gestureLog.filter(log => log.source === 'VOICE').length;
    const cards =[
    {
      label: 'SYSTEM UPTIME',
      icon: Activity,
      value: uptime, // Lấy từ state uptime của ông
      color: 'text-primary',
    },
    {
      label: 'AI PREDICTIONS',
      icon: Cpu,
      value: `${handCount + voiceCount} cmds`,
      color: 'text-neon-purple',
    },
    {
      label: 'SENSOR STATUS',
      icon: Zap,
      value: isConnected ? 'STREAMING' : 'OFFLINE',
      color: isConnected ? 'text-neon-green' : 'text-neon-red',
    },
  ];
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setSeconds(elapsed);
      const h = Math.floor(elapsed / 3600);
      const m = Math.floor((elapsed % 3600) / 60);
      const s = elapsed % 60;
      setUptime(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card, i) => (
        <motion.div key={card.label} /* ... các thuộc tính animation ... */ className="glass neon-border rounded-xl p-4 lg:p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] tracking-widest text-muted-foreground">{card.label}</span>
            <card.icon className={`w-4 h-4 ${card.color}`} />
          </div>
          <p className={`font-mono text-xl font-bold ${card.color}`}>{card.value}</p>
        </motion.div>
      ))}
    </div>
  );
}
