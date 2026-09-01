import React, { useState } from 'react';
import Navbar from './components/layout/Navbar';
import IngestaPage from './pages/IngestaPage';
import ServiciosPage from './pages/ServiciosPage';
import LiquidacionPage from './pages/LiquidacionPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('ingesta');

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
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
