export function downloadMapBlob(blob: Blob, title: string, extension: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  const name=title.replace(/[\\/:*?"<>|]/g,'_').split('').map(char=>char.charCodeAt(0)<32?'_':char).join('');
  link.href = url; link.download = `${name || 'map'}.${extension}`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
