export const eur = (n) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);

export const num = (n) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(Number(n) || 0);

export const fechaES = (iso) => {
  if (!iso) return '—';
  const [a, m, d] = String(iso).slice(0, 10).split('-');
  return d ? `${d}/${m}/${a}` : iso;
};

export const fechaISO = (es) => {
  if (!es) return null;
  const m = String(es).match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : es;
};

export const desde = (iso) => {
  if (!iso) return '';
  const dias = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;
  const meses = Math.floor(dias / 30);
  return `hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
};

export const iniciales = (nombre = '') =>
  nombre.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '—';

export const trimestreDe = (iso) => {
  if (!iso) return null;
  const mes = Number(String(iso).slice(5, 7));
  return Math.ceil(mes / 3);
};

export const AMBITOS = {
  fiscal:   { label: 'Fiscal',   icon: '📊', color: 'blue',   desc: 'IGIC, modelos 420 y 130' },
  laboral:  { label: 'Laboral',  icon: '👥', color: 'purple', desc: 'Nóminas, seguros sociales, modelo 111' },
  contable: { label: 'Contable', icon: '📗', color: 'green',  desc: 'Libros y cuentas anuales' },
  integral: { label: 'Integral', icon: '🎯', color: 'amber',  desc: 'Todo lo anterior' },
};

export const ESTADOS_DOC = {
  borrador:           { label: 'Borrador',      color: ''      },
  enviado:            { label: 'Enviado',       color: 'blue'  },
  pendiente_revision: { label: 'Por revisar',   color: 'amber' },
  verificado:         { label: 'Verificado',    color: 'green' },
  contabilizado:      { label: 'Contabilizado', color: 'green' },
  rechazado:          { label: 'Rechazado',     color: 'red'   },
};

export const TIPO_DOC = {
  factura: { label: 'Factura', icon: '📄' },
  nomina:  { label: 'Nómina',  icon: '👤' },
};
