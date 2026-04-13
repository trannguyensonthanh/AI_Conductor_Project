// #include <Arduino.h>
// #include <Wire.h>
// #include <Adafruit_MPU6050.h>
// #include <driver/i2s.h>

// // --- CẤU HÌNH CHÂN ---
// #define I2C_SDA 21
// #define I2C_SCL 22
// #define I2S_WS 15
// #define I2S_SD 32
// #define I2S_SCK 14
// #define I2S_PORT I2S_NUM_0

// Adafruit_MPU6050 mpu;

// SemaphoreHandle_t serialMutex;

// #define AUDIO_CHUNK_SIZE 256
// int32_t i2s_raw_buffer[AUDIO_CHUNK_SIZE];

// void i2s_install()
// {
//   const i2s_config_t i2s_config = {
//       .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
//       .sample_rate = 16000,
//       .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
//       .channel_format = I2S_CHANNEL_FMT_ONLY_RIGHT,
//       .communication_format = I2S_COMM_FORMAT_STAND_I2S,
//       .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
//       .dma_buf_count = 8,
//       .dma_buf_len = AUDIO_CHUNK_SIZE,
//       .use_apll = false};
//   const i2s_pin_config_t pin_config = {
//       .bck_io_num = I2S_SCK, .ws_io_num = I2S_WS, .data_out_num = -1, .data_in_num = I2S_SD};
//   i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
//   i2s_set_pin(I2S_PORT, &pin_config);
//   i2s_start(I2S_PORT);
// }

// // =========================================================
// // TASK 1: ĐỌC VÀ GỬI MPU6050 (CORE 1 - 100Hz)
// // =========================================================
// void TaskIMU(void *pvParameters)
// {
//   const TickType_t xFrequency = 10 / portTICK_PERIOD_MS;
//   TickType_t xLastWakeTime = xTaskGetTickCount();

//   for (;;)
//   {
//     sensors_event_t a, g, temp;
//     mpu.getEvent(&a, &g, &temp);

//     if (xSemaphoreTake(serialMutex, portMAX_DELAY))
//     {
//       Serial.printf("I:%.2f,%.2f,%.2f,%.2f,%.2f,%.2f\r\n",
//                     a.acceleration.x, a.acceleration.y, a.acceleration.z,
//                     g.gyro.x, g.gyro.y, g.gyro.z);

//       xSemaphoreGive(serialMutex);
//     }

//     vTaskDelayUntil(&xLastWakeTime, xFrequency);
//   }
// }

// // =========================================================
// // TASK 2: ĐỌC VÀ GỬI AUDIO (CORE 0 - Chạy liên tục)
// // =========================================================
// void TaskAudio(void *pvParameters)
// {
//   size_t bytes_read = 0;

//   char audioBuffer[2000];

//   for (;;)
//   {
//     i2s_read(I2S_PORT, &i2s_raw_buffer, sizeof(i2s_raw_buffer), &bytes_read, portMAX_DELAY);

//     if (bytes_read > 0)
//     {

//       int pos = 0;
//       pos += sprintf(&audioBuffer[pos], "A:");

//       for (int i = 0; i < AUDIO_CHUNK_SIZE; i++)
//       {
//         int16_t sample = (int16_t)(i2s_raw_buffer[i] >> 14);
//         if (i < AUDIO_CHUNK_SIZE - 1)
//         {
//           pos += sprintf(&audioBuffer[pos], "%d,", sample);
//         }
//         else
//         {
//           pos += sprintf(&audioBuffer[pos], "%d", sample);
//         }
//       }

//       if (xSemaphoreTake(serialMutex, portMAX_DELAY))
//       {
//         Serial.println(audioBuffer);
//         xSemaphoreGive(serialMutex);
//       }
//     }
//     vTaskDelay(1 / portTICK_PERIOD_MS);
//   }
// }

// // ================= SETUP CHÍNH =================
// void setup()
// {
//   Serial.begin(921600);
//   delay(1000);

//   serialMutex = xSemaphoreCreateMutex();

//   Wire.begin(I2C_SDA, I2C_SCL);
//   Wire.setClock(400000);

//   if (mpu.begin())
//   {
//     mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
//     mpu.setGyroRange(MPU6050_RANGE_500_DEG);
//     mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
//   }

//   i2s_install();

//   xTaskCreatePinnedToCore(TaskIMU, "IMU", 4096, NULL, 2, NULL, 1);
//   xTaskCreatePinnedToCore(TaskAudio, "Audio", 16384, NULL, 1, NULL, 0);
// }

// void loop() { vTaskDelete(NULL); }

#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsClient.h> // <<< THƯ VIỆN MỚI
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <driver/i2s.h>
#include "esp_log.h"

