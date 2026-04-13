// import express from 'express';
// import http from 'http';
// import { Server as SocketIOServer } from 'socket.io';
// import cors from 'cors';
// import { SerialPort } from 'serialport';
// import { ReadlineParser } from '@serialport/parser-readline';

// const app = express();
// app.use(cors());
// const server = http.createServer(app);

// // =========================================================
// // 1. KÊNH GIAO TIẾP (PORT 5000) CHO REACT & PYTHON
// // =========================================================
// const io = new SocketIOServer(server, {
//   cors: { origin: '*', methods: ['GET', 'POST'] },
// });

// io.on('connection', (socket) => {
//   console.log(`💻 [APP/AI KẾT NỐI]: ${socket.id}`);

//   socket.on('ai_gesture_detected', (data) => {
//     console.log(`🧠 [AI CHỐT ĐƠN]: ${data.gesture} (Độ tự tin: ${data.confidence}%)`);
//     io.emit('fe_gesture_update', data);
//   });

//     // Lắng nghe Python báo cáo: "TÔI VỪA NGHE ĐƯỢC GIỌNG NÓI!"
//     socket.on('ai_voice_command', (data) => {
//         console.log(`🗣️ [GIỌNG NÓI]: ${data.command} (${data.confidence}%)`);
//         io.emit('fe_voice_update', data); 
//     });

//   socket.on('disconnect', () => {
//     console.log(`🔴 [ĐÃ THOÁT]: ${socket.id}`);
//   });
// });

// server.listen(5000, () => {
//   console.log('==================================================');
//   console.log('🚀 [HUB] Kênh Web/AI (Socket.IO) chạy tại PORT 5000');
// });

// // =========================================================
// // 2. ĐỌC DỮ LIỆU TỪ CÁP USB (CỔNG COM)
// // =========================================================

// const COM_PORT = 'COM3'; 
// const BAUD_RATE = 921600; // Đã nâng lên 921600 để khớp với ESP32

// try {
//     const port = new SerialPort({ path: COM_PORT, baudRate: BAUD_RATE });
//     const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

//     port.on('open', () => {
//         console.log(`🔌 [ESP32] Đã kết nối cổng ${COM_PORT} với tốc độ ${BAUD_RATE}!`);
//     });

//     parser.on('data', (line) => {
//         try {
//             const rawLine = line.trim();
//             if (!rawLine) return;

//             // KIỂM TRA CHỐNG DÍNH
//             const colonCount = (rawLine.match(/:/g) || []).length;

//             // Nếu vẫn bị dính do nhiễu USB, bỏ qua dòng đó
//             if (colonCount !== 1) return;
          
//             // 1. XỬ LÝ IMU
//             if (rawLine.startsWith('I:')) {
              
//                 const dataStr = rawLine.substring(2);
//                 const parts = dataStr.split(',').map(Number);
                
//                 if (parts.length === 6 && !parts.includes(NaN)) {
//                     const imuData = { 
//                         ax: parts[0], ay: parts[1], az: parts[2], 
//                         gx: parts[3], gy: parts[4], gz: parts[5] 
//                     };
                    
//                     io.emit('sensor_stream', imuData);
//                 }
//             } 
//             // 2. XỬ LÝ AUDIO
//             else if (rawLine.startsWith('A:')) {
//                 const audioStr = rawLine.substring(2);
//                 const chunkArray = audioStr.split(',').map(Number);
                
//                 if (chunkArray.length === 256 && !chunkArray.includes(NaN)) {
//                     io.emit('audio_stream', { chunk: chunkArray });
//                 }
//             }
//         } catch (error) {
//             // Im lặng bỏ qua dòng lỗi
//         }
//     });

//     port.on('error', (err) => {
//         console.error(`❌ [LỖI CỔNG COM]: ${err.message}`);
//     });

// } catch (err) {
//     console.error(`❌ [KHÔNG THỂ MỞ CỔNG COM]`);
// }


import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { WebSocketServer } from 'ws'; // Dùng thư viện ws gốc cho ESP32
import cors from 'cors';

const app = express();
app.use(cors());
const server = http.createServer(app);

// =========================================================
// 1. KÊNH GIAO TIẾP (PORT 5000) CHO REACT & PYTHON AI
// =========================================================
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods:['GET', 'POST'] },
});

io.on('connection', (socket) => {
  console.log(`💻 [APP/AI KẾT NỐI]: ${socket.id}`);

  // Hứng lệnh từ AI Cử chỉ
  socket.on('ai_gesture_detected', (data) => {
    console.log(`🧠[AI CỬ CHỈ]: ${data.gesture} (${data.confidence}%)`);
    io.emit('fe_gesture_update', data);
  });

  // Hứng lệnh từ AI Giọng nói
  socket.on('ai_voice_command', (data) => {
    console.log(`🗣️[AI GIỌNG NÓI]: ${data.command} (${data.confidence}%)`);
    io.emit('fe_voice_update', data); 
  });

  socket.on('disconnect', () => {
    console.log(`🔴 [ĐÃ THOÁT]: ${socket.id}`);
  });
});

server.listen(5000, () => {
  console.log('==================================================');
  console.log('🚀 [HUB] Kênh Web/AI (Socket.IO) chạy tại PORT 5000');
});

// =========================================================
// 2. KÊNH NHẬN DỮ LIỆU KHÔNG DÂY TỪ ESP32 (PORT 5001)
// =========================================================
const wss = new WebSocketServer({ port: 5001 }, () => {
  console.log('📡 [ESP32 HUB] Kênh hứng Data Wi-Fi mở tại PORT 5001');
  console.log('==================================================\n');
});

wss.on('connection', (ws) => {
  console.log(`🔌 [ESP32] GĂNG TAY ĐÃ KẾT NỐI QUA WI-FI! Bắt đầu nhận dữ liệu...`);

  ws.on('message', (message) => {
    try {
      console.log(message)
      // WebSocket gửi data dạng Buffer, cần chuyển sang String
      const rawLine = message.toString().trim();
      if (!rawLine) return;

      // Bộ lọc an toàn của ông Thành (vẫn giữ lại cho chắc ăn)
      const colonCount = (rawLine.match(/:/g) ||[]).length;
      if (colonCount !== 1) return;
    
      // 1. XỬ LÝ IMU
      if (rawLine.startsWith('I:')) {
          const dataStr = rawLine.substring(2);
          const parts = dataStr.split(',').map(Number);
          console.log(parts)
          
          if (parts.length === 6 && !parts.includes(NaN)) {
              const imuData = { 
                  ax: parts[0], ay: parts[1], az: parts[2], 
                  gx: parts[3], gy: parts[4], gz: parts[5] 
              };
              // Bắn qua port 5000 cho React và Python
              io.emit('sensor_stream', imuData);
          }
      } 
      // 2. XỬ LÝ AUDIO
      else if (rawLine.startsWith('A:')) {
          const audioStr = rawLine.substring(2);
          const chunkArray = audioStr.split(',').map(Number);
          
          if (chunkArray.length === 256 && !chunkArray.includes(NaN)) {
              // Bắn qua port 5000 cho Python Audio
              io.emit('audio_stream', { chunk: chunkArray });
          }
      }
    } catch (error) {
      // Im lặng bỏ qua dòng lỗi
    }
  });

  ws.on('close', () => {
    console.log(`❌ [ESP32] ĐÃ MẤT KẾT NỐI WI-FI!`);
  });
});