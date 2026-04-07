import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ICronLog extends Document {
  siteId: Types.ObjectId | null;
  siteName: string;
  message: string;
  level: "info" | "error" | "success";
  createdAt: Date;
}

const CronLogSchema = new Schema<ICronLog>(
  {
    siteId: { type: Schema.Types.ObjectId, ref: "Site", default: null },
    siteName: { type: String, required: true },
    message: { type: String, required: true },
    level: {
      type: String,
      enum: ["info", "error", "success"],
      default: "info",
    },
  },
  { timestamps: true }
);

// Auto-delete logs older than 7 days
CronLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

const CronLog: Model<ICronLog> =
  mongoose.models.CronLog ?? mongoose.model<ICronLog>("CronLog", CronLogSchema);

export default CronLog;
