export interface ConfirmOptions {title?:string;message:string;confirmLabel?:string;cancelLabel?:string;danger?:boolean}
export interface DialogRequest extends ConfirmOptions {id:number;notice:boolean}
let sequence=0;
const queue:{request:DialogRequest;resolve:(value:boolean)=>void}[]=[];
const listeners=new Set<()=>void>();
const emit=()=>listeners.forEach(fn=>fn());
export const subscribeDialog=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};};
export const currentDialog=()=>queue[0]?.request??null;
export function finishDialog(id:number,value:boolean){if(queue[0]?.request.id!==id)return;queue.shift()!.resolve(value);emit();}
function request(options:ConfirmOptions,notice:boolean):Promise<boolean>{return new Promise(resolve=>{queue.push({request:{...options,id:++sequence,notice},resolve});emit();});}
export function confirmDialog(options:string|ConfirmOptions):Promise<boolean>{return request(typeof options==='string'?{title:'確認操作',message:options,danger:true}:options,false);}
export async function notifyDialog(message:string):Promise<void>{await request({title:'提示',message,confirmLabel:'知道了'},true);}
