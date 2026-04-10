/**
 * Uploads for logged-in customers. Do not use `/admin/media-library/upload` — it is admin-only (403).
 */
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export type UploadResult = { ok: true; url: string } | { ok: false; status?: number };

function parseUrl(data: Record<string, unknown>): string | undefined {
  const inner = data?.data as Record<string, unknown> | undefined;
  return (inner?.url as string) || (data?.url as string);
}

/** POST /media/image — field name must be `image`. Optional folder query. Retries as /media/document on 413. */
export async function uploadCustomerImage(file: File, token: string, folder: string): Promise<UploadResult> {
  const headers: HeadersInit = { Authorization: `Bearer ${token}` };

  const postDocument = async (): Promise<UploadResult> => {
    const form = new FormData();
    form.append('document', file);
    const res = await fetch(`${BASE_URL}/media/document`, { method: 'POST', headers, body: form });
    const data = res.ok ? ((await res.json().catch(() => ({}))) as Record<string, unknown>) : {};
    const url = parseUrl(data);
    return res.ok && url ? { ok: true, url } : { ok: false, status: res.status };
  };

  const form = new FormData();
  form.append('image', file);
  const res = await fetch(`${BASE_URL}/media/image?folder=${encodeURIComponent(folder)}`, {
    method: 'POST',
    headers,
    body: form,
  });
  const data = res.ok ? ((await res.json().catch(() => ({}))) as Record<string, unknown>) : {};
  const url = parseUrl(data);
  if (res.ok && url) return { ok: true, url };
  if (res.status === 413) return postDocument();
  return { ok: false, status: res.status };
}

/** POST /media/document — videos and other large/binary files (field `document`). */
export async function uploadCustomerDocument(file: File, token: string): Promise<UploadResult> {
  const headers: HeadersInit = { Authorization: `Bearer ${token}` };
  const form = new FormData();
  form.append('document', file);
  const res = await fetch(`${BASE_URL}/media/document`, { method: 'POST', headers, body: form });
  const data = res.ok ? ((await res.json().catch(() => ({}))) as Record<string, unknown>) : {};
  const url = parseUrl(data);
  return res.ok && url ? { ok: true, url } : { ok: false, status: res.status };
}

/** Stories: image → /media/image; video/audio → /media/document; oversized image → document after 413. */
export async function uploadCustomerStoryFile(file: File, token: string | null): Promise<UploadResult> {
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  const isVideo = file.type.startsWith('video/');
  const isAudio = file.type.startsWith('audio/');

  const postDocument = async (): Promise<UploadResult> => {
    const form = new FormData();
    form.append('document', file);
    const res = await fetch(`${BASE_URL}/media/document`, { method: 'POST', headers, body: form });
    const data = res.ok ? ((await res.json().catch(() => ({}))) as Record<string, unknown>) : {};
    const url = parseUrl(data);
    return res.ok && url ? { ok: true, url } : { ok: false, status: res.status };
  };

  if (!isVideo && !isAudio) {
    const form = new FormData();
    form.append('image', file);
    const res = await fetch(`${BASE_URL}/media/image?folder=stories`, { method: 'POST', headers, body: form });
    const data = res.ok ? ((await res.json().catch(() => ({}))) as Record<string, unknown>) : {};
    const url = parseUrl(data);
    if (res.ok && url) return { ok: true, url };
    if (res.status === 413) return postDocument();
    return { ok: false, status: res.status };
  }

  return postDocument();
}
