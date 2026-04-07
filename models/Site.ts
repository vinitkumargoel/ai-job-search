import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISite extends Document {
  name: string;
  scraperKey: string;
  url: string;
  keywords: string;
  cronSchedule: string;
  isActive: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  lastRunStatus: "success" | "failed" | "never";
  createdAt: Date;
}

const SiteSchema = new Schema<ISite>(
  {
    name: { type: String, required: true, trim: true },
    scraperKey: { type: String, required: true },
    url: { type: String, required: true },
    keywords: { type: String, default: "" },
    cronSchedule: { type: String, required: true, default: "0 9 * * *" },
    isActive: { type: Boolean, default: true },
    lastRunAt: { type: Date, default: null },
    nextRunAt: { type: Date, default: null },
    lastRunStatus: {
      type: String,
      enum: ["success", "failed", "never"],
      default: "never",
    },
  },
  { timestamps: true }
);

const Site: Model<ISite> =
  mongoose.models.Site ?? mongoose.model<ISite>("Site", SiteSchema);

export default Site;
