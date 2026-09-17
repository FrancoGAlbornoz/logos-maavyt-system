import React, { useState, useEffect } from 'react';
import { fetchApi, API_BASE } from '../api/axiosInstance';
import { FileSpreadsheet, FileText, Calendar, DollarSign, Activity, CheckSquare, Clock } from 'lucide-react';

export default function LiquidacionPage() {
  const [periodos, setPeriodos] = useState([]);
  const [selectedPeriodoId, setSelectedPeriodoId] = useState('');
  const [loading, setLoading] = useState(true);

  const loadPeriodos = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/periodos');
      const data = res.data || [];
      setPeriodos(data);
      if (data.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        // Seleccionar periodo activo actual, o periodo con servicios, o el primero
        const activePeriod = data.find(p => todayStr >= p.fecha_inicio && todayStr <= p.fecha_fin)
          || data.find(p => p.total_servicios > 0)
          || data[0];
        setSelectedPeriodoId(activePeriod.periodo_id);
      }
    } catch (err) {
      console.error('Error al cargar períodos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeriodos();
  }, []);

  const selectedPeriodo = periodos.find(p => String(p.periodo_id) === String(selectedPeriodoId));

  const handleDownloadPDF = () => {
    const token = localStorage.getItem('maavyt_token') || '';
    const url = `${API_BASE}/reportes/hoja-de-ruta/pdf?periodo_id=${selectedPeriodoId}&token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
  };

  const handleDownloadExcel = () => {
    const token = localStorage.getItem('maavyt_token') || '';
    const url = `${API_BASE}/reportes/liquidacion/excel?periodo_id=${selectedPeriodoId}&token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      
      {/* Selector de Período Quincenal */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Liquidaciones & Reportes Quincenales</h2>
          <p className="text-slate-500 text-sm mt-0.5">Selecciona la quincena para consultar el cierre financiero y descargar la facturación oficial.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {periodos.slice(0, 4).map((p) => (
            <button
              key={p.periodo_id}
              onClick={() => setSelectedPeriodoId(p.periodo_id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                String(selectedPeriodoId) === String(p.periodo_id)
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {p.quincena === 1 ? '🌓' : '🌕'} {p.periodo_nombre} ({p.total_servicios})
            </button>
          ))}

          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              className="p-1.5 border border-slate-300 rounded-lg text-xs bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedPeriodoId}
              onChange={(e) => setSelectedPeriodoId(e.target.value)}
            >
              {periodos.map((p) => (
                <option key={p.periodo_id} value={p.periodo_id}>
                  {p.periodo_nombre} ({p.total_servicios} servicios)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tarjetas de Métricas del Período */}
      {selectedPeriodo && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase">Total Servicios</div>
              <div className="text-2xl font-bold text-slate-800">{selectedPeriodo.total_servicios}</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase">Subtotal Base</div>
              <div className="text-2xl font-bold text-slate-800">
                ${Number(selectedPeriodo.total_subtotal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-amber-50 p-3 rounded-lg text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase">Total Esperas</div>
              <div className="text-2xl font-bold text-slate-800">
                ${Number(selectedPeriodo.total_esperas || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-emerald-50 p-3 rounded-lg text-emerald-600">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase">Total Quincena</div>
              <div className="text-2xl font-bold text-emerald-700">
                ${Number(selectedPeriodo.total_general || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botones de Descarga de Documentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Descarga PDF */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-rose-100 p-3 rounded-lg text-rose-700">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Hoja de Ruta Operativa (PDF)</h3>
              <p className="text-xs text-slate-500">Documento A4 Horizontal listo para imprimir o enviar por WhatsApp al conductor.</p>
            </div>
          </div>

          <button
            onClick={handleDownloadPDF}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
          >
            <FileText className="w-4 h-4" />
            Descargar PDF Hoja de Ruta (A4 Horizontal)
          </button>
        </div>

        {/* Descarga Excel */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-3 rounded-lg text-emerald-700">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Liquidación Quincenal (.xlsx)</h3>
              <p className="text-xs text-slate-500">Planilla Excel detallada con subtotales, esperas, adicionales y fórmulas automáticas.</p>
            </div>
          </div>

          <button
            onClick={handleDownloadExcel}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Descargar Planilla Excel (.xlsx)
          </button>
        </div>

      </div>

    </div>
  );
}
