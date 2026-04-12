import { WebSocketServer, WebSocket } from 'ws';
import { Server as SocketIOServer } from 'socket.io';
import { EventBus, EVENTS } from '../core/EventBus';

export const initAISocket = (port: number, io: SocketIOServer) => {
  const wss = new WebSocketServer({ port });
  let aiClient: WebSocket | null = null; // Lưu trữ kết nối của Python AI

  wss.on('connection', (ws: WebSocket) => {
    console.log(`\n🧠 [AI STATION] Python AI Engine đã kết nối thành công!`);
    aiClient = ws;
    EventBus.emit(EVENTS.AI_STATUS, { status: 'connected' });

    // Nhận kết quả DỰ ĐOÁN (Inference) từ Python gửi về
    ws.on('message', (message: Buffer) => {
      try {
        const predictionData = JSON.parse(message.toString());
        console.log(
          `🎯 [AI CHỐT ĐƠN]: ${predictionData.gesture} (${predictionData.confidence}%)`,
        );

        // Phát thanh kết quả lên EventBus để UI Socket bắt lấy
        EventBus.emit(EVENTS.AI_PREDICTION, predictionData);
      } catch (error) {
        console.log(`💬 [AI MESSAGE]: ${message.toString()}`);
      }
    });

    ws.on('close', () => {
      console.log(`\n💤 [AI STATION] Python AI Engine đã ngủ đông.`);
      aiClient = null;
      EventBus.emit(EVENTS.AI_STATUS, { status: 'disconnected' });
    });
  });

  // Lắng nghe dữ liệu cảm biến từ ESP32 (thông qua EventBus)
  // Nếu có AI đang kết nối, thì đẩy luồng data đó sang cho AI phân tích
  EventBus.on(EVENTS.ESP32_DATA, (sensorData) => {
    if (aiClient && aiClient.readyState === WebSocket.OPEN) {
      aiClient.send(JSON.stringify(sensorData));
    }
  });

  console.log(`🧠 [AI STATION] Đang mở cổng ${port} chờ Python AI Engine...`);
};
