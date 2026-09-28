import EtymologyBrowser from "../../../features/etymology/EtymologyBrowser";

export default async function EtymologyPage({params}: {params: Promise<{path?: string[]}>}) {
  const {path=[]}=await params;
  return <EtymologyBrowser path={path}/>;
}
