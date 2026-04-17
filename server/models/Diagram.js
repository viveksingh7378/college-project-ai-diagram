import mongoose from 'mongoose';

const diagramSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    systemName: { type: String, required: true },
    // Type: usecase | class | sequence | component | deployment
    diagramType: {
      type: String,
      required: true,
      enum: ['usecase', 'class', 'sequence', 'component', 'deployment'],
    },
    pumlCode: { type: String, required: true },   // Raw @startuml...@enduml
    renderUrl: { type: String, required: true },  // PlantUML server image URL
  },
  { timestamps: true }
);

export default mongoose.model('Diagram', diagramSchema);
