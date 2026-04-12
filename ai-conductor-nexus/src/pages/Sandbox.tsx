import { Canvas } from '@react-three/fiber';
import { useState } from 'react';
import { useAppStore, type SceneId } from '@/stores/useAppStore';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SolarSystem } from '@/components/sandbox/SolarSystem';
import { CyberpunkCar } from '@/components/sandbox/CyberpunkCar';
// import { CrystalCave } from '@/components/sandbox/CrystalCave';
import { UnderwaterWorld } from '@/components/sandbox/UnderwaterWorld';
import { RobotArm } from '@/components/sandbox/RobotArm';
import { CherryBlossom } from '@/components/sandbox/CherryBlossom';
import { AlertTriangle } from 'lucide-react';

const sceneOptions: { id: SceneId; name: string; icon: string }[] = [
  { id: 'SOLAR_SYSTEM', name: 'Solar System', icon: '🪐' },
  { id: 'NEON_CAR', name: 'Cyberpunk Car', icon: '🚗' },
  // { id: 'CRYSTAL_CAVE', name: 'Crystal Cave', icon: '💎' },
  { id: 'UNDERWATER', name: 'Underwater World', icon: '🐠' },
  { id: 'ROBOT_ARM', name: 'Robot Arm', icon: '🤖' },
  { id: 'CHERRY_BLOSSOM', name: 'Cherry Blossom', icon: '🌸' },
];

export default function Sandbox() {
  const { currentScene, setCurrentScene, isConnected } = useAppStore();
  const [autoRotate, setAutoRotate] = useState(true);
  const [carColor, setCarColor] = useState('#00f0ff');

  const cameraPos = (): [number, number, number] => {
    switch (currentScene) {
      case 'SOLAR_SYSTEM': return [0, 8, 15];
      case 'CRYSTAL_CAVE': return [0, 3, 8];
      case 'UNDERWATER': return [0, 2, 10];
      case 'ROBOT_ARM': return [3, 3, 5];
      case 'CHERRY_BLOSSOM': return [0, 4, 12];
      default: return [3, 3, 3];
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="h-full relative"
    >
      {!isConnected && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 glass rounded-lg px-4 py-2 flex items-center gap-2 border border-neon-red/30">
          <AlertTriangle className="w-4 h-4 text-neon-red" />
          <span className="font-mono text-xs text-neon-red">Connect Device for Gesture Control</span>
        </div>
      )}

      <div className="glass neon-border rounded-xl overflow-hidden h-[calc(100vh-8rem)]">
        <Canvas camera={{ position: cameraPos(), fov: 50 }} key={currentScene}>
          {currentScene === 'SOLAR_SYSTEM' && <SolarSystem />}
          {currentScene === 'NEON_CAR' && <CyberpunkCar color={carColor} autoRotate={autoRotate} />}
          {/* {currentScene === 'CRYSTAL_CAVE' && <CrystalCave />} */}
          {currentScene === 'UNDERWATER' && <UnderwaterWorld />}
          {currentScene === 'ROBOT_ARM' && <RobotArm />}
          {currentScene === 'CHERRY_BLOSSOM' && <CherryBlossom />}
        </Canvas>
      </div>

      {/* Scene selector */}
      <div className="absolute top-4 right-4 glass rounded-xl p-4 space-y-3 min-w-[200px] z-10">
        <h4 className="font-mono text-[10px] tracking-widest text-muted-foreground">SCENES</h4>
        {sceneOptions.map((s) => (
          <button
            key={s.id}
            onClick={() => setCurrentScene(s.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all font-mono',
              currentScene === s.id
                ? 'bg-primary/10 text-primary neon-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <span className="text-lg">{s.icon}</span>
            <span className="text-xs">{s.name}</span>
          </button>
        ))}

        {currentScene === 'NEON_CAR' && (
          <div className="pt-3 border-t border-border/50 space-y-3">
            <h4 className="font-mono text-[10px] tracking-widest text-muted-foreground">CONTROLS</h4>
            <div className="flex items-center justify-between">
              <Label className="font-mono text-xs">Auto-Rotate</Label>
              <Switch checked={autoRotate} onCheckedChange={setAutoRotate} />
            </div>
            <div className="space-y-1">
              <Label className="font-mono text-xs">Body Color</Label>
              <Input
                type="color"
                value={carColor}
                onChange={(e) => setCarColor(e.target.value)}
                className="h-8 p-1 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
