import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  phone?: string;
  role: 'super_admin' | 'admin' | 'sales' | 'inventory' | 'stock_take';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthUser extends UserProfile {
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string, userId: string) => Promise<void>;
  createUser: (userData: {
    name: string;
    phone?: string;
    role: UserProfile['role'];
    email?: string;
    password?: string;
  }) => Promise<void>;
  updateUser: (userId: string, updates: Partial<UserProfile>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  getAllUsers: () => Promise<UserProfile[]>;
  canAccessPage: (page: string) => boolean;
  canManageUsers: boolean;
  canManagePricing: boolean;
  canDeleteProducts: () => boolean;
  isSupabaseEnabled: boolean;
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
    let mounted = true;

    const initAuth = async () => {
      try {
        if (!isSupabaseEnabled || !supabase) {
          // No Supabase - require proper login
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        // Get initial session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
        }

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return;

            console.log('Auth state changed:', event, session?.user?.id);

            if (session?.user) {
              await loadUserProfile(session.user);
            } else {
              setUser(null);
              setLoading(false);
            }
          }
        );

        return () => {
          subscription.unsubscribe();
        };

      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    const loadUserProfile = async (supabaseUser: SupabaseUser) => {
      if (!mounted) return;

      try {
        if (!supabase) {
          setUser(null);
          setLoading(false);
          return;
        }

        const { data: profiles, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', supabaseUser.id);

        if (error) {
          console.error('Error loading user profile:', error);
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        // Check if profile exists
        if (!profiles || profiles.length === 0) {
          // No profile found, create one
          console.log('No profile found for user, creating new profile...');

          // Check if this is the first user (should be super admin)
          const { data: allProfiles } = await supabase
            .from('user_profiles')
            .select('id');

          const isFirstUser = !allProfiles || allProfiles.length === 0;

          const newProfile = {
            user_id: supabaseUser.id,
            name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
            phone: supabaseUser.user_metadata?.phone || null,
            role: isFirstUser ? 'super_admin' : (supabaseUser.user_metadata?.role || 'sales'),
            is_active: true,
          };

          const { data: createdProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert(newProfile)
            .select()
            .single();

          if (createError) {
            console.error('Error creating user profile:', createError);
            if (mounted) {
              setUser(null);
              setLoading(false);
            }
            return;
          }

          // Use the created profile
          if (mounted) {
            setUser({
              ...createdProfile,
              email: supabaseUser.email || '',
            });
            setLoading(false);
          }
        } else {
          // Profile exists, use it
          const profile = profiles[0];
          if (mounted) {
            setUser({
              ...profile,
              email: supabaseUser.email || '',
            });
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseEnabled || !supabase) {
      throw new Error('Authentication not available in demo mode');
    }

    // Validate inputs
    if (!email?.trim() || !password?.trim()) {
      throw new Error('Email and password are required');
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      if (!isSupabaseEnabled || !supabase) {
        setUser(null);
        return;
      }

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase signOut error:', error);
        throw error;
      }

      setUser(null);
    } catch (error) {
      console.error('Error during sign out:', error);
      setUser(null);
      throw error;
    }
  };

  const resetPassword = async (email: string, userId: string) => {
    if (!isSupabaseEnabled || !supabase) {
      throw new Error('Password reset not available in demo mode');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reset password');
    }
  };

  const createUser = async (userData: {
    name: string;
    phone?: string;
    role: UserProfile['role'];
    email: string;
    password: string;
  }) => {
    if (!isSupabaseEnabled || !supabase) {
      throw new Error('User creation not available in demo mode');
    }

    // Get current session for authorization
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    // Call the create-user edge function
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        name: userData.name,
        phone: userData.phone,
        role: userData.role,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create user');
    }

    const result = await response.json();
    if (!result.userId) {
      throw new Error('Failed to get user ID from response');
    }
  };

  const updateUser = async (userId: string, updates: Partial<UserProfile>) => {
    if (!isSupabaseEnabled || !supabase) {
      throw new Error('User updates not available in demo mode');
    }

    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  };

  const deleteUser = async (userId: string) => {
    if (!isSupabaseEnabled || !supabase) {
      throw new Error('User deletion not available in demo mode');
    }

    // Get current session for authorization
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    // First delete the user profile
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    // Then delete the auth user via edge function
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete auth user');
    }
  };

  const getAllUsers = async (): Promise<UserProfile[]> => {
    if (!isSupabaseEnabled || !supabase) {
      return []; // Return empty array in demo mode
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  };

  const canAccessPage = (page: string): boolean => {
    if (!user) return false;

    const { role } = user;

    switch (page) {
      case 'dashboard':
        return ['super_admin', 'admin'].includes(role);
      case 'pos':
        return ['super_admin', 'admin', 'sales'].includes(role);
      case 'invoices':
        return ['super_admin', 'admin', 'sales', 'inventory'].includes(role);
      case 'inventory':
        return ['super_admin', 'admin', 'sales', 'inventory'].includes(role);
      case 'creditnotes':
        return ['super_admin', 'admin', 'sales', 'inventory'].includes(role);
      case 'stocktake':
        return ['super_admin', 'admin', 'sales', 'stock_take'].includes(role);
      case 'drugsaleshistory':
        return ['super_admin', 'admin', 'sales'].includes(role);
      case 'saleshistory':
        return ['super_admin', 'admin', 'sales'].includes(role);
      case 'analytics':
        return ['super_admin', 'admin'].includes(role);
      case 'logs':
        return ['super_admin', 'admin'].includes(role);
      case 'settings':
        return ['super_admin', 'admin'].includes(role);
      case 'profile':
        return true;
      default:
        return false;
    }
  };

  const canManageUsers = user?.role === 'super_admin' || user?.role === 'admin';
  const canManagePricing = user?.role === 'super_admin' || user?.role === 'admin';

  const canDeleteProducts = (): boolean => {
    return user?.role === 'super_admin' || user?.role === 'admin';
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signOut,
      resetPassword,
      createUser,
      updateUser,
      deleteUser,
      getAllUsers,
      canAccessPage,
      canManageUsers,
      canManagePricing,
      canDeleteProducts,
      isSupabaseEnabled,
    }}>
      {children}
    </AuthContext.Provider>
  );
};