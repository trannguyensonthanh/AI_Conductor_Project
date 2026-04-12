import os
import time
import serial
import torch
import torch.nn as nn
import numpy as np
import joblib
import threading
from collections import deque
import matplotlib.pyplot as plt
import matplotlib.animation as animation
import socketio
# ================= CẤU HÌNH CƠ BẢN =================
COM_PORT = 'COM3'      # <<< NHỚ ĐỔI CỔNG COM CỦA ÔNG
BAUD_RATE = 115200
SEQ_LENGTH = 100       # 150 frames = 1.5 giây
FEATURES = 6           # 6 trục
NODEJS_SERVER = 'http://localhost:5000'
# ===================================================

# Các đường dẫn
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "..", "models", "best_gesture_model.pth")
SCALER_PATH = os.path.join(SCRIPT_DIR, "..", "models", "scaler.pkl")
# Khởi tạo Client Socket.IO
sio = socketio.Client()
try:
    sio.connect(NODEJS_SERVER)
    print(f"🌐 [MẠNG] Đã kết nối thành công tới Backend Node.js: {NODEJS_SERVER}")
except Exception as e:
    print(f"⚠️[CẢNH BÁO] Không thể kết nối Node.js. Nhớ bật Backend lên nhé!")
# Biến toàn cục cho giao diện và luồng
MAX_PLOT_POINTS = 100
plot_ax, plot_ay, plot_az = [deque([0]*MAX_PLOT_POINTS, maxlen=MAX_PLOT_POINTS) for _ in range(3)]
current_status = "🟢 SẴN SÀNG"
status_color = "green"
is_recording = False
recording_buffer = []

# --- KIẾN TRÚC MẠNG ---
class GestureNet(nn.Module):
    def __init__(self, num_features=6, num_classes=5, cnn_filters=64, lstm_hidden=128):
        super(GestureNet, self).__init__()
        self.cnn = nn.Sequential(
            nn.Conv1d(in_channels=num_features, out_channels=cnn_filters, kernel_size=5, padding=2),
            nn.BatchNorm1d(cnn_filters), nn.ReLU(), nn.MaxPool1d(kernel_size=2),
            nn.Conv1d(in_channels=cnn_filters, out_channels=cnn_filters*2, kernel_size=3, padding=1),
            nn.BatchNorm1d(cnn_filters*2), nn.ReLU(), nn.MaxPool1d(kernel_size=2)
        )
        self.lstm = nn.LSTM(
            input_size=cnn_filters*2, hidden_size=lstm_hidden, 
            num_layers=2, batch_first=True, bidirectional=True, dropout=0.3
        )
        self.classifier = nn.Sequential(
            nn.Linear(lstm_hidden * 2, 64), nn.BatchNorm1d(64), nn.ReLU(), nn.Dropout(0.4),
            nn.Linear(64, num_classes)
        )
    def forward(self, x):
        x = x.permute(0, 2, 1)
        x = self.cnn(x)
        x = x.permute(0, 2, 1)
        lstm_out, (h_n, c_n) = self.lstm(x)
        final_hidden = torch.cat((h_n[-2, :, :], h_n[-1, :, :]), dim=1)
        return self.classifier(final_hidden)
# ----------------------------------------

def load_brain():
    print("🧠 Đang tải Trí tuệ Nhân tạo...")
    device = torch.device("cpu") # Inference trên CPU là đủ nhanh
    checkpoint = torch.load(MODEL_PATH, map_location=device)
    label_mapping = checkpoint['label_mapping']
    model = GestureNet(num_features=6, num_classes=len(label_mapping)).to(device)
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()
    scaler = joblib.load(SCALER_PATH)
    print("✅ AI đã thức giấc!")
    return model, scaler, label_mapping, device

# --- HÀM SUY LUẬN (CHỈ CHẠY KHI ĐƯỢC GỌI) ---
def predict_gesture(model, scaler, label_mapping, device, data_buffer):
    global current_status, status_color
    
    current_status = "🤔 AI ĐANG PHÂN TÍCH..."
    status_color = "orange"
    
    data_np = np.array(data_buffer)
    data_scaled = scaler.transform(data_np)
    data_tensor = torch.tensor(data_scaled, dtype=torch.float32).unsqueeze(0).to(device)
    
    with torch.no_grad():
        output = model(data_tensor)
        probabilities = torch.nn.functional.softmax(output, dim=1)
        confidence, predicted_idx = torch.max(probabilities, 1)
        
        confidence_pct = confidence.item() * 100
        pred_label = label_mapping[predicted_idx.item()]
        
        if confidence_pct > 70.0:
            current_status = f"🎯 KẾT QUẢ: [ {pred_label.upper()} ]"
            status_color = "blue"
            
            # 🔥 BẮN LỆNH LÊN BACKEND NODE.JS NGAY LẬP TỨC 🔥
            if sio.connected:
                sio.emit('python_gesture', {'gesture': pred_label.upper(), 'confidence': round(confidence_pct, 2)})
        else:
            current_status = f"❓ KHÔNG CHẮC CHẮN - {confidence_pct:.1f}%"
            status_color = "gray"
            print(f"   -> {current_status}")
            
    # Hẹn giờ reset về trạng thái Sẵn sàng
    threading.Timer(2.0, reset_status).start()

