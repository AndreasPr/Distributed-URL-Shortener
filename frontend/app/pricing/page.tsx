import { PublicPage, publicMetadata } from "../../components/public/PublicPage";
export const metadata = publicMetadata("/pricing");
export default function Page() { return <PublicPage path="/pricing" />; }
