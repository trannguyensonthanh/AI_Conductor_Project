import serial
import matplotlib.pyplot as plt
import matplotlib.animation as animation
import threading

# ================= CẤU HÌNH CỔNG USB =================
# THAY ĐỔI CỔNG COM Ở ĐÂY CHO ĐÚNG VỚI MÁY CỦA ÔNG (VD: 'COM3', 'COM5', '/dev/ttyUSB0')
COM_PORT = 'COM3' 
BAUD_RATE = 115200
# =====================================================

# Khởi tạo mảng chứa dữ liệu (Lưu 100 điểm gần nhất để vẽ)
MAX_POINTS = 100
data_ax = [0] * MAX_POINTS
data_ay = [0] * MAX_POINTS
data_az = [0] * MAX_POINTS

# Kết nối Serial
try:
    ser = serial.Serial(COM_PORT, BAUD_RATE, timeout=1)
    print(f"✅ Đã kết nối thành công tới {COM_PORT}")
except Exception as e:
    print(f"❌ LỖI: Không thể mở {COM_PORT}. Nhớ tắt Serial Monitor trong VS Code/Arduino đi nhé!")
    exit()

# Cấu hình biểu đồ
fig, ax = plt.subplots(figsize=(10, 5))
ax.set_title("Biểu đồ Gia Tốc MPU6050 (Thời gian thực)", fontsize=16)
ax.set_ylim(-20, 20) # Trục Y từ -20 đến 20 (Gia tốc rơi vào tầm này)
ax.set_ylabel("Gia tốc (m/s^2)")

line_x, = ax.plot(data_ax, label='Accel_X', color='r')
line_y, = ax.plot(data_ay, label='Accel_Y', color='g')
line_z, = ax.plot(data_az, label='Accel_Z', color='b')
ax.legend(loc='upper right')

# Luồng đọc dữ liệu từ USB liên tục
def read_from_serial():
    while True:
        try:
            line = ser.readline().decode('utf-8').strip()
            if line:
                # Dữ liệu có dạng: Accel_X:0.12,Accel_Y:-0.34,Accel_Z:9.81
                parts = line.split(',')
                if len(parts) == 3:
                    x_val = float(parts[0].split(':')[1])
                    y_val = float(parts[1].split(':')[1])
                    z_val = float(parts[2].split(':')[1])

                    # Cập nhật mảng (Xóa phần tử cũ nhất, thêm phần tử mới)
                    data_ax.append(x_val)
                    data_ax.pop(0)
                    data_ay.append(y_val)
                    data_ay.pop(0)
                    data_az.append(z_val)
                    data_az.pop(0)
        except Exception as e:
            pass # Bỏ qua lỗi rác

# Hàm cập nhật khung hình cho biểu đồ
def animate(i):
    line_x.set_ydata(data_ax)
    line_y.set_ydata(data_ay)
    line_z.set_ydata(data_az)
    return line_x, line_y, line_z

# Chạy luồng đọc USB ngầm
t1 = threading.Thread(target=read_from_serial, daemon=True)
t1.start()

# Hiển thị biểu đồ
print("📈 Đang mở cửa sổ biểu đồ. Hãy lắc tay thử nhé!")
ani = animation.FuncAnimation(fig, animate, interval=20, blit=True)
plt.show()