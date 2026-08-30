import { useState, useEffect } from 'react';
import { useAuth } from './lib/auth';
import { sb } from './lib/supabase';
import { Cargando, useToast } from './components/ui';
import Shell from './components/Shell';
import Acceso from './pages/Acceso';
import Ajustes from './pages/Ajustes';

import Panel from './asesoria/Panel';
import Clientes from './asesoria/Clientes';
import Documentos from './asesoria/Documentos';
import Vinculos from './asesoria/Vinculos';
import Informes from './asesoria/Informes';

import Inicio from './empresa/Inicio';
import Subir from './empresa/Subir';
import MisDocumentos from './empresa/MisDocumentos';
import Asesorias from './empresa/Asesorias';

const TITULOS = {
  panel:      ['Panel', 'Resumen de tu cartera'],
  clientes:   ['Empresas', 'Las empresas cuya gestión llevas'],
  documentos: ['Documentos', 'Facturas y nóminas de tus empresas'],
  vinculos:   ['Vínculos', 'Quién te ha conectado y a quién llevas'],
  informes:   ['Informes fiscales', 'Modelos 420, 130, 115 y 111 por trimestre'],
  inicio:     ['Inicio', 'Estado de tus documentos'],
  subir:      ['Subir documento', 'Añade una factura o una nómina'],
  misdocs:    ['Mis documentos', 'Todo lo que has subido'],
  asesorias:  ['Mis asesorías', 'Quién lleva tu gestión'],
  ajustes:    ['Ajustes', 'Tu organización y tu cuenta'],
};

export default function App() {
  const { cargando, sesion, org, sinOrg, esAsesoria } = useAuth();
  const [pagina, setPagina] = useState(null);
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    if (org) setPagina(org.tipo === 'asesoria' ? 'panel' : 'inicio');
  }, [org]);

  // Contador de avisos en el menú
  useEffect(() => {
    if (!org) return;
    let vivo = true;
    const contar = async () => {
      if (org.tipo === 'asesoria') {
        const { count } = await sb.from('documentos').select('id', { count: 'exact', head: true })
          .in('estado', ['enviado', 'pendiente_revision']);
        if (vivo) setPendientes(count || 0);
      } else {
        const { count } = await sb.from('documentos').select('id', { count: 'exact', head: true })
          .eq('estado', 'rechazado');
        if (vivo) setPendientes(count || 0);
      }
    };
    contar();
    const id = setInterval(contar, 45000);
    return () => { vivo = false; clearInterval(id); };
  }, [org, pagina]);

  if (cargando) return <Cargando texto="Comprobando tu sesión…" />;
  if (!sesion) return <Acceso />;
  if (sinOrg) return <SinOrganizacion />;
  if (!org || !pagina) return <Cargando texto="Cargando tu organización…" />;

  const nav = esAsesoria
    ? [
        { grupo: 'Principal', items: [
          { id: 'panel',      icono: '▦', label: 'Panel' },
          { id: 'clientes',   icono: '🏢', label: 'Empresas' },
        ]},
        { grupo: 'Trabajo', items: [
          { id: 'documentos', icono: '📄', label: 'Documentos', badge: pendientes },
          { id: 'informes',   icono: '📊', label: 'Informes fiscales' },
          { id: 'vinculos',   icono: '🔗', label: 'Vínculos' },
        ]},
        { grupo: 'Cuenta', items: [
          { id: 'ajustes',    icono: '⚙️', label: 'Ajustes' },
        ]},
      ]
    : [
        { grupo: 'Principal', items: [
          { id: 'inicio',     icono: '▦', label: 'Inicio', badge: pendientes },
          { id: 'subir',      icono: '＋', label: 'Subir documento' },
          { id: 'misdocs',    icono: '📄', label: 'Mis documentos' },
        ]},
        { grupo: 'Gestión', items: [
          { id: 'asesorias',  icono: '🔗', label: 'Mis asesorías' },
          { id: 'ajustes',    icono: '⚙️', label: 'Ajustes' },
        ]},
      ];

  const [titulo, subtitulo] = TITULOS[pagina] || ['AsesorIA', ''];

  const vistas = {
    panel:      <Panel onNavegar={setPagina} />,
    clientes:   <Clientes />,
    documentos: <Documentos />,
    vinculos:   <Vinculos />,
    informes:   <Informes />,
    inicio:     <Inicio onNavegar={(p) => setPagina(p === 'documentos' ? 'misdocs' : p)} />,
    subir:      <Subir onNavegar={(p) => setPagina(p === 'documentos' ? 'misdocs' : p)} />,
    misdocs:    <MisDocumentos onNavegar={setPagina} />,
    asesorias:  <Asesorias />,
    ajustes:    <Ajustes />,
  };

  return (
    <Shell nav={nav} activo={pagina} onNavegar={setPagina} titulo={titulo} subtitulo={subtitulo}>
      {vistas[pagina]}
    </Shell>
  );
}

