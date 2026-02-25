import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, SaveAll, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const dateKey = toDateKey(selectedDate);
  const readOnly = !isToday(selectedDate);

  const [entries, setEntries] = useState<Record<number, string>>(() => {
    const saved = localStorage.getItem(`diary-${dateKey}`);
    return saved ? JSON.parse(saved) : {};
  });
  const [savedStatus, setSavedStatus] = useState<Record<number, boolean>>({});
  const [allSaved, setAllSaved] = useState(false);

  const loadDate = (date: Date) => {
    setSelectedDate(date);
    const key = toDateKey(date);
    const saved = localStorage.getItem(`diary-${key}`);
    setEntries(saved ? JSON.parse(saved) : {});
    setSavedStatus({});
    setAllSaved(false);
  };

  const updateEntry = (hour: number, value: string) => {
    setEntries((prev) => ({ ...prev, [hour]: value }));
    setSavedStatus((prev) => ({ ...prev, [hour]: false }));
    setAllSaved(false);
  };

  const saveEntry = (hour: number) => {
    localStorage.setItem(`diary-${dateKey}`, JSON.stringify(entries));
    setSavedStatus((prev) => ({ ...prev, [hour]: true }));
    setTimeout(() => setSavedStatus((prev) => ({ ...prev, [hour]: false })), 2000);
  };

  const saveAll = () => {
    localStorage.setItem(`diary-${dateKey}`, JSON.stringify(entries));
    const allStatus: Record<number, boolean> = {};
    HOURS.forEach(({ key }) => { allStatus[key] = true; });
    setSavedStatus(allStatus);
    setAllSaved(true);
    setTimeout(() => {
      setSavedStatus({});
      setAllSaved(false);
    }, 2000);
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
                <button
                  onClick={saveAll}
                  className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                    allSaved
                      ? "bg-[hsl(var(--priority-low))] text-card-foreground"
                      : "glass-btn"
                  }`}
                >
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
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => d && loadDate(d)}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto text-card-foreground")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {!hasEntries && readOnly && (
          <div className="glass-card p-8 text-center mb-3">
            <p className="text-muted-foreground">No diary entries for this date.</p>
          </div>
        )}

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
                    <textarea
                      className="glass-input flex-1 w-full resize-none min-h-[42px]"
                      rows={1}
                      placeholder="What did you do?"
                      value={value}
                      onChange={(e) => updateEntry(key, e.target.value)}
                      maxLength={500}
                    />
                    <button
                      onClick={() => saveEntry(key)}
                      className={`shrink-0 flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                        savedStatus[key]
                          ? "bg-[hsl(var(--priority-low))] text-card-foreground"
                          : "glass-btn-outline"
                      }`}
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savedStatus[key] ? "Saved!" : "Save"}
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Diary;
