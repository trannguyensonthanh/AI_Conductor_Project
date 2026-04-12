import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
export type GestureType =
  | 'SWIPE_UP'
  | 'SWIPE_DOWN'
  | 'SWIPE_LEFT'
  | 'SWIPE_RIGHT'
  | 'PUSH'
  | 'ROTATE'
  | 'NONE';
export type VoiceCommandType =
  | 'BIG' 
  | 'SMALL' 
  | 'SHOOT' 
  | 'ONE' 
  | 'TWO' 
  | 'THREE' 
  | 'FOUR' 
  | 'FIVE' 
  | 'LEFT' 
  | 'RIGHT' 
  | 'NONE';
export type AppMode =
  | 'dashboard'
  | '3d-sandbox'
  | 'presentation'
  | 'game'
  | 'media'
  | 'settings'
  | 'admin';
export type SceneId =
  | 'SOLAR_SYSTEM'
  | 'NEON_CAR'
  | 'ROBOT_ARM'
  | 'CRYSTAL_CAVE'
  | 'UNDERWATER'
  | 'CHERRY_BLOSSOM';
export type UserRole = 'user' | 'admin';
export type ThemeMode = 'dark' | 'light';

interface SensorData {
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
}

interface MicEntry {
  time: number;  // timestamp ms
  level: number; // 0-100
  raw: number;
}

interface GestureLogEntry {
  source: 'HAND' | 'VOICE'; // Thêm nguồn gốc lệnh
  command: string;          // Đổi tên gesture thành command cho tổng quát
  confidence: number;       // Thêm % tự tin của AI
  timestamp: string;
  id: number;
}

export interface SceneEntry {
  id: string;
  name: string;
  type: string;
  icon: string;
  status: 'active' | 'inactive' | 'draft';
  lastUpdated: string;
}

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  displayName: string;
  email: string;
  avatar: string;
  createdAt: string;
  lastLogin: string;
  status: 'active' | 'suspended';
}

export interface UploadedSlide {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
}

interface AppState {
  // Auth
  currentUser: UserAccount | null;
  users: UserAccount[];
  theme: ThemeMode;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  setTheme: (theme: ThemeMode) => void;
  addUser: (user: UserAccount) => void;
  updateUser: (id: string, data: Partial<UserAccount>) => void;
  deleteUser: (id: string) => void;
  
  // Slides
  uploadedSlides: UploadedSlide[];
  addSlide: (slide: UploadedSlide) => void;
  removeSlide: (id: string) => void;

  // Existing
  isConnected: boolean;
  lastGesture: GestureType;
  sensorData: SensorData;
  activeMode: AppMode;
  gestureLog: GestureLogEntry[];
  sensorHistory: { time: string; ax: number; ay: number; az: number }[];
  currentScene: SceneId;
  scenesList: SceneEntry[];
  activeGame: string | null;
  toggleConnection: () => void;
  setLastGesture: (gesture: GestureType) => void;
  setSensorData: (data: SensorData) => void;
  setActiveMode: (mode: AppMode) => void;
  addGestureLog: (gesture: GestureType) => void;
  addSensorHistory: (entry: {
    time: string;
    ax: number;
    ay: number;
    az: number;
  }) => void;
  lastVoiceCommand: VoiceCommandType;
  setLastVoiceCommand: (cmd: VoiceCommandType) => void;
  setCurrentScene: (scene: SceneId) => void;
  setActiveGame: (game: string | null) => void;
  addScene: (scene: SceneEntry) => void;
  isMpuCursorActive: boolean;
  toggleMpuCursor: () => void;
  setMpuCursorActive: (active: boolean) => void;
  // Mic
  micLevel: number;      // 0-100, latest
  micHistory: MicEntry[]; // ring buffer 100 entries
}

let logId = 0;

