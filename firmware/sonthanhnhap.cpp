#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <driver/i2s.h>

// ================= CẤU HÌNH MẠNG =================
const char *ssid = "Nờ Tê";
const char *password = "14102004";
const char *server_ip = "172.20.10.2"; // <<< IP CỦA BACKEND NODE.JS
const uint16_t server_port = 5001;
// ================================================

#define I2C_SDA 21
#define I2C_SCL 22
#define I2S_WS 15
#define I2S_SD 13
#define I2S_SCK 14
#define I2S_PORT I2S_NUM_0

Adafruit_MPU6050 mpu;
WebSocketsClient webSocket;

// Cấu trúc dữ liệu Tinh gọn (Đã bỏ nút bấm)
struct SensorData
{
  float ax, ay, az;
  float gx, gy, gz;
  int mic;
};

QueueHandle_t sensorQueue;
TaskHandle_t TaskSensorHandle;
TaskHandle_t TaskWiFiHandle;

void i2s_install()
{
  const i2s_config_t i2s_config = {
      .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
      .sample_rate = 44100,
      .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
      .channel_format = I2S_CHANNEL_FMT_ONLY_RIGHT,
      .communication_format = I2S_COMM_FORMAT_STAND_I2S,
      .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
      .dma_buf_count = 4,
      .dma_buf_len = 512,
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

void webSocketEvent(WStype_t type, uint8_t *payload, size_t length)
{
  switch (type)
  {
  case WStype_DISCONNECTED:
    Serial.println("[WS] Đã ngắt kết nối Backend!");
    break;
  case WStype_CONNECTED:
    Serial.printf("[WS] Đã kết nối tới %s\n", payload);
    break;
  case WStype_TEXT:
    break;
  }
}

// TASK 1: ĐỌC CẢM BIẾN (CORE 1 - 100Hz)
void TaskReadSensors(void *pvParameters)
{
  const TickType_t xFrequency = 10 / portTICK_PERIOD_MS;
  TickType_t xLastWakeTime = xTaskGetTickCount();
  SensorData currentData;

  for (;;)
  {
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);
    currentData.ax = a.acceleration.x;
    currentData.ay = a.acceleration.y;
    currentData.az = a.acceleration.z;
    currentData.gx = g.gyro.x;
    currentData.gy = g.gyro.y;
    currentData.gz = g.gyro.z;

    int32_t sample = 0;
    size_t bytes_read = 0;
    i2s_read(I2S_PORT, &sample, sizeof(sample), &bytes_read, portMAX_DELAY);
    currentData.mic = abs(sample) >> 14;

    xQueueSend(sensorQueue, &currentData, 0);
    vTaskDelayUntil(&xLastWakeTime, xFrequency);
  }
}

// TASK 2: GỬI WI-FI (CORE 0)
void TaskWiFiComms(void *pvParameters)
{
  SensorData receivedData;
  StaticJsonDocument<256> doc;
  String jsonString;

  for (;;)
  {
    webSocket.loop();

    if (xQueueReceive(sensorQueue, &receivedData, portMAX_DELAY) == pdTRUE)
    {
      if (WiFi.status() == WL_CONNECTED && webSocket.isConnected())
      {
        doc.clear();
        doc["ax"] = receivedData.ax;
        doc["ay"] = receivedData.ay;
        doc["az"] = receivedData.az;
        doc["gx"] = receivedData.gx;
        doc["gy"] = receivedData.gy;
        doc["gz"] = receivedData.gz;
        doc["mic"] = receivedData.mic;

        jsonString = "";
        serializeJson(doc, jsonString);
        webSocket.sendTXT(jsonString);
      }
    }
    vTaskDelay(1 / portTICK_PERIOD_MS);
  }
}

void setup()
{
  Serial.begin(115200);

  Wire.begin(I2C_SDA, I2C_SCL);
  if (!mpu.begin())
  {
    Serial.println("❌ Lỗi MPU6050!");
    while (1)
      delay(10);
  }
  mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  i2s_install();

  Serial.print("Đang kết nối WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
    Serial.println(WiFi.status());
  }
  Serial.println("\n✅ WiFi Connected!");

  webSocket.begin(server_ip, server_port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);

  // Khởi tạo FreeRTOS
  sensorQueue = xQueueCreate(20, sizeof(SensorData));
  xTaskCreatePinnedToCore(TaskReadSensors, "TaskReadSensors", 4096, NULL, 2, &TaskSensorHandle, 1);
  xTaskCreatePinnedToCore(TaskWiFiComms, "TaskWiFiComms", 8192, NULL, 1, &TaskWiFiHandle, 0);

  Serial.println("🚀 HỆ THỐNG RTOS CONTINUOUS ĐÃ KHỞI ĐỘNG!");
}

void loop()
{
  vTaskDelete(NULL);
}