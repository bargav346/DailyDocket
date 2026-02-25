import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogIn } from "lucide-react";

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ username?: string; password?: string; general?: string }>({});

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (username.trim().length < 3) newErrors.username = "Username must be at least 3 characters";
    if (password.trim().length < 4) newErrors.password = "Password must be at least 4 characters";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    const success = login(username, password);
    if (success) {
      navigate("/");
    } else {
      setErrors({ general: "Login failed. Please try again." });
    }
  };

  return (
    <div className="app-bg flex items-center justify-center p-4">
      <div className="glass-card p-8 sm:p-10 w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl glass-btn flex items-center justify-center">
            <LogIn className="w-8 h-8 text-card-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-card-foreground mb-2">Welcome Back</h1>
          <p className="text-muted-foreground text-sm">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-card-foreground text-sm font-medium mb-1.5">Username</label>
            <input
              type="text"
              className="glass-input w-full"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setErrors({}); }}
              maxLength={50}
            />
            {errors.username && <p className="text-destructive text-xs mt-1">{errors.username}</p>}
          </div>

          <div>
            <label className="block text-card-foreground text-sm font-medium mb-1.5">Password</label>
            <input
              type="password"
              className="glass-input w-full"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
              maxLength={100}
            />
            {errors.password && <p className="text-destructive text-xs mt-1">{errors.password}</p>}
          </div>

          {errors.general && <p className="text-destructive text-sm text-center">{errors.general}</p>}

          <button type="submit" className="glass-btn w-full py-3 text-base">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
