import LinkDetail from '../../../components/LinkDetail';
export default async function Page({params}: {params:Promise<{code:string}>}) {
  return <LinkDetail code={(await params).code} />;
}
