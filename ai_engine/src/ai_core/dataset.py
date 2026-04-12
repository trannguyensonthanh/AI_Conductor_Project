import os
import pandas as pd
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib

class MPU6050Dataset(Dataset):
    def __init__(self, X, y):
        self.X = torch.tensor(X, dtype=torch.float32)
        self.y = torch.tensor(y, dtype=torch.long)

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]

class GestureDataPipeline:
    def __init__(self, data_dir, max_seq_length=100):
        self.data_dir = data_dir
        self.max_seq_length = max_seq_length # Số frame cố định cho mỗi cử chỉ
        self.scaler = StandardScaler()
        self.label_mapping = {}
        
    def load_and_preprocess_data(self):
        print("🔍 Đang nạp và phân tích dữ liệu...")
        all_sequences = []
        all_labels =[]
        
        # Lấy danh sách các file CSV trong thư mục
        csv_files =[f for f in os.listdir(self.data_dir) if f.endswith('.csv')]
        
        for label_idx, file_name in enumerate(csv_files):
            # Tên file chính là tên nhãn (VD: 'swipe_right.csv' -> 'swipe_right')
            label_name = file_name.replace('.csv', '')
            self.label_mapping[label_idx] = label_name
            
            file_path = os.path.join(self.data_dir, file_name)
            df = pd.read_csv(file_path)
            
            # Nhóm dữ liệu theo sample_id
            grouped = df.groupby('sample_id')
            
            for _, group in grouped:
                # Trích xuất 6 trục (ax, ay, az, gx, gy, gz)
                sequence = group[['ax', 'ay', 'az', 'gx', 'gy', 'gz']].values
                
                # BƯỚC QUAN TRỌNG: Padding hoặc Truncating
                seq_len = len(sequence)
                if seq_len < self.max_seq_length:
                    # Nếu ngắn hơn, đệm thêm số 0 vào cuối (Zero-Padding)
                    pad_length = self.max_seq_length - seq_len
                    padding = np.zeros((pad_length, 6))
                    sequence = np.vstack((sequence, padding))
                elif seq_len > self.max_seq_length:
                    # Nếu dài hơn, cắt bớt phần đuôi
                    sequence = sequence[:self.max_seq_length, :]
                
                all_sequences.append(sequence)
                all_labels.append(label_idx)
                
        # Chuyển thành Numpy Array
        X = np.array(all_sequences) # Shape: (Số_lượng_mẫu, Max_Seq_Length, 6)
        y = np.array(all_labels)    # Shape: (Số_lượng_mẫu,)
        
        print(f"📦 Tổng số mẫu thu thập được: {X.shape[0]}")
        print(f"🏷️ Mapping nhãn: {self.label_mapping}")
        
        return X, y

    def prepare_dataloaders(self, batch_size=32, test_size=0.2):
        X, y = self.load_and_preprocess_data()
        
        # BƯỚC QUAN TRỌNG: Chuẩn hóa dữ liệu (Standardization)
        # Vì MPU6050 có Gia tốc (g) và Góc xoay (độ/s) có đơn vị khác biệt rất lớn.
        # Phải scale về cùng hệ quy chiếu (mean=0, std=1) để AI không bị "thiên vị"
        
        # Scale 3D: (Samples, Timesteps, Features) -> Scale từng Feature
        N, T, F = X.shape
        X_reshaped = X.reshape(-1, F)
        X_scaled = self.scaler.fit_transform(X_reshaped)
        X = X_scaled.reshape(N, T, F)
        
        # Lưu Scaler lại để sau này chạy Real-time dùng
        joblib.dump(self.scaler, os.path.join(self.data_dir, '..', '..', 'models', 'scaler.pkl'))
        os.makedirs(os.path.join(self.data_dir, '..', '..', 'models'), exist_ok=True)

        # Chia tập Train (để học) và Test (để thi)
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42, stratify=y)
        
        train_dataset = MPU6050Dataset(X_train, y_train)
        test_dataset = MPU6050Dataset(X_test, y_test)
        
        # DataLoader giúp đẩy data vào GPU từng mẻ (batch) một
        train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
        test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)
        
        print(f"🚀 DataLoader sẵn sàng! Train batch: {len(train_loader)}, Test batch: {len(test_loader)}")
        return train_loader, test_loader, len(self.label_mapping)

# Đoạn code test nhanh (Chỉ chạy khi ông chạy trực tiếp file này)
if __name__ == "__main__":
    DIR = os.path.join(os.path.dirname(__file__), "..", "..", "dataset", "raw")
    pipeline = GestureDataPipeline(data_dir=DIR)
    train_dl, test_dl, num_classes = pipeline.prepare_dataloaders()