// =============================================================
// AI CONDUCTOR - ESP32 FIRMWARE (WiFi Binary Protocol v2)
// =============================================================
// Kiến trúc:
//   Core 0: TaskIMU (đọc sensor) + TaskAudio (đọc mic)
//   Core 1: loop() → webSocket.loop() + gửi data (thread-safe)
//
// Protocol Binary:
//   IMU:   [0x01] + 6 x float32 LE = 25 bytes
//   Audio: [0x02] + 256 x int16 LE  = 513 bytes
// =============================================================

#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <driver/i2s.h>

// ================= CẤU HÌNH MẠNG (SỬA Ở ĐÂY) =================
const char *ssid = "Xiaomi WiFi";
const char *password = "sonthanh";
const char *server_ip = "10.129.144.88";
const uint16_t server_port = 5001;
// ==============================================================

// ================= CẤU HÌNH PHẦN CỨNG =================
#define I2C_SDA 21
#define I2C_SCL 22
#define I2S_WS 15
#define I2S_SD 32
#define I2S_SCK 14
#define I2S_PORT I2S_NUM_0

// ================= BINARY PROTOCOL HEADERS =================
#define HEADER_IMU 0x01
#define HEADER_AUDIO 0x02

// ================= TIMING =================
#define IMU_INTERVAL_MS 10 // 100Hz (giữ nguyên theo yêu cầu)
#define AUDIO_CHUNK_SIZE 256
#define WIFI_CHECK_INTERVAL 5000
#define STATS_INTERVAL 5000

// ================= GLOBAL OBJECTS =================
Adafruit_MPU6050 mpu;
WebSocketsClient webSocket;
int32_t i2s_raw_buffer[AUDIO_CHUNK_SIZE];

// ================= THREAD-SAFE SHARED BUFFERS =================
// Tasks CHỈ ĐỌC sensor và ghi vào buffer.
// loop() CHỈ ĐỌC buffer và gửi qua WebSocket.
// → Không bao giờ gọi webSocket.sendXXX() từ task → KHÔNG race condition.

SemaphoreHandle_t imuMutex;
uint8_t imuPacket[25]; // 1 header + 6 floats
volatile bool imuNewData = false;

SemaphoreHandle_t audioMutex;
uint8_t audioPacket[513]; // 1 header + 256 int16s
volatile bool audioNewData = false;

// ================= STATS =================
unsigned long lastWiFiCheck = 0;
unsigned long lastStatsTime = 0;
unsigned long imuReadCount = 0;
unsigned long audioReadCount = 0;
unsigned long wsSendCount = 0;

// ================= I2S SETUP =================
void i2s_install()
{
  const i2s_config_t i2s_config = {
      .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
      .sample_rate = 16000,
      .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
      .channel_format = I2S_CHANNEL_FMT_ONLY_RIGHT,
      .communication_format = I2S_COMM_FORMAT_STAND_I2S,
      .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
      .dma_buf_count = 8,
      .dma_buf_len = AUDIO_CHUNK_SIZE,
      .use_apll = false};
  const i2s_pin_config_t pin_config = {
      .bck_io_num = I2S_SCK,
      .ws_io_num = I2S_WS,
      .data_out_num = -1,
      .data_in_num = I2S_SD};
  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);
  i2s_start(I2S_PORT);
}

// ================= WEBSOCKET EVENT =================
void webSocketEvent(WStype_t type, uint8_t *payload, size_t length)
{
  switch (type)
  {
  case WStype_DISCONNECTED:
    Serial.println("[WS] Disconnected!");
    break;
  case WStype_CONNECTED:
    Serial.println("[WS] Connected to Server!");
    break;
  case WStype_PING:
  case WStype_PONG:
    // Handled automatically by library
    break;
  default:
    break;
  }
}

// =========================================================
// TASK: ĐỌC IMU (Core 0) — CHỈ ĐỌC, KHÔNG GỬI WEBSOCKET
// =========================================================
void TaskIMU(void *pvParameters)
{
  TickType_t xLastWakeTime = xTaskGetTickCount();
  const TickType_t xFrequency = IMU_INTERVAL_MS / portTICK_PERIOD_MS;

  for (;;)
  {
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);

    // Pack binary vào local buffer trước
    uint8_t localBuf[25];
    localBuf[0] = HEADER_IMU;
    float vals[6] = {
        a.acceleration.x, a.acceleration.y, a.acceleration.z,
        g.gyro.x, g.gyro.y, g.gyro.z};
    memcpy(&localBuf[1], vals, 24);

    // Copy vào shared buffer (mutex timeout ngắn, không block lâu)
    if (xSemaphoreTake(imuMutex, pdMS_TO_TICKS(3)))
    {
      memcpy(imuPacket, localBuf, 25);
      imuNewData = true;
      xSemaphoreGive(imuMutex);
    }
    imuReadCount++;

    vTaskDelayUntil(&xLastWakeTime, xFrequency);
  }
}