// ================= CẤU HÌNH MẠNG (SỬA Ở ĐÂY) =================
const char *ssid = "Nờ Tê";
const char *password = "14102004";
const char *server_ip = "172.20.10.2"; // <<< SỬA LẠI IP MÁY TÍNH CỦA ÔNG
const uint16_t server_port = 5001;     // Chú ý: ESP32 kết nối vào port 5001 của Node.js
// ==============================================================
// const char *WIFI_SSID = "Dung Lau 1_2.4G";
// const char *WIFI_PASSWORD = "0352791426";
// const char *SERVER_IP = "192.168.1.8";
// const int SERVER_PORT = 5001;
#define I2C_SDA 21
#define I2C_SCL 22
#define I2S_WS 15
#define I2S_SD 32 // (Chân của ông là 32)
#define I2S_SCK 14
#define I2S_PORT I2S_NUM_0

Adafruit_MPU6050 mpu;
WebSocketsClient webSocket;

// Khóa bảo vệ đường truyền WebSocket chống đụng độ giữa 2 Core
SemaphoreHandle_t wsMutex;

#define AUDIO_CHUNK_SIZE 256
int32_t i2s_raw_buffer[AUDIO_CHUNK_SIZE];

struct SensorData
{
  float ax, ay, az, gx, gy, gz;
  int mic;
};

QueueHandle_t sensorQueue;
SensorData lastGoodData = {0, 0, 0, 0, 0, 0, 0};

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
      .bck_io_num = I2S_SCK, .ws_io_num = I2S_WS, .data_out_num = -1, .data_in_num = I2S_SD};
  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);
  i2s_start(I2S_PORT);
}

// Sự kiện WebSocket
void webSocketEvent(WStype_t type, uint8_t *payload, size_t length)
{
  if (type == WStype_DISCONNECTED)
  {
    Serial.println("[WS] Bị ngắt kết nối!");
  }
  else if (type == WStype_CONNECTED)
  {
    Serial.println("[WS] Đã kết nối tới Server Node.js!");
  }
}

// =========================================================
// TASK 1: ĐỌC VÀ GỬI MPU6050 (CORE 1 - 100Hz)
// =========================================================
void TaskIMU(void *pvParameters)
{
  const TickType_t xFrequency = 10 / portTICK_PERIOD_MS;
  TickType_t xLastWakeTime = xTaskGetTickCount();
  char imuBuffer[100]; // Dùng buffer tĩnh cho nhanh

  for (;;)
  {
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);

    // Chỉ gửi khi Wifi đã kết nối
    if (webSocket.isConnected())
    {
      // Format dữ liệu IMU
      sprintf(imuBuffer, "I:%.2f,%.2f,%.2f,%.2f,%.2f,%.2f",
              a.acceleration.x, a.acceleration.y, a.acceleration.z,
              g.gyro.x, g.gyro.y, g.gyro.z);

      // Xin phép dùng WebSocket
      if (xSemaphoreTake(wsMutex, portMAX_DELAY))
      {
        webSocket.sendTXT(imuBuffer); // Bắn qua Wifi
        xSemaphoreGive(wsMutex);
      }
    }
    vTaskDelayUntil(&xLastWakeTime, xFrequency);
  }
}

// =========================================================
// TASK 2: ĐỌC VÀ GỬI AUDIO (CORE 0 - Chạy liên tục)
// =========================================================
void TaskAudio(void *pvParameters)
{
  size_t bytes_read = 0;
  char audioBuffer[2000]; // Buffer lớn cho chuỗi Audio

  for (;;)
  {
    i2s_read(I2S_PORT, &i2s_raw_buffer, sizeof(i2s_raw_buffer), &bytes_read, portMAX_DELAY);

    if (bytes_read > 0 && webSocket.isConnected())
    {
      int pos = 0;
      pos += sprintf(&audioBuffer[pos], "A:");

      for (int i = 0; i < AUDIO_CHUNK_SIZE; i++)
      {
        int16_t sample = (int16_t)(i2s_raw_buffer[i] >> 14);
        if (i < AUDIO_CHUNK_SIZE - 1)
        {
          pos += sprintf(&audioBuffer[pos], "%d,", sample);
        }
        else
        {
          pos += sprintf(&audioBuffer[pos], "%d", sample);
        }
      }

      // Xin phép dùng WebSocket
      if (xSemaphoreTake(wsMutex, portMAX_DELAY))
      {
        webSocket.sendTXT(audioBuffer); // Bắn qua Wifi
        xSemaphoreGive(wsMutex);
      }
    }
    vTaskDelay(1 / portTICK_PERIOD_MS);
  }
}

void setup()
{
  Serial.begin(115200);
  delay(1000);

  // Kết nối WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
    Serial.print(WiFi.status());
  }
  Serial.println("\nWiFi connected! IP: " + WiFi.localIP().toString());

  // Kết nối WebSocket
  webSocket.begin(server_ip, server_port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);

  wsMutex = xSemaphoreCreateMutex();

  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(400000);

  if (mpu.begin())
  {
    mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  }

  i2s_install();

  xTaskCreatePinnedToCore(TaskIMU, "IMU", 4096, NULL, 2, NULL, 1);
  xTaskCreatePinnedToCore(TaskAudio, "Audio", 16384, NULL, 1, NULL, 0);
}

void loop()
{
  webSocket.loop(); // QUAN TRỌNG: Hàm này duy trì mạng Wifi
  vTaskDelay(1);
}