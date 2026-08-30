import { useEffect, useState, useCallback } from 'react';
import { sb } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { AMBITOS, desde } from '../lib/format';
import { Spinner, Tag, Vacio, Modal, useToast } from '../components/ui';

export default function Asesorias() {
  const { soloLectura } = useAuth();
  const avisar = useToast();
  const [cargando, setCargando] = useState(true);
  const [vinc, setVinc] = useState([]);
  const [dir, setDir] = useState([]);
  const [codigo, setCodigo] = useState('');
  const [ambitoCodigo, setAmbitoCodigo] = useState('integral');
  const [espera, setEspera] = useState(false);
  const [solicitar, setSolicitar] = useState(null);

  const cargar = useCallback(async () => {
    const [v, d] = await Promise.all([
      sb.from('v_mis_asesorias').select('*').order('created_at', { ascending: false }),
      sb.from('v_directorio_asesorias').select('*'),
    ]);
    setVinc(v.data || []);
    setDir(d.data || []);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const usarCodigo = async (e) => {
    e.preventDefault();
    if (!codigo.trim()) return avisar('Escribe el código que te dio tu asesoría', 'amber');
    setEspera(true);
    const { data, error } = await sb.rpc('vincular_por_codigo', {
      p_codigo: codigo.trim().toUpperCase(), p_ambito: ambitoCodigo,
    });
    setEspera(false);
    const r = Array.isArray(data) ? data[0] : data;
    if (error || !r?.ok) return avisar(error?.message || r?.mensaje || 'No se pudo vincular', 'red');
    avisar(r.mensaje, 'green');
    setCodigo('');
    cargar();
  };

  const revocar = async (id) => {
    if (!confirm('¿Desconectar esta asesoría? Dejará de ver tus documentos nuevos.')) return;
    const { data, error } = await sb.rpc('revocar_vinculacion', { p_vinculacion: id, p_motivo: null });
    const r = Array.isArray(data) ? data[0] : data;
    if (error || !r?.ok) return avisar(error?.message || r?.mensaje || 'No se pudo desconectar', 'red');
    avisar(r.mensaje, 'amber');
    cargar();
  };

  if (cargando) return <div style={{ display: 'grid', placeItems: 'center', padding: '3rem' }}><Spinner /></div>;

  const activas    = vinc.filter((v) => v.estado === 'activa');
  const pendientes = vinc.filter((v) => v.estado === 'pendiente');
  const ocupados   = new Set([...activas, ...pendientes].map((v) => v.ambito));

  return (
    <>
      <section className="card" style={{ marginBottom: '1.1rem' }}>
        <div className="card-head"><h2>Tus asesorías</h2></div>
        {activas.length === 0 && pendientes.length === 0 ? (
          <Vacio icono="🔗" titulo="No tienes ninguna asesoría conectada"
            texto="Usa el código que te hayan dado, o busca una en el directorio." />
        ) : (
          <>
            {activas.map((v) => (
              <div key={v.vinculacion_id} style={{ display: 'flex', alignItems: 'center', gap: '.8rem',
                   padding: '.8rem 1.1rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 170 }}>
                  <div style={{ fontWeight: 500 }}>{v.asesoria}</div>
                  <div className="tiny">{[v.municipio, v.provincia].filter(Boolean).join(' · ')}</div>
                </div>
                <Tag color={AMBITOS[v.ambito]?.color}>{AMBITOS[v.ambito]?.icon} {AMBITOS[v.ambito]?.label}</Tag>
                <span className="tiny">desde {desde(v.aceptada_at || v.created_at)}</span>
                {!soloLectura && <button className="btn sm danger" onClick={() => revocar(v.vinculacion_id)}>Desconectar</button>}
              </div>
            ))}
            {pendientes.map((v) => (
              <div key={v.vinculacion_id} style={{ display: 'flex', alignItems: 'center', gap: '.8rem',
                   padding: '.8rem 1.1rem', borderBottom: '1px solid var(--border)', opacity: .75 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{v.asesoria}</div>
                  <div className="tiny">Esperando que acepten</div>
                </div>
                <Tag color={AMBITOS[v.ambito]?.color}>{AMBITOS[v.ambito]?.label}</Tag>
                <Tag color="amber">Pendiente</Tag>
              </div>
            ))}
          </>
        )}
      </section>

      {!soloLectura && (
        <section className="card card-pad" style={{ marginBottom: '1.1rem' }}>
          <h2>Tengo un código</h2>
          <p className="muted" style={{ margin: '.25rem 0 .8rem' }}>
            Si tu asesoría ya usa AsesorIA, te habrá dado un código de ocho caracteres.
          </p>
          <form onSubmit={usarCodigo} className="row" style={{ alignItems: 'flex-end' }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Código</label>
              <input className="input mono" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="A1B2C3D4" maxLength={8} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Qué le llevará</label>
              <select className="input" value={ambitoCodigo} onChange={(e) => setAmbitoCodigo(e.target.value)}>
                {Object.entries(AMBITOS).map(([k, a]) => (
                  <option key={k} value={k} disabled={ocupados.has(k)}>
                    {a.label}{ocupados.has(k) ? ' · ya ocupado' : ''}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn primary" disabled={espera} style={{ flex: '0 0 auto' }}>
              {espera ? 'Conectando…' : 'Conectar'}
            </button>
          </form>
        </section>
      )}

      <section className="card">
        <div className="card-head">
          <h2>Directorio de asesorías</h2>
          <p className="muted" style={{ marginTop: '.2rem' }}>
            Estas asesorías aceptan solicitudes. Enviarles una no activa nada hasta que la acepten.
          </p>
        </div>
        {dir.length === 0 ? (
          <Vacio icono="🔎" titulo="Todavía no hay asesorías en el directorio"
            texto="Si la tuya usa AsesorIA, pídele su código de invitación." />
        ) : (
          <div className="grid k2" style={{ padding: '1.1rem' }}>
            {dir.map((a) => (
              <article key={a.id} className="card card-pad">
                <h3>{a.nombre}</h3>
                <div className="tiny">{[a.municipio, a.provincia].filter(Boolean).join(' · ')}</div>
                {a.descripcion && <p className="muted" style={{ marginTop: '.4rem' }}>{a.descripcion}</p>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem', margin: '.7rem 0' }}>
                  {(a.ambitos_ofrecidos || []).map((am) => (
                    <Tag key={am} color={AMBITOS[am]?.color}>{AMBITOS[am]?.label}</Tag>
                  ))}
                </div>
                {!soloLectura && (
                  <button className="btn full" onClick={() => setSolicitar(a)}>Enviar solicitud</button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {solicitar && (
        <FormSolicitud asesoria={solicitar} ocupados={ocupados}
          onCerrar={() => setSolicitar(null)}
          onHecho={() => { setSolicitar(null); cargar(); }} />
      )}
    </>
  );
}

function FormSolicitud({ asesoria, ocupados, onCerrar, onHecho }) {
  const avisar = useToast();
  const [ambito, setAmbito] = useState(
    Object.keys(AMBITOS).find((k) => !ocupados.has(k)) || 'fiscal'
  );
  const [mensaje, setMensaje] = useState('');
  const [espera, setEspera] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setEspera(true);
    const { data, error } = await sb.rpc('solicitar_asesoria', {
      p_asesoria: asesoria.id, p_ambito: ambito, p_mensaje: mensaje.trim() || null,
    });
    setEspera(false);
    const r = Array.isArray(data) ? data[0] : data;
    if (error || !r?.ok) return avisar(error?.message || r?.mensaje || 'No se pudo enviar', 'red');
    avisar(r.mensaje, 'green');
    onHecho();
  };

  return (
    <Modal titulo={`Solicitar a ${asesoria.nombre}`} onCerrar={onCerrar}>
      <form onSubmit={enviar}>
        <div className="field">
          <label>Qué quieres que lleven</label>
          <select className="input" value={ambito} onChange={(e) => setAmbito(e.target.value)}>
            {Object.entries(AMBITOS).map(([k, a]) => (
              <option key={k} value={k} disabled={ocupados.has(k)}>
                {a.label} · {a.desc}{ocupados.has(k) ? ' (ya ocupado)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Mensaje</label>
          <textarea className="input" rows={3} value={mensaje} onChange={(e) => setMensaje(e.target.value)}
            placeholder="Cuéntales brevemente a qué se dedica tu empresa" />
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button type="button" className="btn" onClick={onCerrar} style={{ flex: 1 }}>Cancelar</button>
          <button className="btn primary" disabled={espera} style={{ flex: 1 }}>
            {espera ? 'Enviando…' : 'Enviar solicitud'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
