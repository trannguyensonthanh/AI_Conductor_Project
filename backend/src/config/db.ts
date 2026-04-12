import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || '');
    console.log(`🗄️  [MONGODB] Đã kết nối thành công: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ [MONGODB LỖI]: ${error}`);
    process.exit(1);
  }
};

export default connectDB;
