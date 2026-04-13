import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Sparkles, Environment, Float } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';

/* ==========================================
   MATERIALS & COLORS (PREMIUM SCI-FI LOOK)
   ========================================== */
const COLORS = {
  primary: '#0a0d14', // Dark Titanium
  secondary: '#d1d5db', // Silver
  neonCyan: '#00f0ff', // Cyberpunk Blue
  neonPink: '#ff0055', // Cyberpunk Pink
  glowOrange: '#ff5500', // Warning/Heat Glow
};

const armorMaterial = new THREE.MeshPhysicalMaterial({
  color: COLORS.primary,
  metalness: 0.9,
  roughness: 0.2,
  clearcoat: 0.5,
  clearcoatRoughness: 0.3,
});

const silverMaterial = new THREE.MeshStandardMaterial({
  color: COLORS.secondary,
  metalness: 0.6,
  roughness: 0.4,
});

/* ==========================================
   ROBOT COMPONENTS
   ========================================== */

/* ── Glowing Cyber Joint ── */
function CyberJoint({ position }: { position?: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshStandardMaterial color="#111" metalness={1} roughness={0.1} />
      </mesh>
      {/* Neon Ring inside joint */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.16, 0.015, 16, 32]} />
        <meshStandardMaterial color={COLORS.neonCyan} emissive={COLORS.neonCyan} emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

/* ── Cybernetic Hand (Gripper upgraded) ── */
function CyberHand({ open }: { open: boolean }) {
  const leftRef = useRef<THREE.Group>(null);
  const rightRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    // Logic Ngàm (Gripper) - Mở/Đóng cực mượt
    const target = open ? 0.4 : 0.1;
    if (leftRef.current) leftRef.current.position.x = THREE.MathUtils.damp(leftRef.current.position.x, target, 5, delta);
    if (rightRef.current) rightRef.current.position.x = THREE.MathUtils.damp(rightRef.current.position.x, -target, 5, delta);
  });

  return (
    <group position={[0, -0.3, 0]}>
      {/* Palm */}
      <mesh>
        <boxGeometry args={[0.2, 0.2, 0.1]} />
        <primitive object={armorMaterial} />
      </mesh>
      {/* Energy Core in Palm */}
      <mesh position={[0, -0.05, 0.06]}>
        <circleGeometry args={[0.04, 32]} />
        <meshStandardMaterial color={COLORS.neonCyan} emissive={COLORS.neonCyan} emissiveIntensity={3} />
      </mesh>

      {/* Left Claw/Finger */}
      <group ref={leftRef} position={[0.2, -0.1, 0]}>
        <mesh position={[0, -0.2, 0]} rotation={[0, 0, 0.2]}>
          <boxGeometry args={[0.06, 0.4, 0.08]} />
          <meshStandardMaterial color="#222" metalness={0.8} />
        </mesh>
        <mesh position={[0.02, -0.4, 0]}>
          <boxGeometry args={[0.02, 0.1, 0.1]} />
          <meshStandardMaterial color={COLORS.glowOrange} emissive={COLORS.glowOrange} emissiveIntensity={2} />
        </mesh>
      </group>

      {/* Right Claw/Finger */}
      <group ref={rightRef} position={[-0.2, -0.1, 0]}>
        <mesh position={[0, -0.2, 0]} rotation={[0, 0, -0.2]}>
          <boxGeometry args={[0.06, 0.4, 0.08]} />
          <meshStandardMaterial color="#222" metalness={0.8} />
        </mesh>
        <mesh position={[-0.02, -0.4, 0]}>
          <boxGeometry args={[0.02, 0.1, 0.1]} />
          <meshStandardMaterial color={COLORS.glowOrange} emissive={COLORS.glowOrange} emissiveIntensity={2} />
        </mesh>
      </group>
    </group>
  );
}