/* ══ REGISTRADO PERO SIN ALTA ════════════════════════════════════════ */
function SinOrganizacion() {
  const { sesion, refrescar, salir } = useAuth();
  const avisar = useToast();
  const [tipo, setTipo] = useState('asesoria');
  const [f, setF] = useState({ nombreOrg: '', nif: '', nombreUsuario: '', municipio: '', provincia: '', codigo: '' });
  const [espera, setEspera] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const crear = async (e) => {
    e.preventDefault();
    if (!f.nombreOrg || !f.nif || !f.nombreUsuario) return avisar('Faltan datos', 'amber');
    setEspera(true);
    const { data, error } = await sb.rpc('registrar_organizacion', {
      p_tipo: tipo, p_nombre: f.nombreOrg.trim(), p_nif: f.nif.trim(),
      p_nombre_usuario: f.nombreUsuario.trim(),
      p_municipio: f.municipio.trim() || null, p_provincia: f.provincia.trim() || null,
      p_codigo_invitacion: tipo === 'empresa' ? (f.codigo.trim() || null) : null,
      p_ambito: tipo === 'empresa' ? 'integral' : null,
    });
    setEspera(false);
    const r = Array.isArray(data) ? data[0] : data;
    if (error || !r?.ok) return avisar(error?.message || r?.mensaje || 'No se pudo completar', 'red');
    avisar('Listo', 'green');
    refrescar();
  };

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="logo"><span className="ase">Asesor</span><span className="ia">IA</span></div>
        <p className="muted" style={{ margin: '.3rem 0 1.2rem' }}>
          Falta un paso: cuéntanos quién eres para terminar de crear tu cuenta.
        </p>

        <form onSubmit={crear}>
          <div className="choice">
            <button type="button" className={tipo === 'asesoria' ? 'on' : ''} onClick={() => setTipo('asesoria')}>
              <span className="t">Soy una asesoría</span>
              <span className="d">Gestiono varias empresas</span>
            </button>
            <button type="button" className={tipo === 'empresa' ? 'on' : ''} onClick={() => setTipo('empresa')}>
              <span className="t">Soy una empresa</span>
              <span className="d">Envío mis documentos</span>
            </button>
          </div>

          <div className="field">
            <label>Tu nombre</label>
            <input className="input" value={f.nombreUsuario} onChange={set('nombreUsuario')} placeholder="Nombre y apellidos" />
          </div>
          <div className="row">
            <div className="field">
              <label>{tipo === 'asesoria' ? 'Nombre de la asesoría' : 'Nombre de la empresa'}</label>
              <input className="input" value={f.nombreOrg} onChange={set('nombreOrg')} placeholder="Razón social" />
            </div>
            <div className="field">
              <label>NIF</label>
              <input className="input mono" value={f.nif} onChange={set('nif')} placeholder="B12345678"
                style={{ textTransform: 'uppercase' }} />
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
            <div className="field">
              <label>Código de invitación</label>
              <input className="input mono" value={f.codigo} onChange={set('codigo')}
                placeholder="Opcional" style={{ textTransform: 'uppercase' }} />
            </div>
          )}

          <button className="btn primary full" disabled={espera}>
            {espera ? 'Creando…' : 'Terminar'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button className="tiny" onClick={salir} style={{ textDecoration: 'underline' }}>
            Salir de {sesion?.user?.email}
          </button>
        </div>
      </div>
    </div>
  );
}
