import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type JobStatus = "new" | "applied" | "saved" | "rejected";

export interface IJob extends Document {
  siteId: Types.ObjectId;
  siteName: string;
  title: string;
  url: string;
  description: string;
  company: string;
  location: string;
  postedAt: string;
  status: JobStatus;
  isNew: boolean;
  matchScore: number | null;
  matchReason: string | null;
  matchedResumeId: Types.ObjectId | null;
  scrapedAt: Date;
  appliedAt: Date | null;
  notes: string;
}

const JobSchema = new Schema(
  {
    siteId: { type: Schema.Types.ObjectId, ref: "Site", required: true },
    siteName: { type: String, required: true },
    title: { type: String, required: true },
    url: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    company: { type: String, default: "" },
    location: { type: String, default: "" },
    postedAt: { type: String, default: "" },
    status: {
      type: String,
      enum: ["new", "applied", "saved", "rejected"],
      default: "new",
    },
    isNew: { type: Boolean, default: true },
    matchScore: { type: Number, default: null },
    matchReason: { type: String, default: null },
    matchedResumeId: { type: Schema.Types.ObjectId, ref: "Resume", default: null },
    scrapedAt: { type: Date, default: Date.now },
    appliedAt: { type: Date, default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

JobSchema.index({ siteId: 1 });
JobSchema.index({ status: 1 });
JobSchema.index({ isNew: 1 });
JobSchema.index({ matchScore: -1 });

const Job: Model<IJob> =
  mongoose.models.Job ?? mongoose.model<IJob>("Job", JobSchema);

export default Job;
