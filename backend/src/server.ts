import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';

const app = express();
app.use(cors());
const server = http.createServer(app);

// =========================================================
// 1. KÊNH GIAO TIẾP (PORT 5000) CHO REACT & PYTHON AI
// =========================================================
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
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
// 2. KÊNH NHẬN DỮ LIỆU TỪ ESP32 QUA WI-FI (PORT 5001)
//
//    Binary Protocol:
//    ┌──────────┬──────────────────────────────────┐
//    │ Header   │ Payload                          │
//    ├──────────┼──────────────────────────────────┤
//    │ 0x01     │ 6 × float32 LE (24 bytes) = IMU  │
//    │ 0x02     │ 256 × int16 LE (512 bytes) = Audio│
//    └──────────┴──────────────────────────────────┘
// =========================================================

const HEADER_IMU = 0x01;
const HEADER_AUDIO = 0x02;

// --- Stats tracking (log mỗi 5s thay vì mỗi packet) ---
let imuPacketCount = 0;
let audioPacketCount = 0;
let errorCount = 0;
let lastStatsTime = Date.now();
const STATS_INTERVAL = 5000;

// --- Heartbeat config ---
const PING_INTERVAL = 10000; // Ping mỗi 10s
const PONG_TIMEOUT = 30000; // Timeout 30s không phản hồi → đóng

const wss = new WebSocketServer({ port: 5001 }, () => {
  console.log('📡 [ESP32 HUB] Binary Protocol - Cổng 5001 đã mở');
  console.log('==================================================\n');
});

wss.on('connection', (ws: WebSocket) => {
  console.log(`🔌 [ESP32] ĐÃ KẾT NỐI QUA WI-FI! Bắt đầu nhận Binary data...`);

  let isAlive = true;

  // --- Heartbeat: Ping ESP32 định kỳ ---
  const pingTimer = setInterval(() => {
    if (!isAlive) {
      console.log('💀 [ESP32] Không phản hồi ping → Đóng kết nối zombie');
      clearInterval(pingTimer);
      ws.terminate();
      return;
    }
    isAlive = false;
    ws.ping();
  }, PING_INTERVAL);

  ws.on('pong', () => {
    isAlive = true;
  });

  // --- Stats logger (mỗi 5 giây, không spam) ---
  const statsTimer = setInterval(() => {
    const now = Date.now();
    const elapsed = (now - lastStatsTime) / 1000;
    if (elapsed > 0) {
      console.log(
        `📊 [STATS] IMU: ${imuPacketCount} pkts (${Math.round(imuPacketCount / elapsed)}Hz) | ` +
          `Audio: ${audioPacketCount} pkts | Errors: ${errorCount}`,
      );
    }
    imuPacketCount = 0;
    audioPacketCount = 0;
    errorCount = 0;
    lastStatsTime = now;
  }, STATS_INTERVAL);

  // --- Xử lý message Binary từ ESP32 ---
  ws.on('message', (message: Buffer, isBinary: boolean) => {
    try {
      // Hỗ trợ cả Binary (mới) và Text (cũ) để backward compatible
      if (isBinary || Buffer.isBuffer(message)) {
        const buf = Buffer.isBuffer(message) ? message : Buffer.from(message);

        if (buf.length < 1) return;
        const header = buf[0];

        // ===== IMU BINARY: 0x01 + 24 bytes (6 floats) =====
        if (header === HEADER_IMU && buf.length === 25) {
          const imuData = {
            ax: buf.readFloatLE(1),
            ay: buf.readFloatLE(5),
            az: buf.readFloatLE(9),
            gx: buf.readFloatLE(13),
            gy: buf.readFloatLE(17),
            gz: buf.readFloatLE(21),
          };
          io.emit('sensor_stream', imuData);
          imuPacketCount++;
          return;
        }

        // ===== AUDIO BINARY: 0x02 + 512 bytes (256 int16s) =====
        if (header === HEADER_AUDIO && buf.length === 513) {
          const chunkArray: number[] = new Array(256);
          for (let i = 0; i < 256; i++) {
            chunkArray[i] = buf.readInt16LE(1 + i * 2);
          }
          io.emit('audio_stream', { chunk: chunkArray });
          audioPacketCount++;
          return;
        }
      }

      // ===== FALLBACK: Text Protocol (backward compatible) =====
      const rawLine = message.toString().trim();
      if (!rawLine) return;

      const colonCount = (rawLine.match(/:/g) || []).length;
      if (colonCount !== 1) return;

      if (rawLine.startsWith('I:')) {
        const parts = rawLine.substring(2).split(',').map(Number);
        if (parts.length === 6 && !parts.includes(NaN)) {
          io.emit('sensor_stream', {
            ax: parts[0],
            ay: parts[1],
            az: parts[2],
            gx: parts[3],
            gy: parts[4],
            gz: parts[5],
          });
          imuPacketCount++;
        }
      } else if (rawLine.startsWith('A:')) {
        const chunkArray = rawLine.substring(2).split(',').map(Number);
        if (chunkArray.length === 256 && !chunkArray.includes(NaN)) {
          io.emit('audio_stream', { chunk: chunkArray });
          audioPacketCount++;
        }
      }
    } catch (error) {
      errorCount++;
    }
  });

  // --- Cleanup khi ESP32 ngắt kết nối ---
  ws.on('close', () => {
    console.log(`❌ [ESP32] ĐÃ MẤT KẾT NỐI WI-FI!`);
    clearInterval(pingTimer);
    clearInterval(statsTimer);
  });

  ws.on('error', (err) => {
    console.log(`⚠️ [ESP32] WebSocket Error: ${err.message}`);
    clearInterval(pingTimer);
    clearInterval(statsTimer);
  });
});
