import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LogRow {
  id: string;
  minutes_before: number | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface Props {
  taskId: string;
  refreshKey?: number;
}

const EmailDeliveryStatus = ({ taskId, refreshKey }: Props) => {
  const [logs, setLogs] = useState<LogRow[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("email_send_log")
        .select("id, minutes_before, status, error_message, created_at")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });
      if (active) setLogs(data || []);
    };
    load();

    const channel = supabase
      .channel(`email-log-${taskId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "email_send_log", filter: `task_id=eq.${taskId}` },
        () => load()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [taskId, refreshKey]);

  if (logs.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {logs.map((log) => {
        const sent = log.status === "sent";
        const label = log.minutes_before != null ? `${log.minutes_before}min` : "now";
        return (
          <span
            key={log.id}
            title={log.error_message || `${sent ? "Sent" : "Failed"} at ${new Date(log.created_at).toLocaleString()}`}
            className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
              sent
                ? "bg-[hsl(var(--priority-low))] text-card-foreground"
                : "bg-destructive/70 text-card-foreground"
            }`}
          >
            {sent ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {label}
          </span>
        );
      })}
    </div>
  );
};

export default EmailDeliveryStatus;
