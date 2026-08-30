import { useState } from 'react';
import { sb } from '../lib/supabase';
import { useToast } from '../components/ui';

const Logo = () => (
  <div className="logo" style={{ marginBottom: '.25rem' }}>
    <span className="ase">Asesor</span><span className="ia">IA</span>
  </div>
);

export default function Acceso() {
  const [modo, setModo] = useState('entrar'); // entrar | crear
  return (
    <div className="auth">
      <div className="auth-card">
        <Logo />
        <p className="muted" style={{ marginBottom: '1.4rem' }}>
          Gestión fiscal para asesorías y sus empresas
        </p>
        {modo === 'entrar'
          ? <Entrar irACrear={() => setModo('crear')} />
          : <Crear irAEntrar={() => setModo('entrar')} />}
      </div>
    </div>
  );
}

/* ══ ENTRAR ══════════════════════════════════════════════════════════ */
function Entrar({ irACrear }) {
  const avisar = useToast();
  const [email, setEmail] = useState('');
  const [pass, setPass]   = useState('');
  const [espera, setEspera] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    if (!email || !pass) return avisar('Escribe tu correo y tu contraseña', 'amber');
    setEspera(true);
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: pass });
    setEspera(false);
    if (error) {
      avisar(
        /invalid/i.test(error.message)   ? 'Ese correo y esa contraseña no coinciden' :
        /confirm/i.test(error.message)   ? 'Confirma tu correo antes de entrar' :
        error.message, 'red');
    }
  };

  const recuperar = async () => {
    if (!email) return avisar('Escribe tu correo primero', 'amber');
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    avisar(error ? error.message : 'Te hemos enviado un enlace para cambiarla', error ? 'red' : 'green');
  };

  return (
    <form onSubmit={enviar}>
      <div className="field">
        <label htmlFor="e">Correo electrónico</label>
        <input id="e" className="input" type="email" autoComplete="username"
          value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@asesoria.com" />
      </div>
      <div className="field">
        <label htmlFor="p">Contraseña</label>
        <input id="p" className="input" type="password" autoComplete="current-password"
          value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" />
      </div>
      <button className="btn primary full" disabled={espera}>
        {espera ? 'Entrando…' : 'Entrar'}
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '.8rem' }}>
        <button type="button" className="tiny" onClick={recuperar}
          style={{ textDecoration: 'underline' }}>He olvidado la contraseña</button>
        <button type="button" onClick={irACrear} style={{ color: 'var(--blue)', fontWeight: 500 }}>
          Crear cuenta →
        </button>
      </div>
    </form>
  );
}

