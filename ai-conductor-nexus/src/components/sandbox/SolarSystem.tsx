import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, OrbitControls, Stars, Trail, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';
import { SensorRig } from './SensorRig';

/* ==========================================
   HYPER-SUN (MẶT TRỜI SIÊU NĂNG LƯỢNG)
   ========================================== */
function HyperSun() {
  const coreRef = useRef<THREE.Mesh>(null);
  const coronaRef1 = useRef<THREE.Mesh>(null);
  const coronaRef2 = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (coreRef.current) coreRef.current.rotation.y = t * 0.1;
    if (coronaRef1.current) {
      coronaRef1.current.rotation.y = t * 0.2;
      coronaRef1.current.rotation.x = t * 0.1;
      coronaRef1.current.scale.setScalar(1.05 + Math.sin(t * 3) * 0.02);
    }
    if (coronaRef2.current) {
      coronaRef2.current.rotation.y = -t * 0.15;
      coronaRef2.current.rotation.z = t * 0.1;
      coronaRef2.current.scale.setScalar(1.2 + Math.cos(t * 2) * 0.05);
    }
  });

  return (
    <group>
      {/* Lõi rực sáng */}
      <Sphere ref={coreRef} args={[1.5, 64, 64]}>
        <meshStandardMaterial color="#ffffff" emissive="#ffdd44" emissiveIntensity={4} />
      </Sphere>
      
      {/* Hào quang Corona Lớp 1 (Năng lượng cuộn) */}
      <Sphere ref={coronaRef1} args={[1.6, 32, 32]}>
        <meshBasicMaterial color="#ff8800" wireframe transparent opacity={0.3} blending={THREE.AdditiveBlending} />
      </Sphere>

      {/* Hào quang Corona Lớp 2 (Glow toả ra) */}
      <Sphere ref={coronaRef2} args={[1.8, 64, 64]}>
        <meshBasicMaterial color="#ff4400" transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
      </Sphere>
      
      <Sphere args={[2.5, 32, 32]}>
        <meshBasicMaterial color="#ff2200" transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} />
      </Sphere>

      {/* Ánh sáng mặt trời */}
      <pointLight intensity={100} color="#ffeedd" distance={300} decay={1.5} />
      <pointLight intensity={50} color="#ff6600" distance={100} decay={2} />
    </group>
  );
}

/* ==========================================
   PLANET (HÀNH TINH CÓ KHÍ QUYỂN & VÀNH ĐAI)
   ========================================== */
interface PlanetProps {
  radius: number;
  distance: number;
  speed: number;
  color: string;
  surfaceColor?: string;
  atmosphereColor?: string;
  hasRings?: boolean;
  moons?: number;
}

function CinematicPlanet({ radius, distance, speed, color, surfaceColor, atmosphereColor, hasRings, moons }: PlanetProps) {
  const ref = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * speed;
    // Quỹ đạo hình elip nhẹ
    ref.current.position.x = Math.cos(t) * distance;
    ref.current.position.z = Math.sin(t) * distance * 0.95; 
    
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005; // Tự quay quanh trục
    }
  });

  return (
    <group ref={ref}>
      {/* Vệt quỹ đạo sao chổi */}
      <Trail width={radius * 4} length={15} color={new THREE.Color(atmosphereColor || color)} attenuation={(w) => w * w}>
        <group>
          {/* Lõi hành tinh (Bề mặt) */}
          <Sphere ref={meshRef} args={[radius, 64, 64]}>
            <meshPhysicalMaterial
              color={surfaceColor || color}
              roughness={0.6}
              metalness={0.2}
              clearcoat={atmosphereColor ? 0.5 : 0} // Hành tinh có khí quyển sẽ bóng hơn
            />
          </Sphere>

          {/* Lớp khí quyển (Atmosphere Glow) */}
          {atmosphereColor && (
            <Sphere args={[radius * 1.15, 32, 32]}>
              <meshBasicMaterial 
                color={atmosphereColor} 
                transparent 
                opacity={0.3} 
                blending={THREE.AdditiveBlending} 
                side={THREE.BackSide} 
                depthWrite={false} 
              />
            </Sphere>
          )}
        </group>
      </Trail>

      {/* Vành đai Sci-Fi (Nhiều lớp) */}
      {hasRings && (
        <group rotation={[-Math.PI / 2.5, 0.2, 0]}>
          <mesh>
            <ringGeometry args={[radius * 1.4, radius * 1.8, 64]} />
            <meshStandardMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
          </mesh>
          <mesh>
            <ringGeometry args={[radius * 1.85, radius * 2.2, 64]} />
            <meshBasicMaterial color={atmosphereColor || color} transparent opacity={0.3} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <mesh>
            <ringGeometry args={[radius * 2.3, radius * 2.4, 64]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.1} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </group>
      )}

      {/* Các mặt trăng */}
      {moons && Array.from({ length: moons }, (_, i) => (
        <Moon key={i} distance={radius * 2 + 0.5 * i} speed={1.5 + i * 0.5} size={radius * 0.2} />
      ))}
    </group>
  );
}

function Moon({ distance, speed, size }: { distance: number; speed: number; size: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * speed;
    ref.current.position.x = Math.cos(t) * distance;
    ref.current.position.z = Math.sin(t) * distance;
  });

  return (
    <group ref={ref}>
      <Sphere args={[size, 32, 32]}>
        <meshStandardMaterial color="#8899aa" roughness={0.9} metalness={0.1} />
      </Sphere>
    </group>
  );
}

