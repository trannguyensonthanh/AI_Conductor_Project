import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';

// ======================================================
// DIGITAL TWIN 3D — Mô hình bàn tay neon phản hồi IMU
// ======================================================

// Smoothed sensor values (lerp)
const smoothed = { rx: 0, ry: 0, rz: 0 };

function GloveHand() {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Points>(null);

  const sensorData = useAppStore((s) => s.sensorData);
  const lastGesture = useAppStore((s) => s.lastGesture);

  // Trail particles (position history)
  const trailCount = 60;
  const trailPositions = useMemo(() => new Float32Array(trailCount * 3), []);
  const trailGeom = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    return geom;
  }, [trailPositions]);

  // Gesture flash color
  const gestureColor = useMemo(() => {
    switch (lastGesture) {
      case 'SWIPE_LEFT': case 'SWIPE_RIGHT': return '#ff6b35';
      case 'SWIPE_UP': case 'SWIPE_DOWN': return '#35ff6b';
      case 'PUSH': return '#ff3565';
      case 'ROTATE': return '#ffcc00';
      default: return '#00f0ff';
    }
  }, [lastGesture]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // --- MAP IMU → 3D ROTATION ---
    // ax/ay/az = accelerometer (-20 ~ +20 m/s²) → map to radians
    // gx/gy/gz = gyroscope (rad/s) → thêm vận tốc quay
    const { ax, ay, az, gx, gy, gz } = sensorData;

    // Target rotation from accelerometer (tilt)
    const targetRx = Math.atan2(ay, Math.sqrt(ax * ax + az * az));
    const targetRy = Math.atan2(ax, Math.sqrt(ay * ay + az * az));
    const targetRz = Math.atan2(az, Math.sqrt(ax * ax + ay * ay)) * 0.5;

    // Smooth lerp (0.08 = responsive but not jittery)
    const lerpFactor = 1 - Math.pow(0.05, delta);
    smoothed.rx += (targetRx - smoothed.rx) * lerpFactor;
    smoothed.ry += (targetRy - smoothed.ry) * lerpFactor;
    smoothed.rz += (targetRz - smoothed.rz) * lerpFactor;

    // Gyroscope adds extra angular velocity for fast movements
    const gyroScale = 0.02;
    groupRef.current.rotation.x = smoothed.rx + gz * gyroScale;
    groupRef.current.rotation.y = smoothed.ry + gx * gyroScale;
    groupRef.current.rotation.z = smoothed.rz + gy * gyroScale;

    // --- GLOW PULSE based on motion energy ---
    if (glowRef.current) {
      const energy = Math.sqrt(gx * gx + gy * gy + gz * gz);
      const pulse = 1.0 + Math.sin(Date.now() * 0.003) * 0.1 + energy * 0.05;
      glowRef.current.scale.setScalar(pulse);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.08 + energy * 0.02;
    }

    // --- TRAIL UPDATE ---
    if (trailRef.current) {
      const positions = trailRef.current.geometry.attributes.position.array as Float32Array;
      // Shift all positions back by 1
      for (let i = (trailCount - 1) * 3; i >= 3; i -= 3) {
        positions[i] = positions[i - 3];
        positions[i + 1] = positions[i - 2];
        positions[i + 2] = positions[i - 1];
      }
      // Latest position = tip of middle finger in world space
      const tip = new THREE.Vector3(0, 1.8, 0);
      tip.applyQuaternion(groupRef.current.quaternion);
      positions[0] = tip.x;
      positions[1] = tip.y;
      positions[2] = tip.z;
      trailRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  const neonCyan = '#00f0ff';
  const neonPurple = '#a855f7';

  // Finger configs: [x, y, z, rotZ, length, radius]
  const fingers: [number, number, number, number, number, number][] = [
    [-0.55, 0.4, 0, 0.25, 0.6, 0.09],   // Thumb
    [-0.3, 0.85, 0, 0.05, 0.55, 0.07],   // Index
    [-0.1, 0.95, 0, 0, 0.6, 0.07],       // Middle
    [0.1, 0.9, 0, -0.03, 0.55, 0.07],    // Ring
    [0.28, 0.75, 0, -0.08, 0.45, 0.06],  // Pinky
  ];

  return (
    <>
      <group ref={groupRef}>
        {/* === PALM === */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.9, 1.0, 0.25, 2, 2, 2]} />
          <meshStandardMaterial
            color={gestureColor}
            emissive={gestureColor}
            emissiveIntensity={0.3}
            metalness={0.8}
            roughness={0.2}
            transparent
            opacity={0.9}
          />
        </mesh>

        {/* Palm wireframe overlay */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.92, 1.02, 0.27]} />
          <meshBasicMaterial color={neonCyan} wireframe transparent opacity={0.15} />
        </mesh>

        {/* === FINGERS === */}
        {fingers.map(([x, y, z, rotZ, length, radius], i) => (
          <group key={i} position={[x, y, z]} rotation={[0, 0, rotZ]}>
            {/* Base segment */}
            <mesh position={[0, length * 0.4, 0]}>
              <capsuleGeometry args={[radius, length * 0.5, 4, 8]} />
              <meshStandardMaterial
                color={neonCyan}
                emissive={neonCyan}
                emissiveIntensity={0.2}
                metalness={0.7}
                roughness={0.3}
                transparent
                opacity={0.85}
              />
            </mesh>
            {/* Tip segment */}
            <mesh position={[0, length * 0.9, 0]}>
              <capsuleGeometry args={[radius * 0.85, length * 0.35, 4, 8]} />
              <meshStandardMaterial
                color={neonPurple}
                emissive={neonPurple}
                emissiveIntensity={0.3}
                metalness={0.6}
                roughness={0.3}
                transparent
                opacity={0.85}
              />
            </mesh>
            {/* Joint ring */}
            <mesh position={[0, length * 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[radius * 1.2, 0.015, 8, 16]} />
              <meshBasicMaterial color={neonCyan} transparent opacity={0.5} />
            </mesh>
          </group>
        ))}

        {/* === WRIST BAND === */}
        <mesh position={[0, -0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.45, 0.06, 8, 24]} />
          <meshStandardMaterial
            color={neonCyan}
            emissive={neonCyan}
            emissiveIntensity={0.5}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>

        {/* === CIRCUIT LINES on palm === */}
        {[0.15, -0.15].map((y, i) => (
          <mesh key={`circuit-${i}`} position={[0, y, 0.13]}>
            <boxGeometry args={[0.6, 0.02, 0.01]} />
            <meshBasicMaterial color={neonCyan} transparent opacity={0.4} />
          </mesh>
        ))}
        <mesh position={[0.2, 0, 0.13]}>
          <boxGeometry args={[0.02, 0.35, 0.01]} />
          <meshBasicMaterial color={neonPurple} transparent opacity={0.4} />
        </mesh>

        {/* === SENSOR DOT (center of palm) === */}
        <mesh position={[0, 0.05, 0.14]}>
          <circleGeometry args={[0.08, 16]} />
          <meshBasicMaterial color={gestureColor} transparent opacity={0.7} />
        </mesh>
      </group>

      {/* === AMBIENT GLOW SPHERE === */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[2.2, 16, 16]} />
        <meshBasicMaterial color={neonCyan} transparent opacity={0.06} side={THREE.BackSide} />
      </mesh>

      {/* === MOTION TRAIL === */}
      <points ref={trailRef} geometry={trailGeom}>
        <pointsMaterial color={neonPurple} size={0.03} transparent opacity={0.4} sizeAttenuation />
      </points>
    </>
  );
}

