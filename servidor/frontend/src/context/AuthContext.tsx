import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "../types";
import { api } from "../services/api";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(api.getSavedUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (api.isAuthenticated()) {
        try {
          const currentUser = await api.auth.me();
          setUser(currentUser);
        } catch {
          api.clearSession();
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();

    const handleExpired = () => {
      setUser(null);
    };

    window.addEventListener("auth-expired", handleExpired);
    return () => window.removeEventListener("auth-expired", handleExpired);
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.auth.login(email, password);
    setUser(data.user);
  };

  const register = async (email: string, password: string, name?: string) => {
    const data = await api.auth.register(email, password, name);
    setUser(data.user);
  };

  const logout = () => {
    api.clearSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider");
  }
  return context;
};
