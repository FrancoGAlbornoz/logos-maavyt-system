import React, { useState, useEffect } from 'react';
import { fetchApi } from '../api/axiosInstance';
import { Search, Filter, Plus, Edit2, Trash2, CheckCircle, Clock, XCircle, AlertTriangle, Calendar, Archive, RotateCcw, ShieldAlert } from 'lucide-react';

export default function ServiciosPage() {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [fechaDesde, setFechaDesde] = useState('2026-09-01');
  const [fechaHasta, setFechaHasta] = useState('');
  const [quickFilter, setQuickFilter] = useState('septiembre');
  const [viewArchived, setViewArchived] = useState(false); // Estado para alternar vistas

  const [editingService, setEditingService] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadServicios = async () => {
    setLoading(true);
    try {
      const endpoint = viewArchived ? '/servicios/archivados' : '/servicios';
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (estadoFilter) params.append('estado', estadoFilter);

      if (!viewArchived) {
        if (quickFilter === 'septiembre') {
          params.append('fecha_desde', '2026-09-01');
        } else if (quickFilter === 'proximos3') {
          const limitDate = new Date();
          limitDate.setDate(limitDate.getDate() + 3);
          const limitStr = limitDate.toISOString().split('T')[0];
          params.append('fecha_desde', '2026-09-01');
          params.append('fecha_hasta', limitStr);
        } else if (quickFilter === 'custom') {
          if (fechaDesde) params.append('fecha_desde', fechaDesde);
          if (fechaHasta) params.append('fecha_hasta', fechaHasta);
        }
      }

      const res = await fetchApi(`${endpoint}?${params.toString()}`);
      setServicios(res.data || []);
    } catch (err) {
      console.error('Error al cargar servicios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServicios();
  }, [search, estadoFilter, quickFilter, fechaDesde, fechaHasta, viewArchived]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await fetchApi(`/servicios/${id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado_servicio: newStatus })
      });
      loadServicios();
    } catch (err) {
      alert('Error al actualizar el estado del servicio');
    }
  };

  // Borrado Lógico (Archivar)
  const handleArchive = async (id) => {
    if (!window.confirm('¿Desea archivar este servicio (borrado lógico)? Podrá restaurarlo cuando lo necesite.')) return;
    try {
      await fetchApi(`/servicios/${id}`, { method: 'DELETE' });
      loadServicios();
    } catch (err) {
      alert('Error al archivar el servicio');
    }
  };

  // Restaurar Servicio
  const handleRestore = async (id) => {
    try {
      await fetchApi(`/servicios/${id}/restaurar`, { method: 'PATCH' });
      loadServicios();
    } catch (err) {
      alert('Error al restaurar el servicio');
    }
  };

  // Purga Definitiva (Física)
  const handlePurge = async (id) => {
    if (!window.confirm('¡ATENCIÓN! ¿Está seguro de eliminar PERMANENTEMENTE este servicio? Esta acción no se puede deshacer.')) return;
    try {
      await fetchApi(`/servicios/${id}/purgar`, { method: 'DELETE' });
      loadServicios();
    } catch (err) {
      alert('Error al purgar el servicio');
    }
  };

  const openEditModal = async (srv) => {
    try {
      const res = await fetchApi(`/servicios/${srv.id}`);
      setEditingService(res.data);
      setIsModalOpen(true);
    } catch (err) {
      alert('Error al cargar detalle del servicio');
    }
  };

  const openNewModal = () => {
    setEditingService({
      nro_reserva: '',
      fecha_servicio: '2026-09-01',
      hora_servicio: '12:00',
      categoria_vehiculo: 'Auto Std',
      origen: '',
      destino: '',
      vuelo_observacion: '',
      subtotal: 0,
      minutos_espera: 0,
      monto_espera: 0,
      monto_adicionales: 0,
      total: 0,
      estado_servicio: 'Confirmado',
      pasajeros: [{ nombre_completo: '', documento_o_referencia: '' }]
    });
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    try {
      if (editingService.id) {
        await fetchApi(`/servicios/${editingService.id}`, {
          method: 'PUT',
          body: JSON.stringify(editingService)
        });
      } else {
        await fetchApi('/servicios', {
          method: 'POST',
          body: JSON.stringify(editingService)
        });
      }
      setIsModalOpen(false);
      loadServicios();
    } catch (err) {
      alert(err.message || 'Error al guardar el servicio');
    }
  };

  const getStatusBadge = (estado) => {
    switch (estado) {
      case 'Realizado':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle className="w-3.5 h-3.5" /> Realizado</span>;
      case 'Confirmado':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Clock className="w-3.5 h-3.5" /> Confirmado</span>;
      case 'Pendiente':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><AlertTriangle className="w-3.5 h-3.5" /> Pendiente</span>;
      case 'No Show':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">No Show</span>;
      case 'Cancelado':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800"><XCircle className="w-3.5 h-3.5" /> Cancelado</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">{estado}</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800">
            {viewArchived ? 'Papelera / Servicios Archivados' : 'Servicios Operativos Vigentes'}
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm">
            {viewArchived 
              ? 'Lista de traslados eliminados lógicamente. Puedes restaurarlos o eliminarlos definitivamente.'
              : `Mostrando servicios vigentes (${servicios.length} traslados).`}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Toggle Ver Archivados */}
          <button
            onClick={() => setViewArchived(!viewArchived)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold border transition-all ${
              viewArchived
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
          >
            <Archive className="w-4 h-4" />
            {viewArchived ? 'Ver Activos' : 'Ver Archivados (Papelera)'}
          </button>

          {!viewArchived && (
            <button
              onClick={openNewModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nuevo Traslado Manual
            </button>
          )}
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por nro. reserva, pasajero, origen o destino..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              className="p-1.5 border border-slate-300 rounded-lg text-xs sm:text-sm bg-white"
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
            >
              <option value="">Todos los Estados</option>
              <option value="Confirmado">Confirmado</option>
              <option value="Realizado">Realizado</option>
              <option value="Pendiente">Pendiente</option>
              <option value="No Show">No Show</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
        </div>

        {/* Botones de Presets de Fecha */}
        {!viewArchived && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> Rango Operativo:
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setQuickFilter('septiembre')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  quickFilter === 'septiembre'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                🗓️ Desde 01/09/2026 en adelante
              </button>

              <button
                onClick={() => setQuickFilter('proximos3')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  quickFilter === 'proximos3'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                ⚡ Próximos 3 Días
              </button>

              <button
                onClick={() => setQuickFilter('todos')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  quickFilter === 'todos'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                🌐 Todos (Sin Filtro de Fecha)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabla de Servicios */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Cargando servicios...</div>
        ) : servicios.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            {viewArchived ? 'No hay servicios archivados en la papelera.' : 'No se encontraron servicios vigentes.'}
          </div>
        ) : (
          <div className="w-full">
            <table className="w-full table-fixed text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="w-[100px] px-2.5 py-2.5">Fecha / Hora</th>
                  <th className="w-[75px] px-2.5 py-2.5">Reserva</th>
                  <th className="w-[16%] px-2.5 py-2.5">Pasajeros</th>
                  <th className="w-[28%] px-2.5 py-2.5">Origen / Destino</th>
                  <th className="w-[18%] px-2.5 py-2.5">Vuelo / Obs</th>
                  <th className="w-[85px] px-2.5 py-2.5 text-right">Total ($)</th>
                  <th className="w-[115px] px-2 py-2.5 text-center">Estado</th>
                  <th className="w-[75px] px-2 py-2.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {servicios.map((s) => (
                  <tr key={s.id} className={`hover:bg-slate-50/80 transition-colors ${viewArchived ? 'bg-rose-50/20' : ''}`}>
                    <td className="px-2.5 py-2">
                      <div className="font-semibold text-slate-800">{new Date(s.fecha_servicio).toLocaleDateString('es-AR')}</div>
                      <div className="text-[11px] text-slate-500">{s.hora_servicio?.substring(0, 5)} hs</div>
                    </td>
                    <td className="px-2.5 py-2 font-bold text-blue-900">
                      {s.nro_reserva}
                    </td>
                    <td className="px-2.5 py-2">
                      <span className="font-medium text-slate-800 block truncate" title={s.pasajeros_concatenados || 'A definir'}>
                        {s.pasajeros_concatenados || 'A definir'}
                      </span>
                    </td>
                    <td className="px-2.5 py-2 text-[11px]">
                      <div className="font-medium text-slate-800 truncate" title={`De: ${s.origen}`}>
                        <b>De:</b> {s.origen}
                      </div>
                      <div className="text-slate-500 truncate" title={`A: ${s.destino}`}>
                        <b>A:</b> {s.destino}
                      </div>
                    </td>
                    <td className="px-2.5 py-2 text-[11px] text-slate-600">
                      <div className="truncate" title={s.vuelo_observacion || '-'}>
                        {s.vuelo_observacion || '-'}
                      </div>
                    </td>
                    <td className="px-2.5 py-2 text-right font-bold text-slate-900 whitespace-nowrap">
                      ${Number(s.total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {!viewArchived ? (
                        <select
                          className={`text-xs font-semibold px-2 py-1 rounded-full border cursor-pointer outline-none transition-all w-full text-center ${
                            s.estado_servicio === 'Realizado' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                            s.estado_servicio === 'Confirmado' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                            s.estado_servicio === 'Pendiente' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                            s.estado_servicio === 'No Show' ? 'bg-purple-50 text-purple-800 border-purple-300' :
                            'bg-rose-50 text-rose-800 border-rose-300'
                          }`}
                          value={s.estado_servicio}
                          onChange={(e) => handleStatusChange(s.id, e.target.value)}
                        >
                          <option value="Confirmado">Confirmado</option>
                          <option value="Realizado">Realizado</option>
                          <option value="Pendiente">Pendiente</option>
                          <option value="No Show">No Show</option>
                          <option value="Cancelado">Cancelado</option>
                        </select>
                      ) : (
                        getStatusBadge(s.estado_servicio)
                      )}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        {!viewArchived ? (
                          <>
                            <button
                              onClick={() => openEditModal(s)}
                              className="p-1 text-slate-500 hover:text-blue-600 transition-colors"
                              title="Editar Servicio"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleArchive(s.id)}
                              className="p-1 text-slate-500 hover:text-amber-600 transition-colors"
                              title="Archivar (Borrado Lógico)"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleRestore(s.id)}
                              className="p-1 text-emerald-600 hover:text-emerald-800 transition-colors"
                              title="Restaurar Servicio"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePurge(s.id)}
                              className="p-1 text-rose-500 hover:text-rose-700 transition-colors"
                              title="Eliminar Definitivamente (Purga)"
                            >
                              <ShieldAlert className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Edición / Alta Manual */}
      {isModalOpen && editingService && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-800">
              {editingService.id ? `Editar Servicio #${editingService.nro_reserva}` : 'Nuevo Traslado Manual'}
            </h3>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">N° Reserva</label>
                  <input
                    type="text"
                    required
                    className="mt-1 w-full p-2 border border-slate-300 rounded text-sm"
                    value={editingService.nro_reserva}
                    onChange={(e) => setEditingService({ ...editingService, nro_reserva: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Categoría</label>
                  <select
                    className="mt-1 w-full p-2 border border-slate-300 rounded text-sm"
                    value={editingService.categoria_vehiculo}
                    onChange={(e) => setEditingService({ ...editingService, categoria_vehiculo: e.target.value })}
                  >
                    <option value="Auto Std">Auto Std</option>
                    <option value="Auto">Auto</option>
                    <option value="Ejecutivo">Ejecutivo</option>
                    <option value="Van">Van</option>
                    <option value="Minibus">Minibus</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Fecha Servicio</label>
                  <input
                    type="date"
                    required
                    className="mt-1 w-full p-2 border border-slate-300 rounded text-sm"
                    value={editingService.fecha_servicio ? editingService.fecha_servicio.substring(0, 10) : ''}
                    onChange={(e) => setEditingService({ ...editingService, fecha_servicio: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Hora</label>
                  <input
                    type="text"
                    className="mt-1 w-full p-2 border border-slate-300 rounded text-sm"
                    value={editingService.hora_servicio}
                    onChange={(e) => setEditingService({ ...editingService, hora_servicio: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Origen</label>
                <input
                  type="text"
                  required
                  className="mt-1 w-full p-2 border border-slate-300 rounded text-sm"
                  value={editingService.origen}
                  onChange={(e) => setEditingService({ ...editingService, origen: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Destino</label>
                <input
                  type="text"
                  required
                  className="mt-1 w-full p-2 border border-slate-300 rounded text-sm"
                  value={editingService.destino}
                  onChange={(e) => setEditingService({ ...editingService, destino: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Vuelo / Observación</label>
                <input
                  type="text"
                  className="mt-1 w-full p-2 border border-slate-300 rounded text-sm"
                  value={editingService.vuelo_observacion || ''}
                  onChange={(e) => setEditingService({ ...editingService, vuelo_observacion: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Subtotal ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 w-full p-2 border border-slate-300 rounded text-sm"
                    value={editingService.subtotal}
                    onChange={(e) => setEditingService({ ...editingService, subtotal: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Espera ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 w-full p-2 border border-slate-300 rounded text-sm"
                    value={editingService.monto_espera}
                    onChange={(e) => setEditingService({ ...editingService, monto_espera: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Adicionales ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 w-full p-2 border border-slate-300 rounded text-sm"
                    value={editingService.monto_adicionales}
                    onChange={(e) => setEditingService({ ...editingService, monto_adicionales: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-900">Total ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 w-full p-2 border border-blue-400 bg-blue-50/50 rounded text-sm font-bold text-blue-900"
                    value={(Number(editingService.subtotal) || 0) + (Number(editingService.monto_espera) || 0) + (Number(editingService.monto_adicionales) || 0)}
                    readOnly
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm"
                >
                  Guardar Servicio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
