import { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  email: string;
  username: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  login: (token: string, userData?: User) => void;
  logout: () => void;
  updateUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  token: null,
  user: null,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
      
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
    }
  }, []);

  const login = (newToken: string, userData?: User) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setIsAuthenticated(true);
    
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    }
  };

  const updateUser = (userData: User) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      token, 
      user, 
      login, 
      logout, 
      updateUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); 