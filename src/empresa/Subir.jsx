import { useState, useEffect } from 'react';
import { sb } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { AMBITOS } from '../lib/format';
import { useToast } from '../components/ui';
import SelectorArchivo from '../components/SelectorArchivo';
import { subirJustificante } from '../lib/archivos';

const VACIO = {
  tipo_doc: 'factura', tipo: 'gasto',
  num_referencia: '', fecha: new Date().toISOString().slice(0, 10),
  emisor: '', nif_emisor: '', concepto: '',
  base: '', igic_pct: '7%', igic: '', retencion: '', total: '',
  empleado: '', nif_empleado: '', periodo: '',
  salario_bruto: '', irpf_retenido: '', liquido: '',
  es_alquiler: false,
};

export default function Subir({ onNavegar }) {
  const { org, trialExpirado } = useAuth();
  const avisar = useToast();
  const [f, setF] = useState(VACIO);
  const [cliente, setCliente] = useState(null);
  const [espera, setEspera] = useState(false);
  const [archivo, setArchivo] = useState(null);

  useEffect(() => {
    sb.from('clientes').select('id').eq('empresa_org_id', org.id).maybeSingle()
      .then(({ data }) => setCliente(data?.id || null));
  }, [org.id]);

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((p) => ({ ...p, [k]: v }));
  };

  const esNomina = f.tipo_doc === 'nomina';

  // Total sugerido
  useEffect(() => {
    if (esNomina) return;
    const b = Number(String(f.base).replace(',', '.')) || 0;
    const i = Number(String(f.igic).replace(',', '.')) || 0;
    const r = Number(String(f.retencion).replace(',', '.')) || 0;
    if (b) setF((p) => ({ ...p, total: (b + i - r).toFixed(2) }));
  }, [f.base, f.igic, f.retencion, esNomina]);

  const guardar = async (enviar) => {
    if (trialExpirado) return avisar('La prueba ha terminado. Elige un plan para subir documentos.', 'red');

    const n = (x) => { const v = Number(String(x).replace(',', '.')); return Number.isNaN(v) ? null : v; };

    if (esNomina && !f.empleado) return avisar('Falta el nombre del empleado', 'amber');
    if (!esNomina && !f.emisor)  return avisar('Falta quién emite la factura', 'amber');
    if (!f.base && !f.salario_bruto) return avisar('Falta el importe', 'amber');
    if (enviar && !archivo &&
        !confirm('Vas a enviarlo sin adjuntar el justificante. Tu asesoría tendrá los datos, pero no el documento original. ¿Continuar?')) return;

    setEspera(true);

    let adjunto = null;
    if (archivo) {
      const r = await subirJustificante(archivo, cliente);
      if (r.error) { setEspera(false); return avisar(r.error, 'red'); }
      adjunto = r;
    }

    const fila = {
      organizacion_id: org.id,
      cliente_id: cliente,
      subido_por_org: org.id,
      tipo_doc: f.tipo_doc,
      tipo: esNomina ? 'gasto' : f.tipo,
      estado: enviar ? 'enviado' : 'borrador',
      canal: 'web',
      archivo_path: adjunto?.path || null,
      archivo_nombre: adjunto?.nombre || null,
      archivo_mime: adjunto?.mime || null,
      archivo_bytes: adjunto?.bytes || null,
      archivo_hash: adjunto?.hash || null,
      num_referencia: esNomina ? (f.periodo || null) : (f.num_referencia || null),
      fecha: f.fecha || null,
      periodo: esNomina ? (f.periodo || null) : null,
      concepto: f.concepto || (esNomina ? `Nómina ${f.periodo}` : null),
      es_alquiler: f.es_alquiler,
      pgc_cuenta: esNomina ? '640' : (f.es_alquiler ? '621' : null),
      ...(esNomina
        ? {
            empleado: f.empleado, nif_empleado: f.nif_empleado || null,
            salario_bruto: n(f.salario_bruto), irpf_retenido: n(f.irpf_retenido),
            liquido: n(f.liquido), base: n(f.salario_bruto),
            total: n(f.salario_bruto),
          }
        : {
            emisor: f.emisor, nif_emisor: f.nif_emisor || null,
            base: n(f.base), igic_pct: f.igic_pct, igic: n(f.igic),
            retencion: n(f.retencion), total: n(f.total),
          }),
    };

    const { error } = await sb.from('documentos').insert(fila);
    setEspera(false);
    if (error) return avisar(error.message, 'red');

    avisar(enviar ? 'Enviado a tu asesoría' : 'Guardado como borrador', 'green');
    setF({ ...VACIO, tipo_doc: f.tipo_doc });
    setArchivo(null);
    onNavegar('documentos');
  };

  return (
    <div style={{ maxWidth: 620 }}>
      <div className="card">
        <div className="card-head">
          <h2>Nuevo documento</h2>
          <p className="muted" style={{ marginTop: '.2rem' }}>
            Guárdalo como borrador si quieres revisarlo antes, o envíalo directamente a tu asesoría.
          </p>
        </div>

        <div className="card-pad">
          <div className="choice" style={{ marginBottom: '1.2rem' }}>
            <button type="button" className={!esNomina ? 'on' : ''}
              onClick={() => setF({ ...VACIO, tipo_doc: 'factura' })}>
              <span className="t">📄 Factura</span>
              <span className="d">Va a tu asesoría fiscal</span>
            </button>
            <button type="button" className={esNomina ? 'on' : ''}
              onClick={() => setF({ ...VACIO, tipo_doc: 'nomina' })}>
              <span className="t">👤 Nómina</span>
              <span className="d">Va a tu asesoría laboral</span>
            </button>
          </div>

          {esNomina ? (
            <>
              <div className="row">
                <div className="field">
                  <label>Empleado</label>
                  <input className="input" value={f.empleado} onChange={set('empleado')} placeholder="Nombre y apellidos" />
                </div>
                <div className="field">
                  <label>NIF del empleado</label>
                  <input className="input mono" value={f.nif_empleado} onChange={set('nif_empleado')} placeholder="00000000A" />
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <label>Periodo</label>
                  <input className="input" value={f.periodo} onChange={set('periodo')} placeholder="Marzo 2026" />
                </div>
                <div className="field">
                  <label>Fecha</label>
                  <input className="input" type="date" value={f.fecha} onChange={set('fecha')} />
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <label>Salario bruto</label>
                  <input className="input mono" value={f.salario_bruto} onChange={set('salario_bruto')} placeholder="0,00" inputMode="decimal" />
                </div>
                <div className="field">
                  <label>IRPF retenido</label>
                  <input className="input mono" value={f.irpf_retenido} onChange={set('irpf_retenido')} placeholder="0,00" inputMode="decimal" />
                </div>
                <div className="field">
                  <label>Líquido</label>
                  <input className="input mono" value={f.liquido} onChange={set('liquido')} placeholder="0,00" inputMode="decimal" />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="field">
                <label>Tipo de movimiento</label>
                <select className="input" value={f.tipo} onChange={set('tipo')}>
                  <option value="gasto">Gasto · una factura que he recibido</option>
                  <option value="ingreso">Ingreso · una factura que he emitido</option>
                </select>
              </div>
              <div className="row">
                <div className="field">
                  <label>{f.tipo === 'gasto' ? 'Proveedor' : 'Cliente'}</label>
                  <input className="input" value={f.emisor} onChange={set('emisor')} placeholder="Nombre o razón social" />
                </div>
                <div className="field">
                  <label>NIF</label>
                  <input className="input mono" value={f.nif_emisor} onChange={set('nif_emisor')} placeholder="B12345678" />
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <label>Nº de factura</label>
                  <input className="input mono" value={f.num_referencia} onChange={set('num_referencia')} placeholder="000123" />
                </div>
                <div className="field">
                  <label>Fecha</label>
                  <input className="input" type="date" value={f.fecha} onChange={set('fecha')} />
                </div>
              </div>
              <div className="field">
                <label>Concepto</label>
                <input className="input" value={f.concepto} onChange={set('concepto')} placeholder="Qué se compró o se vendió" />
              </div>
              <div className="row">
                <div className="field">
                  <label>Base imponible</label>
                  <input className="input mono" value={f.base} onChange={set('base')} placeholder="0,00" inputMode="decimal" />
                </div>
                <div className="field">
                  <label>IGIC %</label>
                  <select className="input" value={f.igic_pct} onChange={set('igic_pct')}>
                    <option>0%</option><option>3%</option><option>7%</option>
                    <option>9,5%</option><option>15%</option><option>Exento</option>
                  </select>
                </div>
                <div className="field">
                  <label>Cuota IGIC</label>
                  <input className="input mono" value={f.igic} onChange={set('igic')} placeholder="0,00" inputMode="decimal" />
                </div>
              </div>
              <div className="field">
                <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={f.es_alquiler} onChange={set('es_alquiler')} />
                  <span>Es un alquiler de local</span>
                </label>
                {f.es_alquiler && (
                  <p className="tiny" style={{ marginTop: '.35rem' }}>
                    En Canarias el alquiler lleva IGIC del 7% y retención del 19%. El total al arrendador es base + IGIC − retención.
                  </p>
                )}
              </div>
              <div className="row">
                <div className="field">
                  <label>Retención</label>
                  <input className="input mono" value={f.retencion} onChange={set('retencion')} placeholder="0,00" inputMode="decimal" />
                </div>
                <div className="field">
                  <label>Total</label>
                  <input className="input mono" value={f.total} onChange={set('total')} placeholder="0,00" inputMode="decimal" />
                </div>
              </div>
            </>
          )}

          <SelectorArchivo archivo={archivo} onElegir={setArchivo}
            clienteId={cliente} deshabilitado={trialExpirado} />

          <div style={{ display: 'flex', gap: '.5rem', marginTop: '.6rem' }}>
            <button className="btn" style={{ flex: 1 }} disabled={espera} onClick={() => guardar(false)}>
              Guardar borrador
            </button>
            <button className="btn primary" style={{ flex: 1 }} disabled={espera} onClick={() => guardar(true)}>
              {espera ? 'Enviando…' : 'Enviar a mi asesoría'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
