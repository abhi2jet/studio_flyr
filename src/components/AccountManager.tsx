import React, { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { motion } from 'motion/react';
import { LogIn, LogOut } from 'lucide-react';

export default function AccountManager() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error("Login failed", e);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  if (!user) {
    return (
      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleLogin}
        className="flex items-center gap-2 px-3 py-1.5 bg-white text-black hover:bg-neutral-200 rounded-full text-xs font-medium transition-colors"
      >
        <LogIn className="w-3 h-3" />
        Log In
      </motion.button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-right hidden sm:block">
        <p className="text-[10px] text-white font-medium">{user.displayName}</p>
        <p className="text-[9px] text-white/50">{user.email}</p>
      </div>
      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleLogout}
        className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-full text-white transition-colors"
        title="Log Out"
      >
        <LogOut className="w-3 h-3" />
      </motion.button>
    </div>
  );
}
