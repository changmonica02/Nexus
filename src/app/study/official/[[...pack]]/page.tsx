import OfficialPackLibrary from '../../../../features/study/components/OfficialPackLibrary';
export default async function Page({params}:{params:Promise<{pack?:string[]}>}) {
  const {pack}=await params;return <OfficialPackLibrary packId={pack?.join('/')}/>;
}
