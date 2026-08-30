import { useEffect, useState, useCallback } from 'react';
import { sb } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { AMBITOS } from '../lib/format';
import { Spinner, useToast } from '../components/ui';
import TablaDocumentos from '../components/TablaDocumentos';

const FILTROS = [
  { id: 'revisar', label: 'Por revisar' },
  { id: 'todos',   label: 'Todos' },
  { id: 'factura', label: 'Facturas' },
  { id: 'nomina',  label: 'Nóminas' },
  { id: 'fiscal',  label: 'Fiscal' },
  { id: 'laboral', label: 'Laboral' },
];

export default function Documentos() {
  const { soloLectura } = useAuth();
  const avisar = useToast();
  const [cargando, setCargando] = useState(true);
  const [docs, setDocs] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [filtro, setFiltro] = useState('revisar');
  const [cliente, setCliente] = useState('');

  const cargar = useCallback(async () => {
    const [d, c] = await Promise.all([
      sb.from('documentos').select('*').order('fecha', { ascending: false, nullsFirst: false }),
      sb.from('v_cartera_asesoria').select('cliente_id, nombre, emoji').order('nombre'),
    ]);
    if (d.error) avisar('No se pudieron cargar los documentos', 'red');
    setDocs(d.data || []);
    setClientes(c.data || []);
    setCargando(false);
  }, [avisar]);

  useEffect(() => { cargar(); }, [cargar]);

  const visibles = docs.filter((d) => {
    if (cliente && d.cliente_id !== cliente) return false;
    if (filtro === 'revisar') return ['enviado', 'pendiente_revision'].includes(d.estado);
    if (filtro === 'factura' || filtro === 'nomina') return d.tipo_doc === filtro;
    if (['fiscal', 'laboral', 'contable'].includes(filtro)) return d.ambito === filtro;
    return true;
  });

  const cuenta = (id) => {
    if (id === 'revisar') return docs.filter((d) => ['enviado', 'pendiente_revision'].includes(d.estado)).length;
    if (id === 'todos') return docs.length;
    if (id === 'factura' || id === 'nomina') return docs.filter((d) => d.tipo_doc === id).length;
    return docs.filter((d) => d.ambito === id).length;
  };

  if (cargando) return <div style={{ display: 'grid', placeItems: 'center', padding: '3rem' }}><Spinner /></div>;

  return (
    <>
      <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
        {FILTROS.map((f) => (
          <button key={f.id} onClick={() => setFiltro(f.id)}
            className={`btn sm ${filtro === f.id ? 'primary' : ''}`}>
            {f.label} <span style={{ opacity: .65 }}>{cuenta(f.id)}</span>
          </button>
        ))}
        <select className="input" value={cliente} onChange={(e) => setCliente(e.target.value)}
          style={{ width: 'auto', marginLeft: 'auto', padding: '.35rem .6rem', fontSize: '.8rem' }}>
          <option value="">Todas las empresas</option>
          {clientes.map((c) => (
            <option key={c.cliente_id} value={c.cliente_id}>{c.emoji} {c.nombre}</option>
          ))}
        </select>
      </div>

      <div className="card">
        <TablaDocumentos
          docs={visibles}
          onCambio={cargar}
          soloLectura={soloLectura}
          modoRevision
        />
      </div>

      {!soloLectura && visibles.length > 0 && (
        <p className="tiny" style={{ marginTop: '.7rem' }}>
          Toca cualquier celda para corregirla. Enter guarda, Escape descarta.
        </p>
      )}
    </>
  );
}
