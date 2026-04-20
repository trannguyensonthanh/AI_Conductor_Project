import os
import torch
import torch.nn as nn
import torch.optim as optim
from tqdm import tqdm # Thư viện vẽ Progress Bar cực xịn
from dataset import GestureDataPipeline
from model import GestureNet

# ================= CẤU HÌNH TRAINING =================
EPOCHS = 50           # Số vòng lặp qua toàn bộ dữ liệu
BATCH_SIZE = 32       # Mỗi mẻ học 32 mẫu
LEARNING_RATE = 0.001 # Tốc độ học

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "..", "..", "dataset", "raw")
MODEL_SAVE_DIR = os.path.join(SCRIPT_DIR, "..", "..", "models")
os.makedirs(MODEL_SAVE_DIR, exist_ok=True)
# =====================================================

def train_model():
    # 1. Chuẩn bị GPU (Ông xài Server mạnh thì nó sẽ tự nhận CUDA)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"🔥 Đang chạy huấn luyện trên thiết bị: {device.type.upper()}")

    # 2. Chuẩn bị Dữ liệu
    pipeline = GestureDataPipeline(data_dir=DATA_DIR, max_seq_length=150) # 1.5s = 150 frames
    train_loader, test_loader, num_classes = pipeline.prepare_dataloaders(batch_size=BATCH_SIZE)

    # 3. Khởi tạo Mô hình, Hàm Loss và Optimizer
    model = GestureNet(num_features=6, num_classes=num_classes).to(device)
    criterion = nn.CrossEntropyLoss() # Hàm mất mát chuẩn cho bài toán phân loại nhiều lớp
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE, weight_decay=1e-4) # Adam cực kỳ tối ưu

    best_acc = 0.0

    print("\n🚀 BẮT ĐẦU HUẤN LUYỆN...")
    for epoch in range(EPOCHS):
        model.train() # Bật chế độ Train (Kích hoạt Dropout/BatchNorm)
        running_loss = 0.0
        correct_train = 0
        total_train = 0

        # Thanh tiến trình
        progress_bar = tqdm(train_loader, desc=f"Epoch {epoch+1}/{EPOCHS} [Train]")
        
        for inputs, labels in progress_bar:
            inputs, labels = inputs.to(device), labels.to(device)

            # Reset gradient
            optimizer.zero_grad()

            # Chạy qua mạng (Forward)
            outputs = model(inputs)
            loss = criterion(outputs, labels)

            # Cập nhật tạ (Backward & Optimize)
            loss.backward()
            optimizer.step()

            # Tính toán độ chính xác
            running_loss += loss.item()
            _, predicted = torch.max(outputs.data, 1)
            total_train += labels.size(0)
            correct_train += (predicted == labels).sum().item()

            progress_bar.set_postfix({'loss': running_loss/total_train, 'acc': 100.*correct_train/total_train})

        # --- ĐÁNH GIÁ TRÊN TẬP TEST (Validation) ---
        model.eval() # Bật chế độ Eval (Tắt Dropout)
        correct_test = 0
        total_test = 0
        
        with torch.no_grad(): # Không cần tính đạo hàm lúc test -> tiết kiệm VRAM
            for inputs, labels in test_loader:
                inputs, labels = inputs.to(device), labels.to(device)
                outputs = model(inputs)
                _, predicted = torch.max(outputs.data, 1)
                total_test += labels.size(0)
                correct_test += (predicted == labels).sum().item()

        test_acc = 100. * correct_test / total_test
        print(f"🎯 Kết quả Epoch {epoch+1}: Train Acc: {100.*correct_train/total_train:.2f}% | Test Acc: {test_acc:.2f}%")

        # --- LƯU LẠI MÔ HÌNH XỊN NHẤT ---
        if test_acc > best_acc:
            best_acc = test_acc
            model_path = os.path.join(MODEL_SAVE_DIR, "best_gesture_model.pth")
            
            # Lưu lại cả model, cấu trúc nhãn (label mapping) để sau này Inference biết
            checkpoint = {
                'model_state_dict': model.state_dict(),
                'label_mapping': pipeline.label_mapping,
                'max_seq_length': pipeline.max_seq_length
            }
            torch.save(checkpoint, model_path)
            print(f"💾 Đã lưu phiên bản model tốt nhất! (Acc: {best_acc:.2f}%)")

    print(f"\n🎉 HOÀN THÀNH HUẤN LUYỆN! ĐỘ CHÍNH XÁC CAO NHẤT: {best_acc:.2f}%")
    print(f"📁 Model đã được lưu tại: {MODEL_SAVE_DIR}/best_gesture_model.pth")

if __name__ == "__main__":
    train_model()