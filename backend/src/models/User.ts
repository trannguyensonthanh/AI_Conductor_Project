import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Sau này sẽ dùng bcrypt để mã hóa
    displayName: { type: String, default: 'New User' },
    email: { type: String },
    avatar: { type: String, default: '👤' },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    lastLogin: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export default mongoose.model('User', UserSchema);
