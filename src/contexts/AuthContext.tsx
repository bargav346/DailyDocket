import { createContext, useContext, useState, ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  email: string;
  login: (email: string, password: string) => boolean;
  register: (email: string, password: string) => string | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem("isAuthenticated") === "true"
  );
  const [email, setEmail] = useState(
    () => localStorage.getItem("userEmail") || ""
  );

  const login = (emailInput: string, password: string) => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmed) || password.trim().length < 4) return false;
    const accounts: Record<string, string> = JSON.parse(localStorage.getItem("accounts") || "{}");
    if (!accounts[trimmed] || accounts[trimmed] !== password) return false;
    localStorage.setItem("isAuthenticated", "true");
    localStorage.setItem("userEmail", trimmed);
    setIsAuthenticated(true);
    setEmail(trimmed);
    return true;
  };

  const register = (emailInput: string, password: string): string | null => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmed)) return "Invalid email address";
    if (password.trim().length < 4) return "Password must be at least 4 characters";
    const accounts: Record<string, string> = JSON.parse(localStorage.getItem("accounts") || "{}");
    if (accounts[trimmed]) return "Account already exists";
    accounts[trimmed] = password;
    localStorage.setItem("accounts", JSON.stringify(accounts));
    localStorage.setItem("isAuthenticated", "true");
    localStorage.setItem("userEmail", trimmed);
    setIsAuthenticated(true);
    setEmail(trimmed);
    return null;
  };

  const logout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("userEmail");
    setIsAuthenticated(false);
    setEmail("");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, email, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