// Grid floor for depth reference
function NeonGrid() {
  return (
    <gridHelper
      args={[6, 12, '#00f0ff', '#1a1a3e']}
      position={[0, -2, 0]}
      rotation={[0, 0, 0]}
    />
  );
}

// ======================================================
// EXPORTED COMPONENT
// ======================================================
export function DigitalTwin() {
  const lastGesture = useAppStore((s) => s.lastGesture);
  const sensorData = useAppStore((s) => s.sensorData);

  // Motion energy indicator
  const energy = Math.sqrt(
    sensorData.gx * sensorData.gx +
    sensorData.gy * sensorData.gy +
    sensorData.gz * sensorData.gz
  );
  const energyLabel = energy < 0.5 ? 'IDLE' : energy < 2 ? 'MOVING' : 'ACTIVE';
  const energyColor = energy < 0.5 ? 'text-muted-foreground' : energy < 2 ? 'text-neon-green' : 'text-primary';

  return (
    <div className="glass neon-border rounded-xl p-4 lg:p-5">
      {/* Header with live indicators */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-xs tracking-widest text-muted-foreground">
          DIGITAL TWIN // LIVE 3D
        </h3>
        <div className="flex items-center gap-3">
          {/* Motion energy badge */}
          <span className={`font-mono text-[10px] tracking-wider ${energyColor}`}>
            ⚡ {energyLabel}
          </span>
          {/* Gesture badge */}
          {lastGesture !== 'NONE' && (
            <span className="font-mono text-[10px] tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/30 animate-pulse">
              🎯 {lastGesture}
            </span>
          )}
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="h-[280px] rounded-lg overflow-hidden bg-background/50 relative">
        <Canvas camera={{ position: [0, 0.5, 4], fov: 45 }}>
          <ambientLight intensity={0.15} />
          <pointLight position={[3, 4, 3]} intensity={0.6} color="#00f0ff" />
          <pointLight position={[-3, 2, -2]} intensity={0.4} color="#a855f7" />
          <pointLight position={[0, -2, 3]} intensity={0.3} color="#ff6b35" />
          <GloveHand />
          <NeonGrid />
        </Canvas>

        {/* Overlay sensor readout */}
        <div className="absolute bottom-2 left-2 font-mono text-[9px] text-muted-foreground/60 space-y-0.5">
          <div>AX:{sensorData.ax.toFixed(1)} AY:{sensorData.ay.toFixed(1)} AZ:{sensorData.az.toFixed(1)}</div>
          <div>GX:{sensorData.gx.toFixed(1)} GY:{sensorData.gy.toFixed(1)} GZ:{sensorData.gz.toFixed(1)}</div>
        </div>

        {/* Connection indicator dot */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${energy > 0.1 ? 'bg-neon-green pulse-green' : 'bg-muted-foreground/30'}`} />
          <span className="font-mono text-[9px] text-muted-foreground/50">
            {energy > 0.1 ? 'LIVE' : 'STANDBY'}
          </span>
        </div>
      </div>
    </div>
  );
}
