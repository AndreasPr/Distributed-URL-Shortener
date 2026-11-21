import { PublicPage, publicMetadata } from "../../components/public/PublicPage";
export const metadata = publicMetadata("/docs");
export default function Page() { return <PublicPage path="/docs" />; }
