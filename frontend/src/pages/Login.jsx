import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { Lock, User, ScissorsLineDashed, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import apiCall, { pingServer } from '../api';
import logoImg from '../assets/logo.png';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Wake up Railway backend silently in background
  useEffect(() => {
    pingServer();
  }, []);


  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Trim to remove accidental spaces, lowercase to fix mobile autocapitalize
      const credentials = {
        username: data.username.trim(),
        password: data.password.trim()
      };
      const res = await apiCall('/auth/login', {
        method: 'POST',
        body: credentials
      });
      
      localStorage.setItem('token', res.token);
      localStorage.setItem('role', res.role);
      localStorage.setItem('username', res.username);
      
      toast.success(`Welcome back, ${res.username}!`);
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6 relative">
      {/* Super clean layout, no glows or visual noise */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md bg-white border border-slate-100 p-8 sm:p-10 rounded-[32px] shadow-premium"
      >
        {/* Salon Logo Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-3xl bg-white logo-container border border-slate-100 flex items-center justify-center shadow-soft overflow-hidden p-0 mb-4 shrink-0">
            <img src={logoImg} alt="Logo" className="w-full h-full object-cover scale-110" />
          </div>
          <h2 className="text-2xl font-extrabold text-primary-dark tracking-tight">R Unisex Salon</h2>
          <p className="text-xs text-slate-450 mt-1 font-semibold">Sign in to manage your salon operations</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Username Field */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-4.5 w-4.5 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="Enter username"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                spellCheck={false}
                {...register('username', { required: 'Username is required' })}
                className="form-input !pl-11 text-xs"
              />
            </div>
            {errors.username && (
              <span className="text-xs text-red-500 font-semibold mt-1.5 block">{errors.username.message}</span>
            )}
          </div>

          {/* Password Field */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
              <button 
                type="button" 
                disabled 
                className="text-[10px] font-bold text-slate-400 cursor-not-allowed hover:text-slate-500 transition-colors"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-4.5 w-4.5 text-slate-400" />
              </span>
              <input
                type="password"
                placeholder="Enter password"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="current-password"
                spellCheck={false}
                {...register('password', { required: 'Password is required' })}
                className="form-input !pl-11 text-xs"
              />
            </div>
            {errors.password && (
              <span className="text-xs text-red-500 font-semibold mt-1.5 block">{errors.password.message}</span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-primary hover:bg-primary-light text-white font-bold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md active:scale-97 disabled:opacity-50 disabled:cursor-not-allowed mt-2 text-xs"
          >
            {loading ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>


      </motion.div>
    </div>
  );
}
