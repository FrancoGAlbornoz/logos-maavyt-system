import React, { useState } from 'react';
import { Truck, FileText, CalendarCheck, FileSpreadsheet, LogOut, KeyRound } from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';

export default function Navbar({ activeTab, setActiveTab, user, onLogout }) {
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const tabs = [
    { id: 'servicios', label: 'Servicios Operativos', icon: CalendarCheck },
    { id: 'ingesta', label: 'Ingesta de Vouchers', icon: FileText },
    { id: 'liquidacion', label: 'Liquidación & Reportes', icon: FileSpreadsheet }
  ];

  return (
    <>
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo / Brand */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('servicios')}>
              <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md shadow-blue-500/20">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-white leading-tight">MAAVYT Manager</h1>
                <p className="text-[11px] text-slate-400 font-medium">Logos Travel - Traslados Ejecutivos</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex space-x-1 sm:space-x-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* User Profile & Actions */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {user && (
                <div className="hidden md:flex items-center space-x-2 bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-slate-200 leading-none">{user.nombre || user.email}</p>
                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">{user.rol || 'OPERADOR'}</span>
                  </div>
                </div>
              )}

              {/* Botón Cambiar Contraseña */}
              <button
                onClick={() => setIsChangePasswordOpen(true)}
                title="Cambiar contraseña de acceso"
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-sm hover:border-slate-600"
              >
                <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Clave</span>
              </button>

              {/* Botón Cerrar Sesión */}
              <button
                onClick={onLogout}
                title="Cerrar sesión"
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Modal de Cambio de Contraseña */}
      <ChangePasswordModal 
        isOpen={isChangePasswordOpen} 
        onClose={() => setIsChangePasswordOpen(false)} 
      />
    </>
  );
}