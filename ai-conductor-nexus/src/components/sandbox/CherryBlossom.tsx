import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Sparkles, Float, Environment, ContactShadows, Html } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';
import { SensorRig } from './SensorRig';

/* ── Nút Fullscreen Overlay (Sử dụng Html của Drei để không bị lỗi THREE namespace) ── */
function FullscreenOverlay() {
  const { gl } = useThree();
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Lấy thẻ div chứa Canvas để phóng to
  const container = gl.domElement.parentElement;

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!container) return;
    if (!document.fullscreenElement) {
      try {
        await container.requestFullscreen();
      } catch (err) {
        console.error("Lỗi khi mở Fullscreen:", err);
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    }
  };

  // Dùng Html fullscreen: Tạo một lớp UI 2D đè lên toàn bộ Canvas
  return (
    <Html fullscreen zIndexRange={[1000, 0]}>
      {/* Container vô hình để không cản trở chuột xoay 3D (OrbitControls) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Nút bấm (bật lại pointer-events để có thể click được) */}
        <button 
          onClick={toggleFullscreen}
          className="pointer-events-auto absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg border border-white/20 text-white transition-all shadow-[0_0_15px_rgba(255,183,197,0.3)] hover:shadow-[0_0_20px_rgba(255,183,197,0.6)]"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
          )}
        </button>
      </div>
    </Html>
  );
}

/* ── Tree trunk & branches ── */
function TreeTrunk() {
  return (
    <group castShadow receiveShadow>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.2, 0.5, 3, 16]} />
        <meshStandardMaterial color="#2d1b19" roughness={0.9} bumpScale={0.02} />
      </mesh>
      <mesh position={[0.6, 2.5, 0.2]} rotation={[0, 0, -0.7]}>
        <cylinderGeometry args={[0.08, 0.2, 2.2, 12]} />
        <meshStandardMaterial color="#2d1b19" roughness={0.9} />
      </mesh>
      <mesh position={[-0.5, 2.2, -0.4]} rotation={[0.2, 0, 0.8]}>
        <cylinderGeometry args={[0.06, 0.18, 2.5, 12]} />
        <meshStandardMaterial color="#2d1b19" roughness={0.9} />
      </mesh>
      <mesh position={[0.1, 2.8, 0.7]} rotation={[-0.8, 0.4, 0]}>
        <cylinderGeometry args={[0.05, 0.15, 1.8, 12]} />
        <meshStandardMaterial color="#2d1b19" roughness={0.9} />
      </mesh>
    </group>
  );
}

