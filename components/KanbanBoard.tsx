"use client";

import { useState } from "react";
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
  summary: string | null;
  skills: string[];
  experienceLevel: string | null;
  employmentType: string | null;
  salary: string | null;
  germanRequired: string | null;
  workLocation: string | null;
  visaSponsorship: string | null;
  url: string;
  notes: string;
}

interface KanbanBoardProps {
  jobs: Job[];
  onStatusChange: (id: string, status: string) => void;
}

const COLUMNS: { key: string; label: string; color: string; dot: string }[] = [
  { key: "new", label: "New", color: "bg-[#EEF1FE]", dot: "bg-[#4F6AF5]" },
  { key: "saved", label: "Saved", color: "bg-cyan-50", dot: "bg-cyan-500" },
  { key: "applied", label: "Applied", color: "bg-blue-50", dot: "bg-blue-500" },
  { key: "call", label: "Got Call", color: "bg-purple-50", dot: "bg-purple-500" },
  { key: "interviewing", label: "Interviewing", color: "bg-amber-50", dot: "bg-amber-400" },
  { key: "selected", label: "Selected", color: "bg-green-50", dot: "bg-green-500" },
  { key: "rejected", label: "Rejected", color: "bg-gray-50", dot: "bg-gray-300" },
];

const INITIAL_VISIBLE = 50; // Show first 50 jobs per column

// Domain mapping for favicon lookup
const SITE_DOMAINS: Record<string, string> = {
  amazon: "amazon.com", bosch: "bosch.com", celonis: "celonis.com", check24: "check24.de",
  commercetools: "commercetools.com", contentful: "contentful.com", deliveryhero: "deliveryhero.com",
  flix: "flixbus.com", getyourguide: "getyourguide.com", hellofresh: "hellofresh.com",
  n26: "n26.com", raisin: "raisin.com", sap: "sap.com", sapfioneer: "sapfioneer.com",
  scout24: "scout24.com", siemens: "siemens.com", softwareag: "softwareag.com",
  teamviewer: "teamviewer.com", zalando: "zalando.com", zeiss: "zeiss.com",
  parloa: "parloa.com", helsing: "helsing.ai", blackforestlabs: "blackforestlabs.ai",
  n8n: "n8n.io", deepl: "deepl.com", alephalpha: "aleph-alpha.de", sereact: "sereact.ai",
  quantumsystems: "quantum-systems.com", sumup: "sumup.com", traderepublic: "traderepublic.com",
  grover: "grover.com", staffbase: "staffbase.com", isaraerospace: "isaraerospace.com",
  personio: "personio.com", enpal: "enpal.de", forto: "forto.com", billie: "billie.io",
  sennder: "sennder.com", wolt: "wolt.com", ionos: "ionos.com", doctolib: "doctolib.de",
  moia: "moia.io", wayve: "wayve.ai", wunderflats: "wunderflats.com", adyen: "adyen.com",
  tulip: "tulip.com", hetzner: "hetzner.com", "telekom-it": "telekom.com",
  trivago: "trivago.com", flaconi: "flaconi.com", freenow: "free-now.com",
  auto1: "auto1.com", aboutyou: "aboutyou.com", scalablecapital: "scalable.capital",
  sixt: "sixt.com", babbel: "babbel.com", idealo: "idealo.de", mambu: "mambu.com",
};

const getFaviconUrl = (siteName: string, size = 32) => {
  const scraperKey = siteName.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
  const domain = SITE_DOMAINS[scraperKey] || SITE_DOMAINS[Object.keys(SITE_DOMAINS).find(k => scraperKey.includes(k)) || ""] || siteName.toLowerCase().replace(/\s+/g, "") + ".com";
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
};

function scoreColor(score: number | null) {
  if (score === null) return "text-gray-400 bg-gray-100";
  if (score >= 70) return "text-green-700 bg-green-100";
  if (score >= 40) return "text-amber-700 bg-amber-100";
  return "text-red-700 bg-red-100";
}

