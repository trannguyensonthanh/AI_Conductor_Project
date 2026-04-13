import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';
import { toast } from '@/hooks/use-toast';

export function SensorRig({ children }: { children: React.ReactNode }) {
  const rigRef = useRef<THREE.Group>(null);
  const { sensorData, isConnected, lastVoiceCommand, setLastVoiceCommand } = useAppStore();
  
  const voiceZoomRef = useRef<number>(1.0);
  
  // Các Ref dùng để lọc chuyển động đẩy/kéo (High-pass filter)
  const gravityXRef = useRef<number>(0);
  const dynamicZoomRef = useRef<number>(0);

  // 🔥 AI VOICE CONTROL: XỬ LÝ LỆNH ZOOM 3D 🔥
  useEffect(() => {
    if (lastVoiceCommand === 'NONE') return;

    if (lastVoiceCommand === 'BIG') {
      voiceZoomRef.current = Math.min(3.0, voiceZoomRef.current + 0.4);
      toast({ title: "🔍 ZOOM IN", description: "Phóng to cảnh vật (Lệnh giọng nói)" });
      setLastVoiceCommand('NONE');
    } 
    else if (lastVoiceCommand === 'SMALL') {
      voiceZoomRef.current = Math.max(0.4, voiceZoomRef.current - 0.4);
      toast({ title: "🔎 ZOOM OUT", description: "Thu nhỏ cảnh vật (Lệnh giọng nói)" });
      setLastVoiceCommand('NONE');
    }
  }, [lastVoiceCommand, setLastVoiceCommand]);

  useFrame((_, delta) => {
    if (!rigRef.current) return;

    if (isConnected) {
      const { ax, ay, gz } = sensorData;

      // -------------------------------------------------------------
      // 1. XOAY TRÒN (YAW) - Xoay mạch trái/phải
      // -------------------------------------------------------------
      if (Math.abs(gz) > 8) {
        const rotationSpeed = (gz / 60) * delta; 
        // Trục Z xoay trái (dương) -> Vũ trụ xoay trái
        rigRef.current.rotation.y += rotationSpeed;
      }

      // -------------------------------------------------------------
      // 2. NGHIÊNG CÚI (PITCH) & LẮC (ROLL) ĐÃ ĐẢO LẠI TRỤC CHUẨN
      // -------------------------------------------------------------
      // Trục X (đâm tới trước) chi phối Pitch. Trục Y (đâm sang trái) chi phối Roll.
      // Dấu âm (-) tùy thuộc vào camera setup, có thể tinh chỉnh nếu bị ngược.
      const targetPitch = THREE.MathUtils.clamp(-ax / 8, -1.2, 1.2); 
      const targetRoll = THREE.MathUtils.clamp(-ay / 8, -1.2, 1.2);  

      rigRef.current.rotation.x = THREE.MathUtils.damp(rigRef.current.rotation.x, targetPitch, 6, delta);
      rigRef.current.rotation.z = THREE.MathUtils.damp(rigRef.current.rotation.z, targetRoll, 6, delta);

      // -------------------------------------------------------------
      // 3. ZOOM ĐẨY/KÉO (TỊNH TIẾN TRỤC X)
      // -------------------------------------------------------------
      // Bước A: Cập nhật trọng lực hiện tại trên trục X (Low-pass filter)
      // Khi bạn cầm nghiêng mạch đứng im, gravityX sẽ bám theo ax
      gravityXRef.current = THREE.MathUtils.damp(gravityXRef.current, ax, 2, delta);

      // Bước B: Tính gia tốc tịnh tiến thuần túy bằng cách lấy ax thực tế trừ đi trọng lực
      const linearX = ax - gravityXRef.current;

      // Bước C: Áp dụng lực đẩy/kéo
      // Pushing forward (linearX dương lớn), Pulling backward (linearX âm lớn)
      if (linearX > 1.5) {
        // Đẩy vào -> Zoom In
        dynamicZoomRef.current = THREE.MathUtils.clamp(dynamicZoomRef.current + linearX / 15, 0, 0.8);
      } else if (linearX < -1.5) {
        // Rút ra -> Zoom Out
        dynamicZoomRef.current = THREE.MathUtils.clamp(dynamicZoomRef.current + linearX / 15, -0.4, 0.8);
      } else {
        // Dừng đẩy/kéo -> Zoom đàn hồi mượt mà về 0
        dynamicZoomRef.current = THREE.MathUtils.damp(dynamicZoomRef.current, 0, 3, delta);
      }

      // Tổng Zoom = Zoom giọng nói + Hiệu ứng đẩy/kéo tay
      const targetZoom = voiceZoomRef.current + dynamicZoomRef.current;
      
      const currentScale = rigRef.current.scale.x;
      const newScale = THREE.MathUtils.damp(currentScale, targetZoom, 5, delta);
      rigRef.current.scale.setScalar(newScale);

    } else {
      // -------------------------------------------------------------
      // NGẮT KẾT NỐI -> TRẢ VỀ CÂN BẰNG TỪ TỪ
      // -------------------------------------------------------------
      rigRef.current.rotation.x = THREE.MathUtils.damp(rigRef.current.rotation.x, 0, 2, delta);
      rigRef.current.rotation.z = THREE.MathUtils.damp(rigRef.current.rotation.z, 0, 2, delta);
      rigRef.current.scale.setScalar(THREE.MathUtils.damp(rigRef.current.scale.x, voiceZoomRef.current, 2, delta));
    }
  });

  return (
    <group ref={rigRef}>
      {children}
    </group>
  );
}