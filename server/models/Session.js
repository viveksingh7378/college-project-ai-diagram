import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'agent'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'New Session' }, // Auto-set from first prompt
    messages: [messageSchema],
    diagrams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Diagram' }],
    systemContext: {
      // Stores the analyzed system info for refine requests
      systemName: String,
      actors: [String],
      modules: [String],
      entities: [String],
      mainFlow: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Session', sessionSchema);