/* ══ CREAR CUENTA ════════════════════════════════════════════════════ */
function Crear({ irAEntrar }) {
  const avisar = useToast();
  const [tipo, setTipo] = useState('asesoria');
  const [f, setF] = useState({
    nombreUsuario: '', email: '', pass: '',
    nombreOrg: '', nif: '', municipio: '', provincia: '',
    codigo: '', ambito: 'integral',
  });
  const [espera, setEspera] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    if (!f.nombreUsuario || !f.email || !f.pass) return avisar('Faltan datos de tu cuenta', 'amber');
    if (f.pass.length < 8) return avisar('La contraseña necesita 8 caracteres como mínimo', 'amber');
    if (!f.nombreOrg || !f.nif) return avisar(`Faltan el nombre y el NIF de la ${tipo}`, 'amber');

    setEspera(true);
    const { data, error } = await sb.auth.signUp({
      email: f.email.trim(),
      password: f.pass,
      options: { data: { nombre: f.nombreUsuario.trim() } },
    });

    if (error) { setEspera(false); return avisar(error.message, 'red'); }

    // Si el proyecto exige confirmar el correo, aún no hay sesión.
    if (!data.session) {
      setEspera(false);
      avisar('Revisa tu correo para confirmar la cuenta', 'green');
      irAEntrar();
      return;
    }

    const { data: alta, error: e2 } = await sb.rpc('registrar_organizacion', {
      p_tipo: tipo,
      p_nombre: f.nombreOrg.trim(),
      p_nif: f.nif.trim(),
      p_nombre_usuario: f.nombreUsuario.trim(),
      p_municipio: f.municipio.trim() || null,
      p_provincia: f.provincia.trim() || null,
      p_codigo_invitacion: tipo === 'empresa' ? (f.codigo.trim() || null) : null,
      p_ambito: tipo === 'empresa' ? f.ambito : null,
    });

    setEspera(false);
    const r = Array.isArray(alta) ? alta[0] : alta;
    if (e2 || !r?.ok) return avisar(e2?.message || r?.mensaje || 'No se pudo crear la organización', 'red');

    if (r.asesoria_vinculada) avisar(`Cuenta creada y vinculada con ${r.asesoria_vinculada}`, 'green');
    else if (r.ficha_reclamada) avisar('Cuenta creada · hemos encontrado tu ficha existente', 'green');
    else avisar('Cuenta creada', 'green');
    // AuthProvider detecta la sesión y entra solo
  };

  return (
    <form onSubmit={enviar}>
      <div className="eyebrow" style={{ marginBottom: '.5rem' }}>Tipo de cuenta</div>
      <div className="choice">
        <button type="button" className={tipo === 'asesoria' ? 'on' : ''} onClick={() => setTipo('asesoria')}>
          <span className="t">Soy una asesoría</span>
          <span className="d">Gestiono la fiscalidad de varias empresas</span>
        </button>
        <button type="button" className={tipo === 'empresa' ? 'on' : ''} onClick={() => setTipo('empresa')}>
          <span className="t">Soy una empresa</span>
          <span className="d">Envío mis documentos a mi asesoría</span>
        </button>
      </div>

      <div className="field">
        <label>Tu nombre</label>
        <input className="input" value={f.nombreUsuario} onChange={set('nombreUsuario')} placeholder="Nombre y apellidos" />
      </div>
      <div className="row">
        <div className="field">
          <label>Correo</label>
          <input className="input" type="email" value={f.email} onChange={set('email')} placeholder="nombre@correo.com" />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input className="input" type="password" value={f.pass} onChange={set('pass')} placeholder="Mínimo 8 caracteres" />
        </div>
      </div>

      <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '.4rem 0 1rem' }} />

      <div className="row">
        <div className="field">
          <label>{tipo === 'asesoria' ? 'Nombre de la asesoría' : 'Nombre de la empresa'}</label>
          <input className="input" value={f.nombreOrg} onChange={set('nombreOrg')} placeholder="Razón social" />
        </div>
        <div className="field">
          <label>NIF</label>
          <input className="input mono" value={f.nif} onChange={set('nif')} placeholder="B12345678" />
        </div>
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

      {tipo === 'empresa' && (
        <>
          <div className="field">
            <label>Código de invitación</label>
            <input className="input mono" value={f.codigo} onChange={set('codigo')}
              placeholder="Si tu asesoría te dio uno" style={{ textTransform: 'uppercase' }} />
            <div className="tiny" style={{ marginTop: '.3rem' }}>
              Sin código también puedes entrar y buscar tu asesoría después.
            </div>
          </div>
          {f.codigo.trim() && (
            <div className="field">
              <label>Qué le llevará esta asesoría</label>
              <select className="input" value={f.ambito} onChange={set('ambito')}>
                <option value="integral">Todo</option>
                <option value="fiscal">Solo lo fiscal</option>
                <option value="laboral">Solo lo laboral</option>
                <option value="contable">Solo lo contable</option>
              </select>
            </div>
          )}
        </>
      )}

      <button className="btn primary full" disabled={espera} style={{ marginTop: '.4rem' }}>
        {espera ? 'Creando…' : 'Crear cuenta · 30 días gratis'}
      </button>
      <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '.8rem' }}>
        <button type="button" onClick={irAEntrar} style={{ color: 'var(--blue)', fontWeight: 500 }}>
          ← Ya tengo cuenta
        </button>
      </div>
    </form>
  );
}
