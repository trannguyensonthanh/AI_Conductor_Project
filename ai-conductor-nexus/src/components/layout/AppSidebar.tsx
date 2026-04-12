import { useAppStore, type AppMode } from '@/stores/useAppStore';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Box,
  Presentation,
  Gamepad2,
  Settings,
  Shield,
  Zap,
  User,
  Music,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppSidebar() {
  const { activeMode, setActiveMode, currentUser } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems: { label: string; mode: AppMode; icon: React.ElementType; path: string; adminOnly?: boolean }[] = [
    { label: 'Dashboard', mode: 'dashboard', icon: LayoutDashboard, path: '/' },
    { label: '3D Sandbox', mode: '3d-sandbox', icon: Box, path: '/sandbox' },
    { label: 'Presentation', mode: 'presentation', icon: Presentation, path: '/presentation' },
    { label: 'Media Player', mode: 'media', icon: Music, path: '/media' },
    { label: 'Game Arcade', mode: 'game', icon: Gamepad2, path: '/game' },
    { label: 'Profile', mode: 'settings', icon: User, path: '/profile' },
    ...(currentUser?.role === 'admin'
      ? [{ label: 'Admin', mode: 'admin' as AppMode, icon: Shield, path: '/admin' }]
      : []),
    { label: 'Settings', mode: 'settings', icon: Settings, path: '/settings' },
  ];

  const handleNav = (item: (typeof navItems)[0]) => {
    setActiveMode(item.mode);
    navigate(item.path);
  };

  return (
    <aside className="w-16 lg:w-56 h-screen glass-strong border-r border-border/50 flex flex-col shrink-0 transition-all duration-300">
      {/* Logo */}
      <div className="h-16 flex items-center gap-2 px-3 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-primary/20 neon-border flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <span className="hidden lg:block font-mono text-xs font-bold tracking-widest neon-text">
          AI CONDUCTOR
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => handleNav(item)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group',
                isActive
                  ? 'bg-primary/10 text-primary neon-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <item.icon className={cn('w-5 h-5 shrink-0', isActive && 'drop-shadow-[0_0_6px_hsl(185_100%_50%/0.6)]')} />
              <span className="hidden lg:block font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/50">
        <p className="hidden lg:block font-mono text-[10px] text-muted-foreground text-center">
          v0.2.0 // {currentUser?.role === 'admin' ? 'ADMIN' : 'USER'}
        </p>
      </div>
    </aside>
  );
}
