import { useState } from 'react';
import { sb } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { AMBITOS, fechaES } from '../lib/format';
import { Tag, useToast } from '../components/ui';

export default function Ajustes() {
  const { org, perfil, esAsesoria, esAdmin, refrescar } = useAuth();
  const avisar = useToast();
  const [f, setF] = useState({
    nombre: org?.nombre || '', municipio: org?.municipio || '',
    provincia: org?.provincia || '', descripcion: org?.descripcion || '',
    email_contacto: org?.email_contacto || '', telefono: org?.telefono || '',
  });
  const [ambitos, setAmbitos] = useState(org?.ambitos_ofrecidos || []);
  const [espera, setEspera] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const guardar = async (e) => {
    e.preventDefault();
    setEspera(true);
    const campos = { ...f };
    if (esAsesoria) campos.ambitos_ofrecidos = ambitos;
    const { error } = await sb.from('organizaciones').update(campos).eq('id', org.id);
    setEspera(false);
    if (error) return avisar('No se pudieron guardar los cambios', 'red');
    avisar('Cambios guardados', 'green');
    refrescar();
  };

  const cambiarPass = async () => {
    const nueva = prompt('Escribe tu nueva contraseña (mínimo 8 caracteres)');
    if (!nueva) return;
    if (nueva.length < 8) return avisar('Necesita 8 caracteres como mínimo', 'amber');
    const { error } = await sb.auth.updateUser({ password: nueva });
    avisar(error ? error.message : 'Contraseña cambiada', error ? 'red' : 'green');
  };

  const alternar = (k) =>
    setAmbitos((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  return (
    <div style={{ maxWidth: 620, display: 'grid', gap: '1.1rem' }}>
      <section className="card">
        <div className="card-head"><h2>Datos de la {esAsesoria ? 'asesoría' : 'empresa'}</h2></div>
        <form className="card-pad" onSubmit={guardar}>
          <div className="field">
            <label>Nombre</label>
            <input className="input" value={f.nombre} onChange={set('nombre')} disabled={!esAdmin} />
          </div>
          <div className="field">
            <label>NIF</label>
            <input className="input mono" value={org?.nif || ''} disabled />
            <div className="tiny" style={{ marginTop: '.3rem' }}>
              El NIF no se puede cambiar: identifica tu organización en todo el sistema.
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label>Municipio</label>
              <input className="input" value={f.municipio} onChange={set('municipio')} disabled={!esAdmin} />
            </div>
            <div className="field">
              <label>Provincia</label>
              <input className="input" value={f.provincia} onChange={set('provincia')} disabled={!esAdmin} />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label>Correo de contacto</label>
              <input className="input" type="email" value={f.email_contacto} onChange={set('email_contacto')} disabled={!esAdmin} />
            </div>
            <div className="field">
              <label>Teléfono</label>
              <input className="input" value={f.telefono} onChange={set('telefono')} disabled={!esAdmin} />
            </div>
          </div>

          {esAsesoria && (
            <>
              <div className="field">
                <label>Descripción para el directorio</label>
                <textarea className="input" rows={3} value={f.descripcion} onChange={set('descripcion')}
                  disabled={!esAdmin} placeholder="En qué está especializada tu asesoría" />
              </div>
              <div className="field">
                <label>Ámbitos que ofreces</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
                  {Object.entries(AMBITOS).map(([k, a]) => (
                    <button key={k} type="button" onClick={() => esAdmin && alternar(k)}
                      className={`tag ${ambitos.includes(k) ? a.color : ''}`}
                      style={{ cursor: esAdmin ? 'pointer' : 'default', padding: '.35rem .7rem' }}>
                      {a.icon} {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {esAdmin && (
            <button className="btn primary" disabled={espera}>
              {espera ? 'Guardando…' : 'Guardar cambios'}
            </button>
          )}
        </form>
      </section>

      {esAsesoria && org?.codigo_invitacion && (
        <section className="card card-pad">
          <h2>Código de invitación</h2>
          <p className="muted" style={{ margin: '.25rem 0 .8rem' }}>
            Dáselo a tus empresas para que se conecten contigo.
          </p>
          <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="mono" style={{ fontSize: '1.3rem', letterSpacing: '.14em', fontWeight: 500,
              padding: '.55rem 1rem', background: 'var(--blue-lt)', color: 'var(--blue)', borderRadius: 'var(--r)' }}>
              {org.codigo_invitacion}
            </span>
            <button className="btn" onClick={() => {
              navigator.clipboard?.writeText(org.codigo_invitacion);
              avisar('Código copiado', 'green');
            }}>Copiar</button>
          </div>
        </section>
      )}

      <section className="card">
        <div className="card-head"><h2>Tu cuenta</h2></div>
        <div className="card-pad">
          <div className="field">
            <label>Nombre</label>
            <input className="input" value={perfil?.nombre || ''} disabled />
          </div>
          <div className="field">
            <label>Correo</label>
            <input className="input" value={perfil?.email || ''} disabled />
          </div>
          <div className="field">
            <label>Permisos</label>
            <div>
              <Tag color={esAdmin ? 'blue' : ''}>
                {perfil?.rol === 'admin' ? 'Administradora' : perfil?.rol === 'contable' ? 'Contable' : 'Solo lectura'}
              </Tag>
            </div>
          </div>
          <button className="btn" onClick={cambiarPass}>Cambiar contraseña</button>
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h2>Plan</h2></div>
        <div className="card-pad">
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', marginBottom: '.6rem' }}>
            <Tag color="blue">{(org?.plan || '').toUpperCase()}</Tag>
            <span className="muted">
              {org?.plan === 'trial' && org?.trial_fin
                ? `La prueba termina el ${fechaES(org.trial_fin)}`
                : 'Plan activo'}
            </span>
          </div>
          <p className="tiny">
            El pago con tarjeta llegará en una próxima versión. Mientras tanto puedes seguir usando la prueba.
          </p>
        </div>
      </section>
    </div>
  );
}
