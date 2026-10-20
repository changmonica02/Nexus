// Nexus adapter for our fork. No account credentials or Nexus persistence here.
import { Save } from '@/services/io/save';
import { loadNexusMap } from '@/services/io/load';
import { Services } from '@/services';

const session = new URL(location.href).searchParams.get('nexus');
let port: MessagePort | undefined, busy = false, ready = false, sequence = 0;
const pendingSaves = new Map<number, { resolve: () => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
const notify = (type: string) => port?.postMessage({ type });

async function image(type: 'svg' | 'png'): Promise<Blob> {
  const url = await Services.ExportMap.getMapURL(type, { fullMap: true });
  try {
    if (type === 'svg') return await (await fetch(url)).blob();
    const img = new Image();
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(Error('Image export failed')); img.src = url; });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    canvas.getContext('2d')!.drawImage(img, 0, 0);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Error('PNG export failed')), 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}

window.addEventListener('message', event => {
  if (event.source !== parent || event.data?.type !== 'nexus-map-connect' || event.data.session !== session || !event.ports[0] || port) return;
  port = event.ports[0];
  port.onmessage = async ({ data }) => {
    if (data?.type === 'persist-result') {
      const pending = pendingSaves.get(data.id);
      if (!pending) return;
      clearTimeout(pending.timer); pendingSaves.delete(data.id);
      if (data.error) pending.reject(Error(data.error)); else pending.resolve();
      return;
    }
    if (!Number.isSafeInteger(data?.id)) return;
    if (busy) { port!.postMessage({ id: data.id, error: 'Map operation already in progress' }); return; }
    busy = true;
    try {
      if (customization) throw Error('Complete the active heightmap/edit mode before saving or exporting');
      let blob: Blob | undefined;
      if (data.type === 'load') {
        if (!(data.blob instanceof Blob)) throw Error('Missing project');
        ready = false;
        await loadNexusMap(data.blob);
        ready = true;
      } else {
        if (!ready) throw Error('Map is not ready');
        if (data.type === 'snapshot') blob = new Blob([Save.prepareMapData()], { type: 'application/octet-stream' });
        else if (data.type === 'svg' || data.type === 'png') blob = await image(data.type);
        else throw Error('Unknown map operation');
      }
      port!.postMessage({ id: data.id, blob });
    } catch (error) { port!.postMessage({ id: data.id, error: error instanceof Error ? error.message : String(error) }); }
    finally { busy = false; }
  };
  port.start();
});

window.addEventListener('map:generated', () => {
  ready = true;
  if (!port) setTimeout(() => parent.postMessage({ type: 'nexus-map-ready', session }, '*'), 0);
  else notify('dirty');
});
for (const type of ['input', 'change', 'pointerup', 'keyup']) document.addEventListener(type, () => {
  if (ready && !busy) notify('dirty');
}, { passive: true });
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault(); event.stopImmediatePropagation(); notify('save-request');
  }
}, true);

window.nexusSaveProject = (blob: Blob) => new Promise<void>((resolve, reject) => {
  if (!port || !ready) return reject(Error('Nexus storage is not ready'));
  const id = ++sequence;
  const timer = setTimeout(() => { pendingSaves.delete(id); reject(Error('Nexus save timed out; keep the editor open and retry')); }, 120000);
  pendingSaves.set(id, { resolve, reject, timer });
  port.postMessage({ type: 'persist', id, blob });
});
declare global { interface Window { nexusSaveProject?: (blob: Blob) => Promise<void>; } }
