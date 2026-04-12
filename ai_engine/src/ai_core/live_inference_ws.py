import asyncio
import websockets
import json
import os
import time
import torch
import torch.nn as nn
import numpy as np
import joblib
from collections import deque

# ================= CẤU HÌNH GIAO TIẾP =================
NODEJS_AI_PORT = 3002
WS_URL = f"ws://localhost:{NODEJS_AI_PORT}"

SEQ_LENGTH = 100       # 1.5 giây data
FEATURES = 6
ENERGY_THRESHOLD = 2.5
COOLDOWN_TIME = 1.0

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "..", "..", "models", "best_gesture_model.pth")
SCALER_PATH = os.path.join(SCRIPT_DIR, "..", "..", "models", "scaler.pkl")
# =======================================================

# --- COPY LẠI KIẾN TRÚC MẠNG Y HỆT TRÊN COLAB ---
class GestureNet(nn.Module):
    def __init__(self, num_features=6, num_classes=5, cnn_filters=64, lstm_hidden=128):
        super(GestureNet, self).__init__()
        self.cnn = nn.Sequential(
            nn.Conv1d(in_channels=num_features, out_channels=cnn_filters, kernel_size=5, padding=2),
            nn.BatchNorm1d(cnn_filters), nn.ReLU(), nn.MaxPool1d(kernel_size=2),
            nn.Conv1d(in_channels=cnn_filters, out_channels=cnn_filters*2, kernel_size=3, padding=1),
            nn.BatchNorm1d(cnn_filters*2), nn.ReLU(), nn.MaxPool1d(kernel_size=2)
        )
        self.lstm = nn.LSTM(input_size=cnn_filters*2, hidden_size=lstm_hidden, num_layers=2, batch_first=True, bidirectional=True, dropout=0.3)
        self.classifier = nn.Sequential(
            nn.Linear(lstm_hidden * 2, 64), nn.BatchNorm1d(64), nn.ReLU(), nn.Dropout(0.4), nn.Linear(64, num_classes)
        )
    def forward(self, x):
        x = x.permute(0, 2, 1)
        x = self.cnn(x)
        x = x.permute(0, 2, 1)
        lstm_out, (h_n, c_n) = self.lstm(x)
        final_hidden = torch.cat((h_n[-2, :, :], h_n[-1, :, :]), dim=1)
        return self.classifier(final_hidden)
# ------------------------------------------------

def load_brain():
    print("\n🧠 Đang đánh thức Trí tuệ Nhân tạo (1D-CNN + BiLSTM)...")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    if not os.path.exists(MODEL_PATH) or not os.path.exists(SCALER_PATH):
        print("❌ LỖI: Không tìm thấy Model hoặc Scaler. Kiểm tra lại thư mục 'models'.")
        exit()
        
    checkpoint = torch.load(MODEL_PATH, map_location=device)
    label_mapping = checkpoint['label_mapping']
    
    model = GestureNet(num_features=FEATURES, num_classes=len(label_mapping)).to(device)
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()
    scaler = joblib.load(SCALER_PATH)
    
    print(f"✅ AI đã sẵn sàng trên thiết bị: [{device.type.upper()}]")
    print(f"🏷️ Các cử chỉ AI có thể nhận diện: {label_mapping}")
    return model, scaler, label_mapping, device

async def ai_client():
    model, scaler, label_mapping, device = load_brain()
    window = deque(maxlen=SEQ_LENGTH)
    last_predict_time = 0

    print(f"\n🔌 Đang kết nối tới Node.js Backend tại cổng {NODEJS_AI_PORT}...")
    
    # Kết nối tới Node.js Server qua WebSocket
    async with websockets.connect(WS_URL) as websocket:
        print("✅ [AI ENGINE] Đã kết nối thành công với Trạm Giao Thông Node.js!")
        print("==================================================")
        print("🛸 AI ĐANG LẮNG NGHE TÍN HIỆU TỪ GĂNG TAY...")
        print("==================================================\n")

        # Liên tục lắng nghe tin nhắn từ Node.js gửi sang
        async for message in websocket:
            try:
                # Node.js gửi sang cục JSON có chứa ax, ay, az, gx, gy, gz
                data = json.loads(message)
                
                # Bơm data vào Cửa sổ trượt
                window.append([data['ax'], data['ay'], data['az'], data['gx'], data['gy'], data['gz']])
                
                # Nếu ống đã đầy data (đủ 1.5 giây)
                if len(window) == SEQ_LENGTH:
                    current_time = time.time()
                    if current_time - last_predict_time < COOLDOWN_TIME:
                        continue # Đang Cooldown thì bỏ qua
                        
                    data_np = np.array(window)
                    energy = np.var(data_np[:, 0]) + np.var(data_np[:, 1]) + np.var(data_np[:, 2])
                    
                    if energy > ENERGY_THRESHOLD:
                        # 1. AI Suy luận
                        data_scaled = scaler.transform(data_np)
                        data_tensor = torch.tensor(data_scaled, dtype=torch.float32).unsqueeze(0).to(device)
                        
                        with torch.no_grad():
                            output = model(data_tensor)
                            probabilities = torch.nn.functional.softmax(output, dim=1)
                            confidence, predicted_idx = torch.max(probabilities, 1)
                            
                            confidence_pct = confidence.item() * 100
                            pred_label = label_mapping[predicted_idx.item()]
                            
                            # 2. Chốt đơn và BẮN KẾT QUẢ VỀ LẠI NODE.JS
                            if confidence_pct > 80.0:
                                print(f"🎯 AI CHỐT ĐƠN: [ {pred_label.upper()} ] - Tự tin: {confidence_pct:.1f}%")
                                
                                # Đóng gói kết quả thành JSON gửi về Backend Node.js
                                result_json = json.dumps({
                                    "gesture": pred_label,
                                    "confidence": round(confidence_pct, 2)
                                })
                                await websocket.send(result_json)
                                
                                last_predict_time = current_time
                                window.clear()

            except Exception as e:
                pass # Bỏ qua lỗi rác

if __name__ == "__main__":
    # Khởi chạy vòng lặp bất đồng bộ
    asyncio.run(ai_client())