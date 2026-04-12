import { useState } from 'react';
import { useAppStore, type SceneEntry, type UserAccount } from '@/stores/useAppStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { Shield, Upload, Users, Box, UserPlus, Trash2, Ban, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function AdminPage() {
  const { scenesList, addScene, users, addUser, updateUser, deleteUser } = useAppStore();

  // Upload model
  const [showUpload, setShowUpload] = useState(false);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('');

  // Add user
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');

  const handleUpload = () => {
    if (!formName || !formType) return;
    const newScene: SceneEntry = {
      id: formName.toUpperCase().replace(/\s+/g, '_'),
      name: formName,
      type: formType,
      icon: '📦',
      status: 'draft',
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    addScene(newScene);
    toast({ title: 'Model Uploaded', description: `"${formName}" đã thêm thành công.` });
    setFormName('');
    setFormType('');
    setShowUpload(false);
  };

  const handleAddUser = () => {
    if (!newUsername || !newPassword || !newDisplayName) return;
    const user: UserAccount = {
      id: `user-${Date.now()}`,
      username: newUsername,
      password: newPassword,
      role: newRole,
      displayName: newDisplayName,
      email: newEmail,
      avatar: newRole === 'admin' ? '🛡️' : '👤',
      createdAt: new Date().toISOString().split('T')[0],
      lastLogin: '-',
      status: 'active',
    };
    addUser(user);
    toast({ title: 'Thành công', description: `Tài khoản "${newUsername}" đã được tạo.` });
    setNewUsername('');
    setNewPassword('');
    setNewDisplayName('');
    setNewEmail('');
    setNewRole('user');
    setShowAddUser(false);
  };

  const toggleUserStatus = (id: string, current: string) => {
    updateUser(id, { status: current === 'active' ? 'suspended' : 'active' });
    toast({ title: 'Đã cập nhật', description: `Trạng thái tài khoản đã thay đổi.` });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-primary" />
        <h2 className="font-mono text-xl font-bold neon-text tracking-widest">ADMIN PANEL</h2>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="glass font-mono">
          <TabsTrigger value="users" className="font-mono gap-2"><Users className="w-4 h-4" /> Tài khoản</TabsTrigger>
          <TabsTrigger value="assets" className="font-mono gap-2"><Box className="w-4 h-4" /> 3D Assets</TabsTrigger>
        </TabsList>

        {/* USERS TAB */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowAddUser(true)} className="font-mono gap-2">
              <UserPlus className="w-4 h-4" /> Thêm tài khoản
            </Button>
          </div>

          <div className="glass neon-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-xs">AVATAR</TableHead>
                  <TableHead className="font-mono text-xs">USERNAME</TableHead>
                  <TableHead className="font-mono text-xs">TÊN</TableHead>
                  <TableHead className="font-mono text-xs">EMAIL</TableHead>
                  <TableHead className="font-mono text-xs">ROLE</TableHead>
                  <TableHead className="font-mono text-xs">TRẠNG THÁI</TableHead>
                  <TableHead className="font-mono text-xs">HÀNH ĐỘNG</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="text-xl">{u.avatar}</TableCell>
                    <TableCell className="font-mono text-xs">{u.username}</TableCell>
                    <TableCell className="font-mono text-sm">{u.displayName}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="font-mono text-[10px]">
                        {u.role.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.status === 'active' ? 'default' : 'destructive'} className="font-mono text-[10px]">
                        {u.status === 'active' ? 'ACTIVE' : 'SUSPENDED'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7"
                          onClick={() => toggleUserStatus(u.id, u.status)}
                        >
                          {u.status === 'active' ? <Ban className="w-3.5 h-3.5 text-neon-red" /> : <CheckCircle className="w-3.5 h-3.5 text-neon-green" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7"
                          onClick={() => {
                            deleteUser(u.id);
                            toast({ title: 'Đã xóa', description: `Tài khoản "${u.username}" đã bị xóa.` });
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-neon-red" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ASSETS TAB */}
        <TabsContent value="assets" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowUpload(true)} className="font-mono gap-2">
              <Upload className="w-4 h-4" /> Upload New Model
            </Button>
          </div>

          <div className="glass neon-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-xs">ID</TableHead>
                  <TableHead className="font-mono text-xs">NAME</TableHead>
                  <TableHead className="font-mono text-xs">TYPE</TableHead>
                  <TableHead className="font-mono text-xs">STATUS</TableHead>
                  <TableHead className="font-mono text-xs">UPDATED</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scenesList.map((scene) => (
                  <TableRow key={scene.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{scene.id}</TableCell>
                    <TableCell className="font-mono text-sm">
                      <span className="mr-2">{scene.icon}</span>{scene.name}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{scene.type}</TableCell>
                    <TableCell>
                      <Badge variant={scene.status === 'active' ? 'default' : 'secondary'} className="font-mono text-[10px]">
                        {scene.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{scene.lastUpdated}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Upload Model Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="glass border-border/50">
          <DialogHeader>
            <DialogTitle className="font-mono neon-text">Upload New Model</DialogTitle>
            <DialogDescription className="font-mono text-xs">Thêm 3D asset vào thư viện.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-mono text-xs">Model Name</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Space Station" className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs">Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="font-mono"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Environment">Environment</SelectItem>
                  <SelectItem value="Showroom">Showroom</SelectItem>
                  <SelectItem value="Interactive">Interactive</SelectItem>
                  <SelectItem value="Static">Static</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs">Model File</Label>
              <Input type="file" accept=".glb,.gltf,.obj" className="font-mono" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)} className="font-mono">Cancel</Button>
            <Button onClick={handleUpload} disabled={!formName || !formType} className="font-mono">Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="glass border-border/50">
          <DialogHeader>
            <DialogTitle className="font-mono neon-text">Thêm tài khoản mới</DialogTitle>
            <DialogDescription className="font-mono text-xs">Tạo tài khoản user hoặc admin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-mono text-xs">Username</Label>
              <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs">Password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs">Tên hiển thị</Label>
              <Input value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs">Email</Label>
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs">Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as 'user' | 'admin')}>
                <SelectTrigger className="font-mono"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUser(false)} className="font-mono">Hủy</Button>
            <Button onClick={handleAddUser} disabled={!newUsername || !newPassword || !newDisplayName} className="font-mono">Tạo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
