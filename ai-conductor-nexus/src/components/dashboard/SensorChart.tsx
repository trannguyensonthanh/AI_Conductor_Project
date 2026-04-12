import { useAppStore } from '@/stores/useAppStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

export function SensorChart() {
  const sensorHistory = useAppStore((s) => s.sensorHistory);

  return (
    <div className="glass neon-border rounded-xl p-4 lg:p-5 h-[320px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono text-xs tracking-widest text-muted-foreground">
          LIVE ACCELEROMETER DATA
        </h3>
        <div className="flex gap-3 font-mono text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary" /> AX
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-neon-purple" /> AY
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-neon-green" /> AZ
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={sensorHistory}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 30% 16%)" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: 'hsl(215 15% 50%)' }}
            stroke="hsl(220 30% 16%)"
            interval="preserveStartEnd"
            minTickGap={20}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'hsl(215 15% 50%)' }}
            stroke="hsl(220 30% 16%)"
            // 🔥 NÂNG CẤP: Biên độ [-15, 15] để khi user vung tay mạnh (Push, Swipe) không bị mất đỉnh đồ thị
            domain={[-15, 15]} 
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(220 40% 8% / 0.95)',
              border: '1px solid hsl(185 100% 50% / 0.3)',
              borderRadius: '8px',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono',
            }}
            animationDuration={100} // Giảm độ trễ Tooltip
          />
          {/* isAnimationActive={false} là chìa khoá để đồ thị không bị giật lag */}
          <Line type="monotone" dataKey="ax" stroke="hsl(185 100% 50%)" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="ay" stroke="hsl(270 100% 65%)" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="az" stroke="hsl(142 76% 50%)" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}