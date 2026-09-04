import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Error capturado en el árbol de componentes:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-rose-100 p-8 text-center">
            <div className="mx-auto w-14 h-14 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center text-rose-600 mb-4 shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              Ocurrió un error inesperado
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Se ha capturado una excepción en este módulo para proteger la integridad de tus datos. Puedes intentar restablecer la vista o recargar la plataforma.
            </p>

            {this.state.error && (
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-left">
                <p className="text-xs font-mono text-rose-600 break-all">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reintentar Vista</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Recargar Aplicación</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