// =========================================================
// TASK: ĐỌC AUDIO (Core 0) — CHỈ ĐỌC, KHÔNG GỬI WEBSOCKET
// =========================================================
void TaskAudio(void *pvParameters)
{
  size_t bytes_read = 0;

  for (;;)
  {
    // Non-blocking read (timeout 50ms thay vì portMAX_DELAY)
    i2s_read(I2S_PORT, &i2s_raw_buffer, sizeof(i2s_raw_buffer),
             &bytes_read, pdMS_TO_TICKS(50));

    if (bytes_read > 0)
    {
      // Pack binary vào local buffer
      uint8_t localBuf[513];
      localBuf[0] = HEADER_AUDIO;

      for (int i = 0; i < AUDIO_CHUNK_SIZE; i++)
      {
        int16_t sample = (int16_t)(i2s_raw_buffer[i] >> 14);
        memcpy(&localBuf[1 + i * 2], &sample, 2);
      }

      // Copy vào shared buffer
      if (xSemaphoreTake(audioMutex, pdMS_TO_TICKS(3)))
      {
        memcpy(audioPacket, localBuf, 513);
        audioNewData = true;
        xSemaphoreGive(audioMutex);
      }
      audioReadCount++;
    }

    vTaskDelay(1);
  }
}

// =========================================================
// WiFi Auto-Reconnect (gọi từ loop, mỗi 5 giây check 1 lần)
// =========================================================
void checkWiFiReconnect()
{
  if (millis() - lastWiFiCheck < WIFI_CHECK_INTERVAL)
    return;
  lastWiFiCheck = millis();

  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("[WiFi] Lost! Reconnecting...");
    WiFi.disconnect();
    delay(100);
    WiFi.begin(ssid, password);

    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 8000)
    {
      delay(100);
    }

    if (WiFi.status() == WL_CONNECTED)
    {
      Serial.println("[WiFi] Reconnected! IP: " + WiFi.localIP().toString());
    }
    else
    {
      Serial.println("[WiFi] Failed, retry next cycle...");
    }
  }
}

// =========================================================
// Stats Logger (mỗi 5 giây, không spam)
// =========================================================
void printStats()
{
  if (millis() - lastStatsTime < STATS_INTERVAL)
    return;

  Serial.printf("[STATS] IMU:%lu | Audio:%lu | Sent:%lu | WiFi:%s | WS:%s\n",
                imuReadCount, audioReadCount, wsSendCount,
                WiFi.status() == WL_CONNECTED ? "OK" : "LOST",
                webSocket.isConnected() ? "OK" : "OFF");

  imuReadCount = 0;
  audioReadCount = 0;
  wsSendCount = 0;
  lastStatsTime = millis();
}

// ================= SETUP =================
void setup()
{
  Serial.begin(115200);
  delay(1000);

  // 1. WiFi
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false); // Tắt WiFi power-saving → ổn định hơn
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi OK! IP: " + WiFi.localIP().toString());

  // 2. WebSocket
  webSocket.begin(server_ip, server_port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(3000);
  webSocket.enableHeartbeat(15000, 3000, 2); // ping 15s, pong timeout 3s, 2 retries

  // 3. Mutex
  imuMutex = xSemaphoreCreateMutex();
  audioMutex = xSemaphoreCreateMutex();

  // 4. MPU6050
  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(400000);
  if (mpu.begin())
  {
    mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    Serial.println("[MPU6050] OK!");
  }
  else
  {
    Serial.println("[MPU6050] FAILED!");
  }

  // 5. I2S Microphone
  i2s_install();
  Serial.println("[I2S Mic] OK!");

  // 6. Sensor Tasks — CHỈ ĐỌC sensor, KHÔNG gửi WebSocket
  //    Cả 2 task chạy trên Core 0, loop() chạy trên Core 1
  xTaskCreatePinnedToCore(TaskIMU, "IMU_Read", 4096, NULL, 2, NULL, 0);
  xTaskCreatePinnedToCore(TaskAudio, "Audio_Read", 8192, NULL, 1, NULL, 0);

  Serial.println("\n=== SYSTEM READY - Binary WiFi Streaming ===\n");
}

// ================= MAIN LOOP (Core 1) =================
// CHỈ loop() mới được gọi webSocket → thread-safe tuyệt đối
void loop()
{
  // 1. Duy trì kết nối WebSocket
  webSocket.loop();

  // 2. Gửi IMU nếu có data mới
  if (imuNewData && webSocket.isConnected())
  {
    uint8_t buf[25];
    if (xSemaphoreTake(imuMutex, pdMS_TO_TICKS(2)))
    {
      memcpy(buf, imuPacket, 25);
      imuNewData = false;
      xSemaphoreGive(imuMutex);
      webSocket.sendBIN(buf, 25);
      wsSendCount++;
    }
  }

  // 3. Gửi Audio nếu có data mới
  if (audioNewData && webSocket.isConnected())
  {
    uint8_t buf[513];
    if (xSemaphoreTake(audioMutex, pdMS_TO_TICKS(2)))
    {
      memcpy(buf, audioPacket, 513);
      audioNewData = false;
      xSemaphoreGive(audioMutex);
      webSocket.sendBIN(buf, 513);
      wsSendCount++;
    }
  }

  // 4. WiFi auto-reconnect
  checkWiFiReconnect();

  // 5. Stats (mỗi 5s)
  printStats();

  // Yield nhỏ để FreeRTOS scheduler hoạt động
  vTaskDelay(1);
}