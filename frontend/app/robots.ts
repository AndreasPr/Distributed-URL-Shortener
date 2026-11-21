import type { MetadataRoute } from "next";
import { publicPaths, siteOrigin } from "../lib/content/public-pages";
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: publicPaths.map(path => `${path}$`), disallow: "/" }], sitemap: `${siteOrigin}/sitemap.xml` };
}
