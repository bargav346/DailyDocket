import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Check, Bell, BellOff, Clock, Mail, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Task {
  id: string;
  text: string;
  priority: "low" | "medium" | "high";
  completed: boolean;
  dueTime?: string;
  notifyPhone?: string;
  notifyEmail?: string;
  /** Tracks which reminders (30/20/10) have been sent */
  sentReminders: number[];
}

const PRIORITY_STYLES = {
  low: "bg-[hsl(var(--priority-low))]",
  medium: "bg-[hsl(var(--priority-medium))]",
  high: "bg-[hsl(var(--priority-high))]",
};

/** Reminder schedule: 30, 20, 10 minutes before due time */
const REMINDER_MINUTES = [30, 20, 10];

const TaskManager = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem("tasks");
    if (!saved) return [];
    // Migrate old tasks that don't have sentReminders
    const parsed = JSON.parse(saved);
    return parsed.map((t: any) => ({ ...t, sentReminders: t.sentReminders || [] }));
  });
  const [newTask, setNewTask] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [dueTime, setDueTime] = useState("");
  const [notifyPhone, setNotifyPhone] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  // Check for due tasks every 30 seconds and send SMS reminders at 30/20/10 min before
  useEffect(() => {
    const checkDueTasks = async () => {
      if (!notificationsEnabled) return;

      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      const remindersToSend: { task: Task; minutesBefore: number }[] = [];

      for (const task of tasks) {
        if (!task.dueTime || task.completed || !task.notifyPhone) continue;

        const [h, m] = task.dueTime.split(":").map(Number);
        const dueMinutes = h * 60 + m;

        for (const minBefore of REMINDER_MINUTES) {
          const triggerAt = dueMinutes - minBefore;
          if (
            nowMinutes >= triggerAt &&
            nowMinutes < triggerAt + 2 && // 2-min window to catch it
            !task.sentReminders.includes(minBefore)
          ) {
            remindersToSend.push({ task, minutesBefore: minBefore });
          }
        }
      }

      if (remindersToSend.length === 0) return;

      for (const { task, minutesBefore } of remindersToSend) {
        try {
          const { error } = await supabase.functions.invoke("send-notification", {
            body: {
              taskText: task.text,
              priority: task.priority,
              dueTime: task.dueTime,
              phone: task.notifyPhone,
              email: task.notifyEmail,
              minutesBefore,
            },
          });
          if (error) throw error;
          toast.success(`SMS sent (${minutesBefore}min before): ${task.text}`);
        } catch (err) {
          console.error("Notification failed:", err);
          toast.error(`Failed to notify for: ${task.text}`);
        }
      }

      // Mark sent reminders
      setTasks((prev) =>
        prev.map((t) => {
          const sent = remindersToSend
            .filter((r) => r.task.id === t.id)
            .map((r) => r.minutesBefore);
          if (sent.length === 0) return t;
          return { ...t, sentReminders: [...t.sentReminders, ...sent] };
        })
      );
    };

    const interval = setInterval(checkDueTasks, 30000);
    checkDueTasks();
    return () => clearInterval(interval);
  }, [tasks, notificationsEnabled]);

  const addTask = () => {
    const text = newTask.trim();
    if (!text || text.length > 200) return;
    setTasks((prev) => [
      {
        id: Date.now().toString(),
        text,
        priority,
        completed: false,
        dueTime: dueTime || undefined,
        notifyPhone: notifyPhone.trim() || undefined,
        notifyEmail: notifyEmail.trim() || undefined,
        sentReminders: [],
      },
      ...prev,
    ]);
    setNewTask("");
    setDueTime("");
  };

  const toggleComplete = (id: string) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));

  const deleteTask = (id: string) =>
    setTasks((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="app-bg p-4 sm:p-8">
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate("/")} className="glass-btn-outline flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button
            onClick={() => setNotificationsEnabled((p) => !p)}
            className={`glass-btn-outline flex items-center gap-2 text-sm ${notificationsEnabled ? "" : "opacity-60"}`}
          >
            {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            {notificationsEnabled ? "Notifications On" : "Notifications Off"}
          </button>
        </div>

        <div className="glass-card p-6 sm:p-8 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-card-foreground mb-6">Task Manager</h1>

          <div className="flex flex-col gap-3 mb-2">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                className="glass-input flex-1"
                placeholder="Add a new task..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                maxLength={200}
              />
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Task["priority"])}
                className="glass-input sm:w-32 appearance-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Clock className="w-4 h-4 text-card-foreground shrink-0" />
                <input
                  type="time"
                  className="glass-input flex-1"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                />
              </div>
              <button onClick={addTask} className="glass-btn flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add Task
              </button>
            </div>

            {/* SMS notification - primary */}
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-card-foreground shrink-0" />
              <input
                type="tel"
                className="glass-input flex-1"
                placeholder="Phone for SMS reminders (e.g. +91...)"
                value={notifyPhone}
                onChange={(e) => setNotifyPhone(e.target.value)}
              />
            </div>

            {/* Email notification - optional */}
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-card-foreground shrink-0" />
              <input
                type="email"
                className="glass-input flex-1"
                placeholder="Notify email (optional)"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              📱 SMS reminders will be sent at 30, 20, and 10 minutes before due time.
            </p>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-3">
          {tasks.length === 0 && (
            <div className="glass-card p-8 text-center">
              <p className="text-muted-foreground">No tasks yet. Add one above!</p>
            </div>
          )}
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`glass-card p-4 flex items-center gap-3 transition-all duration-300 ${
                task.completed ? "opacity-60" : ""
              }`}
            >
              <button
                onClick={() => toggleComplete(task.id)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                  task.completed
                    ? "bg-[hsl(var(--priority-low))]"
                    : "border border-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.1)]"
                }`}
              >
                {task.completed && <Check className="w-4 h-4 text-card-foreground" />}
              </button>

              <div className="flex-1 min-w-0">
                <p className={`text-card-foreground font-medium truncate ${task.completed ? "line-through opacity-70" : ""}`}>
                  {task.text}
                </p>
                <div className="flex flex-wrap gap-2 mt-0.5">
                  {task.dueTime && (
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {task.dueTime}
                    </span>
                  )}
                  {task.notifyPhone && (
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {task.notifyPhone}
                    </span>
                  )}
                  {task.notifyEmail && (
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {task.notifyEmail}
                    </span>
                  )}
                  {task.sentReminders.length > 0 && (
                    <span className="text-muted-foreground text-xs">
                      ✅ Sent: {task.sentReminders.sort((a, b) => b - a).join(", ")}min
                    </span>
                  )}
                </div>
              </div>

              <span
                className={`text-xs px-2.5 py-1 rounded-full text-card-foreground font-medium capitalize shrink-0 ${PRIORITY_STYLES[task.priority]}`}
              >
                {task.priority}
              </span>

              <button
                onClick={() => deleteTask(task.id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-card-foreground hover:bg-destructive/30 transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaskManager;
