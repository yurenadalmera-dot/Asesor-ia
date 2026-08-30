import { sb } from './supabase';

export const BUCKET = 'justificantes';
export const MAX_BYTES = 25 * 1024 * 1024;
export const TIPOS_OK = [
  'application/pdf', 'image/jpeg', 'image/png',
  'image/heic', 'image/heif', 'image/webp',
];

export async function hashArchivo(file) {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0')).join('');
}

function limpiarNombre(nombre) {
  return nombre
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-80);
}

export function validarArchivo(file) {
  if (!file) return 'No has elegido ningún archivo';
  if (file.size > MAX_BYTES) {
    return `El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB. El máximo son 25 MB.`;
  }
  if (file.size === 0) return 'El archivo está vacío';
  if (!TIPOS_OK.includes(file.type)) {
    return 'Solo se admiten PDF y fotos (JPG, PNG, HEIC, WEBP)';
  }
  return null;
}

export async function subirJustificante(file, clienteId) {
  const problema = validarArchivo(file);
  if (problema) return { error: problema };
  if (!clienteId) return { error: 'Falta la empresa a la que pertenece el documento' };

  let hash;
  try {
    hash = await hashArchivo(file);
  } catch {
    hash = null;
  }

  const path = `${clienteId}/${crypto.randomUUID()}-${limpiarNombre(file.name)}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    const m = error.message || '';
    if (/row-level security|Unauthorized/i.test(m)) {
      return { error: 'No tienes permiso para subir documentos de esta empresa, o tu plan está bloqueado' };
    }
    if (/mime|Invalid/i.test(m)) return { error: 'Ese tipo de archivo no se admite' };
    if (/exceeded|too large/i.test(m)) return { error: 'El archivo supera los 25 MB' };
    return { error: m || 'No se pudo subir el archivo' };
  }

  return { path, hash, mime: file.type, bytes: file.size, nombre: file.name };
}

export async function buscarDuplicado(clienteId, hash) {
  if (!hash || !clienteId) return null;
  const { data, error } = await sb.rpc('buscar_duplicado_por_hash', {
    p_cliente: clienteId, p_hash: hash,
  });
  if (error) return null;
  const r = Array.isArray(data) ? data[0] : data;
  return r?.existe ? r : null;
}

export async function urlJustificante(path, segundos = 300) {
  if (!path) return null;
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, segundos);
  return error ? null : data.signedUrl;
}

export async function abrirJustificante(path) {
  const url = await urlJustificante(path);
  if (url) window.open(url, '_blank', 'noopener');
  return !!url;
}

export const pesoLegible = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};
