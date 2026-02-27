import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { CheckSquare, Clock, LogOut } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { email, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="app-bg flex flex-col items-center justify-center p-4 relative">
      {/* Logout */}
      <button
        onClick={handleLogout}
        className="glass-btn-outline fixed right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 text-sm rounded-r-none px-4 py-3"
      >
        <LogOut className="w-4 h-4" />
        Logout
      </button>

      <div className="glass-card p-8 sm:p-12 w-full max-w-lg text-center animate-fade-in">
        <h1 className="text-4xl sm:text-5xl font-bold text-card-foreground mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
          Daily Docket
        </h1>
        <p className="text-muted-foreground mb-2 text-xs tracking-widest uppercase">Welcome back, {email.split("@")[0]} 👋</p>
        <p className="text-muted-foreground mb-10 text-sm">What would you like to do today?</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => navigate("/tasks")}
            className="glass-card group p-6 flex flex-col items-center gap-3 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_40px_rgba(120,80,220,0.3)]"
          >
            <div className="w-14 h-14 rounded-xl glass-btn flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckSquare className="w-7 h-7 text-card-foreground" />
            </div>
            <span className="text-card-foreground font-semibold text-lg">Task Manager</span>
            <span className="text-muted-foreground text-xs">Organize your tasks</span>
          </button>

          <button
            onClick={() => navigate("/diary")}
            className="glass-card group p-6 flex flex-col items-center gap-3 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_40px_rgba(200,80,180,0.3)]"
          >
            <div className="w-14 h-14 rounded-xl glass-btn flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-7 h-7 text-card-foreground" />
            </div>
            <span className="text-card-foreground font-semibold text-lg">Daily Diary</span>
            <span className="text-muted-foreground text-xs">Track your hours</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;
