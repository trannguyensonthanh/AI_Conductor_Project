import os
import time
import torch
import torch.nn as nn
import numpy as np
import joblib
import socketio
import threading
from collections import deque
import torch.nn.functional as F
from scipy.ndimage import uniform_filter1d

# ==============================================================
#                 CẤU HÌNH AI SERVICE
# ==============================================================
NODEJS_SERVER = 'http://localhost:5000'
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "..", "models", "best_gesture_model.pth")
SCALER_PATH = os.path.join(SCRIPT_DIR, "..", "models", "scaler.pkl")

SEQ_LENGTH = 100        
FEATURES = 8            # 8 trục (ax, ay, az, gx, gy, gz, acc_mag, gyro_mag)

ENERGY_THRESHOLD = 0.8  # Ngưỡng lực đánh tịnh tiến (đã trừ trọng lực)
CONFIDENCE_THRESHOLD = 75.0 
COOLDOWN_TIME = 1.2     
# ==============================================================

# ==============================================================
#     1. KIẾN TRÚC MODEL - ĐÃ NÂNG CẤP ĐỂ KHỚP VỚI BẢN 6 CỬ CHỈ
# ==============================================================
class LayerNormLSTMCell(nn.LSTMCell):
    def __init__(self, input_size, hidden_size):
        super().__init__(input_size, hidden_size)
        self.ln_ih = nn.LayerNorm(4 * hidden_size)
        self.ln_hh = nn.LayerNorm(4 * hidden_size)
        self.ln_ho = nn.LayerNorm(hidden_size)

    def forward(self, input, hidden=None):
        if hidden is None:
            hidden = (torch.zeros(input.size(0), self.hidden_size).to(input.device),
                      torch.zeros(input.size(0), self.hidden_size).to(input.device))
        hx, cx = hidden
        gates = self.ln_ih(F.linear(input, self.weight_ih, self.bias_ih)) + \
                self.ln_hh(F.linear(hx, self.weight_hh, self.bias_hh))
        
        ingate, forgetgate, cellgate, outgate = gates.chunk(4, 1)
        ingate = torch.sigmoid(ingate)
        forgetgate = torch.sigmoid(forgetgate)
        cellgate = torch.tanh(cellgate)
        outgate = torch.sigmoid(outgate)

        cy = (forgetgate * cx) + (ingate * cellgate)
        hy = outgate * torch.tanh(self.ln_ho(cy))
        return hy, cy

class Attention(nn.Module):
    def __init__(self, hidden_size):
        super(Attention, self).__init__()
        self.attention = nn.Linear(hidden_size, 1, bias=False)

    def forward(self, lstm_outputs):
        attn_weights = F.softmax(self.attention(lstm_outputs), dim=1)
        context_vector = torch.sum(attn_weights * lstm_outputs, dim=1)
        return context_vector, attn_weights

