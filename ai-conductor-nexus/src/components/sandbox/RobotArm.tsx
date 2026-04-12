import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';

/* ── Joint component ── */
function Joint({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.18, 24, 24]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} metalness={0.9} roughness={0.1} />
    </mesh>
  );
}

/* ── Arm segment ── */
function Segment({ length, color }: { length: number; color: string }) {
  return (
    <group position={[0, length / 2, 0]}>
      <mesh>
        <boxGeometry args={[0.14, length, 0.14]} />
        <meshStandardMaterial color="#ffffff" metalness={0.3} roughness={0.1} />
      </mesh>
      {/* Thêm rãnh phát sáng trên thân segment */}
      <mesh position={[0, 0, 0.08]}>
        <planeGeometry args={[0.02, length * 0.8]} />
        <meshStandardMaterial color="#ff3300" emissive="#ff3300" emissiveIntensity={2.5} />
      </mesh>
      <mesh position={[0, 0, -0.08]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.02, length * 0.8]} />
        <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={2.5} />
      </mesh>
    </group>
  );
}

/* ── Gripper claw ── */
function Gripper({ open }: { open: boolean }) {
  const leftRef = useRef<THREE.Group>(null);
  const rightRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const target = open ? 0.35 : 0.08;
    if (leftRef.current) leftRef.current.position.z = THREE.MathUtils.lerp(leftRef.current.position.z, target, 0.05);
    if (rightRef.current) rightRef.current.position.z = THREE.MathUtils.lerp(rightRef.current.position.z, -target, 0.05);
  });

  return (
    <group>
      {/* Wrist */}
      <mesh>
        <cylinderGeometry args={[0.1, 0.12, 0.15, 16]} />
        <meshStandardMaterial color="#ffffff" metalness={0.3} roughness={0.1} />
      </mesh>
      {/* Left claw */}
      <group ref={leftRef} position={[0, 0, 0.2]}>
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[0.04, 0.4, 0.04]} />
          <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={0.6} metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[0, -0.4, 0.02]}>
          <boxGeometry args={[0.04, 0.06, 0.08]} />
          <meshStandardMaterial color="#ff44aa" emissive="#ff44aa" emissiveIntensity={0.8} />
        </mesh>
      </group>
      {/* Right claw */}
      <group ref={rightRef} position={[0, 0, -0.2]}>
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[0.04, 0.4, 0.04]} />
          <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={0.6} metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[0, -0.4, -0.02]}>
          <boxGeometry args={[0.04, 0.06, 0.08]} />
          <meshStandardMaterial color="#ff44aa" emissive="#ff44aa" emissiveIntensity={0.8} />
        </mesh>
      </group>
    </group>
  );
}

/* ── Holographic display ring ── */
function HoloRing({ y, radius, color }: { y: number; radius: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = clock.getElapsedTime() * 0.5;
      (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(clock.getElapsedTime() * 2 + y) * 0.05;
    }
  });
  return (
    <mesh ref={ref} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.02, radius, 64]} />
      <meshBasicMaterial color={color} transparent opacity={0.15} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ── Platform base ── */
function Platform() {
  return (
    <group>
      {/* Main base */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.8, 0.9, 0.16, 32]} />
        <meshStandardMaterial color="#f0f4f8" metalness={0.2} roughness={0.1} />
      </mesh>
      {/* Base ring glow */}
      <mesh position={[0, 0.17, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 0.78, 64]} />
        <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={2} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* Secondary base */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[1.0, 1.1, 0.04, 32]} />
        <meshStandardMaterial color="#223" metalness={0.95} roughness={0.05} />
      </mesh>
    </group>
  );
}

