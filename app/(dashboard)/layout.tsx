import { ToastProvider } from "@/components/ui/Toast";
import { Sidebar } from "@/components/Sidebar";
import { connectDB } from "@/lib/mongodb";
import Job from "@/models/Job";

async function getNewJobsCount() {
  try {
    await connectDB();
    return await Job.countDocuments({ isNew: true });
  } catch {
    return 0;
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const newJobsCount = await getNewJobsCount();

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar newJobsCount={newJobsCount} />
        <main className="flex-1 overflow-auto bg-[#F3F4F8] pt-14 md:pt-0">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
