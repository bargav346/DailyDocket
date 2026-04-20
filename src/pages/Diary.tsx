import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, SaveAll, CalendarIcon, Mail } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const HOURS = Array.from({ length: 17 }, (_, i) => {
  const hour = i + 6;
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour;
  return { key: hour, label: `${display}:00 ${ampm}` };
});

const toDateKey = (d: Date) => d.toISOString().slice(0, 10);
const isToday = (d: Date) => toDateKey(d) === toDateKey(new Date());

const Diary = () => {
  const navigate = useNavigate();
  const { user, email: userEmail } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const dateKey = toDateKey(selectedDate);
  const readOnly = !isToday(selectedDate);

  const [entries, setEntries] = useState<Record<number, string>>({});
  const [savedStatus, setSavedStatus] = useState<Record<number, boolean>>({});
  const [allSaved, setAllSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [diaryEmail, setDiaryEmail] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);

  // Load entries from DB
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("diary_entries")
        .select("hour, content")
        .eq("date", dateKey);

      if (error) {
        console.error(error);
        toast.error("Failed to load diary entries");
      } else {
        const map: Record<number, string> = {};
        (data || []).forEach((e: any) => { map[e.hour] = e.content; });
        setEntries(map);
      }
      setLoading(false);
    };
    load();
  }, [user, dateKey]);

  // Load email setting (fallback to auth email)
  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_settings")
      .select("diary_email")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.diary_email) setDiaryEmail(data.diary_email);
        else if (userEmail) setDiaryEmail(userEmail);
      });
  }, [user, userEmail]);

  const loadDate = (date: Date) => {
    setSelectedDate(date);
    setSavedStatus({});
    setAllSaved(false);
  };

  const updateEntry = (hour: number, value: string) => {
    setEntries((prev) => ({ ...prev, [hour]: value }));
    setSavedStatus((prev) => ({ ...prev, [hour]: false }));
    setAllSaved(false);
  };

  const saveEntry = async (hour: number) => {
    if (!user) return;
    const content = entries[hour] || "";
    const { error } = await supabase
      .from("diary_entries")
      .upsert({ user_id: user.id, date: dateKey, hour, content }, { onConflict: "user_id,date,hour" });

    if (error) { toast.error("Failed to save"); console.error(error); return; }
    setSavedStatus((prev) => ({ ...prev, [hour]: true }));
    setTimeout(() => setSavedStatus((prev) => ({ ...prev, [hour]: false })), 2000);
  };

  const saveAll = async () => {
    if (!user) return;
    const rows = HOURS.filter(({ key }) => (entries[key] || "").trim())
      .map(({ key }) => ({ user_id: user.id, date: dateKey, hour: key, content: entries[key] || "" }));

    if (rows.length === 0) return;
    const { error } = await supabase
      .from("diary_entries")
      .upsert(rows, { onConflict: "user_id,date,hour" });

    if (error) { toast.error("Failed to save all"); console.error(error); return; }
    const allStatus: Record<number, boolean> = {};
    HOURS.forEach(({ key }) => { allStatus[key] = true; });
    setSavedStatus(allStatus);
    setAllSaved(true);
    setTimeout(() => { setSavedStatus({}); setAllSaved(false); }, 2000);
  };

  const saveEmail = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("user_settings")
      .upsert({ user_id: user.id, diary_email: diaryEmail.trim() || null } as any, { onConflict: "user_id" });
    if (error) { toast.error("Failed to save email"); return; }
    setEmailSaved(true);
    toast.success("Email saved! You'll receive diary summaries at end of day.");
    setTimeout(() => setEmailSaved(false), 2000);
  };

  const hasEntries = Object.values(entries).some((v) => v.trim().length > 0);

  return (
    <div className="app-bg p-4 sm:p-8">
      <div className="max-w-2xl mx-auto animate-fade-in">
        <button onClick={() => navigate("/")} className="glass-btn-outline mb-6 flex items-center gap-2 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="glass-card p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-card-foreground mb-1">Hourly Daily Diary</h1>
              <p className="text-muted-foreground text-sm">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
                {readOnly && <span className="ml-2 text-xs opacity-70">(Read only)</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!readOnly && (
                <button onClick={saveAll}
                  className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                    allSaved ? "bg-[hsl(var(--priority-low))] text-card-foreground" : "glass-btn"
                  }`}>
                  <SaveAll className="w-4 h-4" />
                  {allSaved ? "All Saved!" : "Save All"}
                </button>
              )}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="glass-btn-outline flex items-center gap-2 text-sm shrink-0">
                    <CalendarIcon className="w-4 h-4" />
                    {isToday(selectedDate) ? "Today" : format(selectedDate, "MMM d")}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[hsl(220,25%,12%)] border-[rgba(255,255,255,0.15)]" align="end">
                  <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && loadDate(d)}
                    disabled={(date) => date > new Date()} initialFocus className={cn("p-3 pointer-events-auto text-card-foreground")} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Email for end-of-day summary */}
          <div className="mt-4 flex items-center gap-2">
            <Mail className="w-4 h-4 text-card-foreground shrink-0" />
            <input type="email" className="glass-input flex-1" placeholder="Email for end-of-day diary summary"
              value={diaryEmail} onChange={(e) => setDiaryEmail(e.target.value)} />
            <button onClick={saveEmail}
              className={`shrink-0 text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                emailSaved ? "bg-[hsl(var(--priority-low))] text-card-foreground" : "glass-btn-outline"
              }`}>
              {emailSaved ? "Saved!" : "Save"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">📧 Receive a summary of your diary entries via email at end of day.</p>
        </div>

        {loading ? (
          <div className="glass-card p-8 text-center">
            <p className="text-muted-foreground animate-pulse">Loading...</p>
          </div>
        ) : !hasEntries && readOnly ? (
          <div className="glass-card p-8 text-center mb-3">
            <p className="text-muted-foreground">No diary entries for this date.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {HOURS.map(({ key, label }) => {
              const value = entries[key] || "";
              if (readOnly && !value.trim()) return null;
              return (
                <div key={key} className="glass-card p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <span className="text-card-foreground font-semibold text-sm w-24 shrink-0">{label}</span>
                  {readOnly ? (
                    <p className="text-card-foreground/80 text-sm flex-1">{value}</p>
                  ) : (
                    <>
                      <textarea className="glass-input flex-1 w-full resize-none min-h-[42px]" rows={1}
                        placeholder="What did you do?" value={value}
                        onChange={(e) => updateEntry(key, e.target.value)} maxLength={500} />
                      <button onClick={() => saveEntry(key)}
                        className={`shrink-0 flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                          savedStatus[key] ? "bg-[hsl(var(--priority-low))] text-card-foreground" : "glass-btn-outline"
                        }`}>
                        <Save className="w-3.5 h-3.5" />
                        {savedStatus[key] ? "Saved!" : "Save"}
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Diary;
