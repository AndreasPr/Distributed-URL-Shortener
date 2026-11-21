import { PublicPage, publicMetadata } from "../../components/public/PublicPage";
export const metadata = publicMetadata("/security");
export default function Page() { return <PublicPage path="/security" />; }
