import { createContext, useContext, useState, useCallback, useEffect } from 'react';

/* ══ AVISOS ══════════════════════════════════════════════════════════ */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [t, setT] = useState(null);

  const avisar = useCallback((texto, color = '') => {
    setT({ texto, color, k: Date.now() });
  }, []);

  useEffect(() => {
    if (!t) return;
    const id = setTimeout(() => setT(null), 3200);
    return () => clearTimeout(id);
  }, [t]);

  return (
    <ToastCtx.Provider value={avisar}>
      {children}
      {t && <div className={`toast ${t.color}`} role="status">{t.texto}</div>}
    </ToastCtx.Provider>
  );
}

/* ══ CARGANDO ════════════════════════════════════════════════════════ */
export const Spinner = () => <div className="spin" aria-label="Cargando" />;

export const Cargando = ({ texto = 'Cargando…' }) => (
  <div className="center">
    <div style={{ display: 'grid', placeItems: 'center', gap: '.7rem' }}>
      <Spinner />
      <span className="muted">{texto}</span>
    </div>
  </div>
);

/* ══ VACÍO ═══════════════════════════════════════════════════════════ */
export const Vacio = ({ icono = '📭', titulo, texto, accion }) => (
  <div className="empty">
    <div className="ico">{icono}</div>
    <h3>{titulo}</h3>
    {texto && <p className="muted" style={{ marginTop: '.2rem' }}>{texto}</p>}
    {accion && <div style={{ marginTop: '1rem' }}>{accion}</div>}
  </div>
);

/* ══ MODAL ═══════════════════════════════════════════════════════════ */
export function Modal({ titulo, children, onCerrar, ancho }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onCerrar]);

  return (
    <div className="modal-bg" onClick={onCerrar}>
      <div
        className="modal"
        style={ancho ? { maxWidth: ancho } : undefined}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
      >
        <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>{titulo}</h2>
          <button className="btn sm" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </div>
        <div className="card-pad">{children}</div>
      </div>
    </div>
  );
}

/* ══ ETIQUETA ════════════════════════════════════════════════════════ */
export const Tag = ({ color = '', children }) => (
  <span className={`tag ${color}`}>{children}</span>
);

/* ══ KPI ═════════════════════════════════════════════════════════════ */
export const Kpi = ({ etiqueta, valor, pie, tono = '' }) => (
  <div className={`kpi ${tono}`}>
    <div className="eyebrow">{etiqueta}</div>
    <div className="num" style={{ margin: '.35rem 0 .1rem' }}>{valor}</div>
    {pie && <div className="tiny">{pie}</div>}
  </div>
);
