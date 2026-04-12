import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, MeshReflectorMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';
import { SensorRig } from './SensorRig'; 
/* ── Neon underglow strip ── */
function NeonStrip({ position, color, width = 3.5 }: { position: [number, number, number]; color: string; width?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.5 + Math.sin(clock.getElapsedTime() * 3) * 1;
    }
  });
  return (
    <mesh ref={ref} position={position}>
      <boxGeometry args={[width, 0.02, 0.06]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} />
    </mesh>
  );
}

/* ── Sleek Car Body ── */
function CarBody({ color }: { color: string }) {
  return (
    <group>
      {/* Lower chassis – wide, flat, aggressive */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[4.4, 0.3, 1.8]} />
        <meshStandardMaterial color="#8ba1b5" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Main body */}
      <mesh position={[0, 0.38, 0]}>
        <boxGeometry args={[4.2, 0.26, 1.7]} />
        <meshStandardMaterial color={color} metalness={0.92} roughness={0.08} />
      </mesh>

      {/* Front hood – angled down */}
      <mesh position={[1.7, 0.42, 0]} rotation={[0, 0, -0.18]}>
        <boxGeometry args={[1.4, 0.2, 1.6]} />
        <meshStandardMaterial color={color} metalness={0.92} roughness={0.08} />
      </mesh>

      {/* Front bumper / splitter */}
      <mesh position={[2.25, 0.12, 0]}>
        <boxGeometry args={[0.15, 0.12, 1.85]} />
        <meshStandardMaterial color="#8ba1b5" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Rear diffuser */}
      <mesh position={[-2.2, 0.12, 0]}>
        <boxGeometry args={[0.2, 0.15, 1.85]} />
        <meshStandardMaterial color="#8ba1b5" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Rear trunk slope */}
      <mesh position={[-1.6, 0.42, 0]} rotation={[0, 0, 0.12]}>
        <boxGeometry args={[1.2, 0.22, 1.6]} />
        <meshStandardMaterial color={color} metalness={0.92} roughness={0.08} />
      </mesh>

      {/* Cabin windshield */}
      <mesh position={[0.5, 0.72, 0]} rotation={[0, 0, -0.22]}>
        <boxGeometry args={[1.0, 0.42, 1.42]} />
        <meshStandardMaterial color="#080818" metalness={0.98} roughness={0.02} transparent opacity={0.65} />
      </mesh>

      {/* Cabin roof */}
      <mesh position={[-0.1, 0.78, 0]}>
        <boxGeometry args={[1.4, 0.08, 1.44]} />
        <meshStandardMaterial color="#6a7a90" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Cabin rear glass */}
      <mesh position={[-0.7, 0.68, 0]} rotation={[0, 0, 0.25]}>
        <boxGeometry args={[0.7, 0.35, 1.38]} />
        <meshStandardMaterial color="#080818" metalness={0.98} roughness={0.02} transparent opacity={0.6} />
      </mesh>

      {/* Side skirts */}
      {[0.92, -0.92].map((z, i) => (
        <mesh key={i} position={[0, 0.08, z]}>
          <boxGeometry args={[4.0, 0.06, 0.06]} />
          <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={1.5} />
        </mesh>
      ))}

      {/* Wing / Spoiler */}
      <mesh position={[-2.15, 0.72, 0]}>
        <boxGeometry args={[0.35, 0.04, 2.0]} />
        <meshStandardMaterial color="#6a7a90" metalness={0.8} roughness={0.2} />
      </mesh>
      {[0.8, -0.8].map((z, i) => (
        <group key={i}>
          <mesh position={[-2.05, 0.52, z]}>
            <boxGeometry args={[0.06, 0.4, 0.06]} />
            <meshStandardMaterial color="#8ba1b5" metalness={0.9} roughness={0.15} />
          </mesh>
          <mesh position={[-2.05, 0.52, z + 0.04]}>
            <planeGeometry args={[0.02, 0.35]} />
            <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={2} />
          </mesh>
        </group>
      ))}

      {/* Hood accent line */}
      <mesh position={[0.8, 0.52, 0]}>
        <boxGeometry args={[2.4, 0.015, 0.04]} />
        <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

/* ── Glowing Wheel ── */
function Wheel({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const rimRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.x = clock.getElapsedTime() * 4;
    if (rimRef.current) {
      (rimRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2 + Math.sin(clock.getElapsedTime() * 6) * 0.5;
    }
  });
  return (
    <group position={position}>
      <group ref={ref} rotation={[Math.PI / 2, 0, 0]}>
        {/* Tire */}
        <mesh>
          <cylinderGeometry args={[0.32, 0.32, 0.2, 32]} />
          <meshStandardMaterial color="#111" metalness={0.4} roughness={0.7} />
        </mesh>
        {/* Rim */}
        <mesh ref={rimRef}>
          <cylinderGeometry args={[0.22, 0.22, 0.21, 8]} />
          <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={1.2} metalness={0.95} roughness={0.05} />
        </mesh>
        {/* Hub */}
        <mesh>
          <cylinderGeometry args={[0.08, 0.08, 0.22, 16]} />
          <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={1} />
        </mesh>
      </group>
      {/* Wheel glow on ground */}
      <pointLight color="#00f0ff" intensity={0.6} distance={2} />
    </group>
  );
}

/* ── Headlights with beam ── */
function Headlight({ position, color }: { position: [number, number, number]; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 5 + Math.sin(clock.getElapsedTime() * 4) * 1;
    }
  });
  return (
    <group position={position}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial emissive={color} emissiveIntensity={5} color={color} />
      </mesh>
      <pointLight color={color} intensity={2} distance={8} />
    </group>
  );
}

