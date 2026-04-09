import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Profile from "@/models/Profile";

export const runtime = "nodejs";

// GET — return the single profile (create one if none exists)
export async function GET() {
  await connectDB();

  let profile = await Profile.findOne();
  if (!profile) {
    profile = await Profile.create({});
  }

  return NextResponse.json(profile);
}

// PUT — update the profile
export async function PUT(req: NextRequest) {
  await connectDB();

  const body = await req.json();
  const allowed = ["prompt", "name", "email", "phone", "location", "linkedIn", "website"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (typeof body[key] === "string") {
      updates[key] = body[key];
    }
  }

  let profile = await Profile.findOne();
  if (!profile) {
    profile = await Profile.create(updates);
  } else {
    profile = await Profile.findByIdAndUpdate(profile._id, updates, { new: true });
  }

  return NextResponse.json(profile);
}
