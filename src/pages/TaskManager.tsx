import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Check, Bell, BellOff, Clock, Mail, Phone, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import TaskStreak from "@/components/TaskStreak";
import AiSuggestions from "@/components/AiSuggestions";

interface Task {
  id: string;
  text: string;
  priority: "low" | "medium" | "high";
  completed: boolean;
  dueDate?: string;
  dueTime?: string;
  notifyPhone?: string;
  notifyEmail?: string;
  sentReminders: number[];
  createdAt?: string;
}

const PRIORITY_STYLES = {
  low: "bg-[hsl(var(--priority-low))]",
  medium: "bg-[hsl(var(--priority-medium))]",
  high: "bg-[hsl(var(--priority-high))]",
};

const REMINDER_MINUTES = [30, 20, 10];

const TaskManager = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [dueTime, setDueTime] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [notifyPhone, setNotifyPhone] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [defaultPhone, setDefaultPhone] = useState("");
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);

  // Fetch default phone from user_settings
  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("user_settings")
        .select("task_phone")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.task_phone) {
        setDefaultPhone(data.task_phone);
        setNotifyPhone(data.task_phone);
      } else {
        setShowPhonePrompt(true);
      }
    };
    fetchSettings();
  }, [user]);

  const saveDefaultPhone = async (phone: string) => {
    if (!user || !phone.trim()) return;
    const { data: existing } = await supabase
      .from("user_settings")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) {
      await supabase.from("user_settings").update({ task_phone: phone.trim() }).eq("user_id", user.id);
    } else {
      await supabase.from("user_settings").insert({ user_id: user.id, task_phone: phone.trim() });
    }
    setDefaultPhone(phone.trim());
    setNotifyPhone(phone.trim());
    setShowPhonePrompt(false);
    toast.success("Default phone number saved!");
  };

  // Fetch tasks from DB
  useEffect(() => {
    if (!user) return;
    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("Failed to load tasks");
        console.error(error);
      } else {
        setTasks(
          (data || []).map((t) => ({
            id: t.id,
            text: t.text,
            priority: t.priority as Task["priority"],
            completed: t.completed,
            dueDate: t.due_date || undefined,
            dueTime: t.due_time || undefined,
            notifyPhone: t.notify_phone || undefined,
            notifyEmail: t.notify_email || undefined,
            sentReminders: [],
            createdAt: t.created_at,
          }))
        );
      }
      setLoading(false);
    };
    fetchTasks();
  }, [user]);

  // Reminder check interval
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
          if (nowMinutes >= triggerAt && nowMinutes < triggerAt + 2 && !task.sentReminders.includes(minBefore)) {
            remindersToSend.push({ task, minutesBefore: minBefore });
          }
        }
      }

      if (remindersToSend.length === 0) return;

      for (const { task, minutesBefore } of remindersToSend) {
        try {
          const { error } = await supabase.functions.invoke("send-notification", {
            body: { taskText: task.text, priority: task.priority, dueTime: task.dueTime, phone: task.notifyPhone, email: task.notifyEmail, minutesBefore },
          });
          if (error) throw error;
          toast.success(`SMS sent (${minutesBefore}min before): ${task.text}`);
        } catch (err) {
          console.error("Notification failed:", err);
          toast.error(`Failed to notify for: ${task.text}`);
        }
      }

      setTasks((prev) =>
        prev.map((t) => {
          const sent = remindersToSend.filter((r) => r.task.id === t.id).map((r) => r.minutesBefore);
          if (sent.length === 0) return t;
          return { ...t, sentReminders: [...t.sentReminders, ...sent] };
        })
      );
    };

    const interval = setInterval(checkDueTasks, 30000);
    checkDueTasks();
    return () => clearInterval(interval);
  }, [tasks, notificationsEnabled]);

  const addTask = async () => {
    const text = newTask.trim();
    if (!text || text.length > 200 || !user) return;

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        text,
        priority,
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        due_time: dueTime || null,
        notify_phone: notifyPhone.trim() || null,
        notify_email: notifyEmail.trim() || null,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to add task");
      console.error(error);
      return;
    }

    setTasks((prev) => [
      {
        id: data.id,
        text: data.text,
        priority: data.priority as Task["priority"],
        completed: data.completed,
        dueDate: data.due_date || undefined,
        dueTime: data.due_time || undefined,
        notifyPhone: data.notify_phone || undefined,
        notifyEmail: data.notify_email || undefined,
        sentReminders: [],
        createdAt: data.created_at,
      },
      ...prev,
    ]);
    setNewTask("");
    setDueTime("");
    setDueDate(undefined);
  };

  const addTaskFromSuggestion = async (text: string, suggestedPriority: "low" | "medium" | "high", suggestedDate?: string, suggestedTime?: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("tasks")
      .insert({ text, priority: suggestedPriority, due_date: suggestedDate || null, due_time: suggestedTime || null, user_id: user.id })
      .select()
      .single();
    if (error) { toast.error("Failed to add task"); return; }
    setTasks((prev) => [
      { id: data.id, text: data.text, priority: data.priority as Task["priority"], completed: data.completed, dueDate: data.due_date || undefined, dueTime: data.due_time || undefined, notifyPhone: data.notify_phone || undefined, notifyEmail: data.notify_email || undefined, sentReminders: [], createdAt: data.created_at },
      ...prev,
    ]);
  };


  const toggleComplete = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const { error } = await supabase
      .from("tasks")
      .update({ completed: !task.completed })
      .eq("id", id);
    if (error) { toast.error("Failed to update task"); return; }
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) { toast.error("Failed to delete task"); return; }
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

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

        <TaskStreak tasks={tasks.map(t => ({ completed: t.completed, dueDate: t.dueDate, createdAt: t.createdAt }))} totalTasks={tasks.length} />

        <AiSuggestions
          existingTasks={tasks.map(t => ({ text: t.text, priority: t.priority, completed: t.completed }))}
          onAddTask={addTaskFromSuggestion}
        />

        <div className="glass-card p-6 sm:p-8 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-card-foreground mb-6">Task Manager</h1>
          <div className="flex flex-col gap-3 mb-2">
            <div className="flex flex-col sm:flex-row gap-3">
              <input className="glass-input flex-1" placeholder="Add a new task..." value={newTask}
                onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} maxLength={200} />
              <select value={priority} onChange={(e) => setPriority(e.target.value as Task["priority"])} className="glass-input sm:w-32 appearance-none">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
             <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2 flex-1">
                <CalendarIcon className="w-4 h-4 text-card-foreground shrink-0" />
                <Popover>
                  <PopoverTrigger asChild>
                    <button className={cn("glass-input flex-1 text-left", !dueDate && "text-muted-foreground")}>
                      {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <Clock className="w-4 h-4 text-card-foreground shrink-0" />
                <input type="time" className="glass-input flex-1" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
              </div>
              <button onClick={addTask} className="glass-btn flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add Task
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-card-foreground shrink-0" />
              <input type="tel" className="glass-input flex-1" placeholder="Phone for SMS reminders (e.g. +91...)"
                value={notifyPhone} onChange={(e) => setNotifyPhone(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-card-foreground shrink-0" />
              <input type="email" className="glass-input flex-1" placeholder="Notify email (optional)"
                value={notifyEmail} onChange={(e) => setNotifyEmail(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">📱 SMS reminders at 30, 20, and 10 minutes before due time.</p>
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="glass-card p-8 text-center">
              <p className="text-muted-foreground animate-pulse">Loading tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-muted-foreground">No tasks yet. Add one above!</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className={`glass-card p-4 flex items-center gap-3 transition-all duration-300 ${task.completed ? "opacity-60" : ""}`}>
                <button onClick={() => toggleComplete(task.id)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                    task.completed ? "bg-[hsl(var(--priority-low))]" : "border border-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.1)]"
                  }`}>
                  {task.completed && <Check className="w-4 h-4 text-card-foreground" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-card-foreground font-medium truncate ${task.completed ? "line-through opacity-70" : ""}`}>{task.text}</p>
                  <div className="flex flex-wrap gap-2 mt-0.5">
                    {task.dueDate && <span className="text-muted-foreground text-xs flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {task.dueDate}</span>}
                    {task.dueTime && <span className="text-muted-foreground text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> {task.dueTime}</span>}
                    {task.notifyPhone && <span className="text-muted-foreground text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> {task.notifyPhone}</span>}
                    {task.notifyEmail && <span className="text-muted-foreground text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> {task.notifyEmail}</span>}
                    {task.sentReminders.length > 0 && <span className="text-muted-foreground text-xs">✅ Sent: {task.sentReminders.sort((a, b) => b - a).join(", ")}min</span>}
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full text-card-foreground font-medium capitalize shrink-0 ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</span>
                <button onClick={() => deleteTask(task.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-card-foreground hover:bg-destructive/30 transition-colors shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskManager;
