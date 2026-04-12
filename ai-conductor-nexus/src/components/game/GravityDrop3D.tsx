import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, Float, Text, OrbitControls } from '@react-three/drei';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/stores/useAppStore';
import * as THREE from 'three';

interface Platform {
  id: number;
  x: number;
  z: number;
  y: number;
  w: number;
  d: number;
  color: string;
  collected: boolean;
}

function Player({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 2;
    }
  });
  return (
    <group position={position}>
      <mesh ref={ref}>
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={1.5} />
      </mesh>
      <pointLight color="#00f0ff" intensity={1} distance={3} />
    </group>
  );
}

function PlatformMesh({ platform }: { platform: Platform }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current && !platform.collected) {
      ref.current.position.y = platform.y + Math.sin(clock.getElapsedTime() * 0.5 + platform.x) * 0.1;
    }
  });

  return (
    <mesh ref={ref} position={[platform.x, platform.y, platform.z]}>
      <boxGeometry args={[platform.w, 0.15, platform.d]} />
      <meshStandardMaterial
        color={platform.collected ? '#333' : platform.color}
        emissive={platform.collected ? '#111' : platform.color}
        emissiveIntensity={platform.collected ? 0 : 0.5}
        metalness={0.7}
        roughness={0.3}
      />
    </mesh>
  );
}

function Coin({ position, collected }: { position: [number, number, number]; collected: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current && !collected) {
      ref.current.rotation.y = clock.getElapsedTime() * 3;
    }
  });
  if (collected) return null;
  return (
    <Float speed={2} floatIntensity={0.3}>
      <mesh ref={ref} position={position}>
        <cylinderGeometry args={[0.15, 0.15, 0.04, 16]} />
        <meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={2} metalness={0.9} />
      </mesh>
      <pointLight position={position} color="#ffaa00" intensity={0.3} distance={2} />
    </Float>
  );
}

function GameScene({ gameState, onScore, onGameOver, volume }: {
  gameState: 'idle' | 'playing' | 'over';
  onScore: () => void;
  onGameOver: () => void;
  volume: number;
}) {
  const sensorData = useAppStore((s) => s.sensorData);
  const playerPos = useRef(new THREE.Vector3(0, 5, 0));
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const platforms = useRef<Platform[]>([]);
  const { camera } = useThree();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const platformIdRef = useRef(0);

  const initPlatforms = useCallback(() => {
    const p: Platform[] = [];
    for (let i = 0; i < 30; i++) {
      p.push({
        id: platformIdRef.current++,
        x: (Math.random() - 0.5) * 6,
        z: (Math.random() - 0.5) * 6,
        y: -i * 2,
        w: 1.5 + Math.random() * 1.5,
        d: 1.5 + Math.random() * 1.5,
        color: ['#a855f7', '#00f0ff', '#ff44aa', '#44ff88', '#ffaa00'][i % 5],
        collected: false,
      });
    }
    return p;
  }, []);

  useEffect(() => {
    if (gameState === 'playing') {
      playerPos.current.set(0, 5, 0);
      velocity.current.set(0, 0, 0);
      platforms.current = initPlatforms();
      audioCtxRef.current = new AudioContext();
    }
  }, [gameState, initPlatforms]);

  const playSound = useCallback((freq: number) => {
    if (!audioCtxRef.current || volume === 0) return;
    const osc = audioCtxRef.current.createOscillator();
    const gain = audioCtxRef.current.createGain();
    osc.connect(gain);
    gain.connect(audioCtxRef.current.destination);
    osc.frequency.value = freq;
    gain.gain.value = volume / 400;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.15);
    osc.stop(audioCtxRef.current.currentTime + 0.15);
  }, [volume]);

  useFrame((_, delta) => {
    if (gameState !== 'playing') return;
    const d = Math.min(delta, 0.05);

    // Sensor/gravity
    velocity.current.x += sensorData.ax * 0.3;
    velocity.current.z += sensorData.ay * 0.3;
    velocity.current.y -= 9.8 * d;

    // Damping
    velocity.current.x *= 0.95;
    velocity.current.z *= 0.95;

    playerPos.current.add(velocity.current.clone().multiplyScalar(d));

    // Bounds
    playerPos.current.x = THREE.MathUtils.clamp(playerPos.current.x, -5, 5);
    playerPos.current.z = THREE.MathUtils.clamp(playerPos.current.z, -5, 5);

    // Platform collision (only when falling)
    if (velocity.current.y < 0) {
      for (const p of platforms.current) {
        if (p.collected) continue;
        const onX = Math.abs(playerPos.current.x - p.x) < p.w / 2;
        const onZ = Math.abs(playerPos.current.z - p.z) < p.d / 2;
        const onY = playerPos.current.y <= p.y + 0.4 && playerPos.current.y >= p.y - 0.2;
        if (onX && onZ && onY) {
          velocity.current.y = 8; // bounce up
          p.collected = true;
          onScore();
          playSound(600 + Math.random() * 400);
          break;
        }
      }
    }

    // Death
    if (playerPos.current.y < -65) {
      onGameOver();
      return;
    }

    // Camera follow
    camera.position.lerp(
      new THREE.Vector3(playerPos.current.x, playerPos.current.y + 6, playerPos.current.z + 8),
      0.05
    );
    camera.lookAt(playerPos.current);
  });

  if (gameState !== 'playing') return null;

  return (
    <>
      <Stars radius={80} count={3000} factor={4} />
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 10, 5]} intensity={0.5} color="#a855f7" />

      <Player position={playerPos.current.toArray() as [number, number, number]} />
      
      {platforms.current.map((p) => (
        <PlatformMesh key={p.id} platform={p} />
      ))}
      {platforms.current.filter(p => !p.collected).map((p) => (
        <Coin key={`c-${p.id}`} position={[p.x, p.y + 0.5, p.z]} collected={p.collected} />
      ))}
    </>
  );
}

