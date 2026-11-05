import DictionaryReviewPage from "../../../../features/dictionary/DictionaryReviewPage";

export default async function Page({searchParams}:{searchParams:Promise<{entry?:string}>}) {
  const params=await searchParams;
  const entryId=typeof params.entry==="string"&&/^[0-9a-f-]{36}$/i.test(params.entry)?params.entry:undefined;
  return <DictionaryReviewPage entryId={entryId}/>;
}