/* ── Head ── */
function RobotHead() {
  const visorRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    // Hiệu ứng đèn Visor scan qua lại như Cylon/RoboCop
    if (visorRef.current) {
      const material = visorRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 2 + Math.sin(clock.getElapsedTime() * 5) * 1;
    }
  });

  return (
    <group position={[0, 2.6, 0]}>
      {/* Neck */}
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.1, 0.15, 0.4, 16]} />
        <primitive object={silverMaterial} />
      </mesh>
      {/* Main Helmet */}
      <mesh>
        <boxGeometry args={[0.5, 0.5, 0.6]} />
        <primitive object={armorMaterial} />
      </mesh>
      {/* Cyber Visor */}
      <mesh ref={visorRef} position={[0, 0.05, 0.31]}>
        <boxGeometry args={[0.4, 0.15, 0.05]} />
        <meshStandardMaterial color={COLORS.neonPink} emissive={COLORS.neonPink} emissiveIntensity={3} />
      </mesh>
      {/* Ear antennas */}
      <mesh position={[0.26, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 0.1, 16]} />
        <meshStandardMaterial color={COLORS.neonCyan} emissive={COLORS.neonCyan} emissiveIntensity={1} />
      </mesh>
      <mesh position={[-0.26, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 0.1, 16]} />
        <meshStandardMaterial color={COLORS.neonCyan} emissive={COLORS.neonCyan} emissiveIntensity={1} />
      </mesh>
    </group>
  );
}

/* ── Holographic Orbit Rings ── */
function HoloRing({ y, radius, color, speed, reverse = false }: { y: number; radius: number; color: string; speed: number; reverse?: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = clock.getElapsedTime() * speed * (reverse ? -1 : 1);
      (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.sin(clock.getElapsedTime() * 3 + y) * 0.1;
    }
  });
  return (
    <mesh ref={ref} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.02, radius + 0.02, 64]} />
      <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