class GestureNet(nn.Module):
    def __init__(self, num_features=8, num_classes=6, cnn_filters=128, lstm_hidden=96):
        super(GestureNet, self).__init__()

        self.cnn = nn.Sequential(
            nn.Conv1d(in_channels=num_features, out_channels=cnn_filters, kernel_size=7, padding=3),
            nn.BatchNorm1d(cnn_filters),
            nn.ReLU(),
            nn.MaxPool1d(kernel_size=2),
            
            nn.Conv1d(in_channels=cnn_filters, out_channels=cnn_filters*2, kernel_size=5, padding=2),
            nn.BatchNorm1d(cnn_filters*2),
            nn.ReLU(),
            nn.MaxPool1d(kernel_size=2),
            
            nn.Dropout(0.3)
        )

        self.lstm_forward = LayerNormLSTMCell(input_size=cnn_filters*2, hidden_size=lstm_hidden)
        self.lstm_backward = LayerNormLSTMCell(input_size=cnn_filters*2, hidden_size=lstm_hidden)
        
        self.attention = Attention(lstm_hidden * 2)

        self.classifier = nn.Sequential(
            nn.Linear(lstm_hidden * 2, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(256, num_classes)
        )

    def forward(self, x):
        x = x.permute(0, 2, 1)
        x = self.cnn(x)
        x = x.permute(0, 2, 1)
        
        batch_size, seq_len, _ = x.size()
        hidden_forward = None
        hidden_backward = None
        
        outputs_forward =[]
        outputs_backward =[]
        
        for t in range(seq_len):
            hidden_forward = self.lstm_forward(x[:, t, :], hidden_forward)
            outputs_forward.append(hidden_forward[0].unsqueeze(1))
            
        for t in range(seq_len - 1, -1, -1):
            hidden_backward = self.lstm_backward(x[:, t, :], hidden_backward)
            outputs_backward.insert(0, hidden_backward[0].unsqueeze(1))
        
        out_forward = torch.cat(outputs_forward, dim=1)
        out_backward = torch.cat(outputs_backward, dim=1)
        
        lstm_out = torch.cat((out_forward, out_backward), dim=2)
        context_vector, _ = self.attention(lstm_out)
        out = self.classifier(context_vector)
        return out

# ==============================================================
#     2. "BỘ NÃO" CỦA HỆ THỐNG
# ==============================================================
class AIEngine:
    def __init__(self, model_path, scaler_path):
        self.device = torch.device("cpu")
        print("⚙️  Đang nạp Siêu Trí tuệ (6 Cử chỉ - Attention) vào CPU...")
        
        try:
            checkpoint = torch.load(model_path, map_location=self.device)
            self.label_mapping = checkpoint['label_mapping']
            num_classes = len(self.label_mapping)
            
            self.model = GestureNet(
                num_features=FEATURES, 
                num_classes=num_classes,
                cnn_filters=128,
                lstm_hidden=96
            ).to(self.device)
            
            self.model.load_state_dict(checkpoint['model_state_dict'])
            self.model.eval()
            
            self.scaler = joblib.load(scaler_path)
            print(f"✅ AI Engine đã sẵn sàng! Có khả năng nhận diện {num_classes} cử chỉ: {list(self.label_mapping.values())}")

        except FileNotFoundError as e:
            print(f"❌ LỖI NGHIÊM TRỌNG: Không tìm thấy file model/scaler.\n{e}")
            exit()
        except Exception as e:
            print(f"❌ Lỗi khi tải model: {e}")
            exit()
            
        self.data_buffer = deque(maxlen=SEQ_LENGTH)
        self.buffer_lock = threading.Lock()
        self.last_predict_time = 0

    def append_data(self, data_point):
        with self.buffer_lock:
            self.data_buffer.append(data_point)

    def preprocess_window(self, sequence_6d):
        # 1. Làm mượt
        cleaned_seq = uniform_filter1d(sequence_6d, size=3, axis=0)
        acc = cleaned_seq[:, :3]
        gyro = cleaned_seq[:, 3:]
        
        # 2. Loại bỏ gia tốc trọng trường
        gravity = uniform_filter1d(acc, size=50, axis=0)
        linear_acc = acc - gravity
        
        # 3. Tính độ lớn vector (Magnitude)
        acc_mag = np.linalg.norm(linear_acc, axis=1, keepdims=True)
        gyro_mag = np.linalg.norm(gyro, axis=1, keepdims=True)
        
        # 4. Gộp lại thành 8 features
        enhanced_seq = np.hstack((linear_acc, gyro, acc_mag, gyro_mag))
        return enhanced_seq, acc_mag

    def _predict(self, enhanced_window):
        data_scaled = self.scaler.transform(enhanced_window)
        data_tensor = torch.tensor(data_scaled, dtype=torch.float32).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            output = self.model(data_tensor)
            probabilities = F.softmax(output, dim=1)
            confidence, predicted_idx = torch.max(probabilities, 1)
            
            pred_label = self.label_mapping[predicted_idx.item()]
            return pred_label, confidence.item() * 100

    def run_inference_loop(self):
        print("🛸 Thợ săn AI đã vào vị trí, đang rình rập chuyển động...")
        while True:
            time.sleep(0.02)
            current_time = time.time()

            if current_time - self.last_predict_time < COOLDOWN_TIME:
                continue

            with self.buffer_lock:
                if len(self.data_buffer) < SEQ_LENGTH:
                    continue
                # 👉 FIX LỖI TẠI ĐÂY: Ép kiểu dữ liệu về float32 để scipy không bị lỗi 'O'
                window_raw_np = np.array(self.data_buffer, dtype=np.float32)
            
            enhanced_window, acc_mag = self.preprocess_window(window_raw_np)
            energy = np.mean(acc_mag)
            
            if energy > ENERGY_THRESHOLD:
                self.last_predict_time = current_time 
                
                # Làm sạch bộ đệm sau khi bắt được chuyển động để tránh đoán đúp
                with self.buffer_lock:
                    self.data_buffer.clear()
                    
                pred_label, confidence_pct = self._predict(enhanced_window)
                
                if confidence_pct > CONFIDENCE_THRESHOLD and pred_label.lower() != 'idle':
                    print(f"🎯[CHỐT ĐƠN]: {pred_label.upper()} ({confidence_pct:.1f}%) | Lực đánh: {energy:.2f}G")
                    if sio.connected:
                        sio.emit('ai_gesture_detected', {
                            'gesture': pred_label.upper(), 
                            'confidence': round(confidence_pct, 2)
                        })
                else:
                    print(f"🤔 Bỏ qua (Đoán: {pred_label} - {confidence_pct:.1f}%)")

# ==============================================================
#     3. KÍCH HOẠT HỆ THỐNG
# ==============================================================
if __name__ == '__main__':
    sio = socketio.Client(reconnection_attempts=5, reconnection_delay=1)
    
    # Khởi tạo AI Engine trước
    ai_engine = AIEngine(MODEL_PATH, SCALER_PATH)

    @sio.event
    def connect():
        print(f"🌐  Đã kết nối thành công với Node.js Server!")

    @sio.event
    def connect_error(data):
        print(f"🔌 Lỗi kết nối: {data}")

    @sio.event
    def disconnect():
        print("❌ Đã mất kết nối với Node.js Server.")

    @sio.on('sensor_stream')
    def on_sensor_stream(data):
        try:
            # 👉 FIX LỖI TẠI ĐÂY NỮA: Ép kiểu float ngay lúc nhận để chống dính String từ Node.js
            ai_engine.append_data([
                float(data['ax']), float(data['ay']), float(data['az']), 
                float(data['gx']), float(data['gy']), float(data['gz'])
            ])
        except Exception as e:
            pass

    print("🚀 Bắt đầu khởi động hệ thống đa luồng...")
    worker_thread = threading.Thread(target=ai_engine.run_inference_loop, daemon=True)
    worker_thread.start()

    try:
        sio.connect(NODEJS_SERVER)
        sio.wait()
    except socketio.exceptions.ConnectionError:
        print("🛑 Không thể kết nối tới server. Hãy chắc chắn server Node.js đang chạy.")
    except KeyboardInterrupt:
        print("\n🛑 Người dùng yêu cầu dừng chương trình.")
    finally:
        if sio.connected:
            sio.disconnect()
        print("👋 Tạm biệt!")