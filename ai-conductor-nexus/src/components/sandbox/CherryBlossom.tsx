import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Sparkles, Float } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';
import { SensorRig } from './SensorRig'; 
/* ── Tree trunk & branches ── */
function TreeTrunk() {
  return (
    <group>
      {/* Main trunk */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.4, 0.6, 3, 8]} />
        <meshStandardMaterial color="#3a2522" roughness={0.9} />
      </mesh>
      
      {/* Branch 1 */}
      <mesh position={[0.8, 2.8, 0.2]} rotation={[0, 0, -0.6]}>
        <cylinderGeometry args={[0.15, 0.3, 2, 8]} />
        <meshStandardMaterial color="#3a2522" roughness={0.9} />
      </mesh>

      {/* Branch 2 */}
      <mesh position={[-0.7, 2.5, -0.5]} rotation={[0.2, 0, 0.7]}>
        <cylinderGeometry args={[0.1, 0.25, 2.5, 8]} />
        <meshStandardMaterial color="#3a2522" roughness={0.9} />
      </mesh>
      
      {/* Branch 3 */}
      <mesh position={[0.2, 2.9, 0.8]} rotation={[-0.8, 0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.25, 1.8, 8]} />
        <meshStandardMaterial color="#3a2522" roughness={0.9} />
      </mesh>
    </group>
  );
}

