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
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <driver/i2s.h>
#include <WiFi.h>

// --- CẤU HÌNH WI-FI & SOCKET SERVER ---
const char *WIFI_SSID = "TEN_WIFI_CUA_BAN";
const char *WIFI_PASSWORD = "MAT_KHAU_WIFI";
const char *SERVER_IP = "192.168.1.X";
const int SERVER_PORT = 5001;

WiFiClient tcpClient;

// --- CẤU HÌNH CHÂN ---
#define I2C_SDA 21
#define I2C_SCL 22
#define I2S_WS 15
#define I2S_SD 32
#define I2S_SCK 14
#define I2S_PORT I2S_NUM_0

Adafruit_MPU6050 mpu;
SemaphoreHandle_t wifiMutex;

#define AUDIO_CHUNK_SIZE 256
int32_t i2s_raw_buffer[AUDIO_CHUNK_SIZE];

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

// =========================================================
// TASK 1: ĐỌC VÀ GỬI MPU6050 (CORE 1 - 100Hz)
// =========================================================
void TaskIMU(void *pvParameters)
{
  const TickType_t xFrequency = 10 / portTICK_PERIOD_MS;
  TickType_t xLastWakeTime = xTaskGetTickCount();

  for (;;)
  {
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);

    if (tcpClient.connected())
    {
      if (xSemaphoreTake(wifiMutex, portMAX_DELAY))
      {
        tcpClient.printf("I:%.2f,%.2f,%.2f,%.2f,%.2f,%.2f\r\n",
                         a.acceleration.x, a.acceleration.y, a.acceleration.z,
                         g.gyro.x, g.gyro.y, g.gyro.z);
        xSemaphoreGive(wifiMutex);
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
  char audioBuffer[2500];

  for (;;)
  {
    i2s_read(I2S_PORT, &i2s_raw_buffer, sizeof(i2s_raw_buffer), &bytes_read, portMAX_DELAY);

    if (bytes_read > 0 && tcpClient.connected())
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
          pos += sprintf(&audioBuffer[pos], "%d\r\n", sample);
        }
      }

      if (xSemaphoreTake(wifiMutex, portMAX_DELAY))
      {
        tcpClient.print(audioBuffer);
        xSemaphoreGive(wifiMutex);
      }
    }
    vTaskDelay(1 / portTICK_PERIOD_MS);
  }
}

// ================= SETUP CHÍNH =================
void setup()
{
  Serial.begin(115200);

  // 1. KẾT NỐI WI-FI
  Serial.print("Đang kết nối Wi-Fi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nĐã kết nối Wi-Fi! IP: " + WiFi.localIP().toString());

  wifiMutex = xSemaphoreCreateMutex();

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

// ================= VÒNG LẶP CHÍNH CỦA CORE 1 =================
void loop()
{
  // Quản lý duy trì kết nối TCP Socket
  if (WiFi.status() == WL_CONNECTED)
  {
    if (!tcpClient.connected())
    {
      Serial.println("Đang kết nối lại tới Server TCP...");
      if (tcpClient.connect(SERVER_IP, SERVER_PORT))
      {
        Serial.println("Đã kết nối tới Node.js Server!");
      }
      delay(2000); // Tránh spam kết nối
    }
  }
  delay(100);
}