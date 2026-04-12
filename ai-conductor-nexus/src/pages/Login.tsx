import { useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { Zap, LogIn, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const login = useAppStore((s) => s.login);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast({ title: 'Error', description: 'Vui lòng nhập đầy đủ thông tin.', variant: 'destructive' });
      return;
    }
    const success = login(username.trim(), password.trim());
    if (!success) {
      toast({ title: 'Đăng nhập thất bại', description: 'Sai tên đăng nhập hoặc mật khẩu.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background grid-bg relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="glass neon-border rounded-2xl p-8 w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 neon-border flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-mono text-2xl font-bold neon-text tracking-widest">AI CONDUCTOR</h1>
          <p className="font-mono text-xs text-muted-foreground mt-2">HCI CONTROL INTERFACE // LOGIN</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label className="font-mono text-xs tracking-wider text-muted-foreground">USERNAME</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập"
              className="font-mono bg-muted/30 border-border/50 focus:border-primary"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-xs tracking-wider text-muted-foreground">PASSWORD</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="font-mono bg-muted/30 border-border/50 focus:border-primary pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full font-mono gap-2 h-11">
            <LogIn className="w-4 h-4" /> ĐĂNG NHẬP
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-border/30">
          <p className="font-mono text-[10px] text-muted-foreground text-center space-y-1">
            <span className="block">Demo: admin/admin (Admin) • user/user (User)</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
