import { PublicPage, publicMetadata } from "../../components/public/PublicPage";
export const metadata = publicMetadata("/about");
export default function Page() { return <PublicPage path="/about" />; }
