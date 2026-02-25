import { createContext, useContext, useState, ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  email: string;
  login: (email: string, password: string) => boolean;
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
    localStorage.setItem("isAuthenticated", "true");
    localStorage.setItem("userEmail", trimmed);
    setIsAuthenticated(true);
    setEmail(trimmed);
    return true;
  };

  const logout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("userEmail");
    setIsAuthenticated(false);
    setEmail("");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, email, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
