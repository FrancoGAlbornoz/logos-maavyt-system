import React, { useState } from 'react';
import { fetchApi } from '../api/axiosInstance';
import { Sparkles, CheckCircle2, AlertCircle, ArrowRight, UserPlus, Trash2 } from 'lucide-react';

export default function IngestaPage({ onImportSuccess }) {
  const [rawText, setRawText] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState(null);

  const handlePreview = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetchApi('/parser/preview', {
        method: 'POST',
        body: JSON.stringify({ rawText })
      });
      setParsedItems(res.data || []);
      if (res.data.length === 0) {
        setMessage({ type: 'error', text: 'No se detectaron reservas válidas en el texto proporcionado.' });
      } else {
        setMessage({ type: 'success', text: `¡Se detectaron ${res.data.length} traslado(s) correctamente!` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Error al procesar el texto.' });
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...parsedItems];
    updated[index][field] = value;
    setParsedItems(updated);
  };

  const handlePassengerChange = (itemIdx, paxIdx, field, value) => {
    const updated = [...parsedItems];
    updated[itemIdx].pasajeros[paxIdx][field] = value;
    setParsedItems(updated);
  };

  const addPassenger = (itemIdx) => {
    const updated = [...parsedItems];
    updated[itemIdx].pasajeros.push({ nombre_completo: '', documento_o_referencia: '' });
    setParsedItems(updated);
  };

  const removePassenger = (itemIdx, paxIdx) => {
    const updated = [...parsedItems];
    if (updated[itemIdx].pasajeros.length > 1) {
      updated[itemIdx].pasajeros.splice(paxIdx, 1);
      setParsedItems(updated);
    }
  };

  const handleImport = async () => {
    if (parsedItems.length === 0) return;
    setImporting(true);
    setMessage(null);
    try {
      const res = await fetchApi('/parser/import', {
        method: 'POST',
        body: JSON.stringify({ servicios: parsedItems })
      });
      setMessage({ type: 'success', text: res.message || '¡Servicios importados con éxito a la base de datos!' });
      setParsedItems([]);
      setRawText('');
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Error al importar los servicios.' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          Ingesta Inteligente de Vouchers y Mails
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Pega el texto crudo del correo o voucher recibido de Logos Travel para extraer automáticamente los datos del servicio.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 text-sm font-medium ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Input de Texto */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <label className="block text-sm font-semibold text-slate-700">
          Texto Crudo del Voucher / Email
        </label>
        <textarea
          rows={6}
          className="w-full p-3 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-slate-50"
          placeholder="Ejemplo: RESERVA 230309 FECHA 18/08/2026 HORA 14:50 PAX TORRES DIEGO / CALCATERRA PABLO ORIGEN AEROPUERTO TUC DESTINO HILTON TUCUMAN VUELO AR 1476..."
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
        />

        <div className="flex justify-end">
          <button
            onClick={handlePreview}
            disabled={loading || !rawText.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-all shadow-sm"
          >
            {loading ? 'Analizando texto...' : 'Previsualizar Reserva(s)'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Vista Previa de Tarjetas Extraídas */}
      {parsedItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">
              Vista Previa y Edición ({parsedItems.length} detectados)
            </h3>
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {importing ? 'Importando...' : 'Confirmar e Importar a Base de Datos'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {parsedItems.map((item, idx) => (
              <div key={idx} className="bg-white p-5 rounded-xl border border-blue-200 shadow-sm space-y-4">
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600">N° Reserva</label>
                    <input
                      type="text"
                      className="mt-1 w-full p-2 border border-slate-300 rounded text-sm font-semibold"
                      value={item.nro_reserva}
                      onChange={(e) => handleItemChange(idx, 'nro_reserva', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600">Fecha Servicio</label>
                    <input
                      type="date"
                      className="mt-1 w-full p-2 border border-slate-300 rounded text-sm"
                      value={item.fecha_servicio}
                      onChange={(e) => handleItemChange(idx, 'fecha_servicio', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600">Hora</label>
                    <input
                      type="text"
                      className="mt-1 w-full p-2 border border-slate-300 rounded text-sm"
                      value={item.hora_servicio}
                      onChange={(e) => handleItemChange(idx, 'hora_servicio', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600">Categoría</label>
                    <select
                      className="mt-1 w-full p-2 border border-slate-300 rounded text-sm bg-white"
                      value={item.categoria_vehiculo}
                      onChange={(e) => handleItemChange(idx, 'categoria_vehiculo', e.target.value)}
                    >
                      <option value="Auto Std">Auto Std</option>
                      <option value="Auto">Auto</option>
                      <option value="Ejecutivo">Ejecutivo</option>
                      <option value="Van">Van</option>
                      <option value="Minibus">Minibus</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600">Origen</label>
                    <input
                      type="text"
                      className="mt-1 w-full p-2 border border-slate-300 rounded text-sm"
                      value={item.origen}
                      onChange={(e) => handleItemChange(idx, 'origen', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600">Destino</label>
                    <input
                      type="text"
                      className="mt-1 w-full p-2 border border-slate-300 rounded text-sm"
                      value={item.destino}
                      onChange={(e) => handleItemChange(idx, 'destino', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600">Vuelo / Observación</label>
                    <input
                      type="text"
                      className="mt-1 w-full p-2 border border-slate-300 rounded text-sm"
                      value={item.vuelo_observacion || ''}
                      onChange={(e) => handleItemChange(idx, 'vuelo_observacion', e.target.value)}
                    />
                  </div>
                </div>

                {/* Pasajeros */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase">Pasajeros</span>
                    <button
                      onClick={() => addPassenger(idx)}
                      className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:underline"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Agregar Pasajero
                    </button>
                  </div>

                  {item.pasajeros.map((pax, pIdx) => (
                    <div key={pIdx} className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Nombre completo"
                        className="flex-1 p-1.5 border border-slate-300 rounded text-xs bg-white"
                        value={pax.nombre_completo}
                        onChange={(e) => handlePassengerChange(idx, pIdx, 'nombre_completo', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="DNI / Referencia"
                        className="w-40 p-1.5 border border-slate-300 rounded text-xs bg-white"
                        value={pax.documento_o_referencia || ''}
                        onChange={(e) => handlePassengerChange(idx, pIdx, 'documento_o_referencia', e.target.value)}
                      />
                      {item.pasajeros.length > 1 && (
                        <button
                          onClick={() => removePassenger(idx, pIdx)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Importes */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600">Subtotal ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 w-full p-2 border border-slate-300 rounded text-sm font-semibold"
                      value={item.subtotal}
                      onChange={(e) => handleItemChange(idx, 'subtotal', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600">Espera ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 w-full p-2 border border-slate-300 rounded text-sm"
                      value={item.monto_espera}
                      onChange={(e) => handleItemChange(idx, 'monto_espera', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600">Adicionales ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 w-full p-2 border border-slate-300 rounded text-sm"
                      value={item.monto_adicionales}
                      onChange={(e) => handleItemChange(idx, 'monto_adicionales', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-900">Total ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 w-full p-2 border border-blue-400 bg-blue-50/50 rounded text-sm font-bold text-blue-900"
                      value={item.subtotal + item.monto_espera + item.monto_adicionales}
                      readOnly
                    />
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
