import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const isMpuCursorActive = useAppStore((state) => state.isMpuCursorActive);

  // Maintain X, Y coords outside of React state for 60FPS high performance
  const posRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  // History buffer to counteract "drift" when punching
  const HISTORY_LENGTH = 30; // ~0.5 seconds of frames at 60fps
  const posHistoryRef = useRef<{x: number, y: number}[]>([]);
  // Velocity for buttery smooth inertia
  const velRef = useRef({ x: 0, y: 0 });
  
  const isClickingRef = useRef(false);

  // Config parameters for MPU6050 sensitivity
  const SENSITIVITY_X = 15.0; // Yaw (gz)
  const SENSITIVITY_Y = 15.0; // Pitch (gx)
  const DEADZONE = 0.25;      // Lower deadzone since we have smoothing
  const SMOOTHING = 0.8;      // 0.0 to 0.99. Higher = more smooth/momentum

  useEffect(() => {
    // Hide system cursor when MPU cursor is active
    if (isMpuCursorActive) {
      document.body.style.cursor = 'none';
    } else {
      document.body.style.cursor = 'default';
    }
    return () => { document.body.style.cursor = 'default'; };
  }, [isMpuCursorActive]);

  useEffect(() => {
    if (!isMpuCursorActive) return;

    let reqId: number;

    const loop = () => {
      const state = useAppStore.getState();
      
      // Nếu MPU đặt theo chiều: LED ngửa lên, Jack ghim chĩa vào ngực
      // - Xoay trái/phải (Yaw) => Trục Z (gz)
      // - Ngửa lên/cụp xuống (Pitch) => Trục X (gx)
      const { gz, gy } = state.sensorData;
      
      // Apply deadzone and extract Raw Delta
      // Đảo dấu trục Y (+) để thuật với thói quen gật/ngửa cổ tay xuống
      const rawDeltaX = Math.abs(gz) > DEADZONE ? -gz * SENSITIVITY_X : 0;
      const rawDeltaY = Math.abs(gy) > DEADZONE ? gy * SENSITIVITY_Y : 0;

      // Apply Exponential Smoothing (Gia tốc & Quán tính siêu mượt)
      velRef.current.x = velRef.current.x * SMOOTHING + rawDeltaX * (1 - SMOOTHING);
      velRef.current.y = velRef.current.y * SMOOTHING + rawDeltaY * (1 - SMOOTHING);

      // Calculate new position
      posRef.current.x += velRef.current.x;
      posRef.current.y += velRef.current.y;

      // Clamp to screen bounds
      posRef.current.x = Math.max(0, Math.min(window.innerWidth, posRef.current.x));
      posRef.current.y = Math.max(0, Math.min(window.innerHeight, posRef.current.y));

      // Save history for click compensation
      posHistoryRef.current.push({ x: posRef.current.x, y: posRef.current.y });
      if (posHistoryRef.current.length > HISTORY_LENGTH) {
        posHistoryRef.current.shift();
      }

      // Update DOM directly bypassing React
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0)`;
      }

      reqId = requestAnimationFrame(loop);
    };

    reqId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqId);
  }, [isMpuCursorActive]);
  // --- LẮNG NGHE LỆNH CLICK (TỪ TAY VÀ MIỆNG) ---
  useEffect(() => {
    const unsubscribe = useAppStore.subscribe((state, prevState) => {
      if (!state.isMpuCursorActive) return;

      const currentGesture = state.lastGesture;
      const prevGesture = prevState.lastGesture;
      
      const currentVoice = state.lastVoiceCommand;
      const prevVoice = prevState.lastVoiceCommand;
      
      let shouldClick = false;

      // Kích hoạt click nếu Tay "ĐẤM" (PUSH)
      if (currentGesture === 'PUSH' && currentGesture !== prevGesture) {
        console.log("💥 [CustomCursor] Click bằng Cử chỉ Tay!");
        shouldClick = true;
      }
      
      // Kích hoạt click nếu Miệng hô "BẮN" (SHOOT)
      if (currentVoice === 'SHOOT' && currentVoice !== prevVoice) {
        console.log("🗣️ [CustomCursor] Click bằng Lệnh Giọng nói!");
        shouldClick = true;
      }

      if (shouldClick) {
        triggerClickAction();
        // Reset lệnh để tránh bị đúp
        useAppStore.getState().setLastGesture('NONE');
        useAppStore.getState().setLastVoiceCommand('NONE');
      }
    });
    return () => unsubscribe();
  },[]);

  const triggerClickAction = () => {
    // Visual feedback for clicking
    if (cursorRef.current) {
      cursorRef.current.classList.add('cursor-clicking');
      setTimeout(() => {
        if (cursorRef.current) cursorRef.current.classList.remove('cursor-clicking');
      }, 200);
    }

    // 1. Temporarily hide our custom cursor so document.elementFromPoint doesn't just hit the cursor itself
    const oldDisplay = cursorRef.current ? cursorRef.current.style.display : 'none';
    if (cursorRef.current) {
      cursorRef.current.style.display = 'none';
    }

    // 2. Rewind cursor position to before the punch started (approx 20 frames / ~300ms ago)
    let clickX = posRef.current.x;
    let clickY = posRef.current.y;
    
    if (posHistoryRef.current.length >= 10) {
      const rewindIndex = Math.max(0, posHistoryRef.current.length - 20); 
      const stablePos = posHistoryRef.current[rewindIndex];
      clickX = stablePos.x;
      clickY = stablePos.y;
      
      // Physically snap the cursor back to the stable position
      posRef.current.x = clickX;
      posRef.current.y = clickY;
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${clickX}px, ${clickY}px, 0)`;
      }
    }

    // 3. Find the topmost element under the crosshair using stable coordinates
    const targetEl = document.elementFromPoint(clickX, clickY) as HTMLElement;

    // 4. Restore the custom cursor
    if (cursorRef.current) {
      cursorRef.current.style.display = oldDisplay;
    }

    // 5. Simulate a full real OS mouse click (Pointer + Mouse Events)
    if (targetEl) {
      console.log('👆 [CustomCursor] Thực thi lệnh bấm vào:', targetEl);
      
      const eventConfig = { 
        bubbles: true, 
        cancelable: true, 
        clientX: clickX, 
        clientY: clickY, 
        button: 0 
      };

      // Firing the exact sequence a real mouse does
      targetEl.dispatchEvent(new PointerEvent('pointerdown', eventConfig));
      targetEl.dispatchEvent(new MouseEvent('mousedown', eventConfig));
      targetEl.dispatchEvent(new PointerEvent('pointerup', eventConfig));
      targetEl.dispatchEvent(new MouseEvent('mouseup', eventConfig));
      targetEl.dispatchEvent(new MouseEvent('click', eventConfig));
      
      // Fallback for native buttons
      if (typeof targetEl.click === 'function') {
         // targetEl.click(); // Commenting out to avoid double clicks, the dispatchEvent('click') is usually enough.
         // If a specific button doesn't trigger, we could use it, but dispatchEvent is much more universal.
      }
    } else {
      console.log('⚠️ [CustomCursor] Không tìm thấy phần tử tại tọa độ này');
    }
  };

  if (!isMpuCursorActive) return null;

  return (
    <div
      ref={cursorRef}
      className="fixed top-0 left-0 pointer-events-none z-[9999] transition-transform duration-100 ease-out"
      style={{
        width: '28px', height: '28px',
        marginLeft: '-14px', marginTop: '-14px',
        willChange: 'transform'
      }}
    >
      {/* Vòng ngắm Cyberpunk */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Khung ngắm ngoài */}
        <div className="absolute w-full h-full rounded-full border-2 border-neon-cyan/60 animate-[spin_4s_linear_infinite]">
          {/* 4 điểm ngắm */}
          <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-1 h-2 bg-neon-cyan"></div>
          <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-1 h-2 bg-neon-cyan"></div>
          <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-1 bg-neon-cyan"></div>
          <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-1 bg-neon-cyan"></div>
        </div>
        {/* Tâm ngắm (Chấm đỏ) */}
        <div className="absolute w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_10px_#ff0000]"></div>
      </div>
    </div>
  );
}