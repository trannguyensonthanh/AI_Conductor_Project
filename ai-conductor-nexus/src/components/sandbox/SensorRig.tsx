import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';
import { toast } from '@/hooks/use-toast';

export function SensorRig({ children }: { children: React.ReactNode }) {
  const rigRef = useRef<THREE.Group>(null);
  const { sensorData, isConnected, lastVoiceCommand, setLastVoiceCommand } = useAppStore();
  const voiceZoomRef = useRef<number>(1.0);

    // 🔥 AI VOICE CONTROL: XỬ LÝ LỆNH ZOOM 3D 🔥
  useEffect(() => {
    if (lastVoiceCommand === 'NONE') return;

    if (lastVoiceCommand === 'BIG') {
      voiceZoomRef.current = Math.min(3.0, voiceZoomRef.current + 0.4); // Phóng to tối đa x3
      toast({ title: "🔍 ZOOM IN", description: "Phóng to cảnh vật (Lệnh giọng nói)" });
      setLastVoiceCommand('NONE'); // Nuốt lệnh
    } 
    else if (lastVoiceCommand === 'SMALL') {
      voiceZoomRef.current = Math.max(0.4, voiceZoomRef.current - 0.4); // Thu nhỏ tối đa x0.4
      toast({ title: "🔎 ZOOM OUT", description: "Thu nhỏ cảnh vật (Lệnh giọng nói)" });
      setLastVoiceCommand('NONE'); // Nuốt lệnh
    }
  },[lastVoiceCommand, setLastVoiceCommand]);

  useFrame((_, delta) => {
    if (!rigRef.current) return;

    if (isConnected) {
      const { ax, ay, az, gz } = sensorData;

      // -------------------------------------------------------------
      // 1. XOAY TRÒN (YAW) - ĐÃ TĂNG ĐỘ NHẠY
      // -------------------------------------------------------------
      // Giảm threshold xuống 8 (trước là 15) để bắt các cử động nhỏ hơn.
      // Giảm mẫu số xuống 60 (trước là 150) để tốc độ xoay nhanh hơn gấp 2.5 lần.
      if (Math.abs(gz) > 8) {
        const rotationSpeed = (gz / 60) * delta; 
        rigRef.current.rotation.y += rotationSpeed;
      }

      // -------------------------------------------------------------
      // 2. NGHIÊNG CÚI / LẮC (PARALLAX) - ĐÃ TĂNG BIÊN ĐỘ & ĐỘ NHẠY
      // -------------------------------------------------------------
      // Chia 8 (trước là 15) -> Nghiêng tay một chút là hình ảnh nghiêng theo nhiều hơn.
      // Clamp nới rộng ra từ [-0.8, 0.8] thành [-1.2, 1.2] (Cho phép nghiêng sâu hơn).
      const targetPitch = THREE.MathUtils.clamp(ay / 8, -1.2, 1.2); 
      const targetRoll = THREE.MathUtils.clamp(ax / 8, -1.2, 1.2);  

      // Tăng smoothness (từ 4 lên 6) để nó bắt kịp tay bạn nhanh hơn (ít độ trễ hơn)
      rigRef.current.rotation.x = THREE.MathUtils.damp(rigRef.current.rotation.x, targetPitch, 6, delta);
      rigRef.current.rotation.z = THREE.MathUtils.damp(rigRef.current.rotation.z, -targetRoll, 6, delta);

      // -------------------------------------------------------------
      // 3. HIỆU ỨNG ZOOM DỰA TRÊN TỔNG LỰC ĐẨY TAY (RẤT NHẠY & CHUẨN)
      // -------------------------------------------------------------
      // Tính tổng vector gia tốc hiện tại. Dù bạn cầm nghiêng hay thẳng, 
      // khi đứng im tổng này luôn xấp xỉ 9.8.
      const totalAcceleration = Math.sqrt(ax * ax + ay * ay + az * az);
      
      // Trừ đi 9.8 để ra "Lực thuần túy" (Pure Movement) khi tay bạn đẩy/giật.
      // Dùng Math.abs vì ta muốn đẩy hay giật lùi đều tạo ra phản hồi.
      const pureMovement = Math.abs(totalAcceleration - 9.8);

      let targetZoom = 1.0;
      
      // Bỏ qua các rung động nhẹ (tay run). Nếu giật tay mạnh (> 2):
      if (pureMovement > 2) {
        // Cộng lực đẩy vào Scale. Chia 10 để scale mượt. 
        // Giới hạn Zoom tối đa là 1.5x (tăng 50% kích thước) để không bị văng khỏi màn hình.
        targetZoom = 1.0 + voiceZoomRef.current + THREE.MathUtils.clamp(pureMovement / 10, 0, 0.5);
      }

      // Tốc độ đàn hồi (Damp = 5): Phóng to chớp nhoáng khi đẩy tay, 
      // và tự động thu về 1.0 rất mượt khi bạn dừng đẩy.
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