export function GravityDrop3D({ onBack }: { onBack: () => void }) {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle');
  const [score, setScore] = useState(0);
  const [volume, setVolume] = useState(50);

  const handleScore = useCallback(() => setScore(s => s + 1), []);
  const handleGameOver = useCallback(() => setGameState('over'), []);
  const startGame = useCallback(() => { setScore(0); setGameState('playing'); }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
      <div className="flex items-center justify-between w-full max-w-[700px]">
        <Button variant="ghost" size="sm" onClick={onBack} className="font-mono text-xs gap-2">
          <ArrowLeft className="w-4 h-4" /> BACK TO ARCADE
        </Button>
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm text-primary">Score: {score}</span>
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <Slider value={[volume]} max={100} step={1} onValueChange={(v) => setVolume(v[0])} className="w-24" />
          </div>
        </div>
      </div>
      <div className="glass neon-border rounded-xl overflow-hidden relative" style={{ width: 680, height: 500 }}>
        <Canvas camera={{ position: [0, 10, 12], fov: 55 }}>
          <GameScene gameState={gameState} onScore={handleScore} onGameOver={handleGameOver} volume={volume} />
          {gameState === 'idle' && (
            <>
              <Stars radius={80} count={3000} factor={4} />
              <ambientLight intensity={0.3} />
            </>
          )}
        </Canvas>

        <AnimatePresence>
          {gameState === 'idle' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 z-10">
              <h2 className="text-2xl font-bold neon-text mb-2 font-mono">🌀 GRAVITY DROP 3D</h2>
              <p className="text-sm text-muted-foreground mb-1 font-mono">Nghiêng MPU6050 để di chuyển trong không gian 3D</p>
              <p className="text-xs text-muted-foreground mb-4 font-mono">Nhảy lên các platform để ghi điểm</p>
              <Button onClick={startGame} className="font-mono">START</Button>
            </motion.div>
          )}
          {gameState === 'over' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 z-10">
              <h2 className="text-2xl font-bold text-neon-red mb-2 font-mono">GAME OVER</h2>
              <p className="text-lg neon-text mb-4 font-mono">Score: {score}</p>
              <Button onClick={startGame} className="font-mono">RETRY</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
