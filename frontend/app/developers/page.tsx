import { PublicPage, publicMetadata } from "../../components/public/PublicPage";
export const metadata = publicMetadata("/developers");
export default function Page() { return <PublicPage path="/developers" />; }
