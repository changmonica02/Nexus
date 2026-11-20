"use client";
import {useLanguage} from '../lib/LanguageContext';
export type RegisterMapFlush = (id: string, flush: () => Promise<void>) => () => void;
export function WorldMapSyncStatus({localLabel,cloudState,warning=false}:{localLabel:string;cloudState?:{status:string;error?:string|null;pendingPushes?:number};warning?:boolean}){
  const {t}=useLanguage();
  const cloudLabel=cloudState?(cloudState.error||cloudState.status==='error'?t('worldMap.syncFailed'):cloudState.status==='syncing'?t('worldMap.syncing'):cloudState.status==='offline'?t('worldMap.offline'):cloudState.pendingPushes? t('worldMap.waitingSync'):cloudState.status==='connected'?t('worldMap.connected'):null):null;
  return <footer className="flex shrink-0 flex-wrap justify-end gap-x-3 gap-y-1 px-4 py-2 text-xs" role="status"><span className={warning?'font-medium text-amber-700 dark:text-amber-400':'opacity-60'}>{localLabel}</span>{cloudLabel&&<span role={cloudState?.error||cloudState?.status==='error'?'alert':undefined} className={cloudState?.error||cloudState?.status==='error'?'font-medium text-red-600 dark:text-red-400':'opacity-60'}>{cloudLabel}</span>}</footer>;
}
