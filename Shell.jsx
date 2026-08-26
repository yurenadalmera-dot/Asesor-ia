import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { iniciales } from '../lib/format';

export default function Shell({ nav, activo, onNavegar, titulo, subtitulo, acciones, children }) {
  const { perfil, org, esTrial, diasTrial, trialExpirado, salir } = useAuth();
  const [abierto, setAbierto] = useState(false);

  const ir = (id) => { onNavegar(id); setAbierto(false); };

  const banner = trialExpirado
    ? { clase: 'stop', texto: <>La prueba ha terminado. <strong>Tus datos siguen aquí</strong>, pero no puedes subir documentos nuevos. Elige un plan para continuar.</> }
    : esTrial && diasTrial <= 7
      ? { clase: 'warn', texto: <>La prueba termina en <strong>{diasTrial} {diasTrial === 1 ? 'día' : 'días'}</strong>. Elige un plan para no perder el acceso.</> }
      : esTrial
        ? { clase: 'info', texto: <>Prueba gratuita · <strong>{diasTrial} días restantes</strong> · Sin límites</> }
        : null;

  return (
    <div className="shell">
      {abierto && <div className="scrim" onClick={() => setAbierto(false)} />}

      <aside className={`side ${abierto ? 'open' : ''}`}>
        <div className="side-top">
          <div className="logo"><span className="ase">Asesor</span><span className="ia">IA</span></div>
          <div className="tiny" style={{ marginTop: '.15rem' }}>{org?.nombre}</div>
          <span className={`tag ${trialExpirado ? 'red' : esTrial && diasTrial <= 7 ? 'amber' : esTrial ? 'green' : 'blue'}`}
                style={{ marginTop: '.5rem' }}>
            {trialExpirado ? 'Prueba terminada'
              : esTrial ? `Prueba · ${diasTrial} días`
              : org?.plan?.toUpperCase()}
          </span>
        </div>

        <nav className="nav">
          {nav.map((grupo) => (
            <div key={grupo.grupo}>
              <div className="nav-group">{grupo.grupo}</div>
              {grupo.items.map((it) => (
                <button key={it.id}
                  className={`nav-item ${activo === it.id ? 'on' : ''}`}
                  onClick={() => ir(it.id)}
                  aria-current={activo === it.id ? 'page' : undefined}>
                  <span aria-hidden="true">{it.icono}</span>
                  <span>{it.label}</span>
                  {it.badge > 0 && <span className="badge">{it.badge}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="side-foot">
          <div className="avatar">{iniciales(perfil?.nombre)}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {perfil?.nombre}
            </div>
            <div className="tiny">
              {perfil?.rol === 'admin' ? 'Administradora' : perfil?.rol === 'contable' ? 'Contable' : 'Solo lectura'}
            </div>
          </div>
          <button className="btn sm" onClick={salir} title="Salir" aria-label="Salir">⏻</button>
        </div>
      </aside>

      <div className="main">
        {banner && <div className={`banner ${banner.clase}`}>{banner.texto}</div>}

        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', minWidth: 0 }}>
            <button className="btn sm burger" onClick={() => setAbierto(true)} aria-label="Abrir menú">☰</button>
            <div style={{ minWidth: 0 }}>
              <h1>{titulo}</h1>
              {subtitulo && <div className="muted">{subtitulo}</div>}
            </div>
          </div>
          {acciones && <div style={{ display: 'flex', gap: '.5rem' }}>{acciones}</div>}
        </div>

        <div className="content">{children}</div>
      </div>
    </div>
  );
}
