import { useMemo } from "react";
import { Flame } from "lucide-react";

interface TaskStreakProps {
  tasks: { completed: boolean; dueDate?: string; createdAt?: string }[];
}

const TaskStreak = ({ tasks }: TaskStreakProps) => {
  const { streak, totalCompleted } = useMemo(() => {
    const completedDates = new Set<string>();
    for (const t of tasks) {
      if (t.completed) {
        const date = t.dueDate || t.createdAt?.split("T")[0];
        if (date) completedDates.add(date);
      }
    }

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      if (completedDates.has(key)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return { streak, totalCompleted: tasks.filter((t) => t.completed).length };
  }, [tasks]);

  const flameColor = streak >= 7 ? "text-orange-400" : streak >= 3 ? "text-yellow-400" : "text-muted-foreground";

  return (
    <div className="glass-card p-4 flex items-center gap-4 mb-6">
      <div className="flex items-center gap-2">
        <Flame className={`w-8 h-8 ${flameColor} ${streak > 0 ? "animate-pulse" : ""}`} />
        <div>
          <p className="text-card-foreground text-2xl font-bold leading-none">{streak}</p>
          <p className="text-muted-foreground text-xs">day streak</p>
        </div>
      </div>
      <div className="h-8 w-px bg-[rgba(255,255,255,0.2)]" />
      <div>
        <p className="text-card-foreground text-lg font-semibold leading-none">{totalCompleted}</p>
        <p className="text-muted-foreground text-xs">tasks done</p>
      </div>
      {streak >= 7 && (
        <span className="ml-auto text-xs bg-[hsl(var(--priority-medium))] text-card-foreground px-2 py-1 rounded-full font-medium">
          🔥 On fire!
        </span>
      )}
      {streak >= 3 && streak < 7 && (
        <span className="ml-auto text-xs bg-[hsl(var(--accent))] text-card-foreground px-2 py-1 rounded-full font-medium">
          ⚡ Keep going!
        </span>
      )}
    </div>
  );
};

export default TaskStreak;
