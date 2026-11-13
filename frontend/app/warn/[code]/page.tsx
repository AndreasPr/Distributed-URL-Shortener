import { WarningPage } from "../../../components/TrustPages";
export default async function Page({ params }: { params: Promise<{code: string}> }) {
  const { code } = await params;
  return <WarningPage code={code} />;
}
