import { useEffect, useState, useCallback } from 'react';
import { sb } from '../lib/supabase';
import { eur } from '../lib/format';
import { Spinner, Vacio, useToast, Tag } from '../components/ui';

const HOY = new Date();
const TRIM_ACTUAL = Math.ceil((HOY.getMonth() + 1) / 3);

const modelosDe = (d) => [
  { k: 'modelo_420', n: '420', t: 'IGIC trimestral',
    d: 'IGIC repercutido menos IGIC soportado' },
  { k: 'modelo_130', n: d?.modelo_renta || '130',
    t: d?.nombre_modelo_renta || 'Pago a cuenta del IRPF',
    d: d?.es_atribucion
      ? 'La entidad no lo presenta: cada socio presenta el suyo'
      : d?.modelo_renta === '202'
        ? 'No se calcula aquí: depende del Impuesto sobre Sociedades'
        : 'Rendimiento neto por el tipo aplicable, menos retenciones',
    inaplicable: d?.es_atribucion || d?.modelo_renta === '202' },
  { k: 'modelo_115', n: '115', t: 'Retenciones de alquileres',
    d: 'Lo retenido a los arrendadores' },
  { k: 'modelo_111', n: '111', t: 'Retenciones de trabajo',
    d: 'IRPF retenido en las nóminas' },
];

