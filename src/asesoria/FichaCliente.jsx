import { useEffect, useState, useCallback } from 'react';
import { sb } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { AMBITOS, num } from '../lib/format';
import { Modal, Spinner, Tag, Vacio, useToast } from '../components/ui';

export const FORMAS = {
  autonomo:      'Autónomo · persona física',
  cb:            'Comunidad de bienes',
  scp:           'Sociedad civil sin objeto mercantil',
  scp_mercantil: 'Sociedad civil con objeto mercantil',
  sl:            'Sociedad limitada',
  sa:            'Sociedad anónima',
  otra:          'Otra',
};

export const REGIMENES = {
  estimacion_directa:       'Estimación directa',
  estimacion_directa_simpl: 'Estimación directa simplificada',
  estimacion_objetiva:      'Estimación objetiva · módulos',
  no_aplica:                'No aplica · tributa por Sociedades',
};

export const SIN_IRPF     = ['sl', 'sa', 'scp_mercantil'];
export const ATRIBUCION   = ['cb', 'scp'];

export default function FichaCliente({ clienteId, onCerrar, onCambio }) {
  const { soloLectura } = useAuth();
  const avisar = useToast();
  const [cargando, setCargando] = useState(true);
  const [c, setC] = useState(null);
  const [socios, setSocios] = useState([]);
  const [nuevoSocio, setNuevoSocio] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const [cli, soc] = await Promise.all([
      sb.from('clientes').select('*').eq('id', clienteId).single(),
      sb.from('socios').select('*').eq('cliente_id', clienteId).eq('activo', true).order('porcentaje', { ascending: false }),
    ]);
    if (cli.error) { avisar('No se pudo cargar la ficha', 'red'); return; }
    setC(cli.data);
    setSocios(soc.data || []);
    setCargando(false);
  }, [clienteId, avisar]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async () => {
    setGuardando(true);
    const campos = {
      nombre: c.nombre, municipio: c.municipio, provincia: c.provincia,
      forma_juridica: c.forma_juridica,
      regimen_irpf: SIN_IRPF.includes(c.forma_juridica) ? 'no_aplica' : c.regimen_irpf,
      irpf_pct: c.irpf_pct, epigrafe_iae: c.epigrafe_iae,
      presenta_115: c.presenta_115, presenta_111: c.presenta_111,
    };
    const { error } = await sb.from('clientes').update(campos).eq('id', clienteId);
    setGuardando(false);
    if (error) return avisar('No se pudieron guardar los cambios', 'red');
    avisar('Ficha actualizada', 'green');
    onCambio?.();
  };

  const borrarSocio = async (id) => {
    if (!confirm('¿Quitar este socio?')) return;
    const { error } = await sb.from('socios').update({ activo: false }).eq('id', id);
    if (error) return avisar('No se pudo quitar', 'red');
    avisar('Socio quitado', 'amber');
    cargar();
  };

  if (cargando || !c) {
    return <Modal titulo="Ficha" onCerrar={onCerrar} ancho={640}>
      <div style={{ display: 'grid', placeItems: 'center', padding: '2rem' }}><Spinner /></div>
    </Modal>;
  }

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setC({ ...c, [k]: v });
  };

  const esAtribucion = ATRIBUCION.includes(c.forma_juridica);
  const sumaPart = socios.reduce((s, x) => s + Number(x.porcentaje), 0);

  return (
    <Modal titulo={`${c.emoji || '🏢'} ${c.nombre}`} onCerrar={onCerrar} ancho={640}>
      <div className="field">
        <label>Razón social</label>
        <input className="input" value={c.nombre || ''} onChange={set('nombre')} disabled={soloLectura} />
      </div>
      <div className="row">
        <div className="field">
          <label>NIF</label>
          <input className="input mono" value={c.nif || ''} disabled />
        </div>
        <div className="field">
          <label>Epígrafe IAE</label>
          <input className="input mono" value={c.epigrafe_iae || ''} onChange={set('epigrafe_iae')}
            disabled={soloLectura} placeholder="671.4" />
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label>Municipio</label>
          <input className="input" value={c.municipio || ''} onChange={set('municipio')} disabled={soloLectura} />
        </div>
        <div className="field">
          <label>Provincia</label>
          <input className="input" value={c.provincia || ''} onChange={set('provincia')} disabled={soloLectura} />
        </div>
      </div>

      <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '.3rem 0 1rem' }} />

      <div className="field">
        <label>Forma jurídica</label>
        <select className="input" value={c.forma_juridica} onChange={set('forma_juridica')} disabled={soloLectura}>
          {Object.entries(FORMAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {SIN_IRPF.includes(c.forma_juridica) ? (
        <p className="tiny" style={{ marginBottom: '1rem', padding: '.6rem .8rem',
             background: 'var(--amber-lt)', color: 'var(--amber)', borderRadius: 'var(--r-sm)' }}>
          Esta forma jurídica tributa por el Impuesto sobre Sociedades. No presenta el modelo 130,
          sino pagos fraccionados con el modelo 202.
        </p>
      ) : (
        <div className="row">
          <div className="field">
            <label>Régimen de IRPF</label>
            <select className="input" value={c.regimen_irpf} onChange={set('regimen_irpf')} disabled={soloLectura}>
              {Object.entries(REGIMENES).filter(([k]) => k !== 'no_aplica')
                .map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="field">
            <label>% de pago fraccionado</label>
            <input className="input mono" type="number" step="0.01" value={c.irpf_pct ?? 20}
              onChange={set('irpf_pct')} disabled={soloLectura} />
          </div>
        </div>
      )}

      <div className="row" style={{ marginBottom: '.9rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem' }}>
          <input type="checkbox" checked={c.presenta_115 || false} onChange={set('presenta_115')} disabled={soloLectura} />
          Presenta modelo 115
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem' }}>
          <input type="checkbox" checked={c.presenta_111 || false} onChange={set('presenta_111')} disabled={soloLectura} />
          Presenta modelo 111
        </label>
      </div>

      {/* ══ SOCIOS ══════════════════════════════════════════════════ */}
      {esAtribucion && (
        <section style={{ margin: '1.2rem 0', padding: '.9rem', background: 'var(--off)',
             borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
            <h3>Socios</h3>
            {!soloLectura && sumaPart < 100 && (
              <button className="btn sm" onClick={() => setNuevoSocio(true)}>+ Añadir socio</button>
            )}
          </div>
          <p className="tiny" style={{ marginBottom: '.7rem' }}>
            Esta entidad tributa en atribución de rentas: el rendimiento se reparte entre los socios
            y cada uno presenta su propio modelo 130.
          </p>

          {socios.length === 0 ? (
            <p className="muted" style={{ fontSize: '.82rem' }}>
              Sin socios registrados. Sin ellos no se puede repartir el rendimiento en los informes.
            </p>
          ) : (
            <>
              {socios.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem',
                     padding: '.5rem 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '.85rem', fontWeight: 500 }}>{s.nombre}</div>
                    <div className="tiny mono">{s.nif}</div>
                  </div>
                  <Tag color="blue">{num(s.porcentaje)}%</Tag>
                  <span className="tiny">IRPF {num(s.irpf_pct)}%</span>
                  {!soloLectura && (
                    <button className="btn sm danger" onClick={() => borrarSocio(s.id)} aria-label="Quitar socio">✕</button>
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.6rem', fontSize: '.82rem' }}>
                <span className="muted">Total repartido</span>
                <strong style={{ color: Math.abs(sumaPart - 100) < 0.01 ? 'var(--green)' : 'var(--amber)' }}>
                  {num(sumaPart)}%
                </strong>
              </div>
              {Math.abs(sumaPart - 100) >= 0.01 && (
                <p className="tiny" style={{ marginTop: '.35rem', color: 'var(--amber)' }}>
                  Falta repartir {num(100 - sumaPart)}%. Mientras no sume 100, el reparto de los
                  informes estará incompleto.
                </p>
              )}
            </>
          )}
        </section>
      )}

      {!soloLectura && (
        <div style={{ display: 'flex', gap: '.5rem', marginTop: '1rem' }}>
          <button className="btn" onClick={onCerrar} style={{ flex: 1 }}>Cerrar</button>
          <button className="btn primary" onClick={guardar} disabled={guardando} style={{ flex: 1 }}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      )}

      {nuevoSocio && (
        <NuevoSocio clienteId={clienteId} disponible={100 - sumaPart}
          onCerrar={() => setNuevoSocio(false)}
          onHecho={() => { setNuevoSocio(false); cargar(); }} />
      )}
    </Modal>
  );
}

function NuevoSocio({ clienteId, disponible, onCerrar, onHecho }) {
  const avisar = useToast();
  const [f, setF] = useState({ nombre: '', nif: '', porcentaje: String(disponible), irpf_pct: '20' });
  const [espera, setEspera] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const guardar = async (e) => {
    e.preventDefault();
    const pct = Number(String(f.porcentaje).replace(',', '.'));
    if (!f.nombre || !f.nif) return avisar('Faltan el nombre y el NIF', 'amber');
    if (!pct || pct <= 0) return avisar('El porcentaje debe ser mayor que cero', 'amber');
    if (pct > disponible + 0.01) return avisar(`Solo queda un ${disponible}% por repartir`, 'amber');

    setEspera(true);
    const { error } = await sb.from('socios').insert({
      cliente_id: clienteId, nombre: f.nombre.trim(), nif: f.nif.trim().toUpperCase(),
      porcentaje: pct, irpf_pct: Number(String(f.irpf_pct).replace(',', '.')) || 20,
    });
    setEspera(false);
    if (error) return avisar(/duplicate|unique/i.test(error.message)
      ? 'Ese NIF ya está entre los socios' : error.message, 'red');
    avisar('Socio añadido', 'green');
    onHecho();
  };

  return (
    <Modal titulo="Añadir socio" onCerrar={onCerrar} ancho={420}>
      <form onSubmit={guardar}>
        <div className="field">
          <label>Nombre</label>
          <input className="input" value={f.nombre} onChange={set('nombre')} autoFocus placeholder="Nombre y apellidos" />
        </div>
        <div className="field">
          <label>NIF</label>
          <input className="input mono" value={f.nif} onChange={set('nif')}
            placeholder="00000000A" style={{ textTransform: 'uppercase' }} />
        </div>
        <div className="row">
          <div className="field">
            <label>Participación %</label>
            <input className="input mono" value={f.porcentaje} onChange={set('porcentaje')} inputMode="decimal" />
            <div className="tiny" style={{ marginTop: '.25rem' }}>Queda un {disponible}% por repartir</div>
          </div>
          <div className="field">
            <label>Su % de IRPF</label>
            <input className="input mono" value={f.irpf_pct} onChange={set('irpf_pct')} inputMode="decimal" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button type="button" className="btn" onClick={onCerrar} style={{ flex: 1 }}>Cancelar</button>
          <button className="btn primary" disabled={espera} style={{ flex: 1 }}>
            {espera ? 'Guardando…' : 'Añadir'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
