import { createContext, useContext, useState } from 'react';
import * as api from '../api/mockApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => api.getSession());

  const value = {
    user,
    isAdmin: user?.role === 'admin',
    async login(identifier, password) {
      const u = await api.login(identifier, password);
      setUser(u);
      return u;
    },
    async register(data) {
      const u = await api.register(data);
      setUser(u);
      return u;
    },
    logout() {
      api.logout();
      setUser(null);
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
