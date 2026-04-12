import mongoose from 'mongoose';

const SceneSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // SOLAR_SYSTEM, NEON_CAR...
    name: { type: String, required: true },
    type: { type: String },
    icon: { type: String },
    status: {
      type: String,
      enum: ['active', 'inactive', 'draft'],
      default: 'active',
    },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export default mongoose.model('Scene', SceneSchema);
