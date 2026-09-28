"use client";
import {useEffect,type RefObject} from 'react';
import {bindMenuDismiss} from './menuDismiss';
export function useMenuDismiss(open:boolean,roots:RefObject<HTMLElement|null>[],close:()=>void){
  useEffect(()=>{if(!open)return;return bindMenuDismiss(document,target=>roots.some(root=>target instanceof Node&&root.current?.contains(target)),close);},[open,roots,close]);
}