/* ── Main Robot Arm ── */
export function RobotArm() {
  const { sensorData, isConnected, lastGesture } = useAppStore(); // Lấy thêm lastGesture
  
  const baseRef = useRef<THREE.Group>(null);
  const shoulder = useRef<THREE.Group>(null);
  const elbow = useRef<THREE.Group>(null);
  const wrist = useRef<THREE.Group>(null);
  
  // Biến ngàm: true = Mở, false = Nắm
  const [gripOpen, setGripOpen] = useState(true);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    
    if (isConnected) {
      // BÍ KÍP 1: TRỤC X GIA TỐC (ax) ĐIỀU KHIỂN KHỚP VAI (Cúi/Ngửa tay)
      const targetShoulder = THREE.MathUtils.clamp((sensorData.ax / 20), -1.5, 1.5);
      if (shoulder.current) {
        shoulder.current.rotation.z = THREE.MathUtils.damp(shoulder.current.rotation.z, targetShoulder, 4, delta);
      }

      // BÍ KÍP 2: TRỤC Y GIA TỐC (ay) ĐIỀU KHIỂN KHUỶU TAY (Nghiêng trái/phải)
      const targetElbow = THREE.MathUtils.clamp((sensorData.ay / 20), -1.5, 1.5);
      if (elbow.current) {
        elbow.current.rotation.z = THREE.MathUtils.damp(elbow.current.rotation.z, Math.abs(targetElbow) - 0.5, 4, delta);
      }

      // BÍ KÍP 3: TRỤC Z CON QUAY (gz) ĐIỀU KHIỂN CỔ TAY (Vặn tay nắm cửa)
      if (wrist.current) {
         // Lấy vận tốc vặn tay để xoay cổ tay robot
         const wristSpeed = sensorData.gz * 0.01;
         wrist.current.rotation.y += wristSpeed * delta;
      }

      // // BÍ KÍP 4: KẾT HỢP AI ĐỂ MỞ/ĐÓNG NGÀM (GRIPPER)
      // // Nếu AI phát hiện ông NẮM TAY (FIST) -> Đóng ngàm. Nếu MỞ TAY (OPEN) -> Mở ngàm.
      // if (lastGesture === 'FIST') setGripOpen(false);
      // if (lastGesture === 'OPEN') setGripOpen(true);

    } else {
      // Chế độ tự động nếu chưa kết nối Găng tay 
      if (baseRef.current) baseRef.current.rotation.y = THREE.MathUtils.damp(baseRef.current.rotation.y, Math.sin(t * 0.3) * 0.8, 2, delta);
      if (shoulder.current) shoulder.current.rotation.z = THREE.MathUtils.damp(shoulder.current.rotation.z, Math.sin(t * 0.5) * 0.4, 2, delta);
      if (elbow.current) elbow.current.rotation.z = THREE.MathUtils.damp(elbow.current.rotation.z, Math.sin(t * 0.7 + 1) * 0.5, 2, delta);
      setGripOpen(Math.sin(t * 0.8) > 0);
    }
  });

  return (
    <>
      <color attach="background" args={['#050510']} />
      <fog attach="fog" args={['#050510', 10, 30]} />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[4, 6, 4]} intensity={5.0} color="#00ffff" />
      <pointLight position={[-4, 4, -4]} intensity={3.5} color="#d988ff" />
      <pointLight position={[0, 8, 0]} intensity={3.5} color="#ffaadd" />
      <spotLight position={[0, 10, 5]} intensity={5.0} angle={0.6} penumbra={0.4} color="#ffffff" castShadow />

      <Sparkles count={120} size={2.5} speed={0.3} opacity={0.6} color="#00f0ff" scale={[12, 8, 12]} />

      {/* Holographic rings */}
      <HoloRing y={0.3} radius={1.5} color="#ff3300" />
      <HoloRing y={1.5} radius={1.0} color="#00f0ff" />
      <HoloRing y={2.8} radius={0.7} color="#ff3300" />

      <Platform />

      <group ref={baseRef} position={[0, 0.2, 0]}>
        {/* Base rotator */}
        <mesh>
          <cylinderGeometry args={[0.22, 0.25, 0.3, 16]} />
          <meshStandardMaterial color="#1a1c23" metalness={0.8} roughness={0.2} />
        </mesh>

        <group ref={shoulder} position={[0, 0.15, 0]}>
          <Joint position={[0, 0, 0]} color="#1a1c23" />
          <Segment length={1.2} color="#ffffff" />

          <group ref={elbow} position={[0, 1.2, 0]}>
            <Joint position={[0, 0, 0]} color="#1a1c23" />
            <Segment length={1.0} color="#ffffff" />

            <group ref={wrist} position={[0, 1.0, 0]}>
              <Joint position={[0, 0, 0]} color="#1a1c23" />
              <Segment length={0.6} color="#ffffff" />

              <group position={[0, 0.6, 0]}>
                <Gripper open={gripOpen} />
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#111827" metalness={0.4} roughness={0.7} />
      </mesh>

      <Grid
        args={[40, 40]}
        cellSize={0.5}
        cellThickness={0.3}
        cellColor="#0a1520"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#00f0ff"
        fadeDistance={18}
        infiniteGrid
        position={[0, 0.001, 0]}
      />

      <OrbitControls enablePan enableZoom enableRotate autoRotate autoRotateSpeed={0.4} maxPolarAngle={Math.PI / 2.1} minDistance={2} maxDistance={12} />
    </>
  );
}
