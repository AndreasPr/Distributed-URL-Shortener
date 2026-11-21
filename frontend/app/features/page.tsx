import { PublicPage, publicMetadata } from "../../components/public/PublicPage";
export const metadata = publicMetadata("/features");
export default function Page() { return <PublicPage path="/features" />; }
