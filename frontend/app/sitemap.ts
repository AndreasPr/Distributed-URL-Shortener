import type { MetadataRoute } from "next";
import { publicPaths, siteOrigin } from "../lib/content/public-pages";
export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths.map(path => ({ url: new URL(path, siteOrigin).href }));
}
