import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, MeshReflectorMaterial, Sparkles, Environment, Float } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
// import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';
import { SensorRig } from './SensorRig';

/* ── Neon underglow strip ── */
function NeonStrip({ position, color, width = 3.5 }: { position: [number, number, number]; color: string; width?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 3 + Math.sin(clock.getElapsedTime() * 5) * 1.5;
    }
  });
  return (
    <mesh ref={ref} position={position}>
      <boxGeometry args={[width, 0.02, 0.06]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} />
    </mesh>
  );
}

/* ── Sleek Car Body (Lớp sơn kim loại phủ bóng rực rỡ) ── */
function CarBody({ color }: { color: string }) {
  // Vật liệu sơn xe cao cấp
  const paintMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: color,
    metalness: 0.8,
    roughness: 0.2,
    clearcoat: 1.0,        // Lớp phủ bóng loáng
    clearcoatRoughness: 0.1,
  }), [color]);

  const glassMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#050510',
    metalness: 0.9,
    roughness: 0.0,
    transmission: 0.9,     // Kính trong suốt
    ior: 1.5,
    thickness: 0.1
  }), []);

  const carbonMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#111111', metalness: 0.9, roughness: 0.6
  }), []);

  return (
    <group castShadow receiveShadow>
      <mesh position={[0, 0.15, 0]} material={carbonMaterial}>
        <boxGeometry args={[4.4, 0.3, 1.8]} />
      </mesh>
      <mesh position={[0, 0.38, 0]} material={paintMaterial}>
        <boxGeometry args={[4.2, 0.26, 1.7]} />
      </mesh>
      <mesh position={[1.7, 0.42, 0]} rotation={[0, 0, -0.18]} material={paintMaterial}>
        <boxGeometry args={[1.4, 0.2, 1.6]} />
      </mesh>
      <mesh position={[2.25, 0.12, 0]} material={carbonMaterial}>
        <boxGeometry args={[0.15, 0.12, 1.85]} />
      </mesh>
      <mesh position={[-2.2, 0.12, 0]} material={carbonMaterial}>
        <boxGeometry args={[0.2, 0.15, 1.85]} />
      </mesh>
      <mesh position={[-1.6, 0.42, 0]} rotation={[0, 0, 0.12]} material={paintMaterial}>
        <boxGeometry args={[1.2, 0.22, 1.6]} />
      </mesh>
      <mesh position={[0.5, 0.72, 0]} rotation={[0, 0, -0.22]} material={glassMaterial}>
        <boxGeometry args={[1.0, 0.42, 1.42]} />
      </mesh>
      <mesh position={[-0.1, 0.78, 0]} material={carbonMaterial}>
        <boxGeometry args={[1.4, 0.08, 1.44]} />
      </mesh>
      <mesh position={[-0.7, 0.68, 0]} rotation={[0, 0, 0.25]} material={glassMaterial}>
        <boxGeometry args={[0.7, 0.35, 1.38]} />
      </mesh>

      {/* Đường viền Neon chạy dọc xe */}
      {[0.92, -0.92].map((z, i) => (
        <mesh key={i} position={[0, 0.08, z]}>
          <boxGeometry args={[4.0, 0.04, 0.04]} />
          <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={3} />
        </mesh>
      ))}

      {/* Cánh gió (Spoiler) */}
      <mesh position={[-2.15, 0.72, 0]} material={carbonMaterial}>
        <boxGeometry args={[0.35, 0.04, 2.0]} />
      </mesh>
      {[0.8, -0.8].map((z, i) => (
        <group key={i}>
          <mesh position={[-2.05, 0.52, z]} material={carbonMaterial}>
            <boxGeometry args={[0.06, 0.4, 0.06]} />
          </mesh>
          {/* Lõi Neon trong cánh gió */}
          <mesh position={[-2.05, 0.52, z + (z > 0 ? 0.04 : -0.04)]}>
            <planeGeometry args={[0.02, 0.35]} />
            <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={4} />
          </mesh>
        </group>
      ))}

      {/* Đường kẻ mui xe */}
      <mesh position={[0.8, 0.52, 0]}>
        <boxGeometry args={[2.4, 0.015, 0.04]} />
        <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={3} />
      </mesh>
    </group>
  );
}