/* ── Sci-Fi Platform ── */
function Platform() {
  return (
    <group position={[0, -2.5, 0]}>
      {/* Main floor pad */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[2.5, 3.0, 0.2, 64]} />
        <primitive object={armorMaterial} />
      </mesh>
      {/* Glowing Edge */}
      <mesh position={[0, 0.21, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.3, 2.4, 64]} />
        <meshStandardMaterial color={COLORS.neonCyan} emissive={COLORS.neonCyan} emissiveIntensity={3} transparent opacity={0.8} />
      </mesh>
      {/* Inner tech circle */}
      <mesh position={[0, 0.205, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 32]} />
        <meshStandardMaterial color="#05070a" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
}

/* ==========================================
   MAIN FULL ROBOT COMPONENT
   ========================================== */
export function RobotArm() {
  const { sensorData, isConnected, lastGesture } = useAppStore();
  
  // Refs cho body và cánh tay TRÁI (tự động)
  const bodyRef = useRef<THREE.Group>(null);
  const leftShoulder = useRef<THREE.Group>(null);
  const leftElbow = useRef<THREE.Group>(null);
  const chestCore = useRef<THREE.Mesh>(null);

  // Refs cho cánh tay PHẢI (ĐIỀU KHIỂN BẰNG GĂNG TAY)
  const rightShoulder = useRef<THREE.Group>(null);
  const rightElbow = useRef<THREE.Group>(null);
  const rightWrist = useRef<THREE.Group>(null);
  
  const [gripOpen, setGripOpen] = useState(true);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    
    // --- IDLE ANIMATIONS CHO TOÀN CƠ THỂ ---
    if (bodyRef.current) {
      // Robot thở (nhấp nhô nhẹ) và hơi xoay
      bodyRef.current.position.y = Math.sin(t * 1.5) * 0.05;
      if (!isConnected) {
        bodyRef.current.rotation.y = THREE.MathUtils.damp(bodyRef.current.rotation.y, Math.sin(t * 0.5) * 0.3, 2, delta);
      }
    }

    // Nhịp đập lõi năng lượng ngực
    if (chestCore.current) {
      (chestCore.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 2 + Math.sin(t * 4) * 1.5;
    }

    // Cánh tay trái tự động cử động nhẹ (Idle)
    if (leftShoulder.current) leftShoulder.current.rotation.x = Math.sin(t * 1.2) * 0.1;
    if (leftElbow.current) leftElbow.current.rotation.x = -0.2 + Math.sin(t * 1.5) * 0.1;

    // --- LOGIC ĐIỀU KHIỂN CỦA BẠN (Áp dụng lên Tay Phải) ---
    if (isConnected) {
      // BÍ KÍP 1: TRỤC X GIA TỐC (ax) ĐIỀU KHIỂN KHỚP VAI (Đưa tay ra trước/sau)
      const targetShoulderX = THREE.MathUtils.clamp((sensorData.ax / 20), -2.0, 2.0);
      if (rightShoulder.current) {
        rightShoulder.current.rotation.x = THREE.MathUtils.damp(rightShoulder.current.rotation.x, targetShoulderX, 6, delta);
      }

      // BÍ KÍP 2: TRỤC Y GIA TỐC (ay) ĐIỀU KHIỂN KHUỶU TAY (Gập tay)
      const targetElbowX = THREE.MathUtils.clamp((sensorData.ay / 20), -2.0, 0); // Âm để gập lên
      if (rightElbow.current) {
        rightElbow.current.rotation.x = THREE.MathUtils.damp(rightElbow.current.rotation.x, targetElbowX, 6, delta);
      }

      // BÍ KÍP 3: TRỤC Z CON QUAY (gz) ĐIỀU KHIỂN CỔ TAY (Vặn tay)
      if (rightWrist.current) {
         const wristSpeed = sensorData.gz * 0.01;
         rightWrist.current.rotation.y += wristSpeed * delta;
      }

      // BÍ KÍP 4: GESTURE AI ĐIỀU KHIỂN NGÀM
      if (lastGesture === 'PUSH') setGripOpen(false);
      // if (lastGesture === 'POINT') setGripOpen(true);

    } else {
      // Demo Mode: Tay phải tự múa khi chưa kết nối
      if (rightShoulder.current) rightShoulder.current.rotation.x = THREE.MathUtils.damp(rightShoulder.current.rotation.x, Math.sin(t) * 0.5 - 0.5, 2, delta);
      if (rightElbow.current) rightElbow.current.rotation.x = THREE.MathUtils.damp(rightElbow.current.rotation.x, Math.sin(t * 1.5) * 0.5 - 0.8, 2, delta);
      setGripOpen(Math.sin(t * 2) > 0);
    }
  });

  return (
    <>
      {/* --- MÔI TRƯỜNG & ÁNH SÁNG --- */}
      <color attach="background" args={['#02040a']} />
      <fog attach="fog" args={['#02040a', 8, 30]} />
      <Environment preset="city" />

      <ambientLight intensity={0.4} />
      <pointLight position={[4, 6, 4]} intensity={50} color={COLORS.neonCyan} distance={20} />
      <pointLight position={[-4, 4, -4]} intensity={30} color={COLORS.neonPink} distance={20} />
      <spotLight position={[0, 10, 8]} intensity={80} angle={0.5} penumbra={0.5} color="#ffffff" castShadow />

      <Sparkles count={200} size={2.5} speed={0.5} opacity={0.8} color={COLORS.neonCyan} scale={[10, 10, 10]} />

      {/* Holograms */}
      <HoloRing y={-2.2} radius={3.5} color={COLORS.neonCyan} speed={0.2} />
      <HoloRing y={0} radius={2.5} color={COLORS.neonPink} speed={0.5} reverse />
      <HoloRing y={2.5} radius={1.8} color={COLORS.neonCyan} speed={0.3} />

      <Platform />

      {/* --- CƠ THỂ ROBOT CHÍNH --- */}
      <group ref={bodyRef} position={[0, 0, 0]}>
        
        {/* ĐẦU */}
        <RobotHead />

        {/* THÂN (TORSO) */}
        <group position={[0, 1.4, 0]}>
          {/* Ngực */}
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[1.2, 0.8, 0.5]} />
            <primitive object={armorMaterial} />
          </mesh>
          {/* Lõi Năng Lượng (Chest Core) */}
          <mesh ref={chestCore} position={[0, 0.4, 0.26]}>
            <circleGeometry args={[0.15, 32]} />
            <meshStandardMaterial color={COLORS.neonCyan} emissive={COLORS.neonCyan} />
          </mesh>
          {/* Bụng */}
          <mesh position={[0, -0.2, 0]}>
            <boxGeometry args={[0.8, 0.6, 0.4]} />
            <primitive object={silverMaterial} />
          </mesh>
          {/* Hông */}
          <mesh position={[0, -0.7, 0]}>
            <boxGeometry args={[1.0, 0.4, 0.5]} />
            <primitive object={armorMaterial} />
          </mesh>
        </group>

        {/* CÁNH TAY TRÁI (TỰ ĐỘNG/IDLE) */}
        <group ref={leftShoulder} position={[-0.8, 1.8, 0]}>
          <CyberJoint />
          <mesh position={[0, -0.5, 0]}>
            <cylinderGeometry args={[0.15, 0.12, 1.0, 16]} />
            <primitive object={silverMaterial} />
          </mesh>
          <group ref={leftElbow} position={[0, -1.0, 0]}>
            <CyberJoint />
            <mesh position={[0, -0.45, 0]}>
              <boxGeometry args={[0.2, 0.9, 0.2]} />
              <primitive object={armorMaterial} />
            </mesh>
            <group position={[0, -0.9, 0]}>
              <CyberHand open={false} />
            </group>
          </group>
        </group>

        {/* CÁNH TAY PHẢI (ĐƯỢC ĐIỀU KHIỂN BỞI GĂNG TAY GESTURE) */}
        <group ref={rightShoulder} position={[0.8, 1.8, 0]}>
          <CyberJoint />
          {/* Bắp tay */}
          <mesh position={[0, -0.5, 0]}>
            <cylinderGeometry args={[0.15, 0.12, 1.0, 16]} />
            <primitive object={silverMaterial} />
          </mesh>
          
          {/* Khuỷu tay */}
          <group ref={rightElbow} position={[0, -1.0, 0]}>
            <CyberJoint />
            {/* Cẳng tay */}
            <mesh position={[0, -0.45, 0]}>
              <boxGeometry args={[0.2, 0.9, 0.2]} />
              <primitive object={armorMaterial} />
            </mesh>
            {/* Vạch năng lượng trên cẳng tay */}
            <mesh position={[0.11, -0.45, 0]}>
              <planeGeometry args={[0.05, 0.6]} />
              <meshStandardMaterial color={COLORS.neonPink} emissive={COLORS.neonPink} emissiveIntensity={2} />
            </mesh>
            
            {/* Cổ tay và Bàn tay */}
            <group ref={rightWrist} position={[0, -0.9, 0]}>
              <CyberJoint position={[0, -0.1, 0]} />
              <CyberHand open={gripOpen} />
            </group>
          </group>
        </group>

        {/* CHÂN TRÁI */}
        <group position={[-0.3, 0.5, 0]}>
          <CyberJoint />
          <mesh position={[0, -0.7, 0]}>
            <boxGeometry args={[0.3, 1.4, 0.3]} />
            <primitive object={armorMaterial} />
          </mesh>
          <CyberJoint position={[0, -1.4, 0]} />
          <mesh position={[0, -2.1, 0]}>
            <boxGeometry args={[0.25, 1.4, 0.25]} />
            <primitive object={silverMaterial} />
          </mesh>
          <mesh position={[0, -2.85, 0.1]}>
            <boxGeometry args={[0.35, 0.2, 0.5]} />
            <primitive object={armorMaterial} />
          </mesh>
        </group>

        {/* CHÂN PHẢI */}
        <group position={[0.3, 0.5, 0]}>
          <CyberJoint />
          <mesh position={[0, -0.7, 0]}>
            <boxGeometry args={[0.3, 1.4, 0.3]} />
            <primitive object={armorMaterial} />
          </mesh>
          <CyberJoint position={[0, -1.4, 0]} />
          <mesh position={[0, -2.1, 0]}>
            <boxGeometry args={[0.25, 1.4, 0.25]} />
            <primitive object={silverMaterial} />
          </mesh>
          <mesh position={[0, -2.85, 0.1]}>
            <boxGeometry args={[0.35, 0.2, 0.5]} />
            <primitive object={armorMaterial} />
          </mesh>
        </group>

      </group>

      {/* Grid Floor */}
      <Grid
        args={[40, 40]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#111"
        sectionSize={4}
        sectionThickness={1.5}
        sectionColor={COLORS.neonCyan}
        fadeDistance={25}
        infiniteGrid
        position={[0, -2.49, 0]}
      />

      <OrbitControls 
        enablePan={false} 
        enableZoom 
        enableRotate 
        autoRotate={!isConnected} // Tự xoay camera nếu chưa kết nối
        autoRotateSpeed={0.5} 
        maxPolarAngle={Math.PI / 1.8} 
        minDistance={4} 
        maxDistance={15} 
        target={[0, 1, 0]} 
      />
    </>
  );
}