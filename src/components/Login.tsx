import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const Login: React.FC = () => {
  const { signIn, loading, isSupabaseEnabled } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showSignUpOption, setShowSignUpOption] = useState(false);

  useEffect(() => {
    checkIfUsersExist();
  }, []);

  const checkIfUsersExist = async () => {
    try {
      if (!supabase) {
        setShowSignUpOption(false);
        return;
      }

      // Call the database function to check if any users exist in auth.users
      const { data, error } = await supabase.rpc('has_any_users');

      if (error) {
        console.error('Error checking users:', error);
        setShowSignUpOption(false);
        return;
      }

      // Show sign-up option only if NO users exist
      setShowSignUpOption(data === false);
    } catch (error) {
      console.error('Error checking users:', error);
      setShowSignUpOption(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.email.trim() || !formData.password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    if (isSignUp && !formData.name.trim()) {
      setError('Please enter your name');
      return;
    }

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!supabase) {
          throw new Error('Supabase not configured');
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name,
            }
          }
        });

        if (signUpError) throw signUpError;

        setSuccess('Account created successfully! You can now sign in.');
        setIsSignUp(false);
        setFormData({ email: formData.email, password: '', name: '' });

        // Re-check if users exist to hide sign-up option
        await checkIfUsersExist();
      } else {
        await signIn(formData.email, formData.password);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to ' + (isSignUp ? 'sign up' : 'sign in'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupabaseEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <img src="/wesabi_logo_landscape.png" alt="Wesabi Pharmacy" className="h-16" />
            </div>
            <p className="text-gray-600 mt-2">Point of Sale System</p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="text-sm font-semibold text-red-800">Configuration Required</h3>
                <p className="text-sm text-red-700 mt-1">
                  Supabase configuration is required to use this system. Please configure your environment variables.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-600 text-sm">
              Contact your system administrator to configure the database connection.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img src="/wesabi_logo_landscape.png" alt="Wesabi Pharmacy" className="h-16" />
          </div>
          <p className="text-gray-600 mt-2">Point of Sale System</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter your full name"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter your password"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {isSignUp && (
              <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        {showSignUpOption && (
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setSuccess('');
              }}
              className="text-sm text-green-600 hover:text-green-700"
            >
              {isSignUp ? 'Already have an account? Sign in' : 'No users exist. Create first admin account'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;