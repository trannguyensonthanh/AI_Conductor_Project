import { Server as SocketIOServer, Socket } from 'socket.io';
import { EventBus, EVENTS } from '../core/EventBus';

export const initUISocket = (io: SocketIOServer) => {
  io.on('connection', (socket: Socket) => {
    console.log(
      `\n💻 [UI STATION] Web Frontend đã kết nối (Socket ID: ${socket.id})`,
    );

    socket.on('disconnect', () => {
      console.log(`💻 [UI STATION] Web Frontend đã đóng.`);
    });
  });

  // Bắt Event từ ESP32 và bắn thẳng lên Web để vẽ Biểu đồ 3D/Chart
  EventBus.on(EVENTS.ESP32_DATA, (sensorData) => {
    io.emit('sensor_stream', sensorData);
  });

  // Bắt Event KẾT QUẢ TỪ AI và bắn lên Web để chơi Game / Chuyển Slide
  EventBus.on(EVENTS.AI_PREDICTION, (prediction) => {
    io.emit('gesture_command', prediction);
  });

  // Bắn trạng thái các thiết bị lên Web để hiển thị icon (Xanh/Đỏ)
  EventBus.on(EVENTS.ESP32_STATUS, (status) => {
    io.emit('device_status', { device: 'esp32', ...status });
  });

  EventBus.on(EVENTS.AI_STATUS, (status) => {
    io.emit('device_status', { device: 'ai_engine', ...status });
  });
};
