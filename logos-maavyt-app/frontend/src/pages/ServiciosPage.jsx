import React, { useState, useEffect } from 'react';
import { fetchApi } from '../api/axiosInstance';
import { Search, Filter, Plus, Edit2, Trash2, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';

export default function ServiciosPage() {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [editingService, setEditingService] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadServicios = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (estadoFilter) params.append('estado', estadoFilter);

      const res = await fetchApi(`/servicios?${params.toString()}`);
      setServicios(res.data || []);
    } catch (err) {
      console.error('Error al cargar servicios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServicios();
  }, [search, estadoFilter]);

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

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este servicio?')) return;
    try {
      await fetchApi(`/servicios/${id}`, { method: 'DELETE' });
      loadServicios();
    } catch (err) {
      alert('Error al eliminar el servicio');
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
      fecha_servicio: new Date().toISOString().split('T')[0],
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
      
      {/* Header y Filtros */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Servicios Operativos</h2>
          <p className="text-slate-500 text-sm">Administra los traslados programados y edita su estado en tiempo real.</p>
        </div>

        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all shadow-sm self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> Nuevo Traslado Manual
        </button>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por nro. reserva, pasajero, origen o destino..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            className="p-2 border border-slate-300 rounded-lg text-sm bg-white"
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

      {/* Tabla de Servicios */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Cargando servicios operativos...</div>
        ) : servicios.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No se encontraron servicios registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="p-3">Fecha / Hora</th>
                  <th className="p-3">Reserva</th>
                  <th className="p-3">Pasajeros</th>
                  <th className="p-3">Origen / Destino</th>
                  <th className="p-3">Vuelo / Obs</th>
                  <th className="p-3 text-right">Total ($)</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {servicios.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{new Date(s.fecha_servicio).toLocaleDateString('es-AR')}</div>
                      <div className="text-xs text-slate-500">{s.hora_servicio?.substring(0, 5)} hs</div>
                    </td>
                    <td className="p-3 font-bold text-blue-900 whitespace-nowrap">
                      {s.nro_reserva}
                    </td>
                    <td className="p-3 max-w-xs truncate">
                      <span className="font-medium text-slate-800">{s.pasajeros_concatenados || 'A definir'}</span>
                    </td>
                    <td className="p-3 max-w-xs text-xs">
                      <div className="font-medium text-slate-800 truncate"><b>De:</b> {s.origen}</div>
                      <div className="text-slate-500 truncate"><b>A:</b> {s.destino}</div>
                    </td>
                    <td className="p-3 text-xs text-slate-600 max-w-xs truncate">
                      {s.vuelo_observacion || '-'}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      ${Number(s.total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {getStatusBadge(s.estado_servicio)}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-2">
                        <select
                          className="text-xs p-1 border border-slate-300 rounded bg-white"
                          value={s.estado_servicio}
                          onChange={(e) => handleStatusChange(s.id, e.target.value)}
                        >
                          <option value="Confirmado">Confirmado</option>
                          <option value="Realizado">Realizado</option>
                          <option value="Pendiente">Pendiente</option>
                          <option value="No Show">No Show</option>
                          <option value="Cancelado">Cancelado</option>
                        </select>
                        <button
                          onClick={() => openEditModal(s)}
                          className="p-1 text-slate-500 hover:text-blue-600"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="p-1 text-slate-500 hover:text-rose-600"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