/* ── Glowing Wheel ── */
function Wheel({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.x -= clock.getDelta() * 15; // Bánh xe quay tít
  });
  return (
    <group position={position}>
      <group ref={ref} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.32, 0.32, 0.2, 32]} />
          <meshStandardMaterial color="#050505" roughness={0.9} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.22, 0.22, 0.21, 16]} />
          <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={2.5} metalness={0.8} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.08, 0.08, 0.22, 16]} />
          <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={2} />
        </mesh>
      </group>
    </group>
  );
}

/* ── Headlights ── */
function Headlight({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.1, 0.05, 0.3]} />
        <meshStandardMaterial emissive={color} emissiveIntensity={8} color="#fff" />
      </mesh>
      <pointLight color={color} intensity={1.5} distance={15} decay={2} />
    </group>
  );
}

/* ── Mưa Dạ Quang Cyberpunk (Rơi rất nhanh) ── */
function CyberRain() {
  const ref = useRef<THREE.Points>(null);
  const count = 400;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 1] = Math.random() * 15;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    return arr;
  }, []);

  useFrame(() => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] -= 0.4; // Tốc độ rơi
      if (pos[i * 3 + 1] < 0) pos[i * 3 + 1] = 15; // Rơi chạm đất thì quay lại
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      {/* Mưa dạng tia dài màu cyan */}
      <pointsMaterial color="#00f0ff" size={0.15} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

/* ── Thành phố Neon & Đèn Laser quét ── */
function CityBackdrop() {
  const buildings = useMemo(() =>
    Array.from({ length: 40 }, () => ({
      x: (Math.random() - 0.5) * 50,
      z: -15 - Math.random() * 20,
      w: 2 + Math.random() * 3,
      h: 5 + Math.random() * 15,
      d: 2 + Math.random() * 3,
      color: ['#00f0ff', '#a855f7', '#ff2244', '#00ff88'][Math.floor(Math.random() * 4)]
    })), []);

  return (
    <group>
      {/* Tòa nhà */}
      {buildings.map((b, i) => (
        <group key={i}>
          <mesh position={[b.x, b.h / 2, b.z]}>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color="#030308" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Viền Neon của tòa nhà */}
          <mesh position={[b.x, b.h / 2, b.z]}>
            <boxGeometry args={[b.w + 0.05, b.h + 0.05, b.d + 0.05]} />
            <meshStandardMaterial color={b.color} emissive={b.color} emissiveIntensity={2} wireframe transparent opacity={0.15} />
          </mesh>
        </group>
      ))}
      
      {/* Đèn rọi Laser lên trời */}
      <Float speed={2} rotationIntensity={0} floatIntensity={0}>
        <mesh position={[-10, 10, -20]} rotation={[0, 0, 0.3]}>
          <cylinderGeometry args={[0.2, 2, 30, 16, 1, true]} />
          <meshBasicMaterial color="#00f0ff" transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[15, 10, -25]} rotation={[0, 0, -0.4]}>
          <cylinderGeometry args={[0.2, 2, 30, 16, 1, true]} />
          <meshBasicMaterial color="#a855f7" transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </Float>
    </group>
  );
}

