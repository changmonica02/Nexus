"use client";
import {useCallback} from 'react';
import {usePaginationLanguage} from '../../lib/LanguageContext';
/** Uses the workspace language; saved content is never translated. */
export function useDictionaryText(){
  const {t}=usePaginationLanguage();
  return useCallback((text:string)=>{const key='dictionary.text.'+text,value=t(key);return value===key?text:value;},[t]);
}
