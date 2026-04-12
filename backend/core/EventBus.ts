import { EventEmitter } from 'events';

// Tạo một trạm trung chuyển sự kiện toàn cục (Global Event Bus)
class CentralEventBus extends EventEmitter {}

export const EventBus = new CentralEventBus();

// Định nghĩa các Tên Sự Kiện để gõ code không bị sai chính tả
export const EVENTS = {
  ESP32_DATA: 'ESP32_DATA', // Dữ liệu thô từ găng tay
  AI_PREDICTION: 'AI_PREDICTION', // Kết quả chốt đơn từ Python
  ESP32_STATUS: 'ESP32_STATUS', // Trạng thái (Online/Offline)
  AI_STATUS: 'AI_STATUS', // Trạng thái AI (Online/Offline)
};