export function KanbanBoard({ jobs, onStatusChange }: KanbanBoardProps) {
  const { toast } = useToast();
  const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({});

  const toggleColumn = (columnKey: string) => {
    setExpandedColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };

  const grouped: Record<string, Job[]> = {
    new: [],
    saved: [],
    applied: [],
    call: [],
    interviewing: [],
    selected: [],
    rejected: []
  };
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
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const allJobs = grouped[col.key];
          const isExpanded = expandedColumns[col.key];
          const visibleJobs = isExpanded ? allJobs : allJobs.slice(0, INITIAL_VISIBLE);
          const hasMore = allJobs.length > INITIAL_VISIBLE;

          return (
            <div key={col.key} className="flex flex-col gap-2 flex-shrink-0" style={{ width: '300px' }}>
              {/* Column header */}
              <div className="flex items-center gap-2 px-1">
                <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                <span className="ml-auto text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {allJobs.length}
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
                    {visibleJobs.map((job, index) => (
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
                            {/* Top row: Title + Score */}
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

                            {/* Summary */}
                            {job.summary && (
                              <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">
                                {job.summary}
                              </p>
                            )}

                            {/* Badges row */}
                            <div className="flex flex-wrap items-center gap-1">
                              {job.experienceLevel && job.experienceLevel !== "Not specified" && (
                                <span className="text-[9px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">
                                  {job.experienceLevel}
                                </span>
                              )}
                              {job.employmentType && job.employmentType !== "Not specified" && (
                                <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                                  {job.employmentType}
                                </span>
                              )}
                              {job.workLocation && job.workLocation !== "Not specified" && (
                                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                                  job.workLocation === "Remote" ? "text-green-600 bg-green-50" :
                                  job.workLocation === "Hybrid" ? "text-blue-600 bg-blue-50" :
                                  "text-gray-600 bg-gray-100"
                                }`}>
                                  {job.workLocation === "Remote" && "🏠 "}
                                  {job.workLocation === "Hybrid" && "🔀 "}
                                  {job.workLocation === "On-site" && "🏢 "}
                                  {job.workLocation}
                                </span>
                              )}
                              {job.visaSponsorship === "Yes" && (
                                <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                  ✈️ Visa
                                </span>
                              )}
                            </div>

                            {/* Skills */}
                            {job.skills?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {job.skills.slice(0, 3).map((s) => (
                                  <span key={s} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                    {s}
                                  </span>
                                ))}
                                {job.skills.length > 3 && (
                                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">
                                    +{job.skills.length - 3}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Salary */}
                            {job.salary && (
                              <p className="text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full inline-block self-start">
                                💰 {job.salary}
                              </p>
                            )}

                            {/* Footer: Site + Link */}
                            <div className="flex items-center justify-between gap-1 pt-1 border-t border-gray-100">
                              <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full truncate max-w-[120px]">
                                <img
                                  src={getFaviconUrl(job.siteName, 16)}
                                  alt={job.siteName}
                                  className="w-3 h-3 rounded-sm shrink-0"
                                  loading="lazy"
                                />
                                <span className="truncate">{job.siteName}</span>
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

                            {/* Notes */}
                            {job.notes && (
                              <p className="text-[9px] text-gray-500 bg-yellow-50 rounded px-2 py-1 line-clamp-1 border border-yellow-100">
                                📝 {job.notes}
                              </p>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {allJobs.length === 0 && (
                      <div className="flex-1 flex items-center justify-center py-6 text-[11px] text-gray-400">
                        Drop jobs here
                      </div>
                    )}
                    {hasMore && (
                      <button
                        onClick={() => toggleColumn(col.key)}
                        className="w-full py-2 text-xs font-semibold text-[#4F6AF5] hover:bg-[#4F6AF5]/5 rounded-lg transition-colors"
                      >
                        {isExpanded ? (
                          <span>Show less</span>
                        ) : (
                          <span>View all {allJobs.length} jobs</span>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}