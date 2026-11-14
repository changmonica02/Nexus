"use client";
import type {ReactNode} from 'react';

/** Restricted Markdown presentation: no raw HTML, embeds, scripts or arbitrary URLs.
 * React escapes all text; this component never calls dangerouslySetInnerHTML.
 */
const urlSafe=(url:string)=>{try{const parsed=new URL(url);return parsed.protocol==='https:'||parsed.protocol==='http:'?parsed.href:null;}catch{return null;}};
export function SafeMarkdown({source}:{source:string}){
  const inline=(text:string):ReactNode[]=>{
    const token=/\[([^\]\n]+)\]\(([^\s)]+)\)|\*\*([^*\n]+)\*\*|`([^`\n]+)`|\*([^*\n]+)\*/g;
    const output:ReactNode[]=[];let last=0;let match:RegExpExecArray|null;
    while((match=token.exec(text))!==null){
      if(match.index>last)output.push(text.slice(last,match.index));
      const key=String(match.index);
      if(match[1]!==undefined){const href=urlSafe(match[2]);output.push(href?<a key={key} href={href} target="_blank" rel="noopener noreferrer" className="underline break-all">{match[1]}</a>:match[0]);}
      else if(match[3]!==undefined)output.push(<strong key={key}>{match[3]}</strong>);
      else if(match[4]!==undefined)output.push(<code key={key} className="rounded bg-zinc-500/10 px-1">{match[4]}</code>);
      else output.push(<em key={key}>{match[5]}</em>);
      last=token.lastIndex;
    }
    if(last<text.length)output.push(text.slice(last));
    return output;
  };
  const lines=source.replace(/\r\n?/g,'\n').split('\n');
  const nodes:ReactNode[]=[];let i=0;
  while(i<lines.length){
    const line=lines[i],key=i;
    if(!line.trim()){i++;continue;}
    if(/^\s*```/.test(line)){
      const code:string[]=[];i++;while(i<lines.length&&!/^\s*```/.test(lines[i]))code.push(lines[i++]);
      if(i<lines.length)i++;
      nodes.push(<pre key={key} className="overflow-x-auto rounded border border-[var(--color-border)] p-2 text-sm"><code>{code.join('\n')}</code></pre>);
      continue;
    }
    const heading=/^(#{1,3})\s+(.+)$/.exec(line);
    if(heading){nodes.push(<h3 key={key} className="font-semibold">{inline(heading[2])}</h3>);i++;continue;}
    const quote=/^>\s?(.*)$/.exec(line);
    if(quote){const part:string[]=[];while(i<lines.length&&/^>/.test(lines[i]))part.push(lines[i++].replace(/^>\s?/,''));nodes.push(<blockquote key={key} className="border-l-2 border-[var(--color-border)] pl-3 whitespace-pre-wrap">{inline(part.join('\n'))}</blockquote>);continue;}
    if(/^\s*[-*]\s+/.test(line)){const parts:string[]=[];while(i<lines.length&&/^\s*[-*]\s+/.test(lines[i]))parts.push(lines[i++].replace(/^\s*[-*]\s+/,''));nodes.push(<ul key={key} className="ml-5 list-disc space-y-1">{parts.map((part,n)=><li key={n}>{inline(part)}</li>)}</ul>);continue;}
    if(/^\s*\d+\.\s+/.test(line)){const parts:string[]=[];while(i<lines.length&&/^\s*\d+\.\s+/.test(lines[i]))parts.push(lines[i++].replace(/^\s*\d+\.\s+/,''));nodes.push(<ol key={key} className="ml-5 list-decimal space-y-1">{parts.map((part,n)=><li key={n}>{inline(part)}</li>)}</ol>);continue;}
    const paragraph:string[]=[];while(i<lines.length&&lines[i].trim()&&!/^(#{1,3}\s+|>\s?|\s*[-*]\s+|\s*\d+\.\s+|\s*```)/.test(lines[i]))paragraph.push(lines[i++]);
    if(!paragraph.length){nodes.push(<p key={key}>{inline(lines[i++])}</p>);continue;}
    nodes.push(<p key={key} className="whitespace-pre-wrap">{inline(paragraph.join('\n'))}</p>);
  }
  return <div data-safe-markdown className="min-w-0 space-y-3 break-words">{nodes}</div>;
}
