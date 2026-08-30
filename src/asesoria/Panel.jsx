import { useEffect, useState } from 'react';
import { sb } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { eur, fechaES, desde, AMBITOS, ESTADOS_DOC, TIPO_DOC } from '../lib/format';
import { Kpi, Vacio, Spinner, Tag } from '../components/ui';

export default function Panel({ onNavegar }) {
  const { org } = useAuth();
  const [cargando, setCargando] = useState(true);
  const [datos, setDatos] = useState({ cartera: [], recientes: [], porRevisar: 0, base: 0, igic: 0 });

  useEffect(() => {
    let vivo = true;
    (async () => {
      const [cartera, docs] = await Promise.all([
        sb.from('v_cartera_asesoria').select('*'),
        sb.from('documentos').select('*').order('created_at', { ascending: false }).limit(200),
      ]);
      if (!vivo) return;

      const d = docs.data || [];
      const ejercicio = new Date().getFullYear();
      const delAnio = d.filter((x) => x.ejercicio === ejercicio);

      setDatos({
        cartera: cartera.data || [],
        recientes: d.slice(0, 6),
        porRevisar: d.filter((x) => ['enviado', 'pendiente_revision'].includes(x.estado)).length,
        base: delAnio.reduce((s, x) => s + Number(x.base || 0), 0),
        igic: delAnio.filter((x) => x.tipo === 'gasto').reduce((s, x) => s + Number(x.igic || 0), 0),
      });
      setCargando(false);
    })();
    return () => { vivo = false; };
  }, []);

  if (cargando) return <div style={{ display: 'grid', placeItems: 'center', padding: '3rem' }}><Spinner /></div>;

  const conCuenta = datos.cartera.filter((c) => c.tiene_cuenta).length;

  return (
    <>
      <div className="grid k4" style={{ marginBottom: '1.1rem' }}>
        <Kpi etiqueta="Empresas" valor={datos.cartera.length}
             pie={`${conCuenta} con acceso propio`} />
        <Kpi etiqueta="Por revisar" valor={datos.porRevisar} tono="a"
             pie={datos.porRevisar ? 'Requieren tu atención' : 'Todo al día'} />
        <Kpi etiqueta={`Base ${new Date().getFullYear()}`} valor={eur(datos.base)} tono="g"
             pie="Suma del ejercicio" />
        <Kpi etiqueta="IGIC soportado" valor={eur(datos.igic)} tono="p" pie="Deducible" />
      </div>

      <div className="grid k2">
        <section className="card">
          <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Tu cartera</h2>
            <button className="btn sm" onClick={() => onNavegar('clientes')}>Ver todas</button>
          </div>
          {datos.cartera.length === 0 ? (
            <Vacio icono="🏢" titulo="Aún no hay empresas"
              texto="Añade la primera para empezar a organizar sus documentos."
              accion={<button className="btn primary" onClick={() => onNavegar('clientes')}>Añadir empresa</button>} />
          ) : (
            <div style={{ padding: '.4rem 0' }}>
              {datos.cartera.slice(0, 6).map((c) => (
                <button key={c.cliente_id} onClick={() => onNavegar('clientes')}
                  style={{ display: 'flex', alignItems: 'center', gap: '.7rem', width: '100%',
                           padding: '.55rem 1.1rem', textAlign: 'left' }}>
                  <span style={{ fontSize: '1.1rem' }} aria-hidden="true">{c.emoji || '🏢'}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: '.86rem', fontWeight: 500 }}>{c.nombre}</span>
                    <span className="tiny mono">{c.nif}</span>
                  </span>
                  {c.docs_pendientes > 0 && <Tag color="amber">{c.docs_pendientes} sin revisar</Tag>}
                  {c.tiene_cuenta && <Tag color="green">Con acceso</Tag>}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Últimos documentos</h2>
            <button className="btn sm" onClick={() => onNavegar('documentos')}>Ver todos</button>
          </div>
          {datos.recientes.length === 0 ? (
            <Vacio icono="📄" titulo="Todavía no hay documentos"
              texto="Llegarán aquí cuando tus empresas los envíen o los subas tú." />
          ) : (
            <div className="tbl-wrap">
              <table>
                <tbody>
                  {datos.recientes.map((d) => {
                    const e = ESTADOS_DOC[d.estado] || {};
                    const a = AMBITOS[d.ambito] || {};
                    return (
                      <tr key={d.id}>
                        <td style={{ width: 28 }} aria-hidden="true">{TIPO_DOC[d.tipo_doc]?.icon}</td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{d.emisor || d.empleado || d.num_referencia || '—'}</div>
                          <div className="tiny">{fechaES(d.fecha)} · {a.label}</div>
                        </td>
                        <td className="mono" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{eur(d.total)}</td>
                        <td><Tag color={e.color}>{e.label}</Tag></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {org?.codigo_invitacion && (
        <section className="card card-pad" style={{ marginTop: '1.1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <h2>Invita a tus empresas</h2>
              <p className="muted" style={{ marginTop: '.25rem' }}>
                Comparte este código y podrán enviarte sus facturas y nóminas directamente.
              </p>
            </div>
            <div className="mono" style={{ fontSize: '1.25rem', letterSpacing: '.12em', fontWeight: 500,
                 padding: '.6rem 1rem', background: 'var(--blue-lt)', color: 'var(--blue)', borderRadius: 'var(--r)' }}>
              {org.codigo_invitacion}
            </div>
            <button className="btn" onClick={() => {
              navigator.clipboard?.writeText(org.codigo_invitacion);
            }}>Copiar</button>
          </div>
        </section>
      )}
    </>
  );
}
