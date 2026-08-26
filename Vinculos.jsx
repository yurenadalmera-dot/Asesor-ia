import { useEffect, useState, useCallback } from 'react';
import { sb } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { AMBITOS, desde } from '../lib/format';
import { Spinner, Tag, Vacio, useToast } from '../components/ui';

export default function Vinculos() {
  const { org, soloLectura, refrescar } = useAuth();
  const avisar = useToast();
  const [cargando, setCargando] = useState(true);
  const [vinc, setVinc] = useState([]);
  const [visible, setVisible] = useState(org?.visible_directorio || false);

  const cargar = useCallback(async () => {
    const { data } = await sb
      .from('vinculaciones')
      .select('*, empresa:empresa_org_id(nombre, nif, municipio)')
      .order('created_at', { ascending: false });
    setVinc(data || []);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const responder = async (id, aceptar) => {
    const { data, error } = await sb.rpc('responder_vinculacion', {
      p_vinculacion: id, p_aceptar: aceptar, p_motivo: null,
    });
    const r = Array.isArray(data) ? data[0] : data;
    if (error || !r?.ok) return avisar(error?.message || r?.mensaje || 'No se pudo responder', 'red');
    avisar(r.mensaje, aceptar ? 'green' : 'amber');
    cargar();
  };

  const revocar = async (id) => {
    if (!confirm('¿Dejar de llevar este ámbito de esta empresa? Perderás el acceso a sus documentos.')) return;
    const { data, error } = await sb.rpc('revocar_vinculacion', { p_vinculacion: id, p_motivo: null });
    const r = Array.isArray(data) ? data[0] : data;
    if (error || !r?.ok) return avisar(error?.message || r?.mensaje || 'No se pudo revocar', 'red');
    avisar(r.mensaje, 'amber');
    cargar();
  };

  const cambiarVisibilidad = async (v) => {
    setVisible(v);
    const { error } = await sb.from('organizaciones').update({ visible_directorio: v }).eq('id', org.id);
    if (error) { setVisible(!v); return avisar('No se pudo cambiar', 'red'); }
    avisar(v ? 'Ya apareces en el directorio' : 'Has salido del directorio', 'green');
    refrescar();
  };

  if (cargando) return <div style={{ display: 'grid', placeItems: 'center', padding: '3rem' }}><Spinner /></div>;

  const pendientes = vinc.filter((v) => v.estado === 'pendiente' && v.origen === 'solicitud_empresa');
  const activas    = vinc.filter((v) => v.estado === 'activa');
  const cerradas   = vinc.filter((v) => ['revocada', 'rechazada'].includes(v.estado));

  return (
    <>
      {pendientes.length > 0 && (
        <section className="card" style={{ marginBottom: '1.1rem' }}>
          <div className="card-head">
            <h2>Solicitudes pendientes</h2>
            <p className="muted" style={{ marginTop: '.2rem' }}>
              Estas empresas quieren que lleves su gestión. Nada se activa hasta que aceptes.
            </p>
          </div>
          {pendientes.map((v) => (
            <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '.8rem',
                 padding: '.8rem 1.1rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 500 }}>{v.empresa?.nombre || 'Empresa'}</div>
                <div className="tiny mono">{v.empresa?.nif}</div>
                {v.mensaje && <div className="tiny" style={{ marginTop: '.25rem', fontStyle: 'italic' }}>“{v.mensaje}”</div>}
              </div>
              <Tag color={AMBITOS[v.ambito]?.color}>{AMBITOS[v.ambito]?.icon} {AMBITOS[v.ambito]?.label}</Tag>
              <span className="tiny">{desde(v.created_at)}</span>
              {!soloLectura && (
                <div style={{ display: 'flex', gap: '.4rem' }}>
                  <button className="btn sm primary" onClick={() => responder(v.id, true)}>Aceptar</button>
                  <button className="btn sm danger" onClick={() => responder(v.id, false)}>Rechazar</button>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      <section className="card" style={{ marginBottom: '1.1rem' }}>
        <div className="card-head"><h2>Empresas vinculadas</h2></div>
        {activas.length === 0 ? (
          <Vacio icono="🔗" titulo="Todavía no hay vínculos activos"
            texto="Comparte tu código de invitación para que tus empresas se conecten." />
        ) : activas.map((v) => (
          <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '.8rem',
               padding: '.8rem 1.1rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 500 }}>{v.empresa?.nombre || 'Empresa'}</div>
              <div className="tiny mono">{v.empresa?.nif}</div>
            </div>
            <Tag color={AMBITOS[v.ambito]?.color}>{AMBITOS[v.ambito]?.icon} {AMBITOS[v.ambito]?.label}</Tag>
            <span className="tiny">desde {desde(v.aceptada_at || v.created_at)}</span>
            {!soloLectura && <button className="btn sm danger" onClick={() => revocar(v.id)}>Desvincular</button>}
          </div>
        ))}
      </section>

      <section className="card card-pad" style={{ marginBottom: '1.1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h2>Aparecer en el directorio</h2>
            <p className="muted" style={{ marginTop: '.25rem' }}>
              Las empresas que buscan asesoría podrán encontrarte y enviarte una solicitud.
              Sigues decidiendo tú a quién aceptas.
            </p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={visible} disabled={soloLectura}
              onChange={(e) => cambiarVisibilidad(e.target.checked)} />
            <span style={{ fontSize: '.85rem', fontWeight: 500 }}>{visible ? 'Visible' : 'Oculta'}</span>
          </label>
        </div>
      </section>

      {cerradas.length > 0 && (
        <section className="card">
          <div className="card-head"><h2 style={{ color: 'var(--text2)' }}>Histórico</h2></div>
          {cerradas.map((v) => (
            <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '.8rem',
                 padding: '.6rem 1.1rem', borderBottom: '1px solid var(--border)', opacity: .65 }}>
              <div style={{ flex: 1 }}>{v.empresa?.nombre}</div>
              <Tag>{AMBITOS[v.ambito]?.label}</Tag>
              <Tag color={v.estado === 'rechazada' ? 'red' : ''}>
                {v.estado === 'rechazada' ? 'Rechazada' : 'Revocada'}
              </Tag>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
