import { useEffect, useState, useCallback } from 'react';
import { sb } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { eur, fechaES, AMBITOS, ESTADOS_DOC, TIPO_DOC } from '../lib/format';
import { Kpi, Spinner, Tag, Vacio, useToast } from '../components/ui';

export default function Inicio({ onNavegar }) {
  const { org } = useAuth();
  const avisar = useToast();
  const [cargando, setCargando] = useState(true);
  const [docs, setDocs] = useState([]);
  const [asesorias, setAsesorias] = useState([]);

  const cargar = useCallback(async () => {
    const [d, a] = await Promise.all([
      sb.from('documentos').select('*').order('created_at', { ascending: false }),
      sb.from('v_mis_asesorias').select('*').eq('estado', 'activa'),
    ]);
    if (d.error) avisar('No se pudieron cargar tus documentos', 'red');
    setDocs(d.data || []);
    setAsesorias(a.data || []);
    setCargando(false);
  }, [avisar]);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) return <div style={{ display: 'grid', placeItems: 'center', padding: '3rem' }}><Spinner /></div>;

  const borradores    = docs.filter((d) => d.estado === 'borrador');
  const enCurso       = docs.filter((d) => ['enviado', 'pendiente_revision'].includes(d.estado));
  const contabilizados = docs.filter((d) => ['contabilizado', 'verificado'].includes(d.estado));
  const devueltos     = docs.filter((d) => d.estado === 'rechazado');

  return (
    <>
      {asesorias.length === 0 && (
        <div className="card card-pad" style={{ marginBottom: '1.1rem', borderLeft: '3px solid var(--amber)' }}>
          <h2>Todavía no tienes asesoría conectada</h2>
          <p className="muted" style={{ margin: '.3rem 0 .8rem' }}>
            Puedes guardar tus documentos aquí, pero nadie los recibirá hasta que conectes una asesoría.
          </p>
          <button className="btn primary" onClick={() => onNavegar('asesorias')}>Conectar una asesoría</button>
        </div>
      )}

      <div className="grid k4" style={{ marginBottom: '1.1rem' }}>
        <Kpi etiqueta="Sin enviar" valor={borradores.length}
             pie={borradores.length ? 'Esperando que los envíes' : 'Nada pendiente'} />
        <Kpi etiqueta="En tu asesoría" valor={enCurso.length} tono="a" pie="Pendientes de revisar" />
        <Kpi etiqueta="Contabilizados" valor={contabilizados.length} tono="g" pie="Ya procesados" />
        <Kpi etiqueta="Devueltos" valor={devueltos.length}
             tono={devueltos.length ? 'a' : ''} pie={devueltos.length ? 'Necesitan corrección' : 'Ninguno'} />
      </div>

      {devueltos.length > 0 && (
        <section className="card" style={{ marginBottom: '1.1rem', borderLeft: '3px solid var(--red)' }}>
          <div className="card-head">
            <h2>Documentos devueltos</h2>
            <p className="muted" style={{ marginTop: '.2rem' }}>
              Tu asesoría necesita que revises estos antes de volver a enviarlos.
            </p>
          </div>
          {devueltos.map((d) => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '.7rem',
                 padding: '.7rem 1.1rem', borderBottom: '1px solid var(--border)' }}>
              <span aria-hidden="true">{TIPO_DOC[d.tipo_doc]?.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500 }}>{d.emisor || d.empleado || d.num_referencia}</div>
                <div className="tiny">{fechaES(d.fecha)}</div>
              </div>
              <span className="mono">{eur(d.total)}</span>
              <button className="btn sm" onClick={() => onNavegar('documentos')}>Revisar</button>
            </div>
          ))}
        </section>
      )}

      <section className="card">
        <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Tus últimos documentos</h2>
          <button className="btn sm" onClick={() => onNavegar('documentos')}>Ver todos</button>
        </div>
        {docs.length === 0 ? (
          <Vacio icono="📤" titulo="Empieza subiendo una factura"
            texto="Sube una foto o un PDF y la leemos por ti."
            accion={<button className="btn primary" onClick={() => onNavegar('subir')}>Subir documento</button>} />
        ) : (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr><th style={{ width: 30 }} /><th>Documento</th><th>Ámbito</th>
                    <th style={{ textAlign: 'right' }}>Total</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {docs.slice(0, 8).map((d) => {
                  const e = ESTADOS_DOC[d.estado] || {};
                  const a = AMBITOS[d.ambito] || {};
                  return (
                    <tr key={d.id}>
                      <td aria-hidden="true">{TIPO_DOC[d.tipo_doc]?.icon}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{d.emisor || d.empleado || d.num_referencia || '—'}</div>
                        <div className="tiny">{fechaES(d.fecha)}</div>
                      </td>
                      <td><Tag color={a.color}>{a.icon} {a.label}</Tag></td>
                      <td className="mono" style={{ textAlign: 'right' }}>{eur(d.total)}</td>
                      <td><Tag color={e.color}>{e.label}</Tag></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
