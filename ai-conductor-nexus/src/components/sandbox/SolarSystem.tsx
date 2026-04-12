import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, OrbitControls, Stars, Trail, Float } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';
import { SensorRig } from './SensorRig';

function Sun() {
  const ref = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 0.1;
    }
    if (glowRef.current) {
      const s = 1.8 + Math.sin(clock.getElapsedTime() * 2) * 0.1;
      glowRef.current.scale.setScalar(s);
    }
  });

  return (
    <group>
      <Sphere ref={ref} args={[1.2, 64, 64]}>
        <meshStandardMaterial color="#ffff55" emissive="#ffaa00" emissiveIntensity={5} />
      </Sphere>
      <Sphere ref={glowRef} args={[1.5, 32, 32]}>
        <meshBasicMaterial color="#ffaa00" transparent opacity={0.3} side={THREE.BackSide} />
      </Sphere>
      <Sphere args={[2.2, 32, 32]}>
        <meshBasicMaterial color="#ffcc00" transparent opacity={0.1} side={THREE.BackSide} />
      </Sphere>
      <pointLight intensity={10} color="#ffddaa" distance={150} decay={1.5} />
    </group>
  );
}

function Planet({ radius, distance, speed, color, emissive, hasRing, moons }: {
  radius: number;
  distance: number;
  speed: number;
  color: string;
  emissive?: string;
  hasRing?: boolean;
  moons?: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * speed;
    ref.current.position.x = Math.cos(t) * distance;
    ref.current.position.z = Math.sin(t) * distance;
    if (meshRef.current) meshRef.current.rotation.y += 0.01;
  });

  return (
    <group ref={ref}>
      <Trail width={radius * 2} length={8} color={new THREE.Color(color)} attenuation={(w) => w * w}>
        <Sphere ref={meshRef} args={[radius, 32, 32]}>
          <meshStandardMaterial
            color={color}
            emissive={emissive || color}
            emissiveIntensity={0.8}
            roughness={0.4}
            metalness={0.4}
          />
        </Sphere>
      </Trail>
      {hasRing && (
        <mesh rotation={[-Math.PI / 3, 0, 0]}>
          <ringGeometry args={[radius * 1.4, radius * 2.2, 64]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
      {moons && Array.from({ length: moons }, (_, i) => (
        <Moon key={i} parentRef={ref} distance={radius * 2 + 0.3 * i} speed={2 + i} size={radius * 0.2} />
      ))}
    </group>
  );
}

function Moon({ parentRef, distance, speed, size }: {
  parentRef: React.RefObject<THREE.Group>;
  distance: number;
  speed: number;
  size: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * speed;
    ref.current.position.x = Math.cos(t) * distance;
    ref.current.position.z = Math.sin(t) * distance;
  });

  return (
    <Sphere ref={ref} args={[size, 16, 16]}>
      <meshStandardMaterial color="#aabbcc" emissive="#667788" emissiveIntensity={0.2} />
    </Sphere>
  );
}

function OrbitRing({ distance }: { distance: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[distance - 0.02, distance + 0.02, 128]} />
      <meshBasicMaterial color="#00f0ff" opacity={0.08} transparent side={THREE.DoubleSide} />
    </mesh>
  );
}

function AsteroidBelt() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = 200;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo(() =>
    Array.from({ length: count }, () => ({
      angle: Math.random() * Math.PI * 2,
      dist: 12 + Math.random() * 2,
      speed: 0.05 + Math.random() * 0.1,
      y: (Math.random() - 0.5) * 0.5,
      scale: 0.03 + Math.random() * 0.06,
    })), []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    data.forEach((d, i) => {
      const a = d.angle + t * d.speed;
      dummy.position.set(Math.cos(a) * d.dist, d.y, Math.sin(a) * d.dist);
      dummy.scale.setScalar(d.scale);
      dummy.rotation.set(t * 0.5, t * 0.3, 0);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#887766" roughness={0.8} />
    </instancedMesh>
  );
}

function Nebula() {
  const particles = useMemo(() => {
    const positions = new Float32Array(500 * 3);
    const colors = new Float32Array(500 * 3);
    const palette = [
      new THREE.Color('#a855f7'),
      new THREE.Color('#00f0ff'),
      new THREE.Color('#ff44aa'),
      new THREE.Color('#4488ff'),
    ];
    for (let i = 0; i < 500; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 40 + Math.random() * 30;
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
      const c = palette[i % palette.length];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, colors };
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[particles.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[particles.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.4} vertexColors transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

export function SolarSystem() {

  return (
    <>
    <SensorRig>
      <Stars radius={100} depth={60} count={6000} factor={6} saturation={1} />
      <ambientLight intensity={0.5} color="#ffffff" />
      
        <Nebula />
        <Sun />
        {[3, 5, 7.5, 10, 15].map((d) => <OrbitRing key={d} distance={d} />)}
        <Planet radius={0.25} distance={3} speed={1.5} color="#aa8866" emissive="#775533" />
        <Nebula />
        <Sun />

        {[3, 5, 7.5, 10, 15].map((d) => <OrbitRing key={d} distance={d} />)}

        <Planet radius={0.25} distance={3} speed={1.5} color="#aa8866" emissive="#775533" />
        <Planet radius={0.35} distance={5} speed={1.0} color="#4488ff" emissive="#2266cc" moons={1} />
        <Planet radius={0.3} distance={7.5} speed={0.7} color="#cc4422" emissive="#882211" />
        <Planet radius={0.8} distance={10} speed={0.35} color="#cc8844" emissive="#886633" hasRing moons={2} />
        <Planet radius={0.5} distance={15} speed={0.2} color="#6688aa" emissive="#445566" hasRing />

        <AsteroidBelt />
      

      <OrbitControls enablePan enableZoom enableRotate autoRotate autoRotateSpeed={0.2} />
      </SensorRig>
    </>
  );
}