export default function Informes() {
  const avisar = useToast();
  const [clientes, setClientes] = useState([]);
  const [cliente, setCliente] = useState('');
  const [ejercicio, setEjercicio] = useState(HOY.getFullYear());
  const [trimestre, setTrimestre] = useState(TRIM_ACTUAL);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [calculando, setCalculando] = useState(false);

  useEffect(() => {
    sb.from('v_cartera_asesoria').select('cliente_id, nombre, emoji, mis_ambitos').order('nombre')
      .then(({ data }) => {
        setClientes(data || []);
        if (data?.length) setCliente(data[0].cliente_id);
        setCargando(false);
      });
  }, []);

  const calcular = useCallback(async () => {
    if (!cliente) return;
    setCalculando(true);
    const { data, error } = await sb.rpc('calcular_modelos_fiscales', {
      p_cliente_id: cliente, p_ejercicio: Number(ejercicio), p_trimestre: Number(trimestre),
    });
    setCalculando(false);
    if (error) { avisar(error.message, 'red'); setDatos(null); return; }
    setDatos(Array.isArray(data) ? data[0] : data);
  }, [cliente, ejercicio, trimestre, avisar]);

  useEffect(() => { calcular(); }, [calcular]);

  if (cargando) return <div style={{ display: 'grid', placeItems: 'center', padding: '3rem' }}><Spinner /></div>;

  if (!clientes.length) {
    return (
      <div className="card">
        <Vacio icono="📊" titulo="Aún no hay empresas que liquidar"
          texto="Añade una empresa y sus documentos para calcular sus modelos." />
      </div>
    );
  }

  const elegido = clientes.find((c) => c.cliente_id === cliente);
  const sinDatos = datos && datos.num_documentos === 0;
  const aCompensar = datos && Number(datos.modelo_420) < 0;

  return (
    <>
      <div className="card card-pad" style={{ marginBottom: '1.1rem' }}>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Empresa</label>
            <select className="input" value={cliente} onChange={(e) => setCliente(e.target.value)}>
              {clientes.map((c) => (
                <option key={c.cliente_id} value={c.cliente_id}>{c.emoji} {c.nombre}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, maxWidth: 130 }}>
            <label>Ejercicio</label>
            <select className="input" value={ejercicio} onChange={(e) => setEjercicio(e.target.value)}>
              {[0, 1, 2, 3].map((i) => {
                const a = HOY.getFullYear() - i;
                return <option key={a} value={a}>{a}</option>;
              })}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, maxWidth: 150 }}>
            <label>Trimestre</label>
            <select className="input" value={trimestre} onChange={(e) => setTrimestre(e.target.value)}>
              {[1, 2, 3, 4].map((t) => <option key={t} value={t}>T{t}</option>)}
            </select>
          </div>
        </div>

        {elegido?.mis_ambitos?.length > 0 && (
          <p className="tiny" style={{ marginTop: '.7rem' }}>
            Solo se cuentan los documentos de los ámbitos que llevas:{' '}
            {elegido.mis_ambitos.join(', ')}.
          </p>
        )}
      </div>

      {calculando && <div style={{ display: 'grid', placeItems: 'center', padding: '2rem' }}><Spinner /></div>}

      {!calculando && sinDatos && (
        <div className="card">
          <Vacio icono="🗓️" titulo={`Sin documentos en T${trimestre} de ${ejercicio}`}
            texto="Cuando haya facturas o nóminas de ese periodo, las cifras aparecerán aquí." />
        </div>
      )}

      {!calculando && datos && !sinDatos && (
        <>
          <div className="grid k4" style={{ marginBottom: '1.1rem' }}>
            {modelosDe(datos).map((m) => {
              const v = Number(datos[m.k]);
              const negativo = v < 0;
              return (
                <article key={m.k} className={`kpi ${negativo ? 'g' : ''}`}
                         style={m.inaplicable ? { opacity: .6, borderTopColor: 'var(--border2)' } : undefined}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span className="eyebrow">Modelo {m.n}</span>
                    {negativo && !m.inaplicable && <Tag color="green">A compensar</Tag>}
                    {m.inaplicable && <Tag>No aplica</Tag>}
                  </div>
                  <div className="num" style={{ margin: '.3rem 0 .15rem',
                       color: m.inaplicable ? 'var(--text3)' : negativo ? 'var(--green)' : undefined }}>
                    {m.inaplicable ? '—' : eur(Math.abs(v))}
                  </div>
                  <div style={{ fontSize: '.78rem', fontWeight: 500 }}>{m.t}</div>
                  <div className="tiny" style={{ marginTop: '.2rem' }}>{m.d}</div>
                </article>
              );
            })}
          </div>

          {datos.nota_fiscal && (
            <div className="card card-pad" style={{ marginBottom: '1.1rem', borderLeft: '3px solid var(--amber)' }}>
              <h3 style={{ marginBottom: '.3rem' }}>Ojo con la forma jurídica</h3>
              <p className="muted">{datos.nota_fiscal}</p>
            </div>
          )}

          {datos.es_atribucion && (
            <section className="card" style={{ marginBottom: '1.1rem' }}>
              <div className="card-head">
                <h2>Reparto entre socios</h2>
                <p className="muted" style={{ marginTop: '.2rem' }}>
                  Cada socio presenta su propio modelo 130 por su porcentaje de participación.
                </p>
              </div>
              {(!datos.desglose_socios || datos.desglose_socios.length === 0) ? (
                <div className="card-pad">
                  <p className="muted">
                    Esta entidad tributa en atribución de rentas pero no tiene socios registrados,
                    así que no se puede repartir el rendimiento. Añádelos en la ficha de la empresa.
                  </p>
                </div>
              ) : (
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr><th>Socio</th><th>NIF</th><th style={{textAlign:'right'}}>Participación</th>
                          <th style={{textAlign:'right'}}>Rendimiento</th><th style={{textAlign:'right'}}>Su modelo 130</th></tr>
                    </thead>
                    <tbody>
                      {datos.desglose_socios.map((s) => (
                        <tr key={s.nif}>
                          <td style={{ fontWeight: 500 }}>{s.nombre}</td>
                          <td className="mono">{s.nif}</td>
                          <td className="mono" style={{ textAlign: 'right' }}>{s.porcentaje}%</td>
                          <td className="mono" style={{ textAlign: 'right' }}>{eur(s.rendimiento)}</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{eur(s.modelo_130)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          <div className="grid k2">
            <section className="card">
              <div className="card-head"><h2>Cómo salen esos números</h2></div>
              <div className="tbl-wrap">
                <table>
                  <tbody>
                    <Fila l="Base de ingresos" v={datos.base_ingresos} />
                    <Fila l="IGIC repercutido" v={datos.igic_repercutido} tono="green" />
                    <Fila l="Base de gastos" v={datos.base_gastos} />
                    <Fila l="IGIC soportado" v={datos.igic_soportado} tono="green" />
                    <Fila l="Coste de personal" v={datos.coste_personal} />
                    <Fila l="Retenciones de alquiler" v={datos.retenciones_alquiler} tono="amber" />
                    <Fila l="Retenciones de nóminas" v={datos.retenciones_empleados} tono="amber" />
                    <Fila l="Rendimiento neto" v={datos.rendimiento_neto} fuerte />
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card">
              <div className="card-head"><h2>Resumen del trimestre</h2></div>
              <div className="card-pad">
                <div style={{ display: 'flex', justifyContent: 'space-between',
                     alignItems: 'baseline', paddingBottom: '.8rem', borderBottom: '1px solid var(--border)' }}>
                  <span className="muted">Total a ingresar</span>
                  <span className="num">{eur(datos.total_a_pagar)}</span>
                </div>
                <p className="muted" style={{ marginTop: '.9rem' }}>
                  Calculado sobre <strong>{datos.num_documentos}</strong>{' '}
                  {datos.num_documentos === 1 ? 'documento' : 'documentos'} de T{trimestre} de {ejercicio}.
                </p>
                {aCompensar && (
                  <p className="tiny" style={{ marginTop: '.6rem', color: 'var(--green)' }}>
                    El IGIC sale negativo: hay más soportado que repercutido, así que se compensa en el
                    siguiente trimestre en lugar de ingresarse.
                  </p>
                )}
                <p className="tiny" style={{ marginTop: '.9rem' }}>
                  Estas cifras salen de los documentos registrados. Repásalas antes de presentar
                  cualquier modelo: si falta una factura, falta en el cálculo.
                </p>
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}

const Fila = ({ l, v, tono, fuerte }) => (
  <tr>
    <td style={{ fontWeight: fuerte ? 600 : 400 }}>{l}</td>
    <td className="mono" style={{
      textAlign: 'right', whiteSpace: 'nowrap',
      fontWeight: fuerte ? 600 : 400,
      color: tono === 'green' ? 'var(--green)' : tono === 'amber' ? 'var(--amber)'
           : Number(v) < 0 ? 'var(--red)' : undefined,
    }}>
      {eur(v)}
    </td>
  </tr>
);
