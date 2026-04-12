#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <driver/i2s.h>

// ================= THÔNG TIN MẠNG (SỬA Ở ĐÂY) =================
const char *ssid = "Dung tret_2.4G"; // Thay bằng tên Wifi nhà ông
const char *password = "0352791426"; // Thay bằng mật khẩu Wifi

// Lấy IP IPv4 của máy tính ông (Mở CMD gõ ipconfig để lấy dòng IPv4 Address)
const char *server_ip = "192.168.1.10"; // VD: "192.168.1.60"
const uint16_t server_port = 5000;      // Port của Node.js Backend sau này
// ==============================================================

// --- CẤU HÌNH PHẦN CỨNG ---
#define I2C_SDA 21
#define I2C_SCL 22
#define I2S_WS 15
#define I2S_SD 13
#define I2S_SCK 14
#define I2S_PORT I2S_NUM_0

Adafruit_MPU6050 mpu;
WebSocketsClient webSocket;

// Biến quản lý thời gian (Lấy mẫu 50Hz = 20ms)
unsigned long lastSampleTime = 0;
const int sampleInterval = 20;

// --- HÀM CẤU HÌNH I2S  ---
void i2s_install()
{
  const i2s_config_t i2s_config = {
      .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
      .sample_rate = 44100,
      .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
      .channel_format = I2S_CHANNEL_FMT_ONLY_RIGHT, // Kênh Phải (như ông đã test OK)
      .communication_format = I2S_COMM_FORMAT_STAND_I2S,
      .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
      .dma_buf_count = 8,
      .dma_buf_len = 64,
      .use_apll = false,
      .tx_desc_auto_clear = false,
      .fixed_mclk = 0};
  const i2s_pin_config_t pin_config = {
      .bck_io_num = I2S_SCK,
      .ws_io_num = I2S_WS,
      .data_out_num = I2S_PIN_NO_CHANGE,
      .data_in_num = I2S_SD};
  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);
  i2s_start(I2S_PORT);
}

// --- HÀM XỬ LÝ SỰ KIỆN WEBSOCKET ---
void webSocketEvent(WStype_t type, uint8_t *payload, size_t length)
{
  switch (type)
  {
  case WStype_DISCONNECTED:
    Serial.println("[WS] Disconnected!");
    break;
  case WStype_CONNECTED:
    Serial.printf("[WS] Connected to server: %s\n", payload);
    // Gửi thông báo chào hỏi lên server
    webSocket.sendTXT("{\"type\":\"auth\",\"device\":\"AI_Conductor_Glove\"}");
    break;
  case WStype_TEXT:
    // Code để nhận lệnh từ server (ví dụ server bắt rung motor) - Làm sau
    break;
  }
}

void setup()
{
  Serial.begin(115200);

  // 1. Kết nối Wi-Fi
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // 2. Khởi tạo MPU6050
  Wire.begin(I2C_SDA, I2C_SCL);
  if (!mpu.begin())
  {
    Serial.println("❌ Failed to find MPU6050 chip");
    while (1)
    {
      delay(10);
    }
  }
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_44_HZ); // Đặt bộ lọc thông thấp (Lọc nhiễu tay rung)

  // 3. Khởi tạo Micro INMP441
  i2s_install();

  // 4. Khởi tạo WebSocket Client
  webSocket.begin(server_ip, server_port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000); // Thử kết nối lại mỗi 5s nếu rớt mạng

  Serial.println("🚀 HE THONG DA SAN SANG STREAMING!");
}

void loop()
{
  // Luôn phải gọi hàm này để duy trì kết nối WebSocket
  webSocket.loop();

  // Dùng millis() để tạo vòng lặp chạy đúng 50Hz (mỗi 20ms)
  unsigned long currentTime = millis();
  if (currentTime - lastSampleTime >= sampleInterval)
  {
    lastSampleTime = currentTime;

    // --- ĐỌC CẢM BIẾN ---
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);

    int32_t sample = 0;
    size_t bytes_read = 0;
    i2s_read(I2S_PORT, &sample, sizeof(sample), &bytes_read, portMAX_DELAY);

    // Xử lý thô âm thanh (Lấy biên độ âm lượng)
    // Tạm thời ta gửi năng lượng âm thanh để làm Trigger (như búng tay, vỗ tay)
    // STT (Speech-to-text) sẽ dùng cách stream khác nếu cần.
    int micVolume = abs(sample) >> 14; // Dịch bit để làm nhỏ số lại cho dễ gửi

    // --- ĐÓNG GÓI JSON ---
    // Sử dụng StaticJsonDocument cho tốc độ nhanh, không phân mảnh RAM
    StaticJsonDocument<256> doc;

    doc["ax"] = a.acceleration.x;
    doc["ay"] = a.acceleration.y;
    doc["az"] = a.acceleration.z;
    doc["gx"] = g.gyro.x;
    doc["gy"] = g.gyro.y;
    doc["gz"] = g.gyro.z;
    doc["mic"] = micVolume;

    // Chuyển JSON thành String
    String jsonString;
    serializeJson(doc, jsonString);

    // Bắn dữ liệu lên Server qua WiFi!
    if (webSocket.isConnected())
    {
      webSocket.sendTXT(jsonString);
    }
  }
}