import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Float, Sparkles, MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';
import { SensorRig } from './SensorRig';

/* ── Large Crystal with layered glow ── */
function Crystal({ position, scale, color, rotSpeed }: {
  position: [number, number, number];
  scale: number;
  color: string;
  rotSpeed: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.y = t * rotSpeed;
    ref.current.position.y = position[1] + Math.sin(t * 0.5 + position[0]) * 0.15;
    if (innerRef.current) {
      (innerRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2 + Math.sin(t * 2 + position[0] * 2) * 0.6;
    }
    if (outerRef.current) {
      (outerRef.current.material as THREE.MeshBasicMaterial).opacity = 0.08 + Math.sin(t * 1.5 + position[2]) * 0.03;
    }
  });

  return (
    <Float speed={0.6} rotationIntensity={0.1} floatIntensity={0.15}>
      <group ref={ref} position={position}>
        {/* Premium Crystal Body - Refractive */}
        <mesh scale={scale}>
          <octahedronGeometry args={[1, 0]} />
          <meshPhysicalMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.2}
            roughness={0.05}
            metalness={0.1}
            transmission={0.95} // Glass-like refraction
            ior={1.75}          // Index of refraction
            thickness={scale * 1.5}
            clearcoat={1}
            clearcoatRoughness={0.1}
          />
        </mesh>

        {/* Inner core intense glow */}
        <mesh ref={innerRef} scale={scale * 0.4}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>

        {/* Outer ethereal aura */}
        <mesh ref={outerRef} scale={scale * 1.4}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={color} transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>

        {/* Dynamic Light source */}
        <pointLight color={color} intensity={2.5} distance={10} decay={1.5} />
      </group>
    </Float>
  );
}

/* ── Small crystal cluster (environment detail) ── */
function CrystalCluster({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      {[0, 0.4, -0.3, 0.2].map((offset, i) => (
        <mesh key={i} position={[offset * (i % 2 === 0 ? 1 : -1), i * 0.15, offset * 0.5]} scale={0.12 + i * 0.04} rotation={[0.2 * i, 0.5 * i, 0.1 * i]}>
          <octahedronGeometry args={[1, 0]} />
          <meshPhysicalMaterial 
            color={color} 
            emissive={color} 
            emissiveIntensity={0.4} 
            roughness={0.1} 
            transmission={0.9} 
            thickness={0.5} 
            clearcoat={1} 
          />
        </mesh>
      ))}
      <pointLight color={color} intensity={1.5} distance={5} />
    </group>
  );
}

/* ── Floating glow orb ── */
function GlowOrb({ position, color }: { position: [number, number, number]; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.position.y = position[1] + Math.sin(t * 2 + position[0] * 3) * 0.6;
    ref.current.position.x = position[0] + Math.cos(t * 1.5 + position[2]) * 0.5;
    ref.current.position.z = position[2] + Math.sin(t * 1.2) * 0.4;
  });

  return (
    <group>
      <mesh ref={ref} position={position}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ref} position={position} scale={2}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ── Stalactites & Stalagmites ── */
function RockFormation({ position, height, color, flip }: {
  position: [number, number, number];
  height: number;
  color: string;
  flip?: boolean;
}) {
  return (
    <group position={position} rotation={flip ? [Math.PI, 0, 0] : [0, 0, 0]}>
      <mesh>
        <coneGeometry args={[0.35, height, 6]} />
        <meshStandardMaterial color={color} roughness={0.95} flatShading />
      </mesh>
      {/* Crystal tip */}
      <mesh position={[0, height * 0.4, 0]} scale={0.08}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.8} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

/* ── Cave environment ── */
function CaveEnvironment() {
  const stalactites = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      pos: [(Math.random() - 0.5) * 20, 7 - Math.random() * 0.3, (Math.random() - 0.5) * 20] as [number, number, number],
      h: 0.6 + Math.random() * 2,
      color: `hsl(${270 + Math.random() * 30}, 40%, ${15 + Math.random() * 10}%)`,
    })), []);

  const stalagmites = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      pos: [(Math.random() - 0.5) * 18, -2.5, (Math.random() - 0.5) * 18] as [number, number, number],
      h: 0.4 + Math.random() * 1.2,
      color: `hsl(${260 + Math.random() * 40}, 35%, ${12 + Math.random() * 8}%)`,
    })), []);

  return (
    <group>
      {/* Floor with subtle texture */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#08021a" roughness={0.9} />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 9, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#050110" roughness={0.95} />
      </mesh>

      {/* Back walls for enclosure feel */}
      <mesh position={[0, 2, -15]} rotation={[0, 0, 0]}>
        <planeGeometry args={[80, 20]} />
        <meshStandardMaterial color="#030008" roughness={0.95} />
      </mesh>

      {stalactites.map((s, i) => (
        <RockFormation key={`st-${i}`} position={s.pos} height={s.h} color={s.color} flip />
      ))}
      {stalagmites.map((s, i) => (
        <RockFormation key={`sg-${i}`} position={s.pos} height={s.h} color={s.color} />
      ))}
    </group>
  );
}