/* ==========================================
   SCENERY & EFFECTS
   ========================================== */

function OrbitRing({ distance }: { distance: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[distance, distance + 0.03, 128]} />
      <meshBasicMaterial color="#ffffff" opacity={0.03} transparent side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

function AsteroidBelt() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = 500; // Tăng số lượng tiểu hành tinh
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const data = useMemo(() =>
    Array.from({ length: count }, () => ({
      angle: Math.random() * Math.PI * 2,
      dist: 16 + Math.random() * 3, // Nằm giữa các hành tinh
      speed: 0.02 + Math.random() * 0.05,
      y: (Math.random() - 0.5) * 1.5,
      scale: 0.02 + Math.random() * 0.08,
      rotationSpeed: Math.random() * 2,
    })), []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    data.forEach((d, i) => {
      const a = d.angle + t * d.speed;
      dummy.position.set(Math.cos(a) * d.dist, d.y, Math.sin(a) * d.dist);
      dummy.scale.setScalar(d.scale);
      dummy.rotation.set(t * d.rotationSpeed, t * d.rotationSpeed, 0);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color="#554433" roughness={0.9} metalness={0.5} />
    </instancedMesh>
  );
}

function CinematicNebula() {
  return (
    <group>
      {/* Lõi tinh vân màu Tím/Xanh */}
      <Sparkles count={800} size={8} speed={0.1} opacity={0.4} color="#a855f7" scale={[80, 20, 80]} noise={1} />
      <Sparkles count={500} size={10} speed={0.2} opacity={0.3} color="#00f0ff" scale={[60, 30, 60]} noise={2} />
      <Sparkles count={300} size={15} speed={0.1} opacity={0.2} color="#ff44aa" scale={[100, 40, 100]} noise={1.5} />
      {/* Bụi vũ trụ liti */}
      <Sparkles count={1000} size={1.5} speed={0.3} opacity={0.6} color="#ffffff" scale={[120, 60, 120]} />
    </group>
  );
}

/* ==========================================
   MAIN EXPORT (VŨ TRỤ HOÀN CHỈNH)
   ========================================== */
export function SolarSystem() {
  const { isConnected } = useAppStore(); // Lấy state kết nối để tuỳ biến AutoRotate

  const orbits = [4, 7, 11, 17, 24]; // Khoảng cách các quỹ đạo

  return (
    <>
      {/* Background vũ trụ sâu thẳm */}
      <color attach="background" args={['#010206']} />
      <fogExp2 attach="fog" color="#010206" density={0.015} />

      <SensorRig>
        <group>
          {/* Ngôi sao nền */}
          <Stars radius={80} depth={50} count={8000} factor={5} saturation={1} fade speed={1} />
          
          <ambientLight intensity={0.2} color="#445588" />
          
          <CinematicNebula />
          <HyperSun />

          {/* Vẽ các vòng quỹ đạo mờ ảo */}
          {orbits.map((d) => <OrbitRing key={d} distance={d} />)}

          {/* Hành tinh 1 (Lava / Dung nham nóng bỏng) */}
          <CinematicPlanet 
            radius={0.3} distance={orbits[0]} speed={1.2} 
            color="#ff3300" surfaceColor="#220000" atmosphereColor="#ff6600" 
          />

          {/* Hành tinh 2 (Trái đất / Có sinh sống) */}
          <CinematicPlanet 
            radius={0.5} distance={orbits[1]} speed={0.8} 
            color="#00ffcc" surfaceColor="#0044bb" atmosphereColor="#00bbff" 
            moons={1} 
          />

          {/* Hành tinh 3 (Sao Hỏa / Cát đỏ) */}
          <CinematicPlanet 
            radius={0.4} distance={orbits[2]} speed={0.5} 
            color="#ff5522" surfaceColor="#aa3311" atmosphereColor="#ffaa44" 
            moons={2} 
          />

          {/* Vành đai Tiểu hành tinh nằm giữa */}
          <AsteroidBelt />

          {/* Hành tinh 4 (Sao Mộc / Gas Giant Khổng lồ) */}
          <CinematicPlanet 
            radius={1.2} distance={orbits[3]} speed={0.3} 
            color="#ddaa77" surfaceColor="#cc8855" atmosphereColor="#ffcc88" 
            hasRings moons={4} 
          />

          {/* Hành tinh 5 (Sao Hải Vương / Ice Giant Băng giá) */}
          <CinematicPlanet 
            radius={0.8} distance={orbits[4]} speed={0.15} 
            color="#4466ff" surfaceColor="#112266" atmosphereColor="#00aaff" 
            hasRings moons={2} 
          />
        </group>
      </SensorRig>

      <OrbitControls 
        enablePan={false} 
        enableZoom={true} 
        enableRotate={true} 
        autoRotate={!isConnected} // Tự động xoay quanh hệ mặt trời nếu chưa kết nối Găng tay
        autoRotateSpeed={0.3} 
        maxPolarAngle={Math.PI / 1.6} // Không cho camera chui tuột xuống dưới đáy
        minDistance={5} 
        maxDistance={60} 
      />
    </>
  );
}