import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { sb } from './supabase';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [cargando, setCargando] = useState(true);
  const [sesion, setSesion]     = useState(null);
  const [perfil, setPerfil]     = useState(null);   // fila de usuarios
  const [org, setOrg]           = useState(null);   // fila de organizaciones
  const [sinOrg, setSinOrg]     = useState(false);  // registrado pero sin alta

  const cargarPerfil = useCallback(async (uid) => {
    if (!uid) { setPerfil(null); setOrg(null); setSinOrg(false); return; }

    const { data: u } = await sb
      .from('usuarios')
      .select('id, nombre, email, rol, organizacion_id')
      .eq('id', uid)
      .maybeSingle();

    if (!u) { setPerfil(null); setOrg(null); setSinOrg(true); return; }

    const { data: o } = await sb
      .from('organizaciones')
      .select('*')
      .eq('id', u.organizacion_id)
      .maybeSingle();

    setPerfil(u);
    setOrg(o || null);
    setSinOrg(false);
  }, []);

  useEffect(() => {
    let vivo = true;

    sb.auth.getSession().then(async ({ data: { session } }) => {
      if (!vivo) return;
      setSesion(session);
      await cargarPerfil(session?.user?.id);
      if (vivo) setCargando(false);
    });

    const { data: sub } = sb.auth.onAuthStateChange(async (evento, session) => {
      if (!vivo) return;
      setSesion(session);
      if (evento === 'SIGNED_OUT') {
        setPerfil(null); setOrg(null); setSinOrg(false);
      } else if (session?.user?.id) {
        await cargarPerfil(session.user.id);
      }
    });

    return () => { vivo = false; sub.subscription.unsubscribe(); };
  }, [cargarPerfil]);

  const refrescar = useCallback(
    () => cargarPerfil(sesion?.user?.id),
    [cargarPerfil, sesion]
  );

  const salir = useCallback(async () => { await sb.auth.signOut(); }, []);

  // ── Estado del periodo de prueba ────────────────────────────────────
  const diasTrial = org?.trial_fin
    ? Math.max(0, Math.ceil((new Date(org.trial_fin) - Date.now()) / 86400000))
    : null;

  const esTrial = org?.plan === 'trial';
  const trialExpirado = esTrial && diasTrial === 0;

  const valor = {
    cargando, sesion, perfil, org, sinOrg,
    esAsesoria: org?.tipo === 'asesoria',
    esEmpresa:  org?.tipo === 'empresa',
    esAdmin:    perfil?.rol === 'admin',
    soloLectura: perfil?.rol === 'lectura' || trialExpirado,
    diasTrial, esTrial, trialExpirado,
    refrescar, salir,
  };

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
