const fs = require('fs');

const path = 'src/pages/ServiciosPage.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add state for clienteFilter
content = content.replace(
  "const [estadoFilter, setEstadoFilter] = useState('');",
  "const [estadoFilter, setEstadoFilter] = useState('');\n  const [clienteFilter, setClienteFilter] = useState('');"
);

// 2. Add local filtering logic inside render or before return
const filterLogic = `
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
`;

if (!content.includes('const empresasUnicas = useMemo')) {
  content = content.replace(
    "return (",
    filterLogic + "\n  return ("
  );
}

// 3. Render the dropdown next to estadoFilter
const selectHtml = `
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
`;

content = content.replace(
  /<select[^>]*value=\{estadoFilter\}/g,
  selectHtml.trim() + "\n              <select\n                className=\"p-1.5 border border-slate-300 rounded-lg text-xs sm:text-sm bg-white cursor-pointer\"\n                value={estadoFilter}"
);

// 4. Update the map to use serviciosFiltrados instead of servicios
content = content.replace(/servicios\.length === 0 \?/g, "serviciosFiltrados.length === 0 ?");
content = content.replace(/servicios\.map\(\(srv\)/g, "serviciosFiltrados.map((srv)");
// One more place:
content = content.replace(/\{servicios\.map\(\(srv\)/g, "{serviciosFiltrados.map((srv)");

fs.writeFileSync(path, content, 'utf8');
console.log("Updated ServiciosPage.jsx");
