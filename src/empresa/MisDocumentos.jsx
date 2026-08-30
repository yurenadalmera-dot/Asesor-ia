import { useEffect, useState, useCallback } from 'react';
import { sb } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Spinner, useToast } from '../components/ui';
import TablaDocumentos from '../components/TablaDocumentos';

const FILTROS = [
  { id: 'todos',     label: 'Todos' },
  { id: 'borrador',  label: 'Sin enviar' },
  { id: 'curso',     label: 'En la asesoría' },
  { id: 'rechazado', label: 'Devueltos' },
  { id: 'cerrado',   label: 'Contabilizados' },
];

export default function MisDocumentos({ onNavegar }) {
  const { soloLectura } = useAuth();
  const avisar = useToast();
  const [cargando, setCargando] = useState(true);
  const [docs, setDocs] = useState([]);
  const [filtro, setFiltro] = useState('todos');

  const cargar = useCallback(async () => {
    const { data, error } = await sb.from('documentos').select('*')
      .order('fecha', { ascending: false, nullsFirst: false });
    if (error) avisar('No se pudieron cargar tus documentos', 'red');
    setDocs(data || []);
    setCargando(false);
  }, [avisar]);

  useEffect(() => { cargar(); }, [cargar]);

  const filtrar = (d, id) => {
    if (id === 'todos') return true;
    if (id === 'curso') return ['enviado', 'pendiente_revision'].includes(d.estado);
    if (id === 'cerrado') return ['verificado', 'contabilizado'].includes(d.estado);
    return d.estado === id;
  };

  const visibles = docs.filter((d) => filtrar(d, filtro));
  const borradores = docs.filter((d) => d.estado === 'borrador');

  const enviarTodos = async () => {
    const ids = borradores.map((d) => d.id);
    if (!ids.length) return;
    const { error } = await sb.from('documentos').update({ estado: 'enviado' }).in('id', ids);
    if (error) return avisar('No se pudieron enviar', 'red');
    avisar(`${ids.length} ${ids.length === 1 ? 'documento enviado' : 'documentos enviados'}`, 'green');
    cargar();
  };

  if (cargando) return <div style={{ display: 'grid', placeItems: 'center', padding: '3rem' }}><Spinner /></div>;

  return (
    <>
      <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
        {FILTROS.map((f) => (
          <button key={f.id} onClick={() => setFiltro(f.id)}
            className={`btn sm ${filtro === f.id ? 'primary' : ''}`}>
            {f.label} <span style={{ opacity: .65 }}>{docs.filter((d) => filtrar(d, f.id)).length}</span>
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '.4rem' }}>
          {borradores.length > 0 && !soloLectura && (
            <button className="btn sm" onClick={enviarTodos}>
              Enviar {borradores.length} borrador{borradores.length === 1 ? '' : 'es'}
            </button>
          )}
          <button className="btn sm primary" onClick={() => onNavegar('subir')}>+ Nuevo</button>
        </div>
      </div>

      <div className="card">
        <TablaDocumentos docs={visibles} onCambio={cargar} soloLectura={soloLectura} />
      </div>

      {!soloLectura && visibles.length > 0 && (
        <p className="tiny" style={{ marginTop: '.7rem' }}>
          Puedes corregir cualquier celda mientras la asesoría no lo haya contabilizado.
        </p>
      )}
    </>
  );
}