/* ── Cherry Blossom Flowers ── */
function Blossoms() {
  const clusters = useMemo(() => [
    { pos: [1.6, 3.5, 0.4], size: 1.6 },
    { pos: [-1.8, 3.2, -1.0], size: 1.8 },
    { pos: [0.4, 3.8, 1.6], size: 1.5 },
    { pos: [0, 4.4, 0], size: 2.2 },
    { pos: [1.0, 3.0, -1.2], size: 1.3 },
    { pos: [-0.8, 4.0, 0.8], size: 1.7 },
  ], []);

  return (
    <group>
      {clusters.map((c, i) => (
        <Float key={i} speed={2} rotationIntensity={0.2} floatIntensity={0.3}>
          <mesh position={c.pos as [number, number, number]}>
            <icosahedronGeometry args={[c.size * 0.8, 2]} />
            <meshStandardMaterial color="#ffb7c5" emissive="#ff6b8b" emissiveIntensity={2} roughness={0.2} />
          </mesh>
          <mesh position={c.pos as [number, number, number]} scale={1.2}>
             <icosahedronGeometry args={[c.size, 2]} />
             <meshPhysicalMaterial color="#ffffff" transmission={0.8} opacity={1} roughness={0.1} ior={1.5} thickness={2} transparent />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

/* ── Falling Petals ── */
function FallingPetals({ windSpeed }: { windSpeed: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = 200;
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 15,
      y: Math.random() * 10,
      z: (Math.random() - 0.5) * 15,
      speed: 0.5 + Math.random() * 1.5,
      spinSpeed: Math.random() * 5,
      scale: 0.03 + Math.random() * 0.05,
      phase: Math.random() * Math.PI * 2
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      p.y -= 0.02 * p.speed;
      if (p.y < -0.5) {
        p.y = 8 + Math.random() * 2;
        p.x = (Math.random() - 0.5) * 12;
        p.z = (Math.random() - 0.5) * 12;
      }
      const driftX = Math.sin(t * p.spinSpeed + p.phase) * 0.03 + windSpeed * 0.08;
      const driftZ = Math.cos(t * p.spinSpeed + p.phase) * 0.03;
      p.x += driftX;
      p.z += driftZ;

      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(t * p.spinSpeed, t * p.spinSpeed * 0.8, t * p.spinSpeed * 1.5);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <coneGeometry args={[1, 2, 4]} />
      <meshStandardMaterial color="#ffcce0" emissive="#ff9eb0" emissiveIntensity={1.5} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

/* ── Bệ đỡ hòn đảo lơ lửng ── */
function FloatingBase() {
  return (
    <group position={[0, -0.5, 0]}>
      <mesh position={[0, 0.4, 0]} receiveShadow>
        <cylinderGeometry args={[3.8, 4.2, 0.2, 32]} />
        <meshStandardMaterial color="#2d3a22" roughness={1} />
      </mesh>
      <mesh position={[0, 0, 0]} receiveShadow>
        <cylinderGeometry args={[4.2, 3.5, 0.8, 32]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.51, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.5, 32]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.1} metalness={0.8} />
      </mesh>
      <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.7, 3.9, 64]} />
        <meshStandardMaterial color="#ff6b8b" emissive="#ff6b8b" emissiveIntensity={4} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ── Main Export (Cắm thẳng vào trong thẻ <Canvas> ngoài component cha) ── */
export function CherryBlossom() {
  const groupRef = useRef<THREE.Group>(null);
  const { sensorData, isConnected } = useAppStore();
  
  useFrame((_, delta) => {
    if (groupRef.current && isConnected) {
      if (Math.abs(sensorData.gy) > 200) {
        groupRef.current.rotation.y += (sensorData.gy / 32768) * Math.PI * 1.5 * delta;
      }
      const targetPitch = (sensorData.ax / 16384) * (Math.PI / 6); 
      const targetRoll = (sensorData.ay / 16384) * (Math.PI / 6); 
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetPitch, 0.08);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, -targetRoll, 0.08);
    } else if (groupRef.current) {
      const t = _.clock.getElapsedTime();
      groupRef.current.position.y = Math.sin(t * 1.5) * 0.1 - 1;
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.05);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, 0.05);
    }
  });

  return (
    <>
      {/* 1. Kích hoạt nút Fullscreen an toàn bằng Html */}
      <FullscreenOverlay />

      {/* 2. Cảnh quan 3D */}
      <color attach="background" args={['#0d0508']} />
      <fog attach="fog" args={['#0d0508', 8, 30]} />
      <Environment preset="night" />

      <ambientLight intensity={0.4} color="#ffb7c5" />
      <pointLight position={[0, 8, 0]} intensity={3} color="#ff9eb0" decay={2} distance={20} castShadow />
      <pointLight position={[-4, 2, -4]} intensity={2} color="#88aaff" decay={2} distance={15} />
      
      <SensorRig>
        <group ref={groupRef} position={[0, -1, 0]}>
          <TreeTrunk />
          <Blossoms />
          <FallingPetals windSpeed={isConnected ? sensorData.gx * 0.005 : 0.05} />
          <FloatingBase />

          <Float speed={3} floatIntensity={0.5}>
            <mesh position={[2.5, 1.5, 2]}>
              <octahedronGeometry args={[0.3, 0]} />
              <meshStandardMaterial color="#fff" emissive="#ffaa55" emissiveIntensity={5} />
            </mesh>
            <pointLight position={[2.5, 1.5, 2]} intensity={2} color="#ffaa55" distance={8} />
          </Float>
        </group>
      </SensorRig>

      <ContactShadows position={[0, -2.5, 0]} opacity={0.6} scale={15} blur={2.5} far={4} color="#ffb7c5" />
      
      <Grid
        args={[40, 40]}
        cellSize={0.5}
        cellThickness={0.3}
        cellColor="#2a0d15"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#ff6b8b"
        fadeDistance={25}
        infiniteGrid
        position={[0, -2.5, 0]}
      />

      <Sparkles count={150} size={2.5} speed={0.5} opacity={0.8} color="#ffeb99" scale={[15, 10, 15]} position={[0, 2, 0]} />
      
      {/* 3. Hiệu ứng Post-Processing */}
      <EffectComposer disableNormalPass>
        <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>

      <OrbitControls enablePan={false} enableZoom autoRotate autoRotateSpeed={0.3} minDistance={5} maxDistance={25} maxPolarAngle={Math.PI / 2.05} />
    </>
  );
}