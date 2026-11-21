import { PublicPage, publicMetadata } from "../../components/public/PublicPage";
export const metadata = publicMetadata("/changelog");
export default function Page() { return <PublicPage path="/changelog" />; }
