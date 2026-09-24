import React, { useState, useEffect, useMemo } from 'react';
import { fetchApi, API_BASE } from '../api/axiosInstance';
import {
  Search, Filter, Plus, Edit2, CheckCircle, Clock, XCircle,
  AlertTriangle, Calendar, Archive, RotateCcw, ShieldAlert, RefreshCw,
  Printer, FileSpreadsheet, Users, Trash2, DollarSign
} from 'lucide-react';

// Helper de formateo seguro para fecha local YYYY-MM-DD
function getLocalDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Helper para visualización en tabla DD/MM/AAAA sin desfasaje UTC
function formatDateDisplay(dateVal) {
  if (!dateVal) return '-';
  const str = String(dateVal).substring(0, 10);
  const parts = str.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return str;
}

// Helper para inputs de formulario type="date" (estrictamente YYYY-MM-DD)
function formatInputDate(dateVal) {
  if (!dateVal) return '';
  const str = String(dateVal).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }
  const dmyMatch = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }
  const d = new Date(dateVal);
  if (!isNaN(d.getTime())) {
    return getLocalDateStr(d);
  }
  return '';
}

export default function ServiciosPage() {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [clienteFilter, setClienteFilter] = useState('');
  const [quickFilter, setQuickFilter] = useState('proximos3'); // 'proximos3' | 'hoy' | 'semana' | 'mes' | 'custom'
  const [customFechaDesde, setCustomFechaDesde] = useState(() => getLocalDateStr(new Date()));
  const [customFechaHasta, setCustomFechaHasta] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return getLocalDateStr(d);
  });
  const [viewArchived, setViewArchived] = useState(false); // Estado para alternar vistas
  const [syncingGmail, setSyncingGmail] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  const [editingService, setEditingService] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Cálculo reactivo de fechas y etiqueta de rango según el filtro activo
  const { fechaDesdeCalc, fechaHastaCalc, rangeLabel } = useMemo(() => {
    const today = new Date();
    const todayStr = getLocalDateStr(today);

    if (quickFilter === 'proximos3') {
      const end = new Date(today);
      end.setDate(end.getDate() + 3);
      const endStr = getLocalDateStr(end);
      return {
        fechaDesdeCalc: todayStr,
        fechaHastaCalc: endStr,
        rangeLabel: `Próximos 3 días (${formatDateDisplay(todayStr)} al ${formatDateDisplay(endStr)})`
      };
    }

    if (quickFilter === 'hoy') {
      return {
        fechaDesdeCalc: todayStr,
        fechaHastaCalc: todayStr,
        rangeLabel: `Hoy (${formatDateDisplay(todayStr)})`
      };
    }

    if (quickFilter === 'semana') {
      const end = new Date(today);
      end.setDate(end.getDate() + 7);
      const endStr = getLocalDateStr(end);
      return {
        fechaDesdeCalc: todayStr,
        fechaHastaCalc: endStr,
        rangeLabel: `Próximos 7 días (${formatDateDisplay(todayStr)} al ${formatDateDisplay(endStr)})`
      };
    }

    if (quickFilter === 'quincena1') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDay = new Date(today.getFullYear(), today.getMonth(), 15);
      const firstStr = getLocalDateStr(firstDay);
      const endStr = getLocalDateStr(endDay);
      const monthName = today.toLocaleString('es-AR', { month: 'long' });
      const capitalMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      return {
        fechaDesdeCalc: firstStr,
        fechaHastaCalc: endStr,
        rangeLabel: `1ra Quincena ${capitalMonth} (${formatDateDisplay(firstStr)} al ${formatDateDisplay(endStr)})`
      };
    }

    if (quickFilter === 'quincena2') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 16);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const firstStr = getLocalDateStr(firstDay);
      const lastStr = getLocalDateStr(lastDay);
      const monthName = today.toLocaleString('es-AR', { month: 'long' });
      const capitalMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      return {
        fechaDesdeCalc: firstStr,
        fechaHastaCalc: lastStr,
        rangeLabel: `2da Quincena ${capitalMonth} (${formatDateDisplay(firstStr)} al ${formatDateDisplay(lastStr)})`
      };
    }

    if (quickFilter === 'mes') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const firstStr = getLocalDateStr(firstDay);
      const lastStr = getLocalDateStr(lastDay);
      const monthName = today.toLocaleString('es-AR', { month: 'long' });
      const capitalMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      return {
        fechaDesdeCalc: firstStr,
        fechaHastaCalc: lastStr,
        rangeLabel: `Mes en curso - ${capitalMonth} ${today.getFullYear()} (${formatDateDisplay(firstStr)} al ${formatDateDisplay(lastStr)})`
      };
    }

    // 'custom'
    return {
      fechaDesdeCalc: customFechaDesde,
      fechaHastaCalc: customFechaHasta,
      rangeLabel: `Personalizado (${formatDateDisplay(customFechaDesde)} al ${formatDateDisplay(customFechaHasta)})`
    };
  }, [quickFilter, customFechaDesde, customFechaHasta]);

  const currentMonthName = useMemo(() => {
    const name = new Date().toLocaleString('es-AR', { month: 'long' });
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, []);

  const loadServicios = async () => {
    setLoading(true);
    try {
      const endpoint = viewArchived ? '/servicios/archivados' : '/servicios';
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (estadoFilter) params.append('estado', estadoFilter);

      if (!viewArchived) {
        if (fechaDesdeCalc) params.append('fecha_desde', fechaDesdeCalc);
        if (fechaHastaCalc) params.append('fecha_hasta', fechaHastaCalc);
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
  }, [search, estadoFilter, fechaDesdeCalc, fechaHastaCalc, viewArchived]);

  // Sincronización directa desde Gmail
  const handleSyncGmail = async () => {
    setSyncingGmail(true);
    setSyncMessage(null);
    try {
      const res = await fetchApi('/gmail/sync', {
        method: 'POST',
        body: JSON.stringify({ modo: 'operativo' })
      });

      if (res.success) {
        setSyncMessage({
          type: 'success',
          text: `Sincronización Gmail completada: ${res.vouchers_imported} nuevos, ${res.modifications_updated || 0} modificados, ${res.cancellations_updated || 0} cancelados.`
        });
        await loadServicios();
      } else {
        setSyncMessage({ type: 'error', text: res.message || 'No se pudo sincronizar con Gmail.' });
      }
    } catch (err) {
      setSyncMessage({ type: 'error', text: err.message || 'Error de conexión al sincronizar con Gmail.' });
    } finally {
      setSyncingGmail(false);
    }
  };

  // Exportaciones sincronizadas con los filtros activos
  const buildExportParams = () => {
    const params = new URLSearchParams();
    if (!viewArchived) {
      if (fechaDesdeCalc) params.append('fecha_desde', fechaDesdeCalc);
      if (fechaHastaCalc) params.append('fecha_hasta', fechaHastaCalc);
    }
    if (search) params.append('search', search);
    if (estadoFilter) params.append('estado', estadoFilter);
    params.append('range_label', rangeLabel);

    const token = localStorage.getItem('maavyt_token');
    if (token) params.append('token', token);

    return params.toString();
  };

  const handlePrintPDF = () => {
    const query = buildExportParams();
    window.open(`${API_BASE}/reportes/servicios/pdf?${query}`, '_blank');
  };

  const handleExportExcel = () => {
    const query = buildExportParams();
    window.open(`${API_BASE}/reportes/servicios/excel?${query}`, '_blank');
  };

  const handleExportLiquidacionExcel = () => {
    const query = buildExportParams();
    window.open(`${API_BASE}/reportes/liquidacion/excel?${query}`, '_blank');
  };

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
      const data = res.data;
      const rawDate = data?.fecha_servicio || srv.fecha_servicio;
      data.fecha_servicio = formatInputDate(rawDate);
      if (!Array.isArray(data.pasajeros) || data.pasajeros.length === 0) {
        data.pasajeros = [{ nombre_completo: '', documento_o_referencia: '' }];
      }
      setEditingService(data);
      setIsModalOpen(true);
    } catch (err) {
      alert('Error al cargar detalle del servicio');
    }
  };

  const openNewModal = () => {
    setEditingService({
      nro_reserva: '',
      fecha_servicio: getLocalDateStr(new Date()),
      hora_servicio: '12:00',
      categoria_vehiculo: 'Auto Std',
      origen: '',
      destino: '',
      origen_2: '',
      destino_2: '',
      vuelo_observacion: '',
      subtotal: 0,
      minutos_espera: 0,
      detalle_espera: '',
      monto_espera: 0,
      monto_adicionales: 0,
      total: 0,
      estado_servicio: 'Confirmado',
      pasajeros: [{ nombre_completo: '', documento_o_referencia: '' }]
    });
    setIsModalOpen(true);
  };

  const handlePassengerChange = (idx, field, value) => {
    const updated = [...(editingService.pasajeros || [])];
    updated[idx] = { ...updated[idx], [field]: value };
    setEditingService({ ...editingService, pasajeros: updated });
  };

  const handleAddPassenger = () => {
    setEditingService({
      ...editingService,
      pasajeros: [...(editingService.pasajeros || []), { nombre_completo: '', documento_o_referencia: '' }]
    });
  };

  const handleRemovePassenger = (idx) => {
    const updated = (editingService.pasajeros || []).filter((_, i) => i !== idx);
    setEditingService({
      ...editingService,
      pasajeros: updated.length > 0 ? updated : [{ nombre_completo: '', documento_o_referencia: '' }]
    });
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    try {
      const sub = Number(editingService.subtotal) || 0;
      const esp = Number(editingService.monto_espera) || 0;
      const adc = Number(editingService.monto_adicionales) || 0;
      const computedTotal = sub + esp + adc;

      const payload = {
        ...editingService,
        subtotal: sub,
        monto_espera: esp,
        monto_adicionales: adc,
        total: computedTotal,
        detalle_espera: editingService.detalle_espera || null,
        fecha_servicio: formatInputDate(editingService.fecha_servicio) || getLocalDateStr()
      };
      if (editingService.id) {
        await fetchApi(`/servicios/${editingService.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await fetchApi('/servicios', {
          method: 'POST',
          body: JSON.stringify(payload)
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

  
  // Extraer empresas unicas para el filtro
  const empresasUnicas = useMemo(() => {
    const unicas = new Set(servicios.map(s => s.cliente_nombre).filter(Boolean));
    return Array.from(unicas).sort();
  }, [servicios]);

  // Aplicar filtro local de empresa
  const serviciosFiltrados = useMemo(() => {
    if (!clienteFilter) return servicios;
    return servicios.filter(s => s.cliente_nombre === clienteFilter);
  }, [servicios, clienteFilter]);

  return (
    <div className="space-y-4">
      
      {/* Header Principal con Botón Gmail, Exportaciones y Acciones */}
      <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800">
            {viewArchived ? 'Papelera / Servicios Archivados' : 'Servicios Operativos Vigentes'}
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            {viewArchived 
              ? 'Lista de traslados eliminados lógicamente. Puedes restaurarlos o eliminarlos definitivamente.'
              : `Mostrando ${servicios.length} traslados (${rangeLabel}).`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Botón Principal: Sincronizar desde Gmail Ahora */}
          <button
            onClick={handleSyncGmail}
            disabled={syncingGmail}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
            title="Buscar y sincronizar nuevos vouchers, modificaciones y cancelaciones desde Gmail"
          >
            <RefreshCw className={`w-4 h-4 ${syncingGmail ? 'animate-spin' : ''}`} />
            {syncingGmail ? 'Sincronizando...' : 'Sincronizar Gmail'}
          </button>

          {/* Botón Excel Facturación / Liquidación con precios y formulas */}
          <button
            onClick={handleExportLiquidacionExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
            title="Descargar Planilla Oficial de Liquidación y Facturación con Precios, Subtotales, Esperas/Peajes y Totales para el filtro activo (ej: 1ra o 2da Quincena)"
          >
            <DollarSign className="w-4 h-4 text-emerald-200" />
            Excel Facturación ($)
          </button>

          {/* Botón Imprimir / PDF */}
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
            title="Abrir Hoja de Ruta en PDF A4 Horizontal lista para imprimir"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            PDF Hoja de Ruta
          </button>

          {/* Botón Excel Operativo */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
            title="Descargar Planilla de Servicios Operativos en Excel (sin precios)"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-500" />
            Excel Operativo
          </button>

          {/* Toggle Ver Archivados */}
          <button
            onClick={() => setViewArchived(!viewArchived)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
              viewArchived
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
          >
            <Archive className="w-4 h-4" />
            {viewArchived ? 'Ver Activos' : 'Archivados'}
          </button>

          {!viewArchived && (
            <button
              onClick={openNewModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Nuevo Traslado
            </button>
          )}
        </div>
      </div>

      {/* Banner de Resultado de Sincronización */}
      {syncMessage && (
        <div className={`p-3.5 rounded-xl flex items-center justify-between text-xs sm:text-sm font-medium ${
          syncMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {syncMessage.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{syncMessage.text}</span>
          </div>
          <button
            onClick={() => setSyncMessage(null)}
            className="text-slate-400 hover:text-slate-700 text-xs px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Barra de Búsqueda y Filtros Operativos */}
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
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                className="p-1.5 border border-slate-300 rounded-lg text-xs sm:text-sm bg-white cursor-pointer max-w-[150px]"
                value={clienteFilter}
                onChange={(e) => setClienteFilter(e.target.value)}
              >
                <option value="">Todas las Empresas</option>
                {empresasUnicas.map(emp => (
                  <option key={emp} value={emp}>{emp}</option>
                ))}
              </select>
            </div>
              <select
                className="p-1.5 border border-slate-300 rounded-lg text-xs sm:text-sm bg-white cursor-pointer"
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

        {/* Botones de Presets de Rango Operativo */}
        {!viewArchived && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> Rango Operativo:
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setQuickFilter('proximos3')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  quickFilter === 'proximos3'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                ⚡ Próximos 3 Días
              </button>

              <button
                type="button"
                onClick={() => setQuickFilter('hoy')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  quickFilter === 'hoy'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                📍 Hoy
              </button>

              <button
                type="button"
                onClick={() => setQuickFilter('semana')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  quickFilter === 'semana'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                📅 Próximos 7 Días
              </button>

              <button
                type="button"
                onClick={() => setQuickFilter('quincena1')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  quickFilter === 'quincena1'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                🌓 1ra Quincena (1-15)
              </button>

              <button
                type="button"
                onClick={() => setQuickFilter('quincena2')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  quickFilter === 'quincena2'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                🌕 2da Quincena (16-fin)
              </button>

              <button
                type="button"
                onClick={() => setQuickFilter('mes')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  quickFilter === 'mes'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                📊 Mes Actual ({currentMonthName})
              </button>

              <button
                type="button"
                onClick={() => setQuickFilter('custom')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  quickFilter === 'custom'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                🗓️ Personalizado
              </button>

              {quickFilter === 'custom' && (
                <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-slate-300">
                  <span className="text-[11px] text-slate-500 font-medium">Desde:</span>
                  <input
                    type="date"
                    className="p-1 border border-slate-300 rounded text-xs bg-white text-slate-700"
                    value={customFechaDesde}
                    onChange={(e) => setCustomFechaDesde(e.target.value)}
                  />
                  <span className="text-[11px] text-slate-500 font-medium">Hasta:</span>
                  <input
                    type="date"
                    className="p-1 border border-slate-300 rounded text-xs bg-white text-slate-700"
                    value={customFechaHasta}
                    onChange={(e) => setCustomFechaHasta(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabla de Servicios */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Cargando servicios...</div>
        ) : serviciosFiltrados.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            {viewArchived ? 'No hay servicios archivados en la papelera.' : 'No se encontraron servicios vigentes para el filtro seleccionado.'}
          </div>
        ) : (
          <div className="w-full">
            <table className="w-full table-fixed text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="w-[90px] px-2.5 py-2.5">Fecha / Hora</th>
                  <th className="w-[65px] px-2.5 py-2.5">Reserva</th>
                  <th className="w-[26%] px-2.5 py-2.5">Pasajeros</th>
                  <th className="w-[36%] px-2.5 py-2.5">Origen / Destino</th>
                  <th className="w-[10%] px-2.5 py-2.5">Vuelo / Obs</th>
                  <th className="w-[85px] px-2.5 py-2.5 text-right">Total ($)</th>
                  <th className="w-[110px] px-2 py-2.5 text-center">Estado</th>
                  <th className="w-[65px] px-2 py-2.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {servicios.map((s) => (
                  <tr key={s.id} className={`hover:bg-slate-50/80 transition-colors ${viewArchived ? 'bg-rose-50/20' : ''}`}>
                    <td className="px-2.5 py-2">
                      <div className="font-semibold text-slate-800">{formatDateDisplay(s.fecha_servicio)}</div>
                      <div className="text-[11px] text-slate-500">{s.hora_servicio?.substring(0, 5)} hs</div>
                    </td>
                    <td className="px-2.5 py-2 font-bold text-blue-900">
                      {s.nro_reserva}
                    </td>
                    <td className="px-2.5 py-2">
                      <span className="font-medium text-slate-800 block break-words whitespace-normal">
                        {s.pasajeros_concatenados || 'A definir'}
                      </span>
                    </td>
                    <td className="px-2.5 py-2 text-[11px]">
                      <div className="font-medium text-slate-800 break-words whitespace-normal">
                        <b>De:</b> {s.origen}
                      </div>
                      <div className="text-slate-500 break-words whitespace-normal">
                        <b>A:</b> {s.destino}
                      </div>
                      {(s.destino_2 || s.origen_2) && (
                        <div className="mt-1 pt-1 border-t border-slate-200 text-indigo-700 break-words whitespace-normal">
                          <b>2da Parada:</b> {s.origen_2 ? `${s.origen_2} ➔ ` : ''}{s.destino_2}
                        </div>
                      )}
                    </td>
                    <td className="px-2.5 py-2 text-[11px] text-slate-600">
                      <div className="truncate" title={s.vuelo_observacion || '-'}>
                        {s.vuelo_observacion || '-'}
                      </div>
                    </td>
                    <td className="px-2.5 py-2 text-right whitespace-nowrap">
                      <div className="font-bold text-slate-900">
                        ${Number(s.total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </div>
                      {(() => {
                        const extraMonto = (Number(s.monto_espera) || 0) + (Number(s.monto_adicionales) || 0);
                        if (extraMonto <= 0 && !s.detalle_espera) return null;
                        return (
                          <div
                            className="text-[10px] text-indigo-600 font-semibold truncate max-w-[140px] ml-auto"
                            title={`${s.detalle_espera || 'Adicional'}: $${extraMonto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
                          >
                            +{s.detalle_espera ? `${s.detalle_espera} ` : ''}
                            {extraMonto > 0 ? `($${extraMonto.toLocaleString('es-AR', { minimumFractionDigits: 0 })})` : ''}
                          </div>
                        );
                      })()}
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
                              className="p-1 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                              title="Editar Servicio"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleArchive(s.id)}
                              className="p-1 text-slate-500 hover:text-amber-600 transition-colors cursor-pointer"
                              title="Archivar (Borrado Lógico)"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleRestore(s.id)}
                              className="p-1 text-emerald-600 hover:text-emerald-800 transition-colors cursor-pointer"
                              title="Restaurar Servicio"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePurge(s.id)}
                              className="p-1 text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
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
              <div className="grid grid-cols-3 gap-3">
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
                    className="mt-1 w-full p-2 border border-slate-300 rounded text-sm cursor-pointer"
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
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Estado</label>
                  <select
                    className="mt-1 w-full p-2 border border-slate-300 rounded text-sm cursor-pointer font-semibold text-slate-700"
                    value={editingService.estado_servicio || 'Confirmado'}
                    onChange={(e) => setEditingService({ ...editingService, estado_servicio: e.target.value })}
                  >
                    <option value="Confirmado">Confirmado</option>
                    <option value="Realizado">Realizado</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="No Show">No Show</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Fecha Servicio</label>
                  <input
                    type="date"
                    required
                    className="mt-1 w-full p-2 border border-slate-300 rounded text-sm cursor-pointer"
                    value={formatInputDate(editingService.fecha_servicio)}
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

              {/* Origen y Destino Principal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Origen (Tramo 1)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Aeropuerto / Hotel"
                    className="mt-1 w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={editingService.origen || ''}
                    onChange={(e) => setEditingService({ ...editingService, origen: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Destino (Tramo 1 / 1er Domicilio)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Mendoza 454"
                    className="mt-1 w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={editingService.destino || ''}
                    onChange={(e) => setEditingService({ ...editingService, destino: e.target.value })}
                  />
                </div>
              </div>

              {/* 2da Parada / Tramo Adicional (Nuevo Origen y Nuevo Destino) */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    📍 2da Parada / Tramo Adicional (Opcional - Cuando viajan a 2 domicilios)
                  </span>
                  {(editingService.origen_2 || editingService.destino_2) && (
                    <button
                      type="button"
                      onClick={() => setEditingService({ ...editingService, origen_2: '', destino_2: '' })}
                      className="text-xs text-rose-500 hover:text-rose-700 cursor-pointer"
                    >
                      Limpiar 2do tramo
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500">Nuevo Origen (Tramo 2)</label>
                    <input
                      type="text"
                      placeholder="Ej: Mendoza 454"
                      className="mt-0.5 w-full p-2 border border-slate-300 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={editingService.origen_2 || ''}
                      onChange={(e) => setEditingService({ ...editingService, origen_2: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500">Nuevo Destino (2do Domicilio)</label>
                    <input
                      type="text"
                      placeholder="Ej: Guillermo Marconi 637, Bº Cabildo"
                      className="mt-0.5 w-full p-2 border border-slate-300 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={editingService.destino_2 || ''}
                      onChange={(e) => setEditingService({ ...editingService, destino_2: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Sección de Pasajeros */}
              <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-700" />
                    Pasajeros Asignados ({(editingService.pasajeros || []).length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddPassenger}
                    className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Pasajero
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(editingService.pasajeros && editingService.pasajeros.length > 0 ? editingService.pasajeros : [{ nombre_completo: '', documento_o_referencia: '' }]).map((pax, pIdx) => (
                    <div key={pIdx} className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-lg shadow-2xs">
                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          placeholder="Nombre y Apellido del Pasajero"
                          className="w-full p-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                          value={pax.nombre_completo || ''}
                          onChange={(e) => handlePassengerChange(pIdx, 'nombre_completo', e.target.value)}
                        />
                      </div>
                      <div className="w-40">
                        <input
                          type="text"
                          placeholder="DNI / Referencia"
                          className="w-full p-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                          value={pax.documento_o_referencia || ''}
                          onChange={(e) => handlePassengerChange(pIdx, 'documento_o_referencia', e.target.value)}
                        />
                      </div>
                      {(editingService.pasajeros || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePassenger(pIdx)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                          title="Eliminar pasajero"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
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

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>💰 Liquidación y Facturación (SUBTOTAL - ESTADO/ESPERA - IMPORTE - TOTAL)</span>
                  <span className="text-[11px] font-normal text-slate-500">Planilla de Facturación / Excel</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600">Subtotal ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="mt-1 w-full p-2 border border-slate-300 rounded text-sm bg-white font-semibold"
                      value={editingService.subtotal ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : (parseFloat(e.target.value) || 0);
                        setEditingService({ ...editingService, subtotal: val });
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600">Detalle Espera / Adicional</label>
                    <input
                      type="text"
                      placeholder="Ej: peaje, espera 30 min, etc."
                      className="mt-1 w-full p-2 border border-slate-300 rounded text-sm bg-white"
                      value={editingService.detalle_espera || ''}
                      onChange={(e) => setEditingService({ ...editingService, detalle_espera: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600">Importe Espera / Peaje ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="mt-1 w-full p-2 border border-slate-300 rounded text-sm bg-white font-semibold"
                      value={editingService.monto_espera ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : (parseFloat(e.target.value) || 0);
                        setEditingService({ ...editingService, monto_espera: val });
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600">Otros Adicionales ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="mt-1 w-full p-2 border border-slate-300 rounded text-sm bg-white font-semibold"
                      value={editingService.monto_adicionales ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : (parseFloat(e.target.value) || 0);
                        setEditingService({ ...editingService, monto_adicionales: val });
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-900">Total Calculado ($)</label>
                    <input
                      type="text"
                      className="mt-1 w-full p-2 border border-blue-400 bg-blue-50/50 rounded text-sm font-bold text-blue-900"
                      value={`$${((Number(editingService.subtotal) || 0) + (Number(editingService.monto_espera) || 0) + (Number(editingService.monto_adicionales) || 0)).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm cursor-pointer"
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
