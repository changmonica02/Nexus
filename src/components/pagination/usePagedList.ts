"use client";
import {useEffect,useRef,useState} from 'react';
import {validDataPage} from './model';
export interface PagedData {page:number;total?:number}
/** Retain the last successful page on failure; only the latest request may commit. */
export function usePagedList<T extends PagedData>(key:string,page:number,size:number,load:(page:number)=>Promise<T>,onInvalidPage:(page:number)=>void){
 const callbacks=useRef({load,onInvalidPage});useEffect(()=>{callbacks.current={load,onInvalidPage};});
 const [retry,setRetry]=useState(0),[state,setState]=useState<{key:string;request:string;data:T|null;error:string}>({key,request:'',data:null,error:''});
 const request=JSON.stringify([key,page,size,retry]);
 useEffect(()=>{let active=true;
  void callbacks.current.load(page).then(data=>{if(!active)return;if(data.total!==undefined){const valid=validDataPage(page,data.total,size);if(valid!==page){callbacks.current.onInvalidPage(valid);return;}}
   setState({key,request,data,error:''});
  }).catch(e=>{if(active)setState(old=>({key,request,data:old.key===key?old.data:null,error:e instanceof Error?e.message:String(e)}));});return()=>{active=false;};
 },[key,page,size,retry,request]);
 return {data:state.key===key?state.data:null,loading:state.request!==request,error:state.request===request?state.error:'',retry:()=>setRetry(n=>n+1)};
}
