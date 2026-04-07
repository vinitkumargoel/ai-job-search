import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SkippedUrl from "@/models/SkippedUrl";

export async function GET(req: NextRequest) {
  await connectDB();
  
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

  const [urls, total] = await Promise.all([
    SkippedUrl.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    SkippedUrl.countDocuments(),
  ]);

  return NextResponse.json({ urls, total, page, totalPages: Math.ceil(total / limit) });
}

export async function DELETE(req: NextRequest) {
  await connectDB();
  
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  
  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  await SkippedUrl.findByIdAndDelete(id);
  
  return NextResponse.json({ success: true });
}