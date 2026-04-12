import os
import asyncio
import edge_tts
import wave
import numpy as np
from pydub import AudioSegment

# ================= CẤU HÌNH AUDIO CHUẨN =================
SAMPLE_RATE = 16000        # 16kHz
DURATION = 1.0             # Chuẩn đúng 1 giây
TOTAL_SAMPLES = int(SAMPLE_RATE * DURATION) 

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "..", "dataset_audio", "raw")
os.makedirs(DATA_DIR, exist_ok=True)
# =======================================================

# Từ khóa cần tạo
WORDS = ["ba"]

# Các giọng đọc
VOICES = {
    "Nu": "vi-VN-HoaiMyNeural",
    "Nam": "vi-VN-NamMinhNeural"
}

# Giả lập cảm xúc (tốc độ, cao độ)
EMOTIONS = {
    "binh_thuong": {"rate": "+0%", "pitch": "+0Hz"},
    "vui_nhanh": {"rate": "+15%", "pitch": "+10Hz"},
    "buon_cham": {"rate": "-15%", "pitch": "-10Hz"},
    "ngan_gon": {"rate": "+25%", "pitch": "+5Hz"}
}

def get_next_id(label):
    """Tìm ID lớn nhất hiện có trong thư mục của từ khóa này (Kế thừa từ code của bạn)"""
    folder_path = os.path.join(DATA_DIR, label)
    os.makedirs(folder_path, exist_ok=True)
    
    existing_files = [f for f in os.listdir(folder_path) if f.endswith('.wav')]
    if not existing_files:
        return 1
    
    max_id = 0
    for f in existing_files:
        try:
            file_id = int(f.split('.')[0])
            if file_id > max_id:
                max_id = file_id
        except: pass
    return max_id + 1

def save_to_wav(label, sample_id, audio_data):
    """Lưu mảng dữ liệu thành file .WAV chuẩn (Kế thừa từ code của bạn)"""
    folder_path = os.path.join(DATA_DIR, label)
    file_path = os.path.join(folder_path, f"{sample_id}.wav")
    
    audio_np = np.array(audio_data, dtype=np.int16)
    
    with wave.open(file_path, 'wb') as wf:
        wf.setnchannels(1)      # Mono
        wf.setsampwidth(2)      # 16-bit
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(audio_np.tobytes())
        
    print(f"✅ Đã lưu: {folder_path}/{sample_id}.wav")

async def generate_dataset():
    print("\n" + "="*50)
    print("🤖 BẮT ĐẦU SINH DỮ LIỆU SYNTHETIC AUDIO...")
    print("="*50 + "\n")
    
    temp_mp3 = "temp_tts.mp3"
    
    for word in WORDS:
        print(f"👉 Đang xử lý từ khóa: [{word.upper()}]")
        
        for voice_name, voice_code in VOICES.items():
            for emotion_name, params in EMOTIONS.items():
                
                # 1. Gọi Edge-TTS tạo file âm thanh
                communicate = edge_tts.Communicate(
                    text=word, 
                    voice=voice_code, 
                    rate=params["rate"], 
                    pitch=params["pitch"]
                )
                await communicate.save(temp_mp3)
                
                # 2. Đọc file bằng pydub và chuyển đổi chuẩn format
                audio = AudioSegment.from_mp3(temp_mp3)
                audio = audio.set_frame_rate(SAMPLE_RATE).set_channels(1).set_sample_width(2)
                
                # 3. Lấy mảng raw data (samples)
                samples = np.array(audio.get_array_of_samples())
                
                # 4. Xử lý thời lượng: Bắt buộc đúng 1.0s (16000 samples)
                current_length = len(samples)
                
                if current_length > TOTAL_SAMPLES:
                    # Nếu âm thanh quá dài: Cắt bỏ phần thừa ở hai đầu để lấy phần trung tâm chứa giọng nói
                    diff = current_length - TOTAL_SAMPLES
                    start_cut = diff // 2
                    samples = samples[start_cut : start_cut + TOTAL_SAMPLES]
                else:
                    # Nếu âm thanh quá ngắn: Thêm khoảng lặng (padding bằng 0) vào hai đầu
                    diff = TOTAL_SAMPLES - current_length
                    pad_left = diff // 2
                    pad_right = diff - pad_left
                    samples = np.pad(samples, (pad_left, pad_right), 'constant', constant_values=(0, 0))
                
                # 5. Lưu bằng hàm của bạn
                current_id = get_next_id(word)
                save_to_wav(word, current_id, samples)
                
    # Dọn dẹp
    if os.path.exists(temp_mp3):
        os.remove(temp_mp3)
    print("\n🎉 HOÀN TẤT SINH DỮ LIỆU!")

if __name__ == "__main__":
    # Lưu ý: Cần đảm bảo máy đã cài pydub và ffmpeg
    asyncio.run(generate_dataset())