import { useAppStore } from '@/stores/useAppStore';
import { useNavigate } from 'react-router-dom';
import { Wifi, WifiOff, Sun, Moon, LogOut, User, MousePointer2, Mic, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AppHeader() {
  const { isConnected, toggleConnection, lastGesture, lastVoiceCommand, currentUser, logout, theme, setTheme } = useAppStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const { isMpuCursorActive, toggleMpuCursor } = useAppStore();

  return (
    <header className="h-14 glass-strong border-b border-border/50 flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="font-mono text-sm lg:text-base font-bold tracking-[0.2em] neon-text">
          AI CONDUCTOR
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* HIỂN THỊ CỬ CHỈ TAY */}
        <div className="hidden md:flex items-center gap-2 font-mono text-xs text-muted-foreground border-r border-border/50 pr-4">
          <Hand className="w-3.5 h-3.5 text-primary" />
          <span>TAY:</span>
          <span className="text-primary font-bold">{lastGesture}</span>
        </div>

        {/* HIỂN THỊ LỆNH GIỌNG NÓI */}
        <div className="hidden md:flex items-center gap-2 font-mono text-xs text-muted-foreground border-r border-border/50 pr-4">
          <Mic className="w-3.5 h-3.5 text-neon-purple" />
          <span>MIỆNG:</span>
          <span className="text-neon-purple font-bold">{lastVoiceCommand}</span>
        </div>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-muted-foreground" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
        </Button>

        {/* MPU Cursor toggle */}
        <Button
          variant={isMpuCursorActive ? 'default' : 'ghost'}
          size="icon"
          className={`w-8 h-8 ${isMpuCursorActive ? 'bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30' : ''}`}
          onClick={toggleMpuCursor}
          title="Bật/Tắt con trỏ MPU6050"
        >
          <MousePointer2 className="w-4 h-4" />
        </Button>

        {/* Connection status */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleConnection}
          className="flex items-center gap-2 font-mono text-xs hover:bg-muted/50"
        >
          <div className="relative">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-neon-green pulse-green' : 'bg-neon-red pulse-red'
              }`}
            />
          </div>
          {isConnected ? (
            <Wifi className="w-3.5 h-3.5 text-neon-green" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-neon-red" />
          )}
          <span className={`hidden lg:inline ${isConnected ? 'text-neon-green' : 'text-neon-red'}`}>
            ESP32: {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </Button>

        {/* User info */}
        {currentUser && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 font-mono text-xs"
            >
              <span className="text-base">{currentUser.avatar}</span>
              <span className="hidden lg:inline text-foreground">{currentUser.displayName}</span>
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={handleLogout}>
              <LogOut className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
