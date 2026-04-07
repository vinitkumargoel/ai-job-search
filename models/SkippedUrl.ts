import mongoose, { Schema, Model } from "mongoose";

/**
 * SkippedUrl — stores URLs of scraped jobs that were classified as non-Germany.
 * This prevents re-fetching + re-classifying them on future scrape runs.
 */
const SkippedUrlSchema = new Schema(
  {
    url: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

const SkippedUrl: Model<{ url: string }> =
  mongoose.models.SkippedUrl ??
  mongoose.model("SkippedUrl", SkippedUrlSchema);

export default SkippedUrl;
