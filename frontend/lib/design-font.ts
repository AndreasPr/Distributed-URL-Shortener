import localFont from "next/font/local";
export const designFont = localFont({
  src: "../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-design", display: "swap", weight: "100 900",
});
