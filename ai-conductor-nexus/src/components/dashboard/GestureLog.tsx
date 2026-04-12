import { useAppStore } from '@/stores/useAppStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Hand, Mic, ArrowLeft, ArrowRight, Grip, RotateCw } from 'lucide-react';

const actionIcons: Record<string, React.ElementType> = {
  SWIPE_LEFT: ArrowLeft,
  SWIPE_RIGHT: ArrowRight,
  PUSH: Grip,
  ROTATE: RotateCw,
  // Thêm icon cho giọng nói nếu thích, hoặc mặc định dùng Mic
};

export function GestureLog() {
  const gestureLog = useAppStore((s) => s.gestureLog);

  return (
    <div className="glass neon-border rounded-xl p-4 lg:p-5 h-[320px] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-xs tracking-widest text-muted-foreground">
          COMMAND HISTORY // MULTIMODAL
        </h3>
        <div className="flex gap-2">
          <span className="flex items-center gap-1 font-mono text-[9px] text-primary"><Hand className="w-3 h-3"/> IMU</span>
          <span className="flex items-center gap-1 font-mono text-[9px] text-neon-purple"><Mic className="w-3 h-3"/> VOICE</span>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="space-y-2 pr-2">
          {gestureLog.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50 py-10">
              <Hand className="w-8 h-8 mb-2 animate-pulse" />
              <p className="font-mono text-xs">Đang chờ tín hiệu...</p>
            </div>
          ) : (
            gestureLog.map((entry) => {
              const isVoice = entry.source === 'VOICE';
              const SourceIcon = isVoice ? Mic : Hand;
              const colorClass = isVoice ? 'text-neon-purple' : 'text-primary';
              const bgClass = isVoice ? 'bg-neon-purple/10 border-neon-purple/20' : 'bg-primary/10 border-primary/20';

              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 font-mono text-xs py-2 px-3 rounded-lg border ${bgClass} animate-slide-in-left`}
                >
                  <span className="text-muted-foreground text-[10px] w-16">{entry.timestamp}</span>
                  
                  <div className={`p-1.5 rounded-md ${isVoice ? 'bg-neon-purple/20' : 'bg-primary/20'}`}>
                    <SourceIcon className={`w-3.5 h-3.5 ${colorClass}`} />
                  </div>
                  
                  <span className={`font-bold flex-1 ${colorClass}`}>{entry.command}</span>
                  
                  {/* Hiển thị % độ tự tin của AI */}
                  <span className="text-[10px] text-muted-foreground bg-background/50 px-2 py-0.5 rounded">
                    {entry.confidence}%
                  </span>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}