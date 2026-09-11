import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboard() {
  const navigate = useNavigate();

  useEffect(() => {
    function handleKey(e) {
      if (e.target.closest('input,textarea,select')) return;
      if (e.key === '/') { e.preventDefault(); document.querySelector('input[type="search"]')?.focus(); }
      if (e.key === 'Escape') { /* Close any open panel — handled individually */ }
      if (e.altKey) {
        if (e.key === 'd') { e.preventDefault(); navigate('/dashboard'); }
        if (e.key === 'a') { e.preventDefault(); navigate('/audits'); }
        if (e.key === 'f') { e.preventDefault(); navigate('/findings'); }
        if (e.key === 'r') { e.preventDefault(); navigate('/risks'); }
        if (e.key === 'o') { e.preventDefault(); navigate('/organizations'); }
        if (e.key === 'c') { e.preventDefault(); navigate('/certificates'); }
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [navigate]);
}
