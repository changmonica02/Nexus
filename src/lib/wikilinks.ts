/**
 * 從正????中解?出???[[?面標?]] 形???wikilink 標?清單?? * ?Backlinks / Outgoing Links（MVP-1 Wikilink ?能）使?? */
export function extractWikilinks(text: string): string[] {
  const regex = /\[\[([^\]]+)\]\]/g;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const title = match[1].trim();
    if (title && !matches.includes(title)) {
      matches.push(title);
    }
  }
  return matches;
}