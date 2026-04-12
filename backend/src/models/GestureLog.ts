import mongoose from 'mongoose';

const GestureLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    gesture: { type: String, required: true }, // WAVE_LEFT, FIST, push...
    confidence: { type: Number, required: True }, // AI tự tin bao nhiêu %
    appMode: { type: String }, // Lúc đó ông đang ở mode nào (Game, PPT, Sandbox)
  },
  { timestamps: true },
); // Tự động tạo createdAt chính là timestamp

export default mongoose.model('GestureLog', GestureLogSchema);