/* ── Main Export ── */
export function CyberpunkCar({ color, autoRotate }: { color: string; autoRotate: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const { sensorData, isConnected } = useAppStore();

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Nhún nhảy nhẹ theo nhịp
      const bounce = Math.sin(state.clock.getElapsedTime() * 5) * 0.02 + 0.55;
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, bounce, 0.1);

      if (isConnected) {
        // Cảm biến nghiêng xe (Body Roll & Pitch khi Drift)
        // Khi vung điện thoại mạnh sang trái/phải, xe nghiêng theo
        const rollTarget = (sensorData.gy / 16384) * (Math.PI / 8); 
        const pitchTarget = (sensorData.ax / 16384) * (Math.PI / 12);
        
        groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, -rollTarget, 0.1);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, pitchTarget, 0.1);
      } else {
        groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, 0.05);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.05);
      }
    }
  });

  return (
    <>
      <color attach="background" args={['#020205']} />
      <fogExp2 attach="fog" args={['#050510', 0.03]} />
      <Environment preset="night" />

      {/* Ánh sáng kịch tính */}
      <ambientLight intensity={0.5} color="#442288" />
      <spotLight position={[0, 15, 0]} intensity={3} color="#00f0ff" angle={0.6} penumbra={1} castShadow />
      <pointLight position={[-5, 2, 5]} intensity={2} color="#a855f7" distance={15} />
      <pointLight position={[5, 2, -5]} intensity={2} color="#ff2244" distance={15} />

      <Sparkles count={50} size={3} speed={1} opacity={0.8} color="#00f0ff" scale={[20, 5, 20]} position={[0, 2, 0]} />
      <CyberRain />

      <SensorRig>
        <CityBackdrop />

        <group ref={groupRef} position={[0, 0.55, 0]}>
          <CarBody color={color} />

          {/* Dạ quang gầm xe hắt sáng */}
          <NeonStrip position={[0, 0.01, 0.9]} color="#00f0ff" width={4.0} />
          <NeonStrip position={[0, 0.01, -0.9]} color="#00f0ff" width={4.0} />
          <NeonStrip position={[2.2, 0.01, 0]} color="#00f0ff" width={0.06} />
          <NeonStrip position={[-2.2, 0.01, 0]} color="#ff2244" width={0.06} />

          <pointLight position={[0, -0.2, 0]} color="#00f0ff" intensity={2.5} distance={4} decay={2} />

          {/* Bánh xe */}
          <Wheel position={[-1.35, -0.02, 0.92]} />
          <Wheel position={[-1.35, -0.02, -0.92]} />
          <Wheel position={[1.35, -0.02, 0.92]} />
          <Wheel position={[1.35, -0.02, -0.92]} />

          {/* Đèn pha (Headlights) */}
          <Headlight position={[2.3, 0.35, 0.6]} color="#00f0ff" />
          <Headlight position={[2.3, 0.35, -0.6]} color="#00f0ff" />

          {/* Đèn hậu (Taillights) */}
          <mesh position={[-2.25, 0.35, 0.6]}>
            <boxGeometry args={[0.04, 0.06, 0.5]} />
            <meshStandardMaterial emissive="#ff003c" emissiveIntensity={5} color="#ff003c" />
          </mesh>
          <mesh position={[-2.25, 0.35, -0.6]}>
            <boxGeometry args={[0.04, 0.06, 0.5]} />
            <meshStandardMaterial emissive="#ff003c" emissiveIntensity={5} color="#ff003c" />
          </mesh>
          <pointLight position={[-3, 0.5, 0]} color="#ff003c" intensity={1.5} distance={5} />
        </group>
      </SensorRig>

      {/* Mặt đường nhựa ướt sũng phản chiếu đèn */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[100, 100]} />
        <MeshReflectorMaterial
          mirror={0.8}
          blur={[500, 100]}
          resolution={1024}
          mixBlur={1.5}
          mixStrength={100}
          roughness={1}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#020205"
          metalness={0.8}
        />
      </mesh>

      {/* Lưới Tron / Synthwave Grid */}
      <Grid
        args={[100, 100]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#001122"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#a855f7"
        fadeDistance={30}
        infiniteGrid
        position={[0, 0.002, 0]}
      />

      {/* Hiệu ứng Post-Processing cực xịn */}
      <EffectComposer disableNormalPass>
        <Bloom luminanceThreshold={1} mipmapBlur intensity={2.5} />
        {/* Chromatic Aberration tạo hiệu ứng viền màu quang học/glitch */}
        <ChromaticAberration offset={new THREE.Vector2(0.002, 0.002)} />
        <Vignette eskil={false} offset={0.2} darkness={1.2} />
      </EffectComposer>

      <OrbitControls autoRotate={autoRotate} autoRotateSpeed={1.0} enablePan={false} enableZoom maxPolarAngle={Math.PI / 2.05} minDistance={4} maxDistance={15} />
    </>
  );
}