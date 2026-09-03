import React, { useState, useEffect } from 'react';
import Navbar from './components/layout/Navbar';
import IngestaPage from './pages/IngestaPage';
import ServiciosPage from './pages/ServiciosPage';
import LiquidacionPage from './pages/LiquidacionPage';
import LoginPage from './pages/LoginPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('servicios');
  const [token, setToken] = useState(() => localStorage.getItem('maavyt_token'));
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('maavyt_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener('maavyt_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('maavyt_unauthorized', handleUnauthorized);
  }, []);

  const handleLoginSuccess = (userData) => {
    setToken(localStorage.getItem('maavyt_token'));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('maavyt_token');
    localStorage.removeItem('maavyt_user');
    setToken(null);
    setUser(null);
  };

  // Si no está autenticado, renderizar la pantalla de Login
  if (!token) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        onLogout={handleLogout} 
      />
      
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-6 py-4">
        {activeTab === 'ingesta' && (
          <IngestaPage onImportSuccess={() => setActiveTab('servicios')} />
        )}
        {activeTab === 'servicios' && <ServiciosPage />}
        {activeTab === 'liquidacion' && <LiquidacionPage />}
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        Logos-MAAVYT Manager &copy; {new Date().getFullYear()} - Sistema de Gestión de Traslados y Liquidaciones
      </footer>
    </div>
  );
}
