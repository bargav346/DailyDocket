import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Mail } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; general?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });
    // Check hash for recovery token
    if (window.location.hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (password.length < 6) newErrors.password = "Password must be at least 6 characters";
    if (password !== confirmPassword) newErrors.confirm = "Passwords do not match";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) { setErrors({ general: error.message }); return; }
    setSuccess(true);
    setTimeout(() => navigate("/"), 2000);
  };

  if (!isRecovery) {
    return (
      <div className="app-bg flex items-center justify-center p-4">
        <div className="glass-card p-8 sm:p-10 w-full max-w-md text-center animate-fade-in">
          <p className="text-muted-foreground">Invalid or expired reset link.</p>
          <button onClick={() => navigate("/login")} className="glass-btn w-full py-3 mt-4">Back to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-bg flex items-center justify-center p-4">
      <div className="glass-card p-8 sm:p-10 w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl glass-btn flex items-center justify-center">
            <Mail className="w-8 h-8 text-card-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-card-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            Set New Password
          </h1>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <p className="text-card-foreground font-medium">✅ Password updated!</p>
            <p className="text-muted-foreground text-sm">Redirecting you now...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-card-foreground text-sm font-medium mb-1.5">New Password</label>
              <input type="password" className="glass-input w-full" placeholder="Enter new password"
                value={password} onChange={(e) => { setPassword(e.target.value); setErrors({}); }} maxLength={100} />
              {errors.password && <p className="text-destructive text-xs mt-1">{errors.password}</p>}
            </div>
            <div>
              <label className="block text-card-foreground text-sm font-medium mb-1.5">Confirm Password</label>
              <input type="password" className="glass-input w-full" placeholder="Confirm new password"
                value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setErrors({}); }} maxLength={100} />
              {errors.confirm && <p className="text-destructive text-xs mt-1">{errors.confirm}</p>}
            </div>
            {errors.general && <p className="text-destructive text-sm text-center">{errors.general}</p>}
            <button type="submit" disabled={submitting} className="glass-btn w-full py-3 text-base disabled:opacity-50">
              {submitting ? "Please wait..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
