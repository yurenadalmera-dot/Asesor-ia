import { useState, useRef, useEffect } from 'react';
import { sb } from '../lib/supabase';
import { eur, fechaES, fechaISO, ESTADOS_DOC, AMBITOS, TIPO_DOC } from '../lib/format';
import { Tag, useToast, Vacio } from './ui';

const COLS = [
  { k: 'num_referencia', l: 'Referencia', edit: true,  mono: true },
  { k: 'fecha',          l: 'Fecha',      edit: true,  fecha: true },
  { k: '_entidad',       l: 'Emisor / Empleado', edit: false },
  { k: 'concepto',       l: 'Concepto',   edit: true },
  { k: '_ambito',        l: 'Ámbito',     edit: false },
  { k: 'base',           l: 'Base',       edit: true,  num: true },
  { k: 'igic',           l: 'IGIC',       edit: true,  num: true },
  { k: 'retencion',      l: 'Retención',  edit: true,  num: true },
  { k: 'total',          l: 'Total',      edit: true,  num: true },
  { k: 'pgc_cuenta',     l: 'PGC',        edit: true,  mono: true },
  { k: '_estado',        l: 'Estado',     edit: false },
];

export default function TablaDocumentos({ docs, onCambio, soloLectura, modoRevision }) {
  const avisar = useToast();
  const [editando, setEditando] = useState(null); // {id, k}
  const [borrador, setBorrador] = useState('');
  const ref = useRef(null);

  useEffect(() => { if (editando && ref.current) ref.current.select(); }, [editando]);

  if (!docs.length) {
    return <Vacio icono="📄" titulo="No hay documentos aquí"
      texto="Cuando lleguen facturas o nóminas aparecerán en esta tabla." />;
  }

  const abrir = (d, col) => {
    if (soloLectura || !col.edit) return;
    setEditando({ id: d.id, k: col.k });
    setBorrador(col.fecha ? fechaES(d[col.k]) : (d[col.k] ?? ''));
  };

  const guardar = async () => {
    if (!editando) return;
    const col = COLS.find((c) => c.k === editando.k);
    const doc = docs.find((d) => d.id === editando.id);
    let valor = borrador;

    if (col.num) {
      valor = Number(String(borrador).replace(',', '.'));
      if (Number.isNaN(valor)) { setEditando(null); return avisar('Eso no es un número', 'amber'); }
    }
    if (col.fecha) valor = fechaISO(borrador);

    if (String(doc[editando.k] ?? '') === String(valor ?? '')) { setEditando(null); return; }

    const { error } = await sb.from('documentos').update({ [editando.k]: valor }).eq('id', editando.id);
    setEditando(null);
    if (error) return avisar('No se pudo guardar el cambio', 'red');
    avisar('Guardado', 'green');
    onCambio?.();
  };

  const marcar = async (d, estado) => {
    const { error } = await sb.from('documentos').update({ estado }).eq('id', d.id);
    if (error) return avisar('No se pudo actualizar', 'red');
    avisar(estado === 'contabilizado' ? 'Marcado como contabilizado'
         : estado === 'rechazado' ? 'Documento devuelto a la empresa'
         : 'Actualizado', 'green');
    onCambio?.();
  };

  const teclas = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); guardar(); }
    if (e.key === 'Escape') setEditando(null);
  };

  return (
    <div className="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th style={{ width: 30 }} />
            {COLS.map((c) => <th key={c.k} style={c.num ? { textAlign: 'right' } : undefined}>{c.l}</th>)}
            {modoRevision && !soloLectura && <th style={{ width: 150 }}>Revisión</th>}
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => {
            const est = ESTADOS_DOC[d.estado] || {};
            const amb = AMBITOS[d.ambito] || {};
            const entidad = d.tipo_doc === 'nomina'
              ? (d.empleado || '—')
              : (d.tipo === 'ingreso' ? d.destinatario : d.emisor) || '—';

            return (
              <tr key={d.id}>
                <td aria-hidden="true">{TIPO_DOC[d.tipo_doc]?.icon}</td>

                {COLS.map((c) => {
                  if (c.k === '_entidad') return (
                    <td key={c.k}>
                      <div style={{ fontWeight: 500 }}>{entidad}</div>
                      <div className="tiny mono">{d.nif_emisor || d.nif_empleado || ''}</div>
                    </td>
                  );
                  if (c.k === '_ambito') return (
                    <td key={c.k}><Tag color={amb.color}>{amb.icon} {amb.label}</Tag></td>
                  );
                  if (c.k === '_estado') return (
                    <td key={c.k}><Tag color={est.color}>{est.label}</Tag></td>
                  );

                  const activa = editando?.id === d.id && editando?.k === c.k;
                  const bruto = d[c.k];
                  const texto = c.fecha ? fechaES(bruto)
                    : c.num ? (Number(bruto) ? eur(bruto) : '—')
                    : (bruto || '—');

                  return (
                    <td key={c.k}
                        className={c.edit && !soloLectura ? 'edit' : ''}
                        onClick={() => abrir(d, c)}
                        style={{
                          textAlign: c.num ? 'right' : 'left',
                          fontFamily: c.mono || c.num ? 'var(--mono)' : undefined,
                          whiteSpace: c.num || c.fecha ? 'nowrap' : undefined,
                          color: c.k === 'igic' && Number(bruto) ? 'var(--green)'
                               : c.k === 'retencion' && Number(bruto) ? 'var(--amber)'
                               : c.k === 'pgc_cuenta' ? 'var(--blue)' : undefined,
                          fontWeight: c.k === 'total' ? 500 : undefined,
                        }}>
                      {activa
                        ? <input ref={ref} className="cell-input" value={borrador}
                            onChange={(e) => setBorrador(e.target.value)}
                            onBlur={guardar} onKeyDown={teclas} />
                        : texto}
                    </td>
                  );
                })}

                {modoRevision && !soloLectura && (
                  <td>
                    {['enviado', 'pendiente_revision'].includes(d.estado) ? (
                      <div style={{ display: 'flex', gap: '.3rem' }}>
                        <button className="btn sm primary" onClick={() => marcar(d, 'contabilizado')}>Aceptar</button>
                        <button className="btn sm danger" onClick={() => marcar(d, 'rechazado')}>Devolver</button>
                      </div>
                    ) : <span className="tiny">—</span>}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