/* ── High-end Reflective water pool ── */
function WaterPool() {
  return (
    <group position={[0, -2.48, 2]}>
      {/* Pool water plane with gorgeous reflections */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[5, 64]} />
        <MeshReflectorMaterial
          mirror={0.8}
          blur={[300, 100]}
          resolution={1024}
          mixBlur={1.5}
          mixStrength={50}
          roughness={0.4}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#050215"
          metalness={0.9}
        />
      </mesh>
      {/* Pool rocky border */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <torusGeometry args={[5, 0.3, 8, 32]} />
        <meshStandardMaterial color="#0a0318" roughness={0.9} flatShading />
      </mesh>
      {/* Underwater mysterious glow */}
      <pointLight position={[0, -1, 0]} color="#4488ff" intensity={3.5} distance={15} />
    </group>
  );
}

/* ── Main Export ── */
export function CrystalCave() {
  const groupRef = useRef<THREE.Group>(null);


  const crystals = useMemo(() => [
    { pos: [-3, 0.5, -2] as [number, number, number], scale: 1.0, color: '#a855f7', rot: 0.3 },
    { pos: [2.5, 1.0, -3] as [number, number, number], scale: 1.6, color: '#00f0ff', rot: -0.2 },
    { pos: [-1, 1.8, 1] as [number, number, number], scale: 0.8, color: '#ff44aa', rot: 0.5 },
    { pos: [3.5, 0.2, 1.5] as [number, number, number], scale: 1.2, color: '#44ff88', rot: -0.4 },
    { pos: [0, 1.5, -5] as [number, number, number], scale: 2.0, color: '#ffaa00', rot: 0.12 },
    { pos: [-4.5, 0.8, 2.5] as [number, number, number], scale: 0.9, color: '#ff6644', rot: 0.35 },
    { pos: [1.5, -0.2, 3.5] as [number, number, number], scale: 1.1, color: '#4488ff', rot: -0.25 },
    { pos: [-2, 2.2, -1] as [number, number, number], scale: 0.7, color: '#ff00ff', rot: 0.6 },
    { pos: [4, 1.3, -1] as [number, number, number], scale: 0.6, color: '#00ffaa', rot: -0.3 },
    { pos: [-3.5, -0.3, -4] as [number, number, number], scale: 1.4, color: '#ff88ff', rot: 0.2 },
    { pos: [0, -1, 6] as [number, number, number], scale: 0.5, color: '#88aaff', rot: 0.45 },
    { pos: [5, 0, -4] as [number, number, number], scale: 0.8, color: '#ffff44', rot: -0.15 },
  ], []);

  const clusters = useMemo(() => [
    { pos: [-6, -2.3, -5] as [number, number, number], color: '#a855f7' },
    { pos: [5, -2.3, 4] as [number, number, number], color: '#00f0ff' },
    { pos: [-3, -2.3, 5] as [number, number, number], color: '#ff44aa' },
    { pos: [7, -2.3, -2] as [number, number, number], color: '#44ff88' },
    { pos: [-7, -2.3, 0] as [number, number, number], color: '#ffaa00' },
    { pos: [2, -2.3, -6] as [number, number, number], color: '#ff00ff' },
  ], []);

  const orbs = useMemo(() =>
    Array.from({ length: 70 }, (_, i) => ({
      pos: [(Math.random() - 0.5) * 16, Math.random() * 6 - 1, (Math.random() - 0.5) * 16] as [number, number, number],
      color: ['#a855f7', '#00f0ff', '#ff44aa', '#44ff88', '#ffaa00', '#ff00ff', '#4488ff'][i % 7],
    })), []);

  return (
    <>
      <color attach="background" args={['#030010']} />
      <Stars radius={60} depth={40} count={3000} factor={3} saturation={0.9} />
      <fog attach="fog" args={['#030010', 8, 30]} />

      {/* Ambient & colored lights */}
      <ambientLight intensity={0.2} color="#ffffff" />
      <directionalLight position={[5, 10, 5]} intensity={1.5} color="#88aaff" />
      <pointLight position={[0, 6, 0]} intensity={3.0} color="#a855f7" distance={40} decay={1.5} />
      <pointLight position={[-4, 3, -3]} intensity={3.5} color="#00f0ff" distance={30} decay={1.5} />
      <pointLight position={[4, 3, 3]} intensity={3.5} color="#ff44aa" distance={30} decay={1.5} />
      <pointLight position={[0, -1, 5]} intensity={2.5} color="#4488ff" distance={25} decay={1.5} />
      <pointLight position={[-6, 1, 0]} intensity={2.0} color="#44ff88" distance={20} decay={1.5} />
      <pointLight position={[6, 1, -3]} intensity={2.0} color="#ffaa00" distance={20} decay={1.5} />

      {/* Sparkle particles */}
      <Sparkles count={500} size={4.5} speed={0.2} opacity={0.9} color="#a855f7" scale={[25, 12, 25]} />
      <Sparkles count={200} size={3.5} speed={0.4} opacity={0.8} color="#00f0ff" scale={[20, 10, 20]} />
<SensorRig>
      <group ref={groupRef}>
        <CaveEnvironment />
        <WaterPool />

        {crystals.map((c, i) => (
          <Crystal key={i} position={c.pos} scale={c.scale} color={c.color} rotSpeed={c.rot} />
        ))}

        {clusters.map((c, i) => (
          <CrystalCluster key={i} position={c.pos} color={c.color} />
        ))}

        {orbs.map((o, i) => (
          <GlowOrb key={i} position={o.pos} color={o.color} />
        ))}
      </group>
      </SensorRig>
      <OrbitControls enablePan enableZoom enableRotate autoRotate autoRotateSpeed={0.3} maxPolarAngle={Math.PI / 1.5} minDistance={3} maxDistance={20} />
    </>
  );
}
