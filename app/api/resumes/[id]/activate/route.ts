import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Resume from "@/models/Resume";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;

  const resume = await Resume.findById(id);
  if (!resume) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Deactivate all, then activate this one
  await Resume.updateMany({}, { isActive: false });
  await Resume.findByIdAndUpdate(id, { isActive: true });

  return NextResponse.json({ ok: true });
}
