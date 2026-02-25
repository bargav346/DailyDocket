import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Check, Bell, BellOff, Clock } from "lucide-react";

interface Task {
  id: string;
  text: string;
  priority: "low" | "medium" | "high";
  completed: boolean;
  dueTime?: string;
  notified?: boolean;
}

const PRIORITY_STYLES = {
  low: "bg-[hsl(var(--priority-low))]",
  medium: "bg-[hsl(var(--priority-medium))]",
  high: "bg-[hsl(var(--priority-high))]",
};

const requestNotificationPermission = async () => {
  if ("Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission();
  }
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
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => "Notification" in window && Notification.permission === "granted"
  );

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  // Check for due tasks every 30 seconds
  useEffect(() => {
    const checkDueTasks = () => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      setTasks((prev) => {
        let changed = false;
        const updated = prev.map((task) => {
          if (
            task.dueTime &&
            !task.completed &&
            !task.notified &&
            task.dueTime <= currentTime
          ) {
            changed = true;
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(`Task Due: ${task.text}`, {
                body: `Priority: ${task.priority.toUpperCase()} — Due at ${task.dueTime}`,
                icon: "/favicon.ico",
              });
            }
            return { ...task, notified: true };
          }
          return task;
        });
        return changed ? updated : prev;
      });
    };

    const interval = setInterval(checkDueTasks, 30000);
    checkDueTasks();
    return () => clearInterval(interval);
  }, []);

  const toggleNotifications = async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      setNotificationsEnabled((prev) => !prev);
    } else {
      const perm = await Notification.requestPermission();
      setNotificationsEnabled(perm === "granted");
    }
  };

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
            onClick={toggleNotifications}
            className={`glass-btn-outline flex items-center gap-2 text-sm ${notificationsEnabled ? "" : "opacity-60"}`}
            title={notificationsEnabled ? "Notifications enabled" : "Notifications disabled"}
          >
            {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            {notificationsEnabled ? "Notifications On" : "Notifications Off"}
          </button>
        </div>

        <div className="glass-card p-6 sm:p-8 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-card-foreground mb-6">Task Manager</h1>

          {/* Add Task */}
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
                <p
                  className={`text-card-foreground font-medium truncate ${
                    task.completed ? "line-through opacity-70" : ""
                  }`}
                >
                  {task.text}
                </p>
                {task.dueTime && (
                  <p className="text-muted-foreground text-xs flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> Due at {task.dueTime}
                  </p>
                )}
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
