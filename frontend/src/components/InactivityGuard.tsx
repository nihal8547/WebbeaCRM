import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes
const COUNTDOWN_S = 60; // 1 minute to respond

export default function InactivityGuard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_S);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = () => {
    if (showModal) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowModal(true), INACTIVITY_MS);
  };

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [showModal]);

  useEffect(() => {
    if (!showModal) {
      setCountdown(COUNTDOWN_S);
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }

    setCountdown(COUNTDOWN_S);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          handleLogout();
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [showModal]);

  const handleStillHere = () => {
    setShowModal(false);
    resetTimer();
  };

  const handleLogout = () => {
    setShowModal(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
    logout();
    navigate('/login');
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⏰</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Are You Still Online?</h2>
        <p className="text-gray-500 text-sm mb-6">
          You've been inactive for 30 minutes. You'll be logged out in{' '}
          <span className="font-bold text-orange-600">{countdown}s</span> unless you confirm.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleStillHere}
            className="btn-primary flex-1 py-2.5"
          >
            Yes, I'm Here
          </button>
          <button
            onClick={handleLogout}
            className="btn-secondary flex-1 py-2.5"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
