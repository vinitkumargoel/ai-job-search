import mongoose, { Schema, Document, Model } from "mongoose";

export interface IResume extends Document {
  name: string;
  filename: string;
  contentText: string;
  isActive: boolean;
  uploadedAt: Date;
}

const ResumeSchema = new Schema<IResume>(
  {
    name: { type: String, required: true, trim: true },
    filename: { type: String, required: true },
    contentText: { type: String, required: true },
    isActive: { type: Boolean, default: false },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Resume: Model<IResume> =
  mongoose.models.Resume ?? mongoose.model<IResume>("Resume", ResumeSchema);

export default Resume;
