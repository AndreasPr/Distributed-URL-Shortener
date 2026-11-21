import { PublicPage, publicMetadata } from "../components/public/PublicPage";
export const metadata = publicMetadata("/");
export default function Page() { return <PublicPage path="/" />; }
