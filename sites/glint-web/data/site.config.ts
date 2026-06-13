// Brand config. The engine reads this to theme + wire collections.
export const site = {
  brand: "Glint",
  domain: "glint.vijayatech.in",
  baseUrl: "https://glint.vijayatech.in",
  mount: "/",
  deployTarget: "coolify",
  collections: ["blog"],
  logo: "",
  favicon: "",
  nav: [
    { label: "Docs", href: "https://github.com/vijayatechlabs/glint" },
    { label: "Examples", href: "https://glint.vijayatech.in/blog/" },
  ],
  footer: [
    { label: "GitHub", href: "https://github.com/vijayatechlabs/glint" },
    { label: "VijayaTech", href: "https://vijayatech.in" },
  ],
  social: {
    github: "https://github.com/vijayatechlabs/glint",
  },
  seo: {
    titleTemplate: "%s — Glint",
    defaultDescription:
      "The lightning publishing engine for the AI era. Git-native, static-output, agent-first, AEO-native.",
    ogImage: "/media/og-default.png",
  },
} as const;
