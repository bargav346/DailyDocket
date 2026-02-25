import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";

const HOURS = Array.from({ length: 17 }, (_, i) => {
  const hour = i + 6;
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour;
  return { key: hour, label: `${display}:00 ${ampm}` };
});

const getDateKey = () => new Date().toISOString().slice(0, 10);

const Diary = () => {
  const navigate = useNavigate();
  const dateKey = getDateKey();

  const [entries, setEntries] = useState<Record<number, string>>(() => {
    const saved = localStorage.getItem(`diary-${dateKey}`);
    return saved ? JSON.parse(saved) : {};
  });

  const [savedStatus, setSavedStatus] = useState<Record<number, boolean>>({});

  const updateEntry = (hour: number, value: string) => {
    setEntries((prev) => ({ ...prev, [hour]: value }));
    setSavedStatus((prev) => ({ ...prev, [hour]: false }));
  };

  const saveEntry = (hour: number) => {
    const all = { ...entries };
    localStorage.setItem(`diary-${dateKey}`, JSON.stringify(all));
    setSavedStatus((prev) => ({ ...prev, [hour]: true }));
    setTimeout(() => setSavedStatus((prev) => ({ ...prev, [hour]: false })), 2000);
  };

  return (
    <div className="app-bg p-4 sm:p-8">
      <div className="max-w-2xl mx-auto animate-fade-in">
        <button onClick={() => navigate("/")} className="glass-btn-outline mb-6 flex items-center gap-2 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="glass-card p-6 sm:p-8 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-card-foreground mb-1">Hourly Daily Diary</h1>
          <p className="text-muted-foreground text-sm">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        <div className="space-y-3">
          {HOURS.map(({ key, label }) => (
            <div key={key} className="glass-card p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <span className="text-card-foreground font-semibold text-sm w-24 shrink-0">{label}</span>
              <textarea
                className="glass-input flex-1 w-full resize-none min-h-[42px]"
                rows={1}
                placeholder="What did you do?"
                value={entries[key] || ""}
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Diary;
