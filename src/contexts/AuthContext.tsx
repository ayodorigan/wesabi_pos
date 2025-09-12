import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AuthUser {
  id: string;
  email: string;
  phone?: string;
  name: string;
  role: 'super_admin' | 'admin' | 'inventory_manager' | 'sales' | 'cashier';
  isActive: boolean;
  createdAt: Date;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in from localStorage first
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser({
          ...parsedUser,
          createdAt: new Date(parsedUser.createdAt)
        });
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('currentUser');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Simple password validation for now
      // Check if any users exist in the system
      const { data: userCount, error: countError } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true });

      if (countError) {
        console.error('Error checking user count:', countError);
        throw new Error('Database connection error');
      }

      // If no users exist and this is the admin email, create the first admin user
      if (userCount === 0 && email === 'admin@wesabi.co.ke') {
        console.log('Creating initial admin user...');
        
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([{
            email: 'admin@wesabi.co.ke',
            name: 'Super Administrator',
            role: 'super_admin',
            phone: '+254700000001',
            is_active: true,
            password_hash: password // Store plain text for now - in production use proper hashing
          }])
          .select()
          .single();

        if (createError) {
          console.error('Error creating admin user:', createError);
          throw new Error('Failed to create admin user');
        }

        console.log('Admin user created successfully');
        
        const authUser: AuthUser = {
          id: newUser.id,
          email: newUser.email,
          phone: newUser.phone,
          name: newUser.name,
          role: newUser.role,
          isActive: newUser.is_active,
          createdAt: new Date(newUser.created_at)
        };

        setUser(authUser);
        localStorage.setItem('currentUser', JSON.stringify(authUser));
        return true;
      }

      // Try to find existing user
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true);

      if (error) {
        console.error('Login error:', error);
        return false;
      }

      if (!data || data.length === 0) {
        throw new Error('Invalid credentials');
      }

      // Use the first user from the array
      const userData = data[0];

      // For now, we'll use simple password comparison
      // In production, you should use proper password hashing
      if (userData.password_hash !== password) {
        console.error('Invalid password. Expected:', userData.password_hash, 'Got:', password);
        return false;
      }

      const authUser: AuthUser = {
        id: userData.id,
        email: userData.email,
        phone: userData.phone,
        name: userData.name,
        role: userData.role,
        isActive: userData.is_active,
        createdAt: new Date(userData.created_at)
      };

      setUser(authUser);
      localStorage.setItem('currentUser', JSON.stringify(authUser));
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  const isAuthenticated = !!user;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};