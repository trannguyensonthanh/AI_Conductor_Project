import { useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, Shield, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function UserProfile() {
  const { currentUser, updateUser } = useAppStore();
  const [displayName, setDisplayName] = useState(currentUser?.displayName ?? '');
  const [email, setEmail] = useState(currentUser?.email ?? '');

  if (!currentUser) return null;

  const handleSave = () => {
    updateUser(currentUser.id, { displayName, email });
    toast({ title: 'Đã lưu', description: 'Thông tin cá nhân đã được cập nhật.' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div className="flex items-center gap-3">
        <User className="w-6 h-6 text-primary" />
        <h2 className="font-mono text-xl font-bold neon-text tracking-widest">THÔNG TIN CÁ NHÂN</h2>
      </div>

      {/* Avatar & role */}
      <div className="glass neon-border rounded-xl p-6 flex items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 neon-border flex items-center justify-center text-4xl">
          {currentUser.avatar}
        </div>
        <div className="space-y-1">
          <h3 className="font-mono text-lg font-bold text-foreground">{currentUser.displayName}</h3>
          <p className="font-mono text-xs text-muted-foreground">@{currentUser.username}</p>
          <Badge variant={currentUser.role === 'admin' ? 'default' : 'secondary'} className="font-mono text-[10px]">
            <Shield className="w-3 h-3 mr-1" />
            {currentUser.role.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Edit form */}
      <div className="glass neon-border rounded-xl p-6 space-y-5">
        <h3 className="font-mono text-xs tracking-widest text-muted-foreground">CHỈNH SỬA THÔNG TIN</h3>

        <div className="space-y-2">
          <Label className="font-mono text-xs">Tên hiển thị</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="font-mono" />
        </div>

        <div className="space-y-2">
          <Label className="font-mono text-xs">Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} className="font-mono" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="font-mono text-[10px] text-muted-foreground">NGÀY TẠO</Label>
            <p className="font-mono text-xs flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> {currentUser.createdAt}
            </p>
          </div>
          <div className="space-y-1">
            <Label className="font-mono text-[10px] text-muted-foreground">ĐĂNG NHẬP GẦN NHẤT</Label>
            <p className="font-mono text-xs flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> {currentUser.lastLogin}
            </p>
          </div>
        </div>

        <Button onClick={handleSave} className="font-mono gap-2">
          <Save className="w-4 h-4" /> LƯU THAY ĐỔI
        </Button>
      </div>
    </motion.div>
  );
}
