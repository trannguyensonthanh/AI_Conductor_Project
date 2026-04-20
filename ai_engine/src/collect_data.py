import os
import time
import csv
import threading
import socketio
import numpy as np
from collections import deque
import matplotlib.pyplot as plt
import matplotlib.animation as animation

# ================= CẤU HÌNH KẾT NỐI =================
NODEJS_SERVER = 'http://localhost:5000' # Trạm trung chuyển Node.js
TOTAL_FRAMES = 100 # 1.5 giây (ở tần số 100Hz)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "..", "dataset", "raw")
os.makedirs(DATA_DIR, exist_ok=True)
# ====================================================

# Biến vẽ biểu đồ (Dùng deque cho hiệu năng cao)
MAX_POINTS = 100
data_ax = deque([0]*MAX_POINTS, maxlen=MAX_POINTS)
data_ay = deque([0]*MAX_POINTS, maxlen=MAX_POINTS)
data_az = deque([0]*MAX_POINTS, maxlen=MAX_POINTS)

# Các biến quản lý thu thập
is_recording = False
frames_to_record = 0
current_label = ""
current_sample_id = 0
csv_file = None
csv_writer = None

# Khởi tạo Socket.IO Client
sio = socketio.Client()

def prepare_csv(label):
    global current_sample_id, csv_file, csv_writer
    csv_file_path = os.path.join(DATA_DIR, f"{label}.csv")
    file_exists = os.path.isfile(csv_file_path)
    
    csv_file = open(csv_file_path, "a", newline="")
    csv_writer = csv.writer(csv_file)
    
    if not file_exists:
        csv_writer.writerow(["sample_id", "timestamp", "ax", "ay", "az", "gx", "gy", "gz", "label"])
        current_sample_id = 0
    else:
        # Đọc file để tìm ID lớn nhất
        with open(csv_file_path, "r") as f:
            lines = f.readlines()
            if len(lines) > 1:
                try:
                    last_line = lines[-1]
                    current_sample_id = int(last_line.split(',')[0])
                except:
                    current_sample_id = 0
                    
    print(f"📁 Dữ liệu sẽ lưu tại: {label}.csv | Bắt đầu từ ID: {current_sample_id + 1}")

# --- LẮNG NGHE SỰ KIỆN TỪ NODE.JS ---
@sio.event
def connect():
    print(f"🌐 Đã kết nối với Node.js tại {NODEJS_SERVER}")

@sio.event
def disconnect():
    print("❌ Mất kết nối với Node.js!")

@sio.on('sensor_stream')
def on_sensor_stream(data):
    global is_recording, frames_to_record
    
    try:
        ax, ay, az = data['ax'], data['ay'], data['az']
        gx, gy, gz = data['gx'], data['gy'], data['gz']

        # 1. Cập nhật dữ liệu cho biểu đồ vẽ
        data_ax.append(ax)
        data_ay.append(ay)
        data_az.append(az)

        # 2. Nếu đang bấm ghi hình (SPACE), thì lưu vào file CSV
        if is_recording and frames_to_record > 0:
            csv_writer.writerow([current_sample_id, time.time(), ax, ay, az, gx, gy, gz, current_label])
            frames_to_record -= 1
            
            if frames_to_record == 0:
                is_recording = False
                csv_file.flush() # Ép lưu vào ổ cứng
                print(f"✅ Đã lưu xong Sample ID [{current_sample_id}] cho cử chỉ: {current_label}")
    except Exception as e:
        pass

def start_socketio():
    try:
        sio.connect(NODEJS_SERVER)
        sio.wait()
    except Exception as e:
        print(f"❌ LỖI KHỞI ĐỘNG MẠNG: Bạn đã bật Backend Node.js chưa? Lỗi: {e}")

# --- BẮT SỰ KIỆN BÀN PHÍM VÀ VẼ GIAO DIỆN ---
def on_key_press(event):
    global is_recording, frames_to_record, current_sample_id
    if event.key == ' ' and not is_recording: 
        current_sample_id += 1 # Tăng ID cho mẫu mới
        print(f"🔴 BẮT ĐẦU GHI: Sample ID[{current_sample_id}]")
        frames_to_record = TOTAL_FRAMES
        is_recording = True

# Khởi tạo Giao diện Matplotlib
fig, ax = plt.subplots(figsize=(10, 5))
title_text = ax.set_title("🟢 SẴN SÀNG - Bấm SPACE để thu thập", fontsize=16, color='green')
ax.set_ylim(-20, 20)
line_x, = ax.plot(list(data_ax), label='Accel_X', color='r')
line_y, = ax.plot(list(data_ay), label='Accel_Y', color='g')
line_z, = ax.plot(list(data_az), label='Accel_Z', color='b')
ax.legend(loc='upper right')
fig.canvas.mpl_connect('key_press_event', on_key_press)

def animate(i):
    line_x.set_ydata(list(data_ax))
    line_y.set_ydata(list(data_ay))
    line_z.set_ydata(list(data_az))
    
    if is_recording:
        title_text.set_text(f"🔴 ĐANG GHI HÌNH... (Còn {frames_to_record} frames)")
        title_text.set_color('red')
        fig.patch.set_facecolor('#ffe6e6')
    else:
        title_text.set_text(f"🟢 SẴN SÀNG: [{current_label}] - Bấm SPACE")
        title_text.set_color('green')
        fig.patch.set_facecolor('white')
        
    return line_x, line_y, line_z, title_text

# ================= HÀM CHÍNH =================
if __name__ == "__main__":
    print("\n=======================================================")
    print("🎬 STUDIO THU THẬP AI CONDUCTOR (PHIÊN BẢN WI-FI)")
    print("=======================================================\n")
    
    current_label = input("👉 Nhập TÊN CỬ CHỈ muốn thu thập (VD: swipe_up, push, idle): ").strip().lower()
    
    if not current_label:
        print("❌ Lỗi: Bạn chưa nhập tên cử chỉ!")
        exit()
        
    prepare_csv(current_label)
    
    # Chạy kết nối Node.js ngầm ở một luồng riêng
    t_network = threading.Thread(target=start_socketio, daemon=True)
    t_network.start()

    print("\n👉 Cửa sổ biểu đồ sẽ hiện ra. Lắc nhẹ tay để xem đồ thị có chạy không.")
    print("👉 HÃY ĐẢM BẢO CHUỘT ĐANG CLICK VÀO CỬA SỔ BIỂU ĐỒ.")
    print("👉 BẤM PHÍM 'SPACE' ĐỂ THU 1 MẪU (1.5 giây).\n")

    ani = animation.FuncAnimation(fig, animate, interval=20, blit=False)
    plt.show()