def reset_status():
    global current_status, status_color
    current_status = "🟢 SẴN SÀNG - Bấm SPACE để bắn tỉa"
    status_color = "green"

# --- LUỒNG ĐỌC DỮ LIỆU ---
def serial_reader(ser):
    global is_recording, recording_buffer
    while True:
        try:
            line = ser.readline().decode('utf-8').strip()
            if not line: continue
            
            parts = line.split(',')
            if len(parts) == 6:
                data_point = [float(p.split(':')[1]) for p in parts]
                
                # Cập nhật biểu đồ
                plot_ax.append(data_point[0])
                plot_ay.append(data_point[1])
                plot_az.append(data_point[2])
                # 🔥 BẮN SÓNG CẢM BIẾN REAL-TIME LÊN BACKEND ĐỂ VẼ CHART FRONTEND 🔥
                if sio.connected:
                    sio.emit('python_sensor_data', {
                        'ax': data_point[0], 'ay': data_point[1], 'az': data_point[2],
                        'gx': data_point[3], 'gy': data_point[4], 'gz': data_point[5]
                    })

                # Nếu đang trong chế độ ghi, gom data vào buffer
                if is_recording:
                    recording_buffer.append(data_point)
                    if len(recording_buffer) >= SEQ_LENGTH:
                        is_recording = False # Tự động ngắt khi đủ 150 frames
                        # Tạo luồng mới để AI xử lý, tránh làm đơ giao diện
                        threading.Thread(target=predict_gesture, args=(model, scaler, label_mapping, device, recording_buffer.copy())).start()
                        
        except Exception as e:
            pass 

# --- BẮT SỰ KIỆN BÀN PHÍM ---
def on_key_press(event):
    global is_recording, recording_buffer, current_status, status_color
    if event.key == ' ' and not is_recording:
        is_recording = True
        recording_buffer = [] # Xóa buffer cũ
        current_status = "🔴 ĐANG THU DỮ LIỆU... (1.5s)"
        status_color = "red"
        print("\n💥 Bắt đầu bắn tỉa! Hãy ra cử chỉ ngay...")

# ================= MAIN & GUI =================
if __name__ == "__main__":
    model, scaler, label_mapping, device = load_brain()
    
    try:
        ser = serial.Serial(COM_PORT, BAUD_RATE, timeout=1)
    except Exception as e:
        print(f"❌ LỖI MỞ CỔNG {COM_PORT}!")
        exit()

    reset_status() # Khởi tạo trạng thái ban đầu

    # Cài đặt Biểu đồ
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.set_ylim(-20, 20)
    line_x, = ax.plot([], label='Accel_X', color='r')
    line_y, = ax.plot([], label='Accel_Y', color='g')
    line_z, = ax.plot([], label='Accel_Z', color='b')
    ax.legend(loc='upper right')
    title_text = ax.text(0.5, 1.05, "", transform=ax.transAxes, ha="center", va="bottom", fontsize=18, fontweight='bold')
    
    fig.canvas.mpl_connect('key_press_event', on_key_press)
    
    def animate(i):
        line_x.set_data(range(len(plot_ax)), plot_ax)
        line_y.set_data(range(len(plot_ay)), plot_ay)
        line_z.set_data(range(len(plot_az)), plot_az)
        ax.relim()
        ax.autoscale_view()
        title_text.set_text(current_status)
        title_text.set_color(status_color)
        return line_x, line_y, line_z, title_text

    print("\n👉 BẢNG ĐIỀU KHIỂN ĐÃ MỞ. HÃY THỬ CHẾ ĐỘ 'BẮN TỈA'!")
    
    t_serial = threading.Thread(target=serial_reader, args=(ser,), daemon=True)
    t_serial.start()
    
    ani = animation.FuncAnimation(fig, animate, interval=30, blit=False)
    plt.show()