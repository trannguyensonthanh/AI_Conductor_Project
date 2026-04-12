import torch
import torch.nn as nn

class GestureNet(nn.Module):
    def __init__(self, num_features=6, num_classes=5, cnn_filters=64, lstm_hidden=128):
        super(GestureNet, self).__init__()
        
        # ---------------------------------------------------------
        # BLOCK 1: 1D-CNN (Trích xuất đặc trưng không gian/cục bộ)
        # ---------------------------------------------------------
        self.cnn = nn.Sequential(
            # Lớp chập 1: Quét qua 6 trục dữ liệu
            nn.Conv1d(in_channels=num_features, out_channels=cnn_filters, kernel_size=3, padding=1),
            nn.BatchNorm1d(cnn_filters), # Chuẩn hóa để train nhanh hơn, không bị gradient vanishing
            nn.ReLU(),
            nn.MaxPool1d(kernel_size=2), # Giảm một nửa độ dài chuỗi, giữ lại đặc trưng mạnh nhất
            
            # Lớp chập 2: Đào sâu thêm
            nn.Conv1d(in_channels=cnn_filters, out_channels=cnn_filters*2, kernel_size=3, padding=1),
            nn.BatchNorm1d(cnn_filters*2),
            nn.ReLU(),
            nn.MaxPool1d(kernel_size=2)
        )
        
        # ---------------------------------------------------------
        # BLOCK 2: Bi-LSTM (Học sự phụ thuộc theo thời gian)
        # ---------------------------------------------------------
        # batch_first=True giúp pytorch hiểu chiều đầu tiên là Batch Size
        # bidirectional=True kích hoạt "Nhìn cả quá khứ lẫn tương lai"
        self.lstm = nn.LSTM(
            input_size=cnn_filters*2, 
            hidden_size=lstm_hidden, 
            num_layers=2, # 2 lớp LSTM chồng lên nhau cho não "sâu" hơn
            batch_first=True, 
            bidirectional=True, 
            dropout=0.3 # Chống học vẹt (Overfitting)
        )
        
        # ---------------------------------------------------------
        # BLOCK 3: Classifier (Phân loại ra kết quả cuối cùng)
        # ---------------------------------------------------------
        # Vì Bi-LSTM nên hidden state sẽ gấp đôi (lstm_hidden * 2)
        self.classifier = nn.Sequential(
            nn.Linear(lstm_hidden * 2, 64),
            nn.ReLU(),
            nn.Dropout(0.4), # Tắt ngẫu nhiên 40% nơ-ron để ép mạng phải học đặc trưng chung
            nn.Linear(64, num_classes) # Số lượng ngõ ra = Số lượng cử chỉ của ông
        )

    def forward(self, x):
        # Dữ liệu từ Dataloader vào có dạng: (Batch, Timesteps, Features) = (32, 100, 6)
        # Nhưng CNN của PyTorch lại đòi dạng: (Batch, Channels, Length) = (32, 6, 100)
        # Nên ta phải xoay chiều (permute) nó lại:
        x = x.permute(0, 2, 1)
        
        # Đi qua đôi mắt CNN
        x = self.cnn(x)
        
        # Xoay chiều lại cho LSTM: (Batch, Length, Channels)
        x = x.permute(0, 2, 1)
        
        # Đi qua bộ não LSTM
        # lstm_out chứa toàn bộ sequence, (h_n, c_n) chứa trạng thái ẩn cuối cùng
        lstm_out, (h_n, c_n) = self.lstm(x)
        
        # Lấy trạng thái ẩn ở bước thời gian cuối cùng của cả 2 chiều (Forward và Backward)
        # Đây là phần "tinh túy" nhất chứa toàn bộ thông tin của cử chỉ
        hidden_forward = h_n[-2, :, :] 
        hidden_backward = h_n[-1, :, :]
        final_hidden = torch.cat((hidden_forward, hidden_backward), dim=1)
        
        # Đưa vào bộ phân loại để ra tỷ lệ % cho từng cử chỉ
        out = self.classifier(final_hidden)
        return out