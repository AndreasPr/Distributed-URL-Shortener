import { PublicPage, publicMetadata } from "../../components/public/PublicPage";
export const metadata = publicMetadata("/use-cases");
export default function Page() { return <PublicPage path="/use-cases" />; }
