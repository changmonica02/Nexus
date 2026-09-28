import DictionaryAdmin from "../../../features/dictionary/DictionaryAdmin";
export default async function Page({searchParams}:{searchParams:Promise<{entry?:string;new?:string}>}) {
  const params=await searchParams;
  const entryId=typeof params.entry==='string'?params.entry:undefined;
  const newKind=params.new==='word'||params.new==='prefix'||params.new==='root'?params.new:undefined;
  return <DictionaryAdmin entryId={entryId} newKind={entryId?undefined:newKind}/>;
}
