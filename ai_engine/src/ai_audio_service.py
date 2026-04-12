import os
import time
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchaudio.transforms as T
import numpy as np
import socketio
import threading
from collections import deque

# ================= CẤU HÌNH AI AUDIO SERVICE =================
NODEJS_SERVER = 'http://localhost:5000'
SAMPLE_RATE = 16000
DURATION = 1.0  
SEQ_LENGTH = int(SAMPLE_RATE * DURATION) 
ENERGY_THRESHOLD = 0.02 # Ngưỡng âm lượng để kích hoạt (Tránh tiếng quạt máy, tiếng ồn nền)
COOLDOWN_TIME = 1.0

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "..", "models", "best_audio_model.pth")
# ==============================================================

# --- KIẾN TRÚC MẠNG TỪ QUÁ TRÌNH TRAIN (COPY Y HỆT) ---
class AudioAttention(nn.Module):
    def __init__(self, hidden_size):
        super(AudioAttention, self).__init__()
        self.attention = nn.Sequential(
            nn.Linear(hidden_size, hidden_size // 2), nn.Tanh(), nn.Linear(hidden_size // 2, 1, bias=False)
        )
    def forward(self, lstm_outputs):
        attn_weights = F.softmax(self.attention(lstm_outputs), dim=1)
        context_vector = torch.sum(attn_weights * lstm_outputs, dim=1)
        return context_vector, attn_weights

class KeywordSpottingNet(nn.Module):
    def __init__(self, num_classes):
        super(KeywordSpottingNet, self).__init__()
        self.cnn = nn.Sequential(
            nn.Conv2d(1, 16, kernel_size=3, padding=1), nn.BatchNorm2d(16), nn.ReLU(), nn.MaxPool2d((2, 2)),
            nn.Conv2d(16, 32, kernel_size=3, padding=1), nn.BatchNorm2d(32), nn.ReLU(), nn.MaxPool2d((2, 2)),
            nn.Dropout2d(0.2)
        )
        lstm_input_size = 16 * 32
        self.lstm = nn.LSTM(input_size=lstm_input_size, hidden_size=64, num_layers=1, batch_first=True, bidirectional=True)
        self.attention = AudioAttention(hidden_size=128)
        self.classifier = nn.Sequential(
            nn.Linear(128, 64), nn.BatchNorm1d(64), nn.ReLU(), nn.Dropout(0.4), nn.Linear(64, num_classes)
        )

    def forward(self, x):
        x = self.cnn(x)
        batch_size, channels, mels, time_frames = x.size()
        x = x.permute(0, 3, 1, 2).contiguous() 
        x = x.view(batch_size, time_frames, channels * mels) 
        lstm_out, _ = self.lstm(x)
        context_vector, _ = self.attention(lstm_out)
        out = self.classifier(context_vector)
        return out

# --- HỆ THỐNG XỬ LÝ ÂM THANH REAL-TIME ---
sio = socketio.Client()
audio_buffer = deque(maxlen=SEQ_LENGTH)
buffer_lock = threading.Lock()

class AudioEngine:
    def __init__(self):
        print("🎙️ Đang khởi động Audio AI Service (Có bộ lọc Noise)...")
        self.device = torch.device("cpu") 
        
        try:
            checkpoint = torch.load(MODEL_PATH, map_location=self.device)
            label_to_idx = checkpoint.get('label_to_idx') or checkpoint.get('label_mapping')
            if isinstance(list(label_to_idx.keys())[0], int):
                self.idx_to_label = label_to_idx
            else:
                self.idx_to_label = {v: k for k, v in label_to_idx.items()}
            
            num_classes = len(self.idx_to_label)
            
            self.model = KeywordSpottingNet(num_classes=num_classes).to(self.device)
            self.model.load_state_dict(checkpoint['model_state_dict'])
            self.model.eval()
            
            self.mel_transform = T.MelSpectrogram(sample_rate=SAMPLE_RATE, n_fft=1024, hop_length=512, n_mels=64).to(self.device)
            self.db_transform = T.AmplitudeToDB().to(self.device)
            
            self.last_predict_time = 0
            print(f"✅ Audio AI Sẵn sàng! Từ điển ({num_classes} từ): {list(self.idx_to_label.values())}")
        except Exception as e:
            print(f"❌ LỖI NẠP MODEL ÂM THANH: {e}")
            exit()

    def process_and_predict(self):
        print("🎧 Đang lắng nghe mệnh lệnh bằng Giọng nói...")
        while True:
            time.sleep(0.05)
            
            if time.time() - self.last_predict_time < COOLDOWN_TIME:
                continue

            with buffer_lock:
                if len(audio_buffer) < SEQ_LENGTH:
                    continue
                audio_data = list(audio_buffer)

            # Chuyển đổi 16-bit PCM về Float
            audio_np = np.array(audio_data, dtype=np.float32) / 32768.0
            rms_energy = np.sqrt(np.mean(audio_np**2))
            
            if rms_energy > ENERGY_THRESHOLD:
                audio_tensor = torch.tensor(audio_np).unsqueeze(0).to(self.device) 
                mel_spec = self.mel_transform(audio_tensor)
                mel_db = self.db_transform(mel_spec).unsqueeze(0) 

                with torch.no_grad():
                    output = self.model(mel_db)
                    probabilities = F.softmax(output, dim=1)
                    confidence, predicted_idx = torch.max(probabilities, 1)
                    
                    confidence_pct = confidence.item() * 100
                    pred_label = self.idx_to_label[predicted_idx.item()].lower() # Đưa về chữ thường để dễ so sánh
                    
                    # 🔥 BỘ LỌC ĐA TẦNG: TỰ TIN + CHỐNG NOISE 🔥
                    if confidence_pct < 75.0:
                        print(f"🤔 Chưa rõ ràng ({pred_label.upper()} - {confidence_pct:.1f}%). Bỏ qua.")
                    elif pred_label == 'noise':
                        # TÌM RA NHÃN NOISE -> CHẶN ĐỨNG NGAY TẠI ĐÂY!
                        print(f"🗑️ [BỎ QUA TẠP ÂM]: Nhận diện là Noise ({confidence_pct:.1f}%).")
                        # Xóa bộ đệm để không nhận diện lại cục rác này
                        with buffer_lock:
                            audio_buffer.clear()
                    else:
                        # CHỈ KHI LÀ LỆNH CHUẨN VÀ TỰ TIN CAO MỚI BẮN LÊN FRONTEND
                        print(f"🗣️ [CHỐT LỆNH]: {pred_label.upper()} ({confidence_pct:.1f}%) | Vol: {rms_energy:.3f}")
                        
                        if sio.connected:
                            sio.emit('ai_voice_command', {
                                'command': pred_label.upper(), 
                                'confidence': round(confidence_pct, 2)
                            })
                        
                        self.last_predict_time = time.time()
                        with buffer_lock:
                            audio_buffer.clear() 

# --- KẾT NỐI VÀ HỨNG DỮ LIỆU TỪ NODE.JS ---
@sio.event
def connect():
    print(f"🌐[AUDIO] Đã kết nối với Tổng đài Node.js")

@sio.on('audio_stream')
def on_audio_stream(data):
    chunk = data.get('chunk',[])
    if chunk:
        with buffer_lock:
            audio_buffer.extend(chunk)

if __name__ == '__main__':
    engine = AudioEngine()
    worker = threading.Thread(target=engine.process_and_predict, daemon=True)
    worker.start()
    try:
        sio.connect(NODEJS_SERVER)
        sio.wait()
    except Exception as e:
        print(f"Lỗi mạng: {e}")