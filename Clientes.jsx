import { useEffect, useState, useCallback } from 'react';
import { sb } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { AMBITOS } from '../lib/format';
import { Modal, Vacio, Spinner, Tag, useToast } from '../components/ui';
import FichaCliente, { FORMAS, REGIMENES, SIN_IRPF } from './FichaCliente';

const EMOJIS = ['🏢', '🍽️', '🦷', '💇', '🏥', '🚚', '🏪', '⚖️', '🔧', '🏨', '💊', '🐾'];



export default function Clientes() {
  const { soloLectura } = useAuth();
  const avisar = useToast();
  const [cargando, setCargando] = useState(true);
  const [lista, setLista] = useState([]);
  const [nuevo, setNuevo] = useState(false);
  const [ficha, setFicha] = useState(null);

  const cargar = useCallback(async () => {
    const { data, error } = await sb.from('v_cartera_asesoria').select('*').order('nombre');
    if (error) avisar('No se pudieron cargar las empresas', 'red');
    setLista(data || []);
    setCargando(false);
  }, [avisar]);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) return <div style={{ display: 'grid', placeItems: 'center', padding: '3rem' }}><Spinner /></div>;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span className="muted">{lista.length} {lista.length === 1 ? 'empresa' : 'empresas'}</span>
        {!soloLectura && <button className="btn primary" onClick={() => setNuevo(true)}>+ Añadir empresa</button>}
      </div>

      {lista.length === 0 ? (
        <div className="card">
          <Vacio icono="🏢" titulo="Tu cartera está vacía"
            texto="Añade tu primera empresa para empezar a organizar sus documentos."
            accion={!soloLectura && <button className="btn primary" onClick={() => setNuevo(true)}>Añadir empresa</button>} />
        </div>
      ) : (
        <div className="grid k3">
          {lista.map((c) => (
            <article key={c.cliente_id} className="card card-pad"
              onClick={() => setFicha(c.cliente_id)}
              onKeyDown={(e) => e.key === 'Enter' && setFicha(c.cliente_id)}
              role="button" tabIndex={0} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.7rem' }}>
                <span style={{ fontSize: '1.6rem' }} aria-hidden="true">{c.emoji || '🏢'}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nombre}</h3>
                  <div className="tiny mono">{c.nif}</div>
                  {c.forma_juridica && (
                    <div className="tiny" style={{ marginTop: '.15rem' }}>{FORMAS[c.forma_juridica]}</div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem', margin: '.8rem 0 .6rem' }}>
                {c.tiene_cuenta
                  ? <Tag color="green">Con acceso propio</Tag>
                  : <Tag>Solo gestionada por ti</Tag>}
                {(c.mis_ambitos || []).map((a) => (
                  <Tag key={a} color={AMBITOS[a]?.color}>{AMBITOS[a]?.icon} {AMBITOS[a]?.label}</Tag>
                ))}
                {['cb','scp'].includes(c.forma_juridica) && c.num_socios === 0 && (
                  <Tag color="amber">Faltan socios</Tag>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1.1rem', paddingTop: '.6rem', borderTop: '1px solid var(--border)' }}>
                <div>
                  <div className="tiny">Documentos</div>
                  <div style={{ fontWeight: 600 }}>{c.docs_total}</div>
                </div>
                <div>
                  <div className="tiny">Sin revisar</div>
                  <div style={{ fontWeight: 600, color: c.docs_pendientes ? 'var(--amber)' : 'inherit' }}>
                    {c.docs_pendientes}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {nuevo && <NuevaEmpresa onCerrar={() => setNuevo(false)} onHecho={() => { setNuevo(false); cargar(); }} />}

      {ficha && <FichaCliente clienteId={ficha} onCerrar={() => setFicha(null)} onCambio={cargar} />}
    </>
  );
}

/* ══ ALTA DE EMPRESA GESTIONADA ══════════════════════════════════════ */
function NuevaEmpresa({ onCerrar, onHecho }) {
  const { org } = useAuth();
  const avisar = useToast();
  const [f, setF] = useState({ nombre: '', nif: '', municipio: '', provincia: '', emoji: '🏢',
    forma_juridica: 'autonomo', regimen_irpf: 'estimacion_directa' });
  const [espera, setEspera] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const guardar = async (e) => {
    e.preventDefault();
    if (!f.nombre || !f.nif) return avisar('El nombre y el NIF son obligatorios', 'amber');
    setEspera(true);
    const { error } = await sb.from('clientes').insert({
      organizacion_id: org.id,
      nombre: f.nombre.trim(),
      nif: f.nif.trim().toUpperCase(),
      municipio: f.municipio.trim() || null,
      provincia: f.provincia.trim() || null,
      emoji: f.emoji,
      forma_juridica: f.forma_juridica,
      regimen_irpf: SIN_IRPF.includes(f.forma_juridica) ? 'no_aplica' : f.regimen_irpf,
      activo: true,
    });
    setEspera(false);
    if (error) return avisar(/duplicate|unique/i.test(error.message)
      ? 'Ya existe una empresa con ese NIF' : error.message, 'red');
    avisar('Empresa añadida', 'green');
    onHecho();
  };

  return (
    <Modal titulo="Añadir empresa" onCerrar={onCerrar}>
      <form onSubmit={guardar}>
        <div className="field">
          <label>Razón social</label>
          <input className="input" value={f.nombre} onChange={set('nombre')} placeholder="Nombre de la empresa" autoFocus />
        </div>
        <div className="field">
          <label>NIF</label>
          <input className="input mono" value={f.nif} onChange={set('nif')} placeholder="B12345678"
            style={{ textTransform: 'uppercase' }} />
        </div>
        <div className="row">
          <div className="field">
            <label>Municipio</label>
            <input className="input" value={f.municipio} onChange={set('municipio')} placeholder="Opcional" />
          </div>
          <div className="field">
            <label>Provincia</label>
            <input className="input" value={f.provincia} onChange={set('provincia')} placeholder="Opcional" />
          </div>
        </div>
        <div className="field">
          <label>Forma jurídica</label>
          <select className="input" value={f.forma_juridica}
            onChange={(e) => setF({ ...f, forma_juridica: e.target.value })}>
            {Object.entries(FORMAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div className="tiny" style={{ marginTop: '.3rem' }}>
            Determina qué modelo de pago fraccionado corresponde. Las sociedades tributan por
            Sociedades; las comunidades de bienes reparten el rendimiento entre sus socios.
          </div>
        </div>

        {!SIN_IRPF.includes(f.forma_juridica) && (
          <div className="field">
            <label>Régimen de IRPF</label>
            <select className="input" value={f.regimen_irpf}
              onChange={(e) => setF({ ...f, regimen_irpf: e.target.value })}>
              {Object.entries(REGIMENES).filter(([k]) => k !== 'no_aplica')
                .map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        )}

        <div className="field">
          <label>Icono</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
            {EMOJIS.map((em) => (
              <button key={em} type="button" onClick={() => setF({ ...f, emoji: em })}
                style={{ fontSize: '1.2rem', padding: '.35rem .5rem', borderRadius: 'var(--r-sm)',
                  border: `1px solid ${f.emoji === em ? 'var(--blue)' : 'var(--border)'}`,
                  background: f.emoji === em ? 'var(--blue-lt)' : 'var(--white)' }}>
                {em}
              </button>
            ))}
          </div>
        </div>
        <p className="tiny" style={{ marginBottom: '1rem' }}>
          Si esta empresa se registra después con el mismo NIF, se conectará a esta ficha en lugar de crear otra.
        </p>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button type="button" className="btn" onClick={onCerrar} style={{ flex: 1 }}>Cancelar</button>
          <button className="btn primary" disabled={espera} style={{ flex: 1 }}>
            {espera ? 'Guardando…' : 'Añadir empresa'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