/* ── Floating particles ── */
function FloatingParticles() {
  const ref = useRef<THREE.Points>(null);
  const count = 150;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 25;
      arr[i * 3 + 1] = Math.random() * 6;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 25;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position.array as Float32Array;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] = (pos[i * 3 + 1] + 0.004) % 6;
      pos[i * 3] += Math.sin(t + i) * 0.001;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#00f0ff" size={0.04} transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

/* ── City skyline ── */
function CityBackdrop() {
  const buildings = useMemo(() =>
    Array.from({ length: 60 }, () => ({
      x: (Math.random() - 0.5) * 40,
      z: -10 - Math.random() * 20,
      w: 0.4 + Math.random() * 1.8,
      h: 1.5 + Math.random() * 8,
      d: 0.4 + Math.random() * 1.8,
    })), []);

  return (
    <group>
      {buildings.map((b, i) => (
        <group key={i}>
          <mesh position={[b.x, b.h / 2, b.z]}>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color="#0a0a1a" emissive="#0d0d2a" emissiveIntensity={0.2} />
          </mesh>
          {/* Window lights */}
          {Math.random() > 0.4 && (
            <mesh position={[b.x, b.h * 0.6, b.z + b.d / 2 + 0.01]}>
              <planeGeometry args={[b.w * 0.7, b.h * 0.4]} />
              <meshStandardMaterial
                color={['#00f0ff', '#a855f7', '#ff44aa', '#ffaa00'][i % 4]}
                emissive={['#00f0ff', '#a855f7', '#ff44aa', '#ffaa00'][i % 4]}
                emissiveIntensity={0.4}
                transparent
                opacity={0.3}
              />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

/* ── Main Export ── */
export function CyberpunkCar({ color, autoRotate }: { color: string; autoRotate: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  
 

  useFrame(({ clock }) => {
    if (groupRef.current) {

      groupRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.8) * 0.03 + 0.55;
    }
  });


  return (
    <>
      <color attach="background" args={['#030308']} />
      <fog attach="fog" args={['#030308', 12, 40]} />

      {/* Lighting */}
      <ambientLight intensity={0.5} color="#ffffff" />
      <pointLight position={[6, 6, 6]} intensity={2} color="#00f0ff" />
      <pointLight position={[-6, 4, -6]} intensity={1} color="#a855f7" />
      <pointLight position={[0, 8, 0]} intensity={0.8} color="#ff44aa" />
      <spotLight position={[0, 12, 4]} intensity={2} angle={0.4} penumbra={0.6} color="#ffffff" castShadow />
      <spotLight position={[4, 8, -2]} intensity={1} angle={0.3} penumbra={0.8} color="#00f0ff" />

      <Sparkles count={80} size={1.5} speed={0.3} opacity={0.4} color="#a855f7" scale={[20, 8, 20]} />
  
      <SensorRig>
      <group ref={groupRef} position={[0, 0.55, 0]}>
        <CarBody color={color} />

        {/* Neon underglow */}
        <NeonStrip position={[0, 0.01, 0.9]} color="#00f0ff" width={4.0} />
        <NeonStrip position={[0, 0.01, -0.9]} color="#00f0ff" width={4.0} />
        <NeonStrip position={[2.2, 0.01, 0]} color="#00f0ff" width={0.06} />
        <NeonStrip position={[-2.2, 0.01, 0]} color="#ff2244" width={0.06} />

        {/* Ground glow light */}
        <pointLight position={[0, -0.1, 0]} color="#00f0ff" intensity={1.5} distance={5} />

        {/* Wheels */}
        <Wheel position={[-1.35, -0.02, 0.92]} />
        <Wheel position={[-1.35, -0.02, -0.92]} />
        <Wheel position={[1.35, -0.02, 0.92]} />
        <Wheel position={[1.35, -0.02, -0.92]} />

        {/* Headlights */}
        <Headlight position={[2.3, 0.35, 0.5]} color="#00f0ff" />
        <Headlight position={[2.3, 0.35, -0.5]} color="#00f0ff" />
        <Headlight position={[2.3, 0.35, 0]} color="#ffffff" />

        {/* Taillights */}
        <mesh position={[-2.25, 0.35, 0.6]}>
          <boxGeometry args={[0.04, 0.06, 0.4]} />
          <meshStandardMaterial emissive="#ff2244" emissiveIntensity={5} color="#ff2244" />
        </mesh>
        <mesh position={[-2.25, 0.35, -0.6]}>
          <boxGeometry args={[0.04, 0.06, 0.4]} />
          <meshStandardMaterial emissive="#ff2244" emissiveIntensity={5} color="#ff2244" />
        </mesh>
        <mesh position={[-2.25, 0.35, 0]}>
          <boxGeometry args={[0.04, 0.03, 0.3]} />
          <meshStandardMaterial emissive="#ff8800" emissiveIntensity={3} color="#ff8800" />
        </mesh>
      </group>
      <FloatingParticles />
      <CityBackdrop />
      </SensorRig>

      {/* Reflective ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[60, 60]} />
        <MeshReflectorMaterial
          mirror={0.5}
          blur={[400, 200]}
          resolution={1024}
          mixBlur={1}
          mixStrength={50}
          roughness={0.9}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#030308"
          metalness={0.6}
        />
      </mesh>

      <Grid
        args={[60, 60]}
        cellSize={0.5}
        cellThickness={0.3}
        cellColor="#0a1520"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#00f0ff"
        fadeDistance={25}
        infiniteGrid
        position={[0, 0.002, 0]}
      />

      <OrbitControls autoRotate={autoRotate} autoRotateSpeed={0.6} enablePan enableZoom maxPolarAngle={Math.PI / 2.1} minDistance={3} maxDistance={15} />
    </>
  );
}
