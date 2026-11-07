"use client";
import {usePaginationLanguage} from '../lib/LanguageContext';
export default function WorldMapAttribution(){
 const {t}=usePaginationLanguage();
 return <section aria-label={t('worldMap.licenses')} className="space-y-3 break-words text-sm"><h4 className="font-semibold">{t('worldMap.licenses')}</h4><p>{t('worldMap.attribution')}</p><ul className="space-y-2 [&_a]:underline"><li><a href="https://github.com/Azgaar/Fantasy-Map-Generator/tree/b4a0dcb933586a57242508f558f775da16c35c64" target="_blank" rel="noreferrer">{t('worldMap.source')}</a></li><li><a href="/world-map/core/AZGAAR-LICENSE.txt" target="_blank" rel="noreferrer">MIT License</a></li><li><a href="/world-map/core/THIRD-PARTY-NOTICES.txt" target="_blank" rel="noreferrer">{t('worldMap.notices')}</a></li></ul></section>;
}
