import { WebSocketServer, WebSocket } from 'ws';
import { Server as SocketIOServer } from 'socket.io';
import { EventBus, EVENTS } from '../core/EventBus';

export const initESP32Socket = (port: number, io: SocketIOServer) => {
  const wss = new WebSocketServer({ port });

  wss.on('connection', (ws: WebSocket, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`\n🟢[ESP32 STATION] Găng tay đã kết nối từ IP: ${clientIp}`);

    // Báo cho toàn hệ thống biết ESP32 đã online
    EventBus.emit(EVENTS.ESP32_STATUS, { status: 'connected', ip: clientIp });

    ws.on('message', (message: Buffer) => {
      try {
        // 1. Nhận data từ ESP32 và ép kiểu JSON
        const data = JSON.parse(message.toString());

        // 2. Phát thanh dữ liệu này lên EventBus cho các trạm khác dùng
        EventBus.emit(EVENTS.ESP32_DATA, data);
      } catch (error) {
        console.log(`💬[ESP32 MESSAGE]: ${message.toString()}`);
      }
    });

    ws.on('close', () => {
      console.log(`\n🔴 [ESP32 STATION] Găng tay đã ngắt kết nối.`);
      EventBus.emit(EVENTS.ESP32_STATUS, { status: 'disconnected' });
    });
  });

  console.log(`🔌 [ESP32 STATION] Đang mở cổng ${port} chờ Găng tay ESP32...`);
};
