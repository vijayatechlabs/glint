// Brand config. The engine reads this to theme + wire collections.
export const site = {
  brand: "Glint",
  domain: "example.com",
  baseUrl: "https://example.com",
  mount: "/",          // "/blog" to mount onto an app, "/" for standalone
  deployTarget: "cf-pages",          // cf-pages | coolify | netlify | vercel
  collections: ["blog"],
  seo: {
    titleTemplate: "%s — Glint",
    defaultDescription: "",
    ogImage: "/media/og-default.png",
  },
} as const;