function saveAuthCookie(user: UserAccount | null) {
  if (user) {
    const data = JSON.stringify({ username: user.username, id: user.id });
    document.cookie = `ac_auth=${encodeURIComponent(data)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  } else {
    document.cookie = 'ac_auth=; path=/; max-age=0';
  }
}

function readAuthCookie(): { username: string; id: string } | null {
  const match = document.cookie.match(/(?:^|; )ac_auth=([^;]*)/);
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

function getInitialUser(users: UserAccount[]): UserAccount | null {
  const cookie = readAuthCookie();
  if (!cookie) return null;
  const user = users.find(
    (u) =>
      u.id === cookie.id &&
      u.username === cookie.username &&
      u.status === 'active',
  );
  return user
    ? { ...user, lastLogin: new Date().toISOString().split('T')[0] }
    : null;
}

const defaultUsers: UserAccount[] = [
  {
    id: 'admin-001',
    username: 'admin',
    password: 'admin',
    role: 'admin',
    displayName: 'System Admin',
    email: 'admin@aiconductor.io',
    avatar: '🛡️',
    createdAt: '2026-01-01',
    lastLogin: '2026-03-09',
    status: 'active',
  },
  {
    id: 'user-001',
    username: 'user',
    password: 'user',
    role: 'user',
    displayName: 'Demo User',
    email: 'user@aiconductor.io',
    avatar: '👤',
    createdAt: '2026-02-15',
    lastLogin: '2026-03-09',
    status: 'active',
  },
];

// Khởi tạo Socket trỏ về Backend Node.js
const socket: Socket = io('http://localhost:5000', {
  autoConnect: true, // Tự động kết nối khi mở web
});

export const useAppStore = create<AppState>((set, get) => {
  // Lắng nghe trạng thái kết nối
  socket.on('connect', () => {
    console.log('✅ Đã kết nối với Backend Socket.IO');
    set({ isConnected: true });
  });

  socket.on('disconnect', () => {
    console.log('❌ Mất kết nối Backend');
    set({ isConnected: false });
  });
// Khai báo 1 biến cục bộ để đếm thời gian (Nằm ngoài hàm create của Zustand)
  let lastUIUpdateTime = 0;
  let lastAudioUpdateTime = 0;
  const UI_UPDATE_INTERVAL = 50; // Cập nhật giao diện mỗi 50ms (Tương đương 20 FPS - Rất mượt và nhẹ)

  // 1. HỨNG RAW DATA (ĐÃ TÍCH HỢP VAN XẢ THROTTLING)
  socket.on('sensor_stream', (data) => {
    const now = Date.now();

    // CHỈ CHO PHÉP REACT VẼ LẠI NẾU ĐÃ TRÔI QUA ĐỦ 50ms
    if (now - lastUIUpdateTime >= UI_UPDATE_INTERVAL) {
      lastUIUpdateTime = now;
      const timeString = new Date().toLocaleTimeString('en-US', { hour12: false });

      // Cập nhật State một lần duy nhất
      set((s) => ({
        sensorData: { 
          ax: data.ax, ay: data.ay, az: data.az, 
          gx: data.gx, gy: data.gy, gz: data.gz 
        },
        // Giữ lại 40 điểm gần nhất trên biểu đồ để đồ thị không bị nén quá dày
        sensorHistory:[
          ...s.sensorHistory, 
          { time: timeString, ax: +data.ax.toFixed(2), ay: +data.ay.toFixed(2), az: +data.az.toFixed(2) }
        ].slice(-40) 
      }));
    }
  });

// 2. HỨNG LỆNH CỬ CHỈ TỪ PYTHON (TAY)
  socket.on('fe_gesture_update', (data) => {
    const action = data.gesture as GestureType;
    set({ lastGesture: action });
    
    // Lưu vào Log với source là HAND
    set((s) => ({
      gestureLog:[
        { source: 'HAND', command: action, confidence: data.confidence, timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }), id: Date.now() },
        ...s.gestureLog,
      ].slice(0, 50),
    }));

    setTimeout(() => { set({ lastGesture: 'NONE' }); }, 500);
  });

  // 3. HỨNG LỆNH GIỌNG NÓI TỪ PYTHON (MIỆNG)
  socket.on('fe_voice_update', (data) => {
    const cmd = data.command as VoiceCommandType;
    set({ lastVoiceCommand: cmd });
    
    // Lưu vào Log với source là VOICE
    set((s) => ({
      gestureLog:[
        { source: 'VOICE', command: cmd, confidence: data.confidence, timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }), id: Date.now() },
        ...s.gestureLog,
      ].slice(0, 50),
    }));

    setTimeout(() => { set({ lastVoiceCommand: 'NONE' }); }, 500);
  });

  // 3. HỨNG DỮ LIỆU AUDIO TỪ BACKEND (Đã khớp với Backend gửi mảng chunk 256)
  socket.on('audio_stream', (data: { chunk: number[] }) => {
    const now = Date.now();

    // 3.1. Tính toán biên độ âm thanh (RMS / Peak)
    let peakAmplitude = 0;
    for (let i = 0; i < data.chunk.length; i++) {
      const absValue = Math.abs(data.chunk[i]);
      if (absValue > peakAmplitude) {
        peakAmplitude = absValue;
      }
    }

    // 3.2. Chuyển đổi Raw Data sang % (0 - 100)
    // LƯU Ý: Thay đổi số 500 này tùy theo độ nhạy của Mic. 
    // Nếu nói bình thường mà thanh volume đầy quá nhanh, hãy tăng số này lên (VD: 1000).
    // Nếu nói mà thanh volume lên quá thấp, hãy giảm số này xuống (VD: 300).
    const MAX_EXPECTED_RAW = 500; 
    let calcLevel = Math.min(100, Math.floor((peakAmplitude / MAX_EXPECTED_RAW) * 100));

    // 3.3. Cập nhật UI có Throttling (chỉ render 20 lần/giây để không lag)
    if (now - lastAudioUpdateTime >= UI_UPDATE_INTERVAL) {
      lastAudioUpdateTime = now;

      const entry: MicEntry = { 
        time: now, 
        level: calcLevel, 
        raw: peakAmplitude 
      };

      set((s) => ({
        micLevel: calcLevel,
        // Chỉ lưu tối đa 100 điểm trên mảng đồ thị
        micHistory: [...s.micHistory, entry].slice(-100),
      }));
    }
  });

  return {
    currentUser: getInitialUser(defaultUsers),
    users: defaultUsers,
    theme: 'dark',
    uploadedSlides: [],

    login: (username, password) => {
      const user = get().users.find(
        (u) =>
          u.username === username &&
          u.password === password &&
          u.status === 'active',
      );
      if (user) {
        const loggedIn = {
          ...user,
          lastLogin: new Date().toISOString().split('T')[0],
        };
        set({ currentUser: loggedIn });
        saveAuthCookie(loggedIn);
        return true;
      }
      return false;
    },
    logout: () => {
      set({ currentUser: null });
      saveAuthCookie(null);
    },
    setTheme: (theme) => {
      set({ theme });
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    },
    addUser: (user) => set((s) => ({ users: [...s.users, user] })),
    updateUser: (id, data) =>
      set((s) => ({
        users: s.users.map((u) => (u.id === id ? { ...u, ...data } : u)),
      })),
    deleteUser: (id) =>
      set((s) => ({ users: s.users.filter((u) => u.id !== id) })),

    addSlide: (slide) =>
      set((s) => ({ uploadedSlides: [...s.uploadedSlides, slide] })),
    removeSlide: (id) =>
      set((s) => ({
        uploadedSlides: s.uploadedSlides.filter((sl) => sl.id !== id),
      })),

    isConnected: true,
    lastGesture: 'NONE',
    sensorData: { ax: 0, ay: 0, az: 0, gx: 0, gy: 0, gz: 0 },
    activeMode: 'dashboard',
    gestureLog: [],
    sensorHistory: [],
    micLevel: 0,
    micHistory: [],
    currentScene: 'SOLAR_SYSTEM',
    scenesList: [
      {
        id: 'SOLAR_SYSTEM',
        name: 'Solar System',
        type: 'Environment',
        icon: '🪐',
        status: 'active',
        lastUpdated: '2026-02-15',
      },
      {
        id: 'NEON_CAR',
        name: 'Cyberpunk Car',
        type: 'Showroom',
        icon: '🚗',
        status: 'active',
        lastUpdated: '2026-02-14',
      },
      {
        id: 'ROBOT_ARM',
        name: 'Robot Arm',
        type: 'Interactive',
        icon: '🤖',
        status: 'draft',
        lastUpdated: '2026-02-13',
      },
      {
        id: 'CHERRY_BLOSSOM',
        name: 'Cherry Blossom',
        type: 'Environment',
        icon: '🌸',
        status: 'active',
        lastUpdated: '2026-04-08',
      },
    ],
    activeGame: null,
    toggleConnection: () => set((s) => ({ isConnected: !s.isConnected })),
    setLastGesture: (gesture) => set({ lastGesture: gesture }),
    setSensorData: (data) => set({ sensorData: data }),
    setActiveMode: (mode) => set({ activeMode: mode }),
    addGestureLog: (gesture) =>
      set((s) => ({
        gestureLog: [
          {
            gesture,
            timestamp: new Date().toLocaleTimeString('en-US', {
              hour12: false,
            }),
            id: ++logId,
          },
          ...s.gestureLog,
        ].slice(0, 50),
      })),
    addSensorHistory: (entry) =>
      set((s) => ({
        sensorHistory: [...s.sensorHistory, entry].slice(-60),
      })),
    lastVoiceCommand: 'NONE',
    setLastVoiceCommand: (cmd) => set({ lastVoiceCommand: cmd }),
    setCurrentScene: (scene) => set({ currentScene: scene }),
    setActiveGame: (game) => set({ activeGame: game }),
    addScene: (scene) =>
      set((s) => ({
        scenesList: [...s.scenesList, scene],
      })),
    isMpuCursorActive: false,
    toggleMpuCursor: () => set((s) => ({ isMpuCursorActive: !s.isMpuCursorActive })),
    setMpuCursorActive: (active) => set({ isMpuCursorActive: active }),
  };
});
