import { Canvas, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

function WireframeSphere() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
      meshRef.current.rotation.x += delta * 0.1;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1.5, 24, 24]} />
      <meshBasicMaterial color="#00f0ff" wireframe transparent opacity={0.6} />
    </mesh>
  );
}

export function DigitalTwin() {
  return (
    <div className="glass neon-border rounded-xl p-4 lg:p-5">
      <h3 className="font-mono text-xs tracking-widest text-muted-foreground mb-3">
        DIGITAL TWIN // 3D PREVIEW
      </h3>
      <div className="h-[250px] rounded-lg overflow-hidden bg-background/50">
        <Canvas camera={{ position: [0, 0, 4] }}>
          <ambientLight intensity={0.3} />
          <pointLight position={[5, 5, 5]} intensity={0.8} color="#00f0ff" />
          <WireframeSphere />
        </Canvas>
      </div>
    </div>
  );
}
