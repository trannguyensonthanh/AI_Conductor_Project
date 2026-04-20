<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Orbitron&weight=900&size=40&duration=3000&pause=1000&color=00D4FF&center=true&vCenter=true&width=900&height=80&lines=🎼+AI+CONDUCTOR;HỆ+SINH+THÁI+TƯƠNG+TÁC+ĐA+PHƯƠNG+THỨC" alt="AI Conductor Typing SVG" />

<br/>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-ESP32-E7352C?style=for-the-badge&logo=espressif&logoColor=white" />
  <img src="https://img.shields.io/badge/AI-PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white" />
  <img src="https://img.shields.io/badge/Backend-Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/3D-Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Latency-%3C150ms-00FF88?style=for-the-badge" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Trường-PTIT%20HCM-003087?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Môn-Tương%20tác%20Người--Máy-9B59B6?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Team-Innovate%20Forward-FF6B6B?style=for-the-badge" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</p>

<br/>

> **"Phá vỡ rào cản của chuột và bàn phím. Điều khiển thế giới số bằng ngón tay và giọng nói của bạn."**

<br/>

</div>

---

## 📖 Mục lục

- [🌟 Giới thiệu](#-giới-thiệu)
- [🎬 Demo](#-demo)
- [🏗️ Kiến trúc hệ thống](#️-kiến-trúc-hệ-thống)
- [🧠 AI Engine - Trái tim của hệ thống](#-ai-engine---trái-tim-của-hệ-thống)
- [🔌 Phần cứng (Hardware)](#-phần-cứng-hardware)
- [⚙️ Backend - Trạm trung chuyển](#️-backend---trạm-trung-chuyển)
- [🖥️ Frontend - Giao diện 3D](#️-frontend---giao-diện-3d)
- [🚀 Hướng dẫn cài đặt](#-hướng-dẫn-cài-đặt)
- [🎮 Hướng dẫn sử dụng](#-hướng-dẫn-sử-dụng)
- [📊 Hiệu năng](#-hiệu-năng)
- [👥 Đội ngũ phát triển](#-đội-ngũ-phát-triển)
- [📄 License](#-license)

---

## 🌟 Giới thiệu

**AI Conductor** là một hệ sinh thái tương tác người-máy thế hệ mới, được thiết kế để **phá vỡ hoàn toàn** mô hình tương tác truyền thống dựa trên chuột và bàn phím. Hệ thống cho phép người dùng điều khiển không gian số thông qua hai phương thức tự nhiên nhất của con người:

| Phương thức | Cảm biến | Xử lý | Độ trễ |
|:---:|:---:|:---:|:---:|
| 🤚 **Cử chỉ tay** | MPU-6050 (IMU 6-DOF) | CNN + Bi-LSTM + Attention | < 100ms |
| 🎤 **Giọng nói** | INMP441 (I²S MEMS Mic) | 2D-CNN + Bi-LSTM + Attention | < 150ms |

### ✨ Điểm nổi bật

```
🎯 6 Cử chỉ tay  |  🗣️ 8 Lệnh giọng nói  |  📡 Thời gian thực (Real-time)
🎮 3 Ứng dụng    |  🧩 Kiến trúc Monorepo  |  🔌 IoT + Edge AI
```

**Ứng dụng tích hợp sẵn:**
- 🖼️ **Thuyết trình thông minh** — Lật slide bằng cử chỉ tay hoặc khẩu lệnh
- 🌌 **3D Sandbox** — Khám phá và điều khiển thế giới 3D (Robot Arm, Crystal Cave, Solar System...)
- 🎮 **Mini Game** — Chơi game bằng cú đấm và giọng nói (Contra, Voice Runner)

---

## 🎬 Demo

<div align="center">

| Cử chỉ điều khiển Slide | Khẩu lệnh giọng nói | Điều khiển 3D Sandbox |
|:---:|:---:|:---:|
| ↔️ Vuốt Trái/Phải | 🗣️ "LEFT" / "RIGHT" | 🤚 Xoay cổ tay |
| 👊 Cú đấm PUSH | 🗣️ "SHOOT" | 🗣️ "BIG" / "SMALL" |

> **📂 Xem tài liệu chi tiết:** [`docs/AI-CONDUCTOR-HE-SINH-THAI-TUONG-TAC-DJA-PHUONG-THUC.pdf`](./docs/AI-CONDUCTOR-HE-SINH-THAI-TUONG-TAC-DJA-PHUONG-THUC.pdf)

</div>

---

## 🏗️ Kiến trúc hệ thống

Hệ thống được tổ chức theo **mô hình Monorepo** với 4 khối chức năng độc lập, giao tiếp với nhau qua **Socket.IO** và **USB Serial**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                      👤 NGƯỜI DÙNG                                   │
│                  (Đeo găng tay/Khẩu lệnh)                           │
└────────────────────┬────────────────────────────────────────────────┘
                     │
          ┌──────────▼──────────┐
          │   🔌 ESP32 DevKit   │  ← Firmware C++ / FreeRTOS
          │  ┌───────────────┐  │
          │  │  MPU-6050     │  │  ax,ay,az, gx,gy,gz @ 100Hz
          │  │  (I²C: 21,22) │  │
          │  ├───────────────┤  │
          │  │  INMP441      │  │  16-bit PCM @ 16kHz (256 samples/chunk)
          │  │  (I²S: 14,15) │  │
          │  └───────────────┘  │
          └──────────┬──────────┘
                     │  USB Serial @ 921600 baud (2 luồng song song)
                     │  Prefix "I:" = IMU Data | "A:" = Audio Data
          ┌──────────▼──────────┐
          │  ⚙️  Node.js HUB    │  ← TypeScript / Express / SerialPort
          │     PORT 5000       │
          │   (Socket.IO)       │
          └──────┬──────────────┘
                 │  Socket.IO Events
        ┌────────┼───────────────────┐
        │        │                   │
┌───────▼───┐  ┌─▼────────────────┐  ┌▼──────────────────┐
│ 🧠 AI     │  │  🧠 AI Audio     │  │  🖥️ React Frontend │
│ Gesture   │  │  Service         │  │  PORT 8080         │
│ Service   │  │  (ai_audio_      │  │                    │
│(ai_service│  │   service.py)    │  │  Three.js / R3F    │
│  .py)     │  │                  │  │  Zustand Store     │
│           │  │  KeywordSpotting │  │  Framer Motion     │
│ GestureNet│  │  Net             │  │                    │
│ CNN+BiLSTM│  │  2D-CNN+BiLSTM   │  │  ✨ Presentation   │
│ +Attention│  │  +Attention      │  │  🌌 3D Sandbox     │
└───────────┘  └──────────────────┘  │  🎮 Mini Game      │
                                      └───────────────────┘
```

### 📁 Cấu trúc thư mục

```
AI-Conductor-Project/
│
├── 📁 firmware/                    # ESP32 Embedded System
│   ├── src/
│   │   └── main.cpp               # FreeRTOS Dual-Core Tasks
│   └── platformio.ini             # PlatformIO Config
│
├── 📁 backend/                     # Node.js Central Hub
│   ├── src/
│   │   ├── server.ts              # Socket.IO + SerialPort Hub
│   │   ├── controllers/           # Route Controllers
│   │   ├── routes/                # API Routes
│   │   ├── sockets/               # WebSocket Handlers
│   │   └── utils/                 # Utility Functions
│   └── package.json
│
├── 📁 ai_engine/                   # Python AI Services
│   ├── src/
│   │   ├── ai_service.py          # Gesture Recognition (GestureNet)
│   │   ├── ai_audio_service.py    # Voice Command (KeywordSpottingNet)
│   │   ├── collect_data.py        # Data Collection Tool
│   │   ├── live_inference.py      # Live Testing & Inference
│   │   └── ai_core/               # Model Architecture Modules
│   ├── models/                    # Pre-trained Model Files
│   │   ├── best_gesture_model.pth # GestureNet Weights
│   │   ├── best_audio_model.pth   # AudioNet Weights
│   │   └── scaler.pkl             # Feature Scaler
│   ├── dataset/                   # IMU Gesture Dataset
│   └── dataset_audio/             # Voice Command Dataset
│
├── 📁 ai-conductor-nexus/          # React Frontend
│   ├── src/
│   │   ├── pages/                 # App Pages
│   │   │   ├── Presentation.tsx   # Smart Presentation
│   │   │   ├── Sandbox.tsx        # 3D Interactive World
│   │   │   ├── MiniGame.tsx       # Gesture-controlled Games
│   │   │   ├── Admin.tsx          # System Dashboard
│   │   │   └── MediaPlayer.tsx    # AI Media Player
│   │   ├── components/            # Reusable UI Components
│   │   ├── stores/                # Zustand Global State
│   │   └── hooks/                 # Custom React Hooks
│   └── package.json
│
└── 📁 docs/                        # Documentation & Diagrams
    ├── endtoend.png
    ├── quytrinhaimpu.png
    └── *.pdf
```

---

## 🧠 AI Engine - Trái tim của hệ thống

### 🤚 Model 1: GestureNet — Nhận diện Cử chỉ

**Kiến trúc:** `1D-CNN → Bi-LSTM với LayerNorm → Attention Mechanism → Classifier`

```
Input: [Batch, 100 timesteps, 8 features]
         ax, ay, az, gx, gy, gz, acc_mag, gyro_mag
         
    ↓
┌──────────────────────────────────┐
│   1D-CNN Feature Extractor       │
│   Conv1d(8→128, k=7) + BN + ReLU│
│   MaxPool1d(2)                   │
│   Conv1d(128→256, k=5) + BN+ReLU│
│   MaxPool1d(2) + Dropout(0.3)    │
└──────────────────────────────────┘
    ↓
┌──────────────────────────────────┐
│   Bidirectional LSTM (96 hidden) │
│   LayerNorm LSTM Cell             │
│   Forward + Backward → 192-dim   │
└──────────────────────────────────┘
    ↓
┌──────────────────────────────────┐
│   Attention Mechanism            │
│   Context Vector (192-dim)       │
└──────────────────────────────────┘
    ↓
┌──────────────────────────────────┐
│   Classifier: FC(256) + BN + ReLU│
│   Dropout(0.5) → 6 Classes       │
└──────────────────────────────────┘

Output: LEFT | RIGHT | PUSH | IDLE | UP | DOWN
```

**Preprocessing Pipeline:**
1. 🔄 Làm mượt tín hiệu với `uniform_filter1d` (window=3)
2. 🌍 Loại bỏ gia tốc trọng lực bằng low-pass filter (window=50)
3. 📐 Tính vector magnitude: `acc_mag = ‖linear_acc‖₂`, `gyro_mag = ‖gyro‖₂`
4. 📊 Ghép thành 8 features, chuẩn hóa bằng `StandardScaler`

**Smart Triggering:**
- ⚡ Energy Threshold: `mean(acc_mag) > 0.8G` → Phát hiện chuyển động
- 🎯 Confidence Gate: `softmax score > 75%` → Xác nhận cử chỉ
- ⏱️ Cooldown: `1.2 giây` → Chống đoán trùng lặp

---

### 🎤 Model 2: KeywordSpottingNet — Nhận diện Giọng nói

**Kiến trúc:** `Mel-Spectrogram → 2D-CNN → Bi-LSTM → Attention → Classifier`

```
Input: Raw PCM Audio (16,000 samples @ 16kHz = 1 giây)

    ↓ MelSpectrogram(n_fft=1024, hop=512, n_mels=64)
    ↓ AmplitudeToDB()
    ↓ Z-score Normalization

Mel-Spectrogram: [1, 1, 64 mels, T time_frames]

    ↓
┌──────────────────────────────────┐
│   2D-CNN Image Feature Extractor │
│   Conv2d(1→16, 3×3) + BN + ReLU │
│   MaxPool2d(2×2)                 │
│   Conv2d(16→32, 3×3)+ BN + ReLU │
│   MaxPool2d(2×2) + Dropout2d(0.2)│
└──────────────────────────────────┘
    ↓ Reshape → [Batch, T', 16*32=512]
┌──────────────────────────────────┐
│   Bidirectional LSTM (64 hidden) │
│   Output: 128-dim context        │
└──────────────────────────────────┘
    ↓
┌──────────────────────────────────┐
│   Attention → Context Vector     │
│   FC(64) + BN + Dropout → N cls  │
└──────────────────────────────────┘

Output: LEFT | RIGHT | BIG | SMALL | SHOOT | BẮN | NOISE | ...
```

**Bộ lọc đa tầng chống nhiễu:**
```
Layer 1: RMS Energy > 0.0015 (lọc im lặng / tiếng quạt)
Layer 2: Mean dB > -55.0 dB (lọc âm thanh quá nhỏ)
Layer 3: Confidence ≥ 85% (lọc nhận diện không chắc)
Layer 4: Margin (Top1 - Top2) ≥ 30% (lọc "nói tào lao")
Layer 5: Special filter cho "shoot" ≥ 90%
```

---

## 🔌 Phần cứng (Hardware)

### 📋 Bill of Materials (BOM)

| # | Linh kiện | Model | Giao tiếp | Chức năng |
|:---:|---|---|:---:|---|
| 1 | Vi điều khiển | **ESP32 DOIT DevKit V1** | — | Não trung tâm |
| 2 | Cảm biến chuyển động | **MPU-6050** (6-DOF IMU) | I²C | Đo Accel + Gyro |
| 3 | Micro MEMS | **INMP441** | I²S | Thu âm thanh |
| 4 | Máy tính | PC / Laptop | USB | Chạy Backend + AI |

### 🔌 Sơ đồ đấu nối

```
ESP32 DOIT DevKit V1
┌─────────────────────────────────────────┐
│                                         │
│  GPIO 21 (SDA) ──────── SDA  [MPU-6050]│
│  GPIO 22 (SCL) ──────── SCL  [MPU-6050]│
│  3.3V ─────────────────── VCC [MPU-6050]│
│  GND ──────────────────── GND [MPU-6050]│
│                                         │
│  GPIO 14 (SCK) ──────── SCK  [INMP441] │
│  GPIO 15 (WS)  ──────── WS   [INMP441] │
│  GPIO 32 (SD)  ──────── SD   [INMP441] │
│  3.3V ─────────────────── VDD [INMP441] │
│  GND ──────────────────── GND [INMP441] │
│  L/R ──────────────────── GND [INMP441] │← Mono Right Channel
│                                         │
│  USB ──────────────────────────── PC    │← 921600 baud
└─────────────────────────────────────────┘
```

### ⚡ Firmware Architecture (FreeRTOS Dual-Core)

Firmware sử dụng **FreeRTOS** để chạy 2 task song song trên 2 lõi riêng biệt:

```
ESP32 CORE 0 (PRO_CPU)          ESP32 CORE 1 (APP_CPU)
┌──────────────────────┐        ┌──────────────────────┐
│  TaskAudio (Prio 1)  │        │  TaskIMU (Prio 2)    │
│  ─────────────────   │        │  ─────────────────   │
│  I2S Read DMA Buffer │        │  MPU6050.getEvent()  │
│  256 samples/chunk   │        │  @ 100Hz (10ms tick) │
│  Format: "A:s1,s2,.."│        │  Format: "I:ax,ay,.."│
│  Serial.println()    │        │  Serial.printf()     │
└──────────┬───────────┘        └──────────┬───────────┘
           │                               │
           └───────────┬───────────────────┘
                       │ SemaphoreHandle_t serialMutex
                       │ (Mutex bảo vệ Serial port)
                  USB @ 921600 baud
```

---

## ⚙️ Backend - Trạm trung chuyển

**Node.js** đóng vai trò **Central Hub**, điều phối mọi luồng dữ liệu trong hệ thống:

```
┌───────────────────────────────────────────────┐
│           Node.js HUB (PORT 5000)             │
│                                               │
│  SerialPort (COM3 @ 921600 baud)              │
│       │                                       │
│       ├─ "I:..." → Parse IMU Data             │
│       │            ↓ io.emit('sensor_stream') │
│       │                                       │
│       └─ "A:..." → Parse Audio Chunk (256)    │
│                    ↓ io.emit('audio_stream')  │
│                                               │
│  Socket.IO Events (Port 5000):                │
│  ┌─────────────────────────────────────────┐  │
│  │ Listen: 'ai_gesture_detected'           │  │
│  │   → Broadcast: 'fe_gesture_update'     │  │
│  │                                         │  │
│  │ Listen: 'ai_voice_command'              │  │
│  │   → Broadcast: 'fe_voice_update'       │  │
│  └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```

**Stack:** `TypeScript · Express.js · Socket.IO v4 · SerialPort v13 · Nodemon`

---

## 🖥️ Frontend - Giao diện 3D

**React + Three.js** cung cấp giao diện 3D hiện đại, nhận dữ liệu real-time qua Socket.IO:

### 📱 Các trang chính

| Trang | Mô tả | Công nghệ |
|---|---|---|
| 🖼️ **Presentation** | Thuyết trình thông minh với gesture/voice | PDF.js, PPTX Preview |
| 🌌 **Sandbox** | 5 cảnh 3D tương tác (Robot/Cave/Solar...) | Three.js + R3F |
| 🎮 **MiniGame** | Contra & Voice Runner điều khiển bằng cử chỉ | Three.js |
| 📊 **Admin** | Dashboard giám sát hệ thống real-time | Recharts |
| 🎵 **MediaPlayer** | Trình phát media điều khiển bằng giọng nói | Web Audio API |

### 🔧 Tech Stack Frontend

```
React 18 + TypeScript + Vite
│
├── 🎨 UI: Radix UI + Tailwind CSS + shadcn/ui
├── 🌌 3D Rendering: Three.js + React Three Fiber + Drei
├── ✨ Animation: Framer Motion + @react-three/postprocessing
├── 🌐 State: Zustand (Global Store)
├── 🔌 Real-time: Socket.IO Client v4
└── 📦 Data: TanStack Query v5
```

### 📡 Luồng dữ liệu Real-time

```
Socket Event 'fe_gesture_update'  →  useGestureStore (Zustand)
                                            ↓
                                   GestureHandler (Hook)
                                            ↓
                         ┌──────────────────────────────────┐
                         │  LEFT/RIGHT → Lật slide          │
                         │  PUSH       → Bắn súng game      │
                         │  UP/DOWN    → Zoom 3D / Scroll   │
                         └──────────────────────────────────┘

Socket Event 'fe_voice_update'    →  useVoiceStore (Zustand)
                                            ↓
                         ┌──────────────────────────────────┐
                         │  BIG/SMALL  → Scale 3D object    │
                         │  LEFT/RIGHT → Navigate slide     │
                         │  SHOOT/BẮN  → Fire in game       │
                         └──────────────────────────────────┘
```

---

## 🚀 Hướng dẫn cài đặt

### 📋 Yêu cầu hệ thống

| Thành phần | Yêu cầu tối thiểu |
|---|---|
| OS | Windows 10/11 (khuyến nghị) |
| Node.js | v18+ |
| Python | 3.9+ |
| RAM | 8GB+ |
| GPU | CUDA (tùy chọn, CPU cũng chạy được) |
| IDE | VS Code + PlatformIO Extension |

---

### 🔧 Bước 1: Cài đặt Firmware (ESP32)

<details>
<summary><strong>📖 Nhấn để mở hướng dẫn chi tiết</strong></summary>

1. **Cài đặt VS Code** và extension **PlatformIO IDE**

2. **Mở thư mục** `firmware/` trong VS Code

3. **Đấu nối phần cứng** theo sơ đồ ở trên

4. **Nạp firmware** lên ESP32:
   ```
   PlatformIO: Upload (Ctrl+Alt+U)
   ```

5. **Kiểm tra kết nối** qua Serial Monitor (baudrate: 921600):
   ```
   I:0.12,-0.34,9.81,0.001,-0.002,0.003
   A:123,456,-789,234,...
   ```

> **⚠️ Lưu ý:** Thiết bị cần kết nối USB vào máy tính trước khi chạy Backend.

</details>

---

### ⚙️ Bước 2: Cài đặt Backend (Node.js Hub)

```bash
# Di chuyển vào thư mục backend
cd backend

# Cài đặt dependencies
npm install

# Cập nhật cổng COM trong src/server.ts
# const COM_PORT = 'COM3';  ← Sửa thành cổng COM của bạn (kiểm tra Device Manager)

# Khởi động server
npm run dev
```

**Kiểm tra thành công:**
```
==================================================
🚀 [HUB] Kênh Web/AI (Socket.IO) chạy tại PORT 5000
🔌 [ESP32] Đã kết nối cổng COM3 với tốc độ 921600!
```

---

### 🧠 Bước 3: Cài đặt AI Engine (Python)

**⚠️ Quan trọng:** Đảm bảo có các file model trong `ai_engine/models/`:
- `best_gesture_model.pth`
- `best_audio_model.pth`
- `scaler.pkl`

```bash
# Di chuyển vào thư mục AI
cd ai_engine

# Tạo và kích hoạt môi trường ảo (khuyến nghị)
python -m venv venv
venv\Scripts\activate          # Windows

# Cài đặt dependencies
pip install torch torchaudio numpy scipy python-socketio joblib
```

**Chạy 2 dịch vụ AI (mở 2 terminal riêng biệt):**

```bash
# 🖥️ Terminal 1 — AI nhận diện CỬ CHỈ TAY
python src/ai_service.py
```

```bash
# 🖥️ Terminal 2 — AI nhận diện GIỌNG NÓI
python src/ai_audio_service.py
```

**Kiểm tra thành công (Terminal 1):**
```
✅ AI Engine đã sẵn sàng! Nhận diện 6 cử chỉ: ['LEFT', 'RIGHT', 'PUSH', 'IDLE', 'UP', 'DOWN']
🌐  Đã kết nối thành công với Node.js Server!
🛸 Thợ săn AI đã vào vị trí, đang rình rập chuyển động...
```

**Kiểm tra thành công (Terminal 2):**
```
✅ Audio AI Sẵn sàng! Từ điển (8 từ): ['LEFT', 'RIGHT', 'BIG', 'SMALL', 'SHOOT', ...]
🎧 Đang lắng nghe mệnh lệnh bằng Giọng nói...
```

---

### 🖥️ Bước 4: Cài đặt Frontend (React)

```bash
# Di chuyển vào thư mục frontend
cd ai-conductor-nexus

# Cài đặt dependencies
npm install

# Khởi động dev server
npm run dev
```

Mở trình duyệt tại: **[http://localhost:8080](http://localhost:8080)**

---

### 📊 Tổng quan startup (chạy theo thứ tự)

```
Thứ tự khởi động:
1️⃣  ESP32 (cắm USB vào máy tính)
2️⃣  npm run dev         (trong thư mục backend/)
3️⃣  python ai_service.py        (Terminal 1 - ai_engine/)
4️⃣  python ai_audio_service.py  (Terminal 2 - ai_engine/)
5️⃣  npm run dev         (trong thư mục ai-conductor-nexus/)
```

---

## 🎮 Hướng dẫn sử dụng

### 🤚 Cử chỉ tay (Gesture Commands)

| Cử chỉ | Mô tả | Tác dụng |
|:---:|---|---|
| ⬅️ **Vuốt Trái** | Di chuyển tay nhanh sang trái | Slide trước / Di chuyển trái |
| ➡️ **Vuốt Phải** | Di chuyển tay nhanh sang phải | Slide kế / Di chuyển phải |
| 👊 **PUSH (Đấm)** | Cú đấm thẳng về phía trước | Bắn súng (game) / Xác nhận |
| 🔄 **Xoay cổ tay** | Xoay cổ tay theo trục Z | Điều chỉnh âm lượng 3D |
| ⬆️ **Vuốt Lên** | Di chuyển tay lên nhanh | Zoom in / Scroll lên |
| ⬇️ **Vuốt Xuống** | Di chuyển tay xuống nhanh | Zoom out / Scroll xuống |

### 🗣️ Lệnh giọng nói (Voice Commands)

| Khẩu lệnh | Ngôn ngữ | Tác dụng |
|:---:|:---:|---|
| **"LEFT"** | Tiếng Anh | Slide trước / Di chuyển trái |
| **"RIGHT"** | Tiếng Anh | Slide kế / Di chuyển phải |
| **"BIG"** | Tiếng Anh | Phóng to đối tượng 3D |
| **"SMALL"** | Tiếng Anh | Thu nhỏ đối tượng 3D |
| **"SHOOT" / "BẮN"** | EN/VI | Nhân vật bắn súng (Contra) |
| **Hét to** | — | Nhân vật nhảy (Voice Runner) |

---

## 📊 Hiệu năng

### ⚡ Độ trễ End-to-End (Latency)

```
ESP32 (Sensor) → USB Serial → Node.js → AI Service → Frontend
     ~2ms           ~5ms         ~3ms      ~80ms        ~5ms
                                                    ──────────
                                            Total: < 100ms (Cử chỉ)
                                            Total: < 150ms (Giọng nói)
```

### 🎯 Độ chính xác mô hình

| Mô hình | Classes | Accuracy | Confidence Gate |
|---|:---:|:---:|:---:|
| GestureNet (CNN+BiLSTM) | 6 | **~92%** | 75% |
| KeywordSpottingNet | 8 | **~88%** | 85% |

### 🔧 Thông số kỹ thuật

| Thông số | Giá trị |
|---|---|
| IMU sample rate | 100 Hz |
| Audio sample rate | 16,000 Hz |
| Audio chunk size | 256 samples |
| Gesture window | 100 timesteps = 1 giây |
| Voice window | 16,000 samples = 1 giây |
| Serial baud rate | 921,600 bps |
| Cooldown time (gesture) | 1.2 giây |
| Cooldown time (voice) | 1.0 giây |

---

## 👥 Đội ngũ phát triển

<div align="center">

### 🏆 Team Innovate Forward

</div>

| Thành viên | Vai trò | Đóng góp chính |
|:---:|:---:|---|
| **Trần Nguyễn Sơn Thành** | 🏗️ Leader / System Architect | Thiết kế kiến trúc tổng thể, Frontend ReactJS, Zustand State Management, Three.js 3D, Hybrid Control Logic |
| **Lữ Tất Thành** | 🔌 Embedded Engineer | Thiết kế phần cứng, Firmware ESP32, FreeRTOS Multithreading, I²C/I²S Protocol |
| **Nguyễn Duy Thái** | 🧠 Data Scientist | Xây dựng Data Pipeline, Thu thập dữ liệu, Huấn luyện mô hình Deep Learning (PyTorch) trên Google Colab |
| **Cao Duy Thái** | ⚙️ Backend & Inference Engineer | Trạm trung chuyển Node.js (Socket.IO), AI Inference Services (Python), Tối ưu pipeline |

<div align="center">

---

🎓 **Giảng viên hướng dẫn:** TS. Nguyễn Trọng Kiên — Học viện Công nghệ Bưu chính Viễn thông (PTIT HCM)

📚 **Môn học:** Tương tác Người-Máy (Human-Computer Interaction with IoT & Embedded Systems)

</div>

---

## 🛠️ Công nghệ sử dụng

<div align="center">

### Embedded & IoT

![ESP32](https://img.shields.io/badge/ESP32-E7352C?style=flat-square&logo=espressif&logoColor=white)
![C++](https://img.shields.io/badge/C++-00599C?style=flat-square&logo=c%2B%2B&logoColor=white)
![FreeRTOS](https://img.shields.io/badge/FreeRTOS-8CC84B?style=flat-square)
![PlatformIO](https://img.shields.io/badge/PlatformIO-FF7F00?style=flat-square&logo=platformio&logoColor=white)

### AI & Machine Learning

![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=flat-square&logo=pytorch&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)
![NumPy](https://img.shields.io/badge/NumPy-013243?style=flat-square&logo=numpy&logoColor=white)
![SciPy](https://img.shields.io/badge/SciPy-8CAAE6?style=flat-square&logo=scipy&logoColor=white)

### Backend

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=flat-square&logo=socketdotio&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)

### Frontend

![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat-square&logo=threedotjs&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer%20Motion-0055FF?style=flat-square&logo=framer&logoColor=white)

</div>

---

## ❓ Troubleshooting

<details>
<summary><strong>🔴 Lỗi: "Không thể mở cổng COM"</strong></summary>

1. Kiểm tra ESP32 đã cắm USB chưa
2. Vào **Device Manager** → **Ports (COM & LPT)** → Tìm cổng COM của ESP32
3. Sửa `COM_PORT` trong `backend/src/server.ts`
4. Đảm bảo không có chương trình nào khác đang dùng cổng COM này (như Serial Monitor của Arduino IDE)

</details>

<details>
<summary><strong>🔴 Lỗi: "Không tìm thấy file model"</strong></summary>

Đảm bảo các file sau tồn tại trong `ai_engine/models/`:
- `best_gesture_model.pth`
- `best_audio_model.pth`
- `scaler.pkl`

Nếu chưa có, cần huấn luyện lại mô hình bằng notebook trong `ai_engine/src/`:
- `AI_tương_tác_người_máy_(MPU6050).ipynb`
- `AI_tương_tác_người_máy_(I2S_INMP).ipynb`

</details>

<details>
<summary><strong>🔴 AI nhận diện kém / hay nhận nhầm</strong></summary>

**Cử chỉ:**
- Đảm bảo cử chỉ **dứt khoát**, rõ ràng
- Điều chỉnh `ENERGY_THRESHOLD` trong `ai_service.py` (mặc định 0.8G)
- Kiểm tra MPU-6050 đặt đúng hướng trên cổ tay

**Giọng nói:**
- Nói **rõ ràng**, đủ to, gần micro (< 50cm)
- Giảm `DYNAMIC_ENERGY_THRESHOLD` nếu micro quá xa
- Đảm bảo môi trường ít tiếng ồn nền

</details>

<details>
<summary><strong>🔴 Frontend không nhận được dữ liệu</strong></summary>

1. Đảm bảo Backend đang chạy tại `http://localhost:5000`
2. Kiểm tra console trình duyệt (F12) có lỗi CORS không
3. Đảm bảo thứ tự khởi động đúng: ESP32 → Backend → AI → Frontend

</details>

---

## 📄 License

```
MIT License

Copyright (c) 2025 Innovate Forward Team - PTIT HCM

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

<div align="center">

**Dự án được thực hiện hoàn toàn cho mục đích giáo dục và nghiên cứu HCI.**

Nhóm xin chân thành cảm ơn sự hướng dẫn tận tình của **TS. Nguyễn Trọng Kiên**.

<br/>

⭐ **Nếu dự án này hữu ích, hãy cho chúng tôi một ngôi sao!** ⭐

<br/>

© 2025 **Innovate Forward Team** — PTIT HCM

*Made with ❤️ and a lot of ☕*

</div>
