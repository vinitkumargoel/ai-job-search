import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Resume from "@/models/Resume";
import { extractTextFromPDF } from "@/lib/pdfParser";

export const runtime = "nodejs";

export async function GET() {
  await connectDB();
  const resumes = await Resume.find({}, "-contentText").sort({ uploadedAt: -1 });
  return NextResponse.json(resumes);
}

export async function POST(req: NextRequest) {
  await connectDB();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const name = formData.get("name") as string | null;

  if (!file || !name) {
    return NextResponse.json({ error: "file and name are required" }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentText = await extractTextFromPDF(buffer);

  if (!contentText || contentText.length < 50) {
    return NextResponse.json({ error: "Could not extract text from PDF" }, { status: 400 });
  }

  const resume = await Resume.create({
    name,
    filename: file.name,
    contentText,
    isActive: false,
  });

  return NextResponse.json({ ...resume.toObject(), contentText: undefined }, { status: 201 });
}
