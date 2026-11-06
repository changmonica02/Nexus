"use client";
import {useEffect,useMemo,useState} from 'react';
import {getSupabase} from '../../infrastructure/supabase/client';
import {observeDictionaryInvalidation} from '../dictionary/dictionaryInvalidation';
import type {StudyCard} from './studyFSRS';
import {resolveOfficialContent} from './officialContent';
export function useOfficialContent(cards:StudyCard[],refreshKey=''){
 const key=JSON.stringify(cards),stable=useMemo(()=>JSON.parse(key) as StudyCard[],[key]);
 const [resolved,setResolved]=useState<{key:string;cards:StudyCard[]}|null>(null);
 useEffect(()=>{let alive=true,request=0;const refresh=()=>{const n=++request;void resolveOfficialContent(stable,getSupabase(),()=>alive&&n===request).then(result=>{if(alive&&n===request)setResolved({key,cards:result});});};refresh();const stop=observeDictionaryInvalidation(refresh);window.addEventListener('online',refresh);return()=>{alive=false;stop();window.removeEventListener('online',refresh);};},[key,stable,refreshKey]);
 return resolved?.key===key?resolved.cards:cards;
}
