import { PublicPage, publicMetadata } from "../../components/public/PublicPage";
export const metadata = publicMetadata("/contact");
export default function Page() { return <PublicPage path="/contact" />; }
