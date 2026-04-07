"use client";

import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useToast } from "./ui/Toast";

interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  siteName: string;
  status: string;
  isNew: boolean;
  matchScore: number | null;
  url: string;
  notes: string;
}

interface KanbanBoardProps {
  jobs: Job[];
  onStatusChange: (id: string, status: string) => void;
}

const COLUMNS: { key: string; label: string; color: string; dot: string }[] = [
  { key: "new",      label: "New",      color: "bg-[#EEF1FE]",  dot: "bg-[#4F6AF5]" },
  { key: "saved",    label: "Saved",    color: "bg-amber-50",   dot: "bg-amber-400" },
  { key: "applied",  label: "Applied",  color: "bg-green-50",   dot: "bg-green-500" },
  { key: "rejected", label: "Rejected", color: "bg-gray-50",    dot: "bg-gray-300" },
];

function scoreColor(score: number | null) {
  if (score === null) return "text-gray-400 bg-gray-100";
  if (score >= 70) return "text-green-700 bg-green-100";
  if (score >= 40) return "text-amber-700 bg-amber-100";
  return "text-red-700 bg-red-100";
}

export function KanbanBoard({ jobs, onStatusChange }: KanbanBoardProps) {
  const { toast } = useToast();

  const grouped: Record<string, Job[]> = { new: [], saved: [], applied: [], rejected: [] };
  for (const job of jobs) {
    const col = grouped[job.status] ?? grouped.new;
    col.push(job);
  }

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const newStatus = destination.droppableId;
    onStatusChange(draggableId, newStatus);

    const res = await fetch(`/api/jobs/${draggableId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      onStatusChange(draggableId, source.droppableId); // revert
      toast("Failed to update status", "error");
    } else {
      toast(`Moved to ${newStatus}`, "success");
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="flex flex-col gap-3">
            {/* Column header */}
            <div className="flex items-center gap-2 px-1">
              <span className={`w-2 h-2 rounded-full ${col.dot}`} />
              <span className="text-sm font-semibold text-gray-700">{col.label}</span>
              <span className="ml-auto text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {grouped[col.key].length}
              </span>
            </div>

            <Droppable droppableId={col.key}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex flex-col gap-2 min-h-[120px] rounded-xl p-2 transition-colors ${
                    snapshot.isDraggingOver ? col.color : "bg-gray-50"
                  }`}
                >
                  {grouped[col.key].map((job, index) => (
                    <Draggable key={job._id} draggableId={job._id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`bg-white rounded-lg border p-3 flex flex-col gap-2 cursor-grab active:cursor-grabbing transition-all ${
                            snapshot.isDragging
                              ? "border-[#4F6AF5] shadow-lg rotate-1"
                              : "border-gray-100 shadow-sm hover:border-gray-200 hover:shadow"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              {job.isNew && (
                                <span className="text-[9px] font-bold uppercase tracking-wider text-white bg-[#4F6AF5] px-1.5 py-0.5 rounded-full mb-1 inline-block">
                                  New
                                </span>
                              )}
                              <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-snug">{job.title}</p>
                              <p className="text-[11px] text-gray-500 mt-0.5 truncate">{job.company}</p>
                            </div>
                            {job.matchScore !== null && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${scoreColor(job.matchScore)}`}>
                                {job.matchScore}%
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full truncate max-w-[80px]">
                              {job.siteName}
                            </span>
                            <a
                              href={job.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] font-semibold text-[#4F6AF5] hover:underline shrink-0"
                            >
                              View →
                            </a>
                          </div>
                          {job.notes && (
                            <p className="text-[10px] text-gray-500 bg-gray-50 rounded px-2 py-1 line-clamp-1 border border-gray-100">
                              📝 {job.notes}
                            </p>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {grouped[col.key].length === 0 && (
                    <div className="flex-1 flex items-center justify-center py-6 text-[11px] text-gray-400">
                      Drop jobs here
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
