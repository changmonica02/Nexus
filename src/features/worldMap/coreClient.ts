export type MapMarker = {placementId:string;entityId:string;name:string;x:number;y:number;visible:boolean;label?:{visible:boolean};icon?:string};
export type MapView = {x:number;y:number;scale:number};
export type NaturalMapSettings = {widthKm?:number;template:string;seed:string;width:number;height:number;points:number;equator:number;precipitation:number};
export type MapPresentation = {markers?:MapMarker[];pickPoint?:string|null;generation?:NaturalMapSettings;overlays?:string[];contourInterval?:number;contourLabels?:boolean;preview?:boolean;freePan?:boolean;resize?:boolean;fit?:boolean;language?:string;layer?:string;zoom?:number;view?:MapView};
/** Only a private MessagePort crosses the opaque-origin core boundary. */
export class MapCoreClient {
  private sequence = 0;
  private pending = new Map<number, { resolve: (blob: Blob | undefined) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  private tail: Promise<unknown> = Promise.resolve();
  private closed = false;
  constructor(private port: MessagePort, onEvent: (data: {type:string;placementId?:string;requestId?:string;x?:number;y?:number;id?:number;blob?:Blob;view?:MapView;delta?:number;preview?:boolean}) => void) {
    port.onmessage = ({ data }) => {
      if (typeof data?.type === 'string') { onEvent(data); return; }
      const pending = this.pending.get(data?.id);
      if (!pending) return;
      clearTimeout(pending.timer); this.pending.delete(data.id);
      if (data.error) pending.reject(Error(String(data.error))); else pending.resolve(data.blob);
    };
    port.start();
  }
  request(type: 'load' | 'snapshot' | 'svg' | 'png' | 'configure' | 'generate' | 'view' | 'catalog' | 'heightmap-preview', blob?: Blob, settings?: MapPresentation): Promise<Blob | undefined> {
    const operation = this.tail.catch(() => undefined).then(() => new Promise<Blob | undefined>((resolve, reject) => {
      if (this.closed) { reject(Error('Map editor closed')); return; }
      const id = ++this.sequence;
      const timer = setTimeout(() => { this.pending.delete(id); reject(Error('Map operation timed out; keep the editor open and retry')); }, 120000);
      this.pending.set(id, {resolve, reject, timer}); this.port.postMessage({id, type, blob, settings});
    }));
    this.tail = operation;
    return operation;
  }
  acknowledge(id: number, error?: string) { this.port.postMessage({type:'persist-result',id,error}); }
  rememberSaved(blob:Blob) { if(!this.closed)this.port.postMessage({type:'remember-saved',blob}); }
  close() {
    this.closed = true;
    this.port.close();
    for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(Error('Map editor closed')); }
    this.pending.clear();
  }
}

export function downloadMapBlob(blob: Blob, title: string, extension: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  const name=title.replace(/[\\/:*?"<>|]/g,'_').split('').map(char=>char.charCodeAt(0)<32?'_':char).join('');
  link.href = url; link.download = `${name || 'map'}.${extension}`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}



