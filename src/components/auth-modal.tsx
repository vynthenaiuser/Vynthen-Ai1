'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { LegalModal } from '@/components/legal-modal';
import { X, Loader2, Mail, Lock, User, ArrowLeft, ExternalLink } from 'lucide-react';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const { authMode, setAuthMode, signUp, signIn, resetPassword, continueAsGuest, markAuthAsSeen } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLegal, setShowLegal] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (authMode === 'signup') {
        const result = await signUp(email, password, name);
        if (!result.success) {
          setError(result.error || 'Failed to create account');
        } else {
          setSuccess('Check your email to confirm your account!');
          setAuthMode('signin');
        }
      } else if (authMode === 'signin') {
        const result = await signIn(email, password);
        if (!result.success) {
          setError(result.error || 'Failed to sign in');
        } else {
          onOpenChange(false);
        }
      } else if (authMode === 'reset') {
        const result = await resetPassword(email);
        if (result.success) {
          setSuccess('Check your email for a password reset link.');
        } else {
          setError(result.error || 'Failed to send reset email');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuest = () => {
    continueAsGuest();
    onOpenChange(false);
  };

  // Handle modal close - mark auth as seen so it doesn't show again
  const handleClose = () => {
    markAuthAsSeen();
    onOpenChange(false);
  };

  const getTitle = () => {
    switch (authMode) {
      case 'signup': return 'Create Account';
      case 'signin': return 'Welcome Back';
      case 'reset': return 'Reset Password';
    }
  };

  const getSubtitle = () => {
    switch (authMode) {
      case 'signup': return 'Start your journey with Vynthen AI';
      case 'signin': return 'Sign in to continue to Vynthen AI';
      case 'reset': return 'Enter your email to reset your password';
    }
  };

  return (
    <>
      <LegalModal open={showLegal} onOpenChange={setShowLegal} />
      
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        {/* Backdrop - clicking it marks auth as seen */}
        <div 
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={handleClose}
        />
        
        {/* Modal */}
        <div className="relative w-full max-w-md mx-4 bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#1f1f1f]">
            {authMode === 'reset' ? (
              <button 
                onClick={() => setAuthMode('signin')}
                className="p-1 text-[#9ca3af] hover:text-[#f2f2f2] transition-surface"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-6" />
            )}
            
            <div className="flex items-center justify-center">
              <div className="w-8 h-8">
                <img
                  src="/upload/Vynthen.jpg"
                  alt="Vynthen"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            
            <button 
              onClick={handleClose}
              className="p-1 text-[#9ca3af] hover:text-[#f2f2f2] transition-surface"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-medium text-[#f2f2f2] mb-1">{getTitle()}</h2>
              <p className="text-sm text-[#9ca3af]">{getSubtitle()}</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-xs text-[#9ca3af] mb-1.5">Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#525252]" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full bg-[#111111] border border-[#1f1f1f] rounded-xl px-10 py-2.5 text-[#f2f2f2] placeholder-[#525252] text-sm outline-none focus:border-[#262626] transition-surface"
                    />
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-xs text-[#9ca3af] mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#525252]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full bg-[#111111] border border-[#1f1f1f] rounded-xl px-10 py-2.5 text-[#f2f2f2] placeholder-[#525252] text-sm outline-none focus:border-[#262626] transition-surface"
                  />
                </div>
              </div>
              
              {authMode !== 'reset' && (
                <div>
                  <label className="block text-xs text-[#9ca3af] mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#525252]" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full bg-[#111111] border border-[#1f1f1f] rounded-xl px-10 py-2.5 text-[#f2f2f2] placeholder-[#525252] text-sm outline-none focus:border-[#262626] transition-surface"
                    />
                  </div>
                </div>
              )}
              
              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}
              
              {success && (
                <p className="text-sm text-green-400 text-center">{success}</p>
              )}
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#f2f2f2] text-[#000000] rounded-xl py-2.5 text-sm font-medium hover:bg-[#e5e5e5] transition-surface disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  authMode === 'signup' ? 'Create Account' : authMode === 'signin' ? 'Sign In' : 'Send Reset Link'
                )}
              </button>
            </form>
            
            {authMode === 'signin' && (
              <button
                onClick={() => setAuthMode('reset')}
                className="w-full text-center text-xs text-[#9ca3af] hover:text-[#f2f2f2] mt-3 transition-surface"
              >
                Forgot your password?
              </button>
            )}
            
            {authMode !== 'reset' && (
              <>
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-[#1f1f1f]" />
                  <span className="text-xs text-[#525252]">or</span>
                  <div className="flex-1 h-px bg-[#1f1f1f]" />
                </div>
                
                <button
                  onClick={handleGuest}
                  className="w-full border border-[#1f1f1f] rounded-xl py-2.5 text-sm text-[#9ca3af] hover:text-[#f2f2f2] hover:bg-[#111111] transition-surface"
                >
                  Continue as Guest
                </button>
                
                <p className="text-xs text-center text-[#525252] mt-3">
                  Guest sessions are not saved
                </p>
              </>
            )}
            
            {authMode !== 'reset' && (
              <p className="text-xs text-center text-[#525252] mt-4">
                {authMode === 'signin' ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <button 
                      onClick={() => setAuthMode('signup')}
                      className="text-[#9ca3af] hover:text-[#f2f2f2] transition-surface"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button 
                      onClick={() => setAuthMode('signin')}
                      className="text-[#9ca3af] hover:text-[#f2f2f2] transition-surface"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            )}
            
            {/* Legal Agreement */}
            {authMode !== 'reset' && (
              <div className="mt-4 pt-4 border-t border-[#1f1f1f]">
                <p className="text-[11px] text-center text-[#525252] leading-relaxed">
                  By {authMode === 'signup' ? 'creating an account' : 'signing in'}, you agree to our{' '}
                  <button 
                    onClick={() => setShowLegal(true)}
                    className="text-[#9ca3af] hover:text-[#f2f2f2] underline underline-offset-2 transition-surface inline-flex items-center gap-0.5"
                  >
                    Terms of Service
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                  ,{' '}
                  <button 
                    onClick={() => setShowLegal(true)}
                    className="text-[#9ca3af] hover:text-[#f2f2f2] underline underline-offset-2 transition-surface inline-flex items-center gap-0.5"
                  >
                    Privacy Policy
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                  , and{' '}
                  <button 
                    onClick={() => setShowLegal(true)}
                    className="text-[#9ca3af] hover:text-[#f2f2f2] underline underline-offset-2 transition-surface inline-flex items-center gap-0.5"
                  >
                    License Agreement
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                  .
                </p>
                
                <button 
                  onClick={() => setShowLegal(true)}
                  className="w-full mt-3 text-xs text-center text-[#525252] hover:text-[#9ca3af] transition-surface flex items-center justify-center gap-1"
                >
                  <span>Read all legal documents before continuing</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
