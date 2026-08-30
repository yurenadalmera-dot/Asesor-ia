import { useState, useRef, useEffect } from 'react';
import { validarArchivo, pesoLegible, hashArchivo, buscarDuplicado, abrirJustificante } from '../lib/archivos';
import { fechaES, eur } from '../lib/format';
import { Tag } from './ui';

export default function SelectorArchivo({ archivo, onElegir, clienteId, deshabilitado }) {
  const [error, setError]   = useState(null);
  const [previa, setPrevia] = useState(null);
  const [dup, setDup]       = useState(null);
  const [mirando, setMirando] = useState(false);
  const [encima, setEncima] = useState(false);
  const input = useRef(null);

  useEffect(() => {
    if (!archivo || !archivo.type?.startsWith('image/')) { setPrevia(null); return; }
    const url = URL.createObjectURL(archivo);
    setPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  const tomar = async (f) => {
    setError(null); setDup(null);
    if (!f) return;
    const problema = validarArchivo(f);
    if (problema) { setError(problema); onElegir(null); return; }
    onElegir(f);
    if (clienteId) {
      setMirando(true);
      try {
        const h = await hashArchivo(f);
        setDup(await buscarDuplicado(clienteId, h));
      } catch { /* sin hash no hay comprobación */ }
      setMirando(false);
    }
  };

  const quitar = () => { onElegir(null); setError(null); setDup(null); if (input.current) input.current.value = ''; };

  return (
    <div className="field">
      <label>Justificante</label>

      {!archivo ? (
        <div
          onClick={() => !deshabilitado && input.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && !deshabilitado && input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setEncima(true); }}
          onDragLeave={() => setEncima(false)}
          onDrop={(e) => { e.preventDefault(); setEncima(false); tomar(e.dataTransfer.files?.[0]); }}
          role="button" tabIndex={deshabilitado ? -1 : 0}
          style={{
            border: `1px dashed ${encima ? 'var(--blue)' : 'var(--border2)'}`,
            background: encima ? 'var(--blue-lt)' : 'var(--off)',
            borderRadius: 'var(--r)', padding: '1.1rem', textAlign: 'center',
            cursor: deshabilitado ? 'not-allowed' : 'pointer', opacity: deshabilitado ? .55 : 1,
            transition: 'background .12s, border-color .12s',
          }}
        >
          <div style={{ fontSize: '1.4rem', marginBottom: '.3rem' }} aria-hidden="true">📎</div>
          <div style={{ fontSize: '.85rem', fontWeight: 500 }}>Adjunta la factura</div>
          <div className="tiny" style={{ marginTop: '.2rem' }}>
            Haz una foto o elige un PDF · máximo 25 MB
          </div>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r)',
             padding: '.6rem', background: 'var(--white)', display: 'flex', gap: '.7rem', alignItems: 'center' }}>
          {previa
            ? <img src={previa} alt="" style={{ width: 48, height: 48, objectFit: 'cover',
                     borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }} />
            : <div style={{ width: 48, height: 48, display: 'grid', placeItems: 'center',
                   background: 'var(--off)', borderRadius: 'var(--r-sm)', fontSize: '1.3rem' }} aria-hidden="true">📄</div>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '.83rem', fontWeight: 500, overflow: 'hidden',
                 textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{archivo.name}</div>
            <div className="tiny">{pesoLegible(archivo.size)}{mirando ? ' · comprobando…' : ''}</div>
          </div>
          <button type="button" className="btn sm" onClick={quitar} aria-label="Quitar archivo">✕</button>
        </div>
      )}

      <input ref={input} type="file" hidden
        accept="application/pdf,image/jpeg,image/png,image/heic,image/heif,image/webp"
        onChange={(e) => tomar(e.target.files?.[0])} />

      {error && (
        <p className="tiny" style={{ marginTop: '.4rem', color: 'var(--red)' }}>{error}</p>
      )}

      {dup && (
        <div style={{ marginTop: '.5rem', padding: '.55rem .7rem', background: 'var(--amber-lt)',
             border: '1px solid #FDE8B8', borderRadius: 'var(--r-sm)' }}>
          <div style={{ fontSize: '.8rem', fontWeight: 500, color: 'var(--amber)' }}>
            Este archivo ya está registrado
          </div>
          <div className="tiny" style={{ marginTop: '.15rem' }}>
            {dup.num_referencia || 'Sin referencia'} · {fechaES(dup.fecha)}
            {dup.total ? ` · ${eur(dup.total)}` : ''}. Puedes subirlo igualmente si es un caso aparte.
          </div>
        </div>
      )}
    </div>
  );
}

export function VerJustificante({ path, nombre }) {
  const [cargando, setCargando] = useState(false);
  if (!path) return <span className="tiny" title="Sin justificante adjunto">—</span>;

  const abrir = async (e) => {
    e.stopPropagation();
    setCargando(true);
    await abrirJustificante(path);
    setCargando(false);
  };

  return (
    <button className="btn sm" onClick={abrir} disabled={cargando}
      title={nombre || 'Ver el original'} aria-label="Ver el justificante original">
      {cargando ? '…' : '📄 Ver'}
    </button>
  );
}
