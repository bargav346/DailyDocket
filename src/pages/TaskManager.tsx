import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Check, Bell, BellOff, Clock, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Task {
  id: string;
  text: string;
  priority: "low" | "medium" | "high";
  completed: boolean;
  dueTime?: string;
  notified?: boolean;
  notifyEmail?: string;
}

const PRIORITY_STYLES = {
  low: "bg-[hsl(var(--priority-low))]",
  medium: "bg-[hsl(var(--priority-medium))]",
  high: "bg-[hsl(var(--priority-high))]",
};

const TaskManager = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem("tasks");
    return saved ? JSON.parse(saved) : [];
  });
  const [newTask, setNewTask] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [dueTime, setDueTime] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  // Check for due tasks every 30 seconds and send notifications
  useEffect(() => {
    const checkDueTasks = async () => {
      if (!notificationsEnabled) return;

      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      const tasksToNotify = tasks.filter(
        (t) => t.dueTime && !t.completed && !t.notified && t.dueTime <= currentTime && t.notifyEmail
      );

      if (tasksToNotify.length === 0) return;

      for (const task of tasksToNotify) {
        try {
          const { error } = await supabase.functions.invoke("send-notification", {
            body: {
              taskText: task.text,
              priority: task.priority,
              dueTime: task.dueTime,
              email: task.notifyEmail,
            },
          });
          if (error) throw error;
          toast.success(`Notification sent for: ${task.text}`);
        } catch (err) {
          console.error("Notification failed:", err);
          toast.error(`Failed to notify for: ${task.text}`);
        }
      }

      setTasks((prev) =>
        prev.map((t) =>
          tasksToNotify.some((n) => n.id === t.id) ? { ...t, notified: true } : t
        )
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
        notified: false,
        notifyEmail: notifyEmail.trim() || undefined,
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

            {/* Notification contact fields */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Mail className="w-4 h-4 text-card-foreground shrink-0" />
                <input
                  type="email"
                  className="glass-input flex-1"
                  placeholder="Notify email (optional)"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 flex-1">
                <Phone className="w-4 h-4 text-card-foreground shrink-0" />
                <input
                  type="tel"
                  className="glass-input flex-1"
                  placeholder="Phone +1234... (optional)"
                  value={notifyPhone}
                  onChange={(e) => setNotifyPhone(e.target.value)}
                />
              </div>
            </div>
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
                  {task.notifyEmail && (
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {task.notifyEmail}
                    </span>
                  )}
                  {task.notifyPhone && (
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {task.notifyPhone}
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
