import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Mail } from "lucide-react";

const Login = () => {
  const { login, register, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string; general?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail.trim())) { setResetError("Please enter a valid email"); return; }
    setResetSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetSubmitting(false);
    if (error) { setResetError(error.message); return; }
    setResetSent(true);
  };

  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) newErrors.email = "Please enter a valid email address";
    if (password.trim().length < 6) newErrors.password = "Password must be at least 6 characters";
    if (isSignUp && password !== confirmPassword) newErrors.confirm = "Passwords do not match";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setSubmitting(true);
    if (isSignUp) {
      const err = await register(email, password);
      setSubmitting(false);
      if (err) { setErrors({ general: err }); return; }
      setSignUpSuccess(true);
    } else {
      const err = await login(email, password);
      setSubmitting(false);
      if (err) { setErrors({ general: err }); return; }
      navigate("/");
    }
  };

  const switchMode = () => { setIsSignUp(!isSignUp); setErrors({}); setConfirmPassword(""); setSignUpSuccess(false); };

  return (
    <div className="app-bg flex items-center justify-center p-4 relative">
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="glass-btn fixed right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 text-sm rounded-r-none px-4 py-3 z-50"
        >
          <Mail className="w-4 h-4" />
          {isSignUp ? "Sign Up" : "Login"}
        </button>
      )}

      {!showForm && (
        <div className="glass-card p-8 sm:p-12 w-full max-w-lg text-center animate-fade-in">
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
      )}

      {showForm && (
        <div className="glass-card p-8 sm:p-10 w-full max-w-md animate-fade-in relative">
          <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-card-foreground transition-colors text-xl">✕</button>
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

          {signUpSuccess ? (
            <div className="text-center space-y-4">
              <p className="text-card-foreground font-medium">✅ Account created!</p>
              <p className="text-muted-foreground text-sm">Please check your email to verify your account, then sign in.</p>
              <button onClick={switchMode} className="glass-btn w-full py-3">Go to Sign In</button>
            </div>
          ) : (
            <>
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
                <button type="submit" disabled={submitting} className="glass-btn w-full py-3 text-base disabled:opacity-50">
                  {submitting ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
                </button>
              </form>
              <p className="text-center text-muted-foreground text-sm mt-6">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button onClick={switchMode} className="text-card-foreground underline hover:opacity-80 transition-opacity">
                  {isSignUp ? "Sign In" : "Create Account"}
                </button>
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Login;
