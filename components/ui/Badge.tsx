interface BadgeProps {
  children: React.ReactNode;
  variant?: "navy" | "red" | "green" | "yellow" | "gray" | "blue" | "purple";
}

const variantStyles: Record<string, string> = {
  navy: "bg-[#202B52] text-white",
  red: "bg-[#EA1815] text-white",
  green: "bg-[#128986] text-white",
  yellow: "bg-[#FFA000] text-white",
  gray: "bg-[#E6EBF2] text-[#3F486B]",
  blue: "bg-[#0961FB] text-white",
  purple: "bg-[#A109BA] text-white",
};

export function Badge({ children, variant = "gray" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${variantStyles[variant]}`}
    >
      {children}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null)
    return <Badge variant="gray">No Score</Badge>;
  if (score >= 70)
    return <Badge variant="green">{score}% Match</Badge>;
  if (score >= 40)
    return <Badge variant="yellow">{score}% Match</Badge>;
  return <Badge variant="red">{score}% Match</Badge>;
}
