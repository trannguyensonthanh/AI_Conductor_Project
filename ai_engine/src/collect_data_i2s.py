import os
import time
import threading
import wave # Thư viện chuẩn của Python để ghi file Audio
import socketio
import numpy as np
from collections import deque
import matplotlib.pyplot as plt
import matplotlib.animation as animation

# ================= CẤU HÌNH AUDIO CHUẨN =================
NODEJS_SERVER = 'http://localhost:5000' 

# Chuẩn âm thanh cho Speech Recognition AI
SAMPLE_RATE = 16000        # 16kHz
DURATION = 1.0             # Thu đúng 1 giây (Đủ để nói "Bắn", "Một", "Hai")
TOTAL_SAMPLES = int(SAMPLE_RATE * DURATION) 

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Tạo thư mục riêng cho Audio (tách biệt với IMU)
DATA_DIR = os.path.join(SCRIPT_DIR, "..", "dataset_audio", "raw")
os.makedirs(DATA_DIR, exist_ok=True)
# =======================================================

# Khởi tạo Socket.IO Client
sio = socketio.Client()

# Biến quản lý thu thập
is_recording = False
audio_buffer =[]  # Bộ đệm chứa các mẫu âm thanh trong 1 lần thu
current_label = ""
current_sample_id = 0

# Biểu đồ: Chỉ hiển thị 2000 mẫu gần nhất cho đỡ lag màn hình
MAX_PLOT_POINTS = 2000
data_mic = deque([0]*MAX_PLOT_POINTS, maxlen=MAX_PLOT_POINTS)

def get_next_id(label):
    """Tìm ID lớn nhất hiện có trong thư mục của từ khóa này"""
    folder_path = os.path.join(DATA_DIR, label)
    os.makedirs(folder_path, exist_ok=True)
    
    existing_files =[f for f in os.listdir(folder_path) if f.endswith('.wav')]
    if not existing_files:
        return 1
    
    # Tìm ID lớn nhất (giả sử tên file là: 1.wav, 2.wav...)
    max_id = 0
    for f in existing_files:
        try:
            file_id = int(f.split('.')[0])
            if file_id > max_id:
                max_id = file_id
        except: pass
    return max_id + 1

def save_to_wav(label, sample_id, audio_data):
    """Lưu mảng dữ liệu thành file .WAV chuẩn"""
    folder_path = os.path.join(DATA_DIR, label)
    file_path = os.path.join(folder_path, f"{sample_id}.wav")
    
    # Chuyển đổi dữ liệu sang chuẩn 16-bit PCM
    audio_np = np.array(audio_data, dtype=np.int16)
    
    with wave.open(file_path, 'wb') as wf:
        wf.setnchannels(1)      # Mono (1 kênh)
        wf.setsampwidth(2)      # 16-bit (2 bytes)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(audio_np.tobytes())
        
    print(f"✅ Đã lưu file Audio: {folder_path}/{sample_id}.wav")

# --- LẮNG NGHE DATA TỪ NODE.JS ---
@sio.event
def connect():
    print(f"🌐 Đã kết nối server: {NODEJS_SERVER}")

# HỨNG DỮ LIỆU DẠNG CỤC (CHUNK) THAY VÌ TỪNG ĐIỂM
@sio.on('audio_stream')
def on_audio_stream(data):
    global is_recording, audio_buffer, current_sample_id
    
    try:
        # ESP32 sẽ gửi 1 mảng (Array) ví dụ 512 mẫu cùng lúc
        chunk = data.get('chunk',[])
        
        # 1. Cập nhật biểu đồ (lấy vài điểm đại diện cho lẹ)
        if len(chunk) > 0:
            data_mic.extend(chunk)

        # 2. Nếu đang ghi âm
        if is_recording:
            audio_buffer.extend(chunk)
            
            # Nếu đã thu đủ số lượng mẫu (16000 mẫu = 1 giây)
            if len(audio_buffer) >= TOTAL_SAMPLES:
                is_recording = False
                
                # Cắt lấy đúng 16000 mẫu cho chuẩn
                final_audio = audio_buffer[:TOTAL_SAMPLES]
                save_to_wav(current_label, current_sample_id, final_audio)
                current_sample_id += 1

    except Exception as e:
        pass

def start_socketio():
    try:
        sio.connect(NODEJS_SERVER)
        sio.wait()
    except Exception as e:
        print(f"❌ Lỗi mạng: {e}")

# --- GIAO DIỆN & BÀN PHÍM ---
def on_key_press(event):
    global is_recording, audio_buffer, current_sample_id
    if event.key == ' ' and not is_recording: 
        audio_buffer =[] # Xóa sạch bộ đệm cũ
        is_recording = True
        print(f"🔴 ĐANG THU ÂM TỪ [{current_label.upper()}] SỐ {current_sample_id}...")
        # current_sample_id += 1

fig, ax = plt.subplots(figsize=(10, 4))
title_text = ax.set_title("🎤 STUDIO THU ÂM - Sẵn sàng", fontsize=14, color='green')
ax.set_ylim(-32768, 32767) # Dải âm thanh chuẩn 16-bit PCM
line_mic, = ax.plot(list(data_mic), color='#1f77b4', lw=1)
ax.set_ylabel("Biên độ sóng âm")
fig.canvas.mpl_connect('key_press_event', on_key_press)

def animate(i):
    line_mic.set_ydata(list(data_mic))
    
    if is_recording:
        progress = int((len(audio_buffer) / TOTAL_SAMPLES) * 100)
        title_text.set_text(f"🔴 ĐANG THU ÂM... {progress}%")
        title_text.set_color('red')
        fig.patch.set_facecolor('#fff5f5')
    else:
        title_text.set_text(f"🟢 SẴN SÀNG: Từ khóa[{current_label.upper()}] - Bấm SPACE")
        title_text.set_color('green')
        fig.patch.set_facecolor('white')
        
    return line_mic, title_text

if __name__ == "__main__":
    print("\n" + "="*50)
    print("🎙️ AUDIO DATA COLLECTOR (WAV FORMAT)")
    print("="*50 + "\n")
    
    current_label = input("👉 Nhập TỪ KHÓA muốn thu (vd: ban, mot, hai, noise): ").strip().lower()
    
    if not current_label:
        exit()
        
    current_sample_id = get_next_id(current_label)
    print(f"📁 Từ khóa [{current_label.upper()}] sẽ bắt đầu từ ID: {current_sample_id}")
    
    t_network = threading.Thread(target=start_socketio, daemon=True)
    t_network.start()

    ani = animation.FuncAnimation(fig, animate, interval=30, blit=False)
    plt.show()