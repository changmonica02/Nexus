export function totalPages(total:number,pageSize:number):number {
  if(!Number.isSafeInteger(total)||total<0||!Number.isSafeInteger(pageSize)||pageSize<1)throw new Error('Invalid pagination count');
  return Math.ceil(total/pageSize);
}
/** User input is rejected, never clamped. Internally all page indexes are zero-based. */
export function parsePage(value:string,pages:number):number|null {
  if(!/^\d+$/.test(value.trim()))return null;
  const page=Number(value.trim());
  return Number.isSafeInteger(page)&&page>=1&&page<=pages?page-1:null;
}
export function validDataPage(page:number,total:number,size:number):number {
  return Math.min(Math.max(0,page),Math.max(0,totalPages(total,size)-1));
}
