"use client";
import Link from 'next/link';
import {createContext,useContext,type ComponentProps} from 'react';
/** Standalone reading uses normal links; embedded reading stays in its own history. */
export const DictionaryReadingNavigation=createContext<((href:string)=>void)|null>(null);
export default function DictionaryReadLink(props:ComponentProps<typeof Link>){
  const navigate=useContext(DictionaryReadingNavigation);
  if(!navigate)return <Link {...props}/>;
  const href=typeof props.href==='string'?props.href:String(props.href.pathname??'/dictionary');
  return <a {...props} href={href} onClick={event=>{
    props.onClick?.(event);
    if(event.defaultPrevented)return;
    event.preventDefault();event.stopPropagation();navigate(href);
  }}/>;
}
