import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Mail } from "lucide-react";

const Login = () => {
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string; general?: string }>({});

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) newErrors.email = "Please enter a valid email address";
    if (password.trim().length < 4) newErrors.password = "Password must be at least 4 characters";
    if (isSignUp && password !== confirmPassword) newErrors.confirm = "Passwords do not match";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    if (isSignUp) {
      const err = register(email, password);
      if (err) { setErrors({ general: err }); return; }
      navigate("/");
    } else {
      const success = login(email, password);
      if (success) { navigate("/"); }
      else { setErrors({ general: "Invalid email or password." }); }
    }
  };

  const switchMode = () => { setIsSignUp(!isSignUp); setErrors({}); setConfirmPassword(""); };

  return (
    <div className="app-bg flex items-center justify-center p-4">
      <div className="glass-card p-8 sm:p-10 w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl glass-btn flex items-center justify-center">
            <Mail className="w-8 h-8 text-card-foreground" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-card-foreground mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Daily Docket
          </h1>
          <p className="text-muted-foreground text-sm mt-3">
            {isSignUp ? "Create your account to get started" : "Welcome back! Sign in to continue"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-card-foreground text-sm font-medium mb-1.5">Email</label>
            <input type="email" className="glass-input w-full" placeholder="you@example.com"
              value={email} onChange={(e) => { setEmail(e.target.value); setErrors({}); }} maxLength={100} />
            {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-card-foreground text-sm font-medium mb-1.5">Password</label>
            <input type="password" className="glass-input w-full" placeholder="Enter your password"
              value={password} onChange={(e) => { setPassword(e.target.value); setErrors({}); }} maxLength={100} />
            {errors.password && <p className="text-destructive text-xs mt-1">{errors.password}</p>}
          </div>

          {isSignUp && (
            <div>
              <label className="block text-card-foreground text-sm font-medium mb-1.5">Confirm Password</label>
              <input type="password" className="glass-input w-full" placeholder="Confirm your password"
                value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setErrors({}); }} maxLength={100} />
              {errors.confirm && <p className="text-destructive text-xs mt-1">{errors.confirm}</p>}
            </div>
          )}

          {errors.general && <p className="text-destructive text-sm text-center">{errors.general}</p>}

          <button type="submit" className="glass-btn w-full py-3 text-base">
            {isSignUp ? "Create Account" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-muted-foreground text-sm mt-6">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button onClick={switchMode} className="text-card-foreground underline hover:opacity-80 transition-opacity">
            {isSignUp ? "Sign In" : "Create Account"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
