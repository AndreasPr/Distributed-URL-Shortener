import { headers } from "next/headers";
import { ReportPage } from "../../../components/TrustPages";
export default async function Page({ params }: { params: Promise<{code: string}> }) {
  const { code } = await params;
  return <ReportPage code={code} nonce={(await headers()).get("x-nonce") || ""} />;
}
