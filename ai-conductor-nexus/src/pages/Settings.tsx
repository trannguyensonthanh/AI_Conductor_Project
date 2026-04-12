import { useAppStore } from '@/stores/useAppStore';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

export default function SettingsPage() {
  const { isConnected, toggleConnection, theme, setTheme } = useAppStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <h2 className="font-mono text-xl font-bold neon-text tracking-widest">SETTINGS</h2>

      {/* Theme */}
      <div className="glass neon-border rounded-xl p-6 space-y-4">
        <h3 className="font-mono text-xs tracking-widest text-muted-foreground">GIAO DIỆN</h3>
        <div className="flex items-center justify-between">
          <Label className="font-mono text-sm flex items-center gap-2">
            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            Chế độ {theme === 'dark' ? 'Tối' : 'Sáng'}
          </Label>
          <Switch
            checked={theme === 'light'}
            onCheckedChange={(checked) => setTheme(checked ? 'light' : 'dark')}
          />
        </div>
      </div>

      <div className="glass neon-border rounded-xl p-6 space-y-6">
        <h3 className="font-mono text-xs tracking-widest text-muted-foreground">CONNECTION</h3>

        <div className="flex items-center justify-between">
          <Label className="font-mono text-sm">ESP32 Connection</Label>
          <Switch checked={isConnected} onCheckedChange={toggleConnection} />
        </div>

        <div className="space-y-2">
          <Label className="font-mono text-xs text-muted-foreground">Sensor Sensitivity</Label>
          <Slider defaultValue={[50]} max={100} step={1} />
        </div>

        <div className="space-y-2">
          <Label className="font-mono text-xs text-muted-foreground">Gesture Threshold</Label>
          <Slider defaultValue={[70]} max={100} step={1} />
        </div>
      </div>

      <div className="glass neon-border rounded-xl p-6 space-y-4">
        <h3 className="font-mono text-xs tracking-widest text-muted-foreground">ABOUT</h3>
        <div className="font-mono text-xs text-muted-foreground space-y-1">
          <p>AI Conductor // Prototype v0.2.0</p>
          <p>Human-Computer Interaction via Gesture Recognition</p>
          <p>ESP32 + MPU6050 + TensorFlow Lite</p>
        </div>
      </div>
    </motion.div>
  );
}
