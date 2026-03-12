import { useState } from "react";
import { Sparkles, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Suggestion {
  title: string;
  priority: "low" | "medium" | "high";
}

interface AiSuggestionsProps {
  existingTasks: { text: string; priority: string; completed: boolean }[];
  onAddTask: (text: string, priority: "low" | "medium" | "high") => void;
}

const PRIORITY_STYLES = {
  low: "bg-[hsl(var(--priority-low))]",
  medium: "bg-[hsl(var(--priority-medium))]",
  high: "bg-[hsl(var(--priority-high))]",
};

const AiSuggestions = ({ existingTasks, onAddTask }: AiSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchSuggestions = async () => {
    setLoading(true);
    setSuggestions([]);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-tasks", {
        body: { existingTasks },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSuggestions(data.suggestions || []);
      setOpen(true);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to get suggestions");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (s: Suggestion) => {
    onAddTask(s.title, s.priority);
    setSuggestions((prev) => prev.filter((x) => x.title !== s.title));
    toast.success(`Added: ${s.title}`);
  };

  return (
    <div className="mb-6">
      <button
        onClick={fetchSuggestions}
        disabled={loading}
        className="glass-btn flex items-center gap-2 w-full justify-center"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {loading ? "Getting AI suggestions..." : "✨ AI Task Suggestions"}
      </button>

      {open && suggestions.length > 0 && (
        <div className="glass-card p-4 mt-3 space-y-2">
          <p className="text-card-foreground text-sm font-semibold mb-2">Suggested tasks:</p>
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-center gap-3 glass-card p-3">
              <div className="flex-1 min-w-0">
                <p className="text-card-foreground text-sm font-medium truncate">{s.title}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full text-card-foreground font-medium capitalize shrink-0 ${PRIORITY_STYLES[s.priority]}`}>
                {s.priority}
              </span>
              <button
                onClick={() => handleAdd(s)}
                className="glass-btn-outline flex items-center gap-1 text-xs !px-2 !py-1"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AiSuggestions;
