import os

def rename_wav_files(folder_path, start_number):
    # lấy danh sách file wav
    files = [f for f in os.listdir(folder_path) if f.lower().endswith(".wav")]
    
    # sort để đảm bảo thứ tự ổn định
    files.sort()

    current_number = start_number

    for filename in files:
        old_path = os.path.join(folder_path, filename)
        new_name = f"{current_number}.wav"
        new_path = os.path.join(folder_path, new_name)

        # tránh ghi đè file
        while os.path.exists(new_path):
            current_number += 1
            new_name = f"{current_number}.wav"
            new_path = os.path.join(folder_path, new_name)

        os.rename(old_path, new_path)
        print(f"{filename} -> {new_name}")

        current_number += 1


# ====== INPUT ======
folder_path = input("Nhập đường dẫn folder: ")
start_number = int(input("Nhập số bắt đầu: "))

rename_wav_files(folder_path, start_number)