/* ── Cherry Blossom Flowers ── */
function Blossoms() {
  const clusters = useMemo(() => [
    { pos: [1.6, 3.5, 0.4], size: 1.5 },
    { pos: [-1.8, 3.2, -1.0], size: 1.8 },
    { pos: [0.4, 3.8, 1.6], size: 1.4 },
    { pos: [0, 4.2, 0], size: 2.0 },
    { pos: [1.0, 3.0, -1.2], size: 1.2 },
    { pos: [-0.8, 4.0, 0.8], size: 1.6 },
  ], []);

  return (
    <group>
      {clusters.map((c, i) => (
        <Float key={i} speed={1.5} rotationIntensity={0.1} floatIntensity={0.2}>
          <mesh position={c.pos as [number, number, number]}>
            <sphereGeometry args={[c.size, 16, 16]} />
            <meshStandardMaterial 
              color="#ffb7c5" 
              emissive="#ff9eb0" 
              emissiveIntensity={0.6} 
              transparent 
              opacity={0.85} 
              roughness={0.4} 
            />
          </mesh>
          <mesh position={c.pos as [number, number, number]} scale={1.1}>
             <sphereGeometry args={[c.size, 12, 12]} />
             <meshStandardMaterial 
               color="#ffcce0" 
               emissive="#ffb7c5" 
               emissiveIntensity={0.3} 
               transparent 
               opacity={0.4} 
               side={THREE.BackSide} 
             />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

/* ── Falling Petals (Reacts to AI sensor wind) ── */
function FallingPetals({ windSpeed }: { windSpeed: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = 150;
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 12,
      y: Math.random() * 8,
      z: (Math.random() - 0.5) * 12,
      speed: 0.5 + Math.random() * 1.5,
      wobbleSpeed: 1 + Math.random() * 2,
      scale: 0.05 + Math.random() * 0.05,
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    
    particles.forEach((p, i) => {
      // Petals fall down, and drift based on windSpeed
      p.y -= 0.02 * p.speed;
      if (p.y < -0.5) {
        p.y = 8;
        p.x = (Math.random() - 0.5) * 12;
        p.z = (Math.random() - 0.5) * 12;
      }
      
      const driftX = Math.sin(t * p.wobbleSpeed) * 0.02 + windSpeed * 0.05;
      const driftZ = Math.cos(t * p.wobbleSpeed * 0.8) * 0.02;
      p.x += driftX;
      p.z += driftZ;

      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(
        t * p.wobbleSpeed, 
        t * p.wobbleSpeed * 0.5, 
        t * p.wobbleSpeed * 1.2
      );
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      {/* Use a small thin cylinder or plane to represent a petal */}
      <cylinderGeometry args={[1, 1, 0.1, 5]} />
      <meshStandardMaterial color="#ffb7c5" emissive="#ff9eb0" emissiveIntensity={0.8} />
    </instancedMesh>
  );
}

/* ── Main Export ── */
export function CherryBlossom() {
  const groupRef = useRef<THREE.Group>(null);
  
  const { sensorData, isConnected } = useAppStore();
  
  // Tính toán lực gió (Wind Power) dựa vào gia tốc vung tay (gx, gy, gz)
  // Nếu ông vung tay cực mạnh, gx/gy sẽ lên tới mức ngàn.
  // Ta lấy độ lớn vector tổng hợp làm lực gió.
  const windPower = isConnected 
    ? Math.abs(sensorData.gx) + Math.abs(sensorData.gy) + Math.abs(sensorData.gz) 
    : 0;
  
  // Chuẩn hóa lực gió về dải (0 -> 10) để truyền vào Component FallingPetals
  const normalizedWind = Math.min(windPower / 500, 10); 

  useFrame((_, delta) => {
    if (groupRef.current && isConnected) {
      // 1. Tích lũy góc Yaw quay cây
      if (Math.abs(sensorData.gy) > 200) {
        groupRef.current.rotation.y += (sensorData.gy / 32768) * Math.PI * 1.5 * delta;
      }
      
      // 2. Nghiêng diorama (Pitch & Roll)
      const targetPitch = (sensorData.ax / 16384) * (Math.PI / 6); 
      const targetRoll = (sensorData.ay / 16384) * (Math.PI / 6); 
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetPitch, 0.08);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, -targetRoll, 0.08);
    } else if (groupRef.current) {
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.05);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, 0.05);
    }
  });

  return (
    <>
      <color attach="background" args={['#1a0f12']} />
      <fog attach="fog" args={['#1a0f12', 5, 25]} />

      {/* Lighting */}
      <ambientLight intensity={0.6} color="#ffffff" />
      <pointLight position={[5, 8, 5]} intensity={2.5} color="#ffb7c5" decay={1.5} distance={30} />
      <pointLight position={[-4, 4, -4]} intensity={1.5} color="#ffd1dc" decay={1.5} distance={20} />
      <spotLight position={[0, 10, 0]} intensity={3} angle={0.6} penumbra={0.7} color="#ffffff" />
      
      {/* Scene Content */}
      <SensorRig>
      <group ref={groupRef} position={[0, -1, 0]}>
        <TreeTrunk />
        <Blossoms />
        {/* Pass user's sensorData.ax or .ay as wind to blow the petals! */}
        <FallingPetals windSpeed={isConnected ? sensorData.gx * 0.005 : 0.02} />

        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[4, 5, 0.4, 32]} />
          <meshStandardMaterial color="#222" roughness={0.9} />
        </mesh>
        
        {/* Glow ring around the base */}
        <mesh position={[0, 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
           <ringGeometry args={[3.8, 4.1, 64]} />
           <meshStandardMaterial color="#ffb7c5" emissive="#ffb7c5" emissiveIntensity={2} side={THREE.DoubleSide} transparent opacity={0.6} />
        </mesh>

        {/* Small lantern or decorative light */}
        <mesh position={[2, 0.5, 2]}>
          <cylinderGeometry args={[0.2, 0.2, 0.6, 6]} />
          <meshStandardMaterial color="#ffffee" emissive="#ffaa55" emissiveIntensity={3} />
        </mesh>
        <pointLight position={[2, 1, 2]} intensity={2} color="#ffaa55" distance={10} />
      </group>
      </SensorRig>
      {/* Ground Grid */}
      <Grid
        args={[40, 40]}
        cellSize={0.5}
        cellThickness={0.3}
        cellColor="#3a1520"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#ffb7c5"
        fadeDistance={20}
        infiniteGrid
        position={[0, -1.01, 0]}
      />

      <Sparkles count={100} size={2} speed={0.4} opacity={0.4} color="#ff9eb0" scale={[15, 10, 15]} />
      <OrbitControls enablePan enableZoom autoRotate autoRotateSpeed={0.5} minDistance={4} maxDistance={20} maxPolarAngle={Math.PI / 2.1} />
    </>
  );
}
