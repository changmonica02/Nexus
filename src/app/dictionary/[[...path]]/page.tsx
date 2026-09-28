import DictionaryBrowser from '../../../features/dictionary/DictionaryBrowser';
export default async function Page({params}:{params:Promise<{path?:string[]}>}) {
  const {path=[]}=await params;return <DictionaryBrowser path={path}/>;
}
