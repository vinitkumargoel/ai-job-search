import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProfile extends Document {
  prompt: string; // The system prompt — skills, experience, education, preferences
  name: string; // Full name for resume/cover letter
  email: string; // Email for resume header
  phone: string; // Phone for resume header
  location: string; // Location for resume header
  linkedIn: string; // LinkedIn URL
  website: string; // Personal website/portfolio
  updatedAt: Date;
}

const ProfileSchema = new Schema<IProfile>(
  {
    prompt: { type: String, default: "" },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    location: { type: String, default: "" },
    linkedIn: { type: String, default: "" },
    website: { type: String, default: "" },
  },
  { timestamps: true }
);

const Profile: Model<IProfile> =
  mongoose.models.Profile ?? mongoose.model<IProfile>("Profile", ProfileSchema);

export default Profile;
