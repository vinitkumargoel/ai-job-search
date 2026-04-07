import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Resume from "@/models/Resume";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;

  const resume = await Resume.findById(id);
  if (!resume) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (resume.isActive) {
    return NextResponse.json({ error: "Cannot delete the active resume" }, { status: 400 });
  }

  await Resume.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
