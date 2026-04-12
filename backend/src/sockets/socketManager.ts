import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

export const initSocket = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: '*', // Chấp nhận Frontend kết nối từ bất kỳ port nào (VD: Vite port 8080)
      methods: ['GET', 'POST'],
    },
  });

  console.log('⚡ [SOCKET.IO] Hệ thống Real-time đã khởi động!');

  io.on('connection', (socket: Socket) => {
    console.log(`🟢 [CLIENT KẾT NỐI] ID: ${socket.id}`);

    // ==========================================
    // 1. LẮNG NGHE DỮ LIỆU TỪ PYTHON (AI ENGINE)
    // ==========================================

    // Nhận luồng dữ liệu IMU liên tục (50Hz) để vẽ biểu đồ trên Web
    socket.on('python_sensor_data', (data) => {
      // Ngay lập tức BẮN SÓNG (Broadcast) dữ liệu này sang cho Frontend React
      // Dùng broadcast.emit để gửi cho tất cả NHƯNG trừ thằng Python ra
      socket.broadcast.emit('fe_sensor_update', data);
    });

    // Nhận Lệnh Cử Chỉ từ AI (Ví dụ: "SWIPE_RIGHT", "FIST")
    socket.on('python_gesture', (gestureData) => {
      console.log(
        `🎯[AI CHỐT ĐƠN]: ${gestureData.gesture} (Tự tin: ${gestureData.confidence}%)`,
      );

      // Bắn sự kiện này sang Frontend để lật Slide, chém quái vật...
      socket.broadcast.emit('fe_gesture_update', gestureData);

      // TODO (Tương lai): Lưu lịch sử thao tác này vào MongoDB để hiện lên cái "Gesture Log"
    });

    // ==========================================
    // 2. CÁC SỰ KIỆN TỪ FRONTEND (REACT)
    // ==========================================

    // (Nếu Frontend muốn gửi lệnh gì đó ngược lại, ví dụ "Chuyển Scene", định nghĩa ở đây)
    socket.on('fe_change_scene', (sceneId) => {
      console.log(`🌌 Frontend yêu cầu đổi cảnh 3D thành: ${sceneId}`);
      socket.broadcast.emit('sync_scene', sceneId);
    });

    // Khi có Client ngắt kết nối
    socket.on('disconnect', () => {
      console.log(`🔴[CLIENT NGẮT KẾT NỐI] ID: ${socket.id}`);
    });
  });

  return io;
};
