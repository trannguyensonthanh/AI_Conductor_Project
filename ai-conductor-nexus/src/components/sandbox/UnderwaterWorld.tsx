import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';
import { SensorRig } from './SensorRig';
/* ── Detailed Fish with fins ── */
function Fish({ startPos, speed, color, size }: {
  startPos: [number, number, number];
  speed: number;
  color: string;
  size: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Mesh>(null);
  const finRef1 = useRef<THREE.Mesh>(null);
  const finRef2 = useRef<THREE.Mesh>(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * speed + phase;
    ref.current.position.x = startPos[0] + Math.sin(t) * 5;
    ref.current.position.z = startPos[2] + Math.cos(t * 0.7) * 4;
    ref.current.position.y = startPos[1] + Math.sin(t * 1.5) * 0.6;
    ref.current.rotation.y = Math.atan2(Math.cos(t) * 5, -Math.sin(t) * 4) + Math.PI;

    const swim = clock.getElapsedTime();
    if (tailRef.current) tailRef.current.rotation.y = Math.sin(swim * 10) * 0.4;
    if (finRef1.current) finRef1.current.rotation.z = Math.sin(swim * 6) * 0.25 - 0.4;
    if (finRef2.current) finRef2.current.rotation.z = -Math.sin(swim * 6) * 0.25 + 0.4;
  });

  const s = size;
  return (
    <group ref={ref}>
      {/* Body – smooth ellipsoid */}
      <mesh scale={[s * 1.6, s * 0.7, s * 0.5]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} roughness={0.15} metalness={0.7} />
      </mesh>

      {/* Belly – lighter underside */}
      <mesh position={[0, -s * 0.15, 0]} scale={[s * 1.4, s * 0.45, s * 0.42]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color="#ddeeff" emissive="#aaccee" emissiveIntensity={0.2} roughness={0.3} metalness={0.4} transparent opacity={0.6} />
      </mesh>

      {/* Eye left */}
      <mesh position={[s * 0.9, s * 0.2, s * 0.3]}>
        <sphereGeometry args={[s * 0.12, 12, 12]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[s * 1.0, s * 0.2, s * 0.35]}>
        <sphereGeometry args={[s * 0.06, 8, 8]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {/* Eye right */}
      <mesh position={[s * 0.9, s * 0.2, -s * 0.3]}>
        <sphereGeometry args={[s * 0.12, 12, 12]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[s * 1.0, s * 0.2, -s * 0.35]}>
        <sphereGeometry args={[s * 0.06, 8, 8]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {/* Mouth */}
      <mesh position={[s * 1.4, -s * 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[s * 0.08, s * 0.02, 8, 12, Math.PI]} />
        <meshStandardMaterial color="#cc3344" />
      </mesh>

      {/* Tail fin */}
      <mesh ref={tailRef} position={[-s * 1.3, 0, 0]}>
        <coneGeometry args={[s * 0.5, s * 0.9, 4]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>

      {/* Dorsal fin */}
      <mesh position={[0, s * 0.55, 0]} rotation={[0, 0, -0.15]} scale={[s * 0.6, s * 0.35, s * 0.04]}>
        <coneGeometry args={[1, 1, 4]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>

      {/* Pectoral fins */}
      <mesh ref={finRef1} position={[s * 0.3, -s * 0.2, s * 0.4]} rotation={[0.3, 0.5, -0.4]}>
        <coneGeometry args={[s * 0.2, s * 0.5, 3]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={finRef2} position={[s * 0.3, -s * 0.2, -s * 0.4]} rotation={[-0.3, -0.5, 0.4]}>
        <coneGeometry args={[s * 0.2, s * 0.5, 3]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>

      {/* Subtle body glow */}
      <pointLight color={color} intensity={0.15} distance={2} />
    </group>
  );
}

/* ── Jellyfish ── */
function JellyFish({ position, color }: { position: [number, number, number]; color: string }) {
  const ref = useRef<THREE.Group>(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() + phase;
    ref.current.position.y = position[1] + Math.sin(t * 0.5) * 1.5;
    ref.current.position.x = position[0] + Math.sin(t * 0.3) * 0.6;
    ref.current.scale.y = 1 + Math.sin(t * 2) * 0.12;
  });

  return (
    <group ref={ref} position={position}>
      {/* Bell dome */}
      <mesh>
        <sphereGeometry args={[0.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
      {/* Inner bell */}
      <mesh position={[0, -0.05, 0]} scale={0.75}>
        <sphereGeometry args={[0.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={1.2} transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
      {/* Tentacles */}
      {Array.from({ length: 8 }, (_, i) => (
        <Float key={i} speed={2 + i * 0.3} floatIntensity={0.4} rotationIntensity={0.15}>
          <mesh position={[Math.cos(i * 0.785) * 0.25, -0.4 - i * 0.03, Math.sin(i * 0.785) * 0.25]}>
            <cylinderGeometry args={[0.012, 0.004, 1.0 + Math.random() * 0.6, 4]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} transparent opacity={0.35} />
          </mesh>
        </Float>
      ))}
      <pointLight color={color} intensity={0.5} distance={4} />
    </group>
  );
}

/* ── Sea Turtle ── */
function SeaTurtle({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const flipperL = useRef<THREE.Mesh>(null);
  const flipperR = useRef<THREE.Mesh>(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * 0.2 + phase;
    ref.current.position.x = position[0] + Math.sin(t) * 6;
    ref.current.position.z = position[2] + Math.cos(t) * 5;
    ref.current.position.y = position[1] + Math.sin(t * 3) * 0.3;
    ref.current.rotation.y = Math.atan2(Math.cos(t) * 6, -Math.sin(t) * 5) + Math.PI;

    const swim = clock.getElapsedTime();
    if (flipperL.current) flipperL.current.rotation.z = Math.sin(swim * 2) * 0.4 - 0.3;
    if (flipperR.current) flipperR.current.rotation.z = -Math.sin(swim * 2) * 0.4 + 0.3;
  });

  return (
    <group ref={ref} position={position}>
      {/* Shell */}
      <mesh scale={[0.8, 0.35, 0.6]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial color="#2d6b4e" emissive="#1a4a32" emissiveIntensity={0.3} roughness={0.6} metalness={0.3} />
      </mesh>
      {/* Shell pattern */}
      <mesh scale={[0.82, 0.36, 0.62]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#3a8a62" wireframe transparent opacity={0.3} />
      </mesh>
      {/* Head */}
      <mesh position={[0.7, 0.05, 0]} scale={[0.25, 0.18, 0.2]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color="#4a9a6e" emissive="#2a6a4e" emissiveIntensity={0.2} roughness={0.5} />
      </mesh>
      {/* Eyes */}
      <mesh position={[0.88, 0.1, 0.12]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0.88, 0.1, -0.12]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {/* Flippers */}
      <mesh ref={flipperL} position={[0.2, -0.1, 0.55]} rotation={[0.3, 0.3, -0.3]}>
        <coneGeometry args={[0.15, 0.6, 4]} />
        <meshStandardMaterial color="#3a8a62" roughness={0.5} />
      </mesh>
      <mesh ref={flipperR} position={[0.2, -0.1, -0.55]} rotation={[-0.3, -0.3, 0.3]}>
        <coneGeometry args={[0.15, 0.6, 4]} />
        <meshStandardMaterial color="#3a8a62" roughness={0.5} />
      </mesh>
      {/* Rear flippers */}
      <mesh position={[-0.6, -0.08, 0.3]} rotation={[0, 0.3, -0.2]} scale={0.6}>
        <coneGeometry args={[0.1, 0.35, 3]} />
        <meshStandardMaterial color="#3a8a62" roughness={0.5} />
      </mesh>
      <mesh position={[-0.6, -0.08, -0.3]} rotation={[0, -0.3, 0.2]} scale={0.6}>
        <coneGeometry args={[0.1, 0.35, 3]} />
        <meshStandardMaterial color="#3a8a62" roughness={0.5} />
      </mesh>
    </group>
  );
}

/* ── Bubble ── */
function Bubble({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);
  const speed = useMemo(() => 0.2 + Math.random() * 0.5, []);
  const wobble = useMemo(() => Math.random() * Math.PI * 2, []);
  const sz = useMemo(() => 0.03 + Math.random() * 0.08, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.position.y = ((position[1] + t * speed) % 14) - 4;
    ref.current.position.x = position[0] + Math.sin(t * 2 + wobble) * 0.5;
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[sz, 12, 12]} />
      <meshStandardMaterial color="#aaeeff" emissive="#88ddff" emissiveIntensity={0.6} transparent opacity={0.35} metalness={0.8} roughness={0.1} />
    </mesh>
  );
}

/* ── Coral reef ── */
function Coral({ position, color, scale }: {
  position: [number, number, number];
  color: string;
  scale: number;
}) {
  return (
    <Float speed={0.3} rotationIntensity={0.03} floatIntensity={0.03}>
      <group position={position}>
        {/* Branching coral */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} position={[Math.cos(i * 1.05) * 0.35, i * 0.22 * scale, Math.sin(i * 1.05) * 0.35]} scale={scale * (1 - i * 0.1)} rotation={[0.1 * i, i * 0.5, 0]}>
            <cylinderGeometry args={[0.1, 0.15, 0.4, 8]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} roughness={0.4} />
          </mesh>
        ))}
        {/* Coral tip */}
        <mesh position={[0, scale * 1.6, 0]}>
          <sphereGeometry args={[0.12 * scale, 12, 12]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} transparent opacity={0.7} />
        </mesh>
      </group>
    </Float>
  );
}

/* ── Seaweed ── */
function Seaweed({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const segments = useMemo(() => 5 + Math.floor(Math.random() * 4), []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.children.forEach((child, i) => {
      child.rotation.z = Math.sin(clock.getElapsedTime() * 1.5 + i * 0.5) * 0.15 * (i + 1);
      child.rotation.x = Math.sin(clock.getElapsedTime() * 1.2 + i * 0.3) * 0.05 * (i + 1);
    });
  });

  return (
    <group ref={ref} position={position}>
      {Array.from({ length: segments }, (_, i) => (
        <mesh key={i} position={[0, i * 0.38, 0]}>
          <cylinderGeometry args={[0.025, 0.035, 0.4, 6]} />
          <meshStandardMaterial color="#1a8844" emissive="#1a8844" emissiveIntensity={0.35} transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/* ── Light rays from surface ── */
function LightRays() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.children.forEach((child, i) => {
      (child as THREE.Mesh).material && ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity !== undefined &&
        (((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.02 + Math.sin(clock.getElapsedTime() * 0.5 + i) * 0.015);
    });
  });

  return (
    <group ref={ref}>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-6 + i * 2.5, 4, -3 + i * 0.8]} rotation={[0, 0, 0.08 * (i - 2.5)]}>
          <planeGeometry args={[0.5, 16]} />
          <meshBasicMaterial color="#66bbff" transparent opacity={0.03} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/* ── Main Export ── */
export function UnderwaterWorld() {
  const fishes = useMemo(() => [
    { pos: [0, 0.5, 0] as [number, number, number], speed: 0.35, color: '#ff6644', size: 0.35 },
    { pos: [3, 1.5, -2] as [number, number, number], speed: 0.5, color: '#ffaa00', size: 0.22 },
    { pos: [-3, -0.5, 1] as [number, number, number], speed: 0.3, color: '#4488ff', size: 0.4 },
    { pos: [1, 2.5, 3] as [number, number, number], speed: 0.45, color: '#ff44aa', size: 0.28 },
    { pos: [-2, -0.2, -3] as [number, number, number], speed: 0.4, color: '#44ffaa', size: 0.32 },
    { pos: [4, 1, 2] as [number, number, number], speed: 0.5, color: '#aa88ff', size: 0.24 },
    { pos: [-1, 2, -4] as [number, number, number], speed: 0.35, color: '#ff8844', size: 0.36 },
    { pos: [5, 0, -1] as [number, number, number], speed: 0.55, color: '#44aaff', size: 0.2 },
    { pos: [-4, 1.2, 4] as [number, number, number], speed: 0.38, color: '#ffcc44', size: 0.3 },
    { pos: [2, -1, -5] as [number, number, number], speed: 0.42, color: '#66ff88', size: 0.26 },
  ], []);

  const bubbles = useMemo(() =>
    Array.from({ length: 80 }, () => ({
      pos: [(Math.random() - 0.5) * 18, Math.random() * 14 - 4, (Math.random() - 0.5) * 18] as [number, number, number],
    })), []);

  const jellies = useMemo(() => [
    { pos: [-4, 3, -4] as [number, number, number], color: '#ff44aa' },
    { pos: [5, 2, -2] as [number, number, number], color: '#aa44ff' },
    { pos: [-1, 4, 3] as [number, number, number], color: '#44aaff' },
    { pos: [3, 1, -6] as [number, number, number], color: '#ff88ff' },
    { pos: [-5, 2.5, 2] as [number, number, number], color: '#44ffcc' },
  ], []);

  const groupRef = useRef<THREE.Group>(null);

  return (
    <>
      <color attach="background" args={['#052035']} />
      <fog attach="fog" args={['#052035', 8, 32]} />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 12, 3]} intensity={1.5} color="#88bfff" />
      <pointLight position={[0, 8, 0]} intensity={1.5} color="#00aaff" distance={40} decay={1.5} />
      <pointLight position={[-5, 0, -4]} intensity={1.2} color="#00ffaa" distance={25} decay={1.5} />
      <pointLight position={[5, 3, 4]} intensity={1.2} color="#ff44aa" distance={25} decay={1.5} />
      <pointLight position={[0, -2, 0]} intensity={1.0} color="#2266ff" distance={20} decay={1.5} />

      <Sparkles count={250} size={2.5} speed={0.2} opacity={0.6} color="#88ccff" scale={[24, 12, 24]} />
      <LightRays />
<SensorRig>
      <group ref={groupRef}>
        {/* Sea floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]}>
        <planeGeometry args={[60, 60, 40, 40]} />
        <meshStandardMaterial color="#0a2d45" roughness={0.8} />
      </mesh>

      {/* Sandy patches */}
      {[[-2, 0], [4, -3], [-5, 4], [1, 6]].map(([x, z], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, -3.95, z]}>
          <circleGeometry args={[1.5 + Math.random(), 24]} />
          <meshStandardMaterial color="#1a3040" roughness={0.9} />
        </mesh>
      ))}

      {/* Seaweed */}
      {Array.from({ length: 22 }, (_, i) => (
        <Seaweed key={i} position={[(Math.random() - 0.5) * 20, -3.7, (Math.random() - 0.5) * 20]} />
      ))}

      {/* Corals */}
      {[
        { pos: [-4, -3.7, -3] as [number, number, number], color: '#ff4466', scale: 1.1 },
        { pos: [3, -3.7, -5] as [number, number, number], color: '#ff8844', scale: 0.9 },
        { pos: [-2, -3.7, 5] as [number, number, number], color: '#aa44ff', scale: 1.3 },
        { pos: [5, -3.7, 2] as [number, number, number], color: '#44ff88', scale: 0.8 },
        { pos: [0, -3.7, -7] as [number, number, number], color: '#ffaa44', scale: 1.0 },
        { pos: [-6, -3.7, -1] as [number, number, number], color: '#ff44ff', scale: 0.7 },
        { pos: [7, -3.7, -4] as [number, number, number], color: '#ff6688', scale: 0.85 },
        { pos: [-3, -3.7, 7] as [number, number, number], color: '#44ddff', scale: 0.95 },
      ].map((c, i) => (
        <Coral key={i} position={c.pos} color={c.color} scale={c.scale} />
      ))}

      {/* Creatures */}
      {fishes.map((f, i) => (
        <Fish key={i} startPos={f.pos} speed={f.speed} color={f.color} size={f.size} />
      ))}
      {jellies.map((j, i) => (
        <JellyFish key={i} position={j.pos} color={j.color} />
      ))}
      <SeaTurtle position={[0, 1, 0]} />
      <SeaTurtle position={[3, 2.5, -3]} />

      {bubbles.map((b, i) => (
        <Bubble key={i} position={b.pos} />
      ))}
      </group>
      </SensorRig>

      <OrbitControls enablePan enableZoom enableRotate autoRotate autoRotateSpeed={0.2} maxPolarAngle={Math.PI / 1.4} minDistance={3} maxDistance={20} />
    </>
  );
}
