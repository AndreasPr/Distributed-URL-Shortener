import { proxyShort } from "../../../../lib/short-link";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  return proxyShort((await params).code);
}
