import type { GatsbyConfig } from "gatsby";

const config: GatsbyConfig = {
  siteMetadata: {
    title: "Hi! I'm Daniel!",
    description: "I'm Daniel, a full-stack developer and AI engineer!",
    author: "Daniel Holzmann",
    siteUrl: "https://danielholzmann.com",
  },
  graphqlTypegen: true,
  plugins: [
    "gatsby-plugin-postcss",
    "gatsby-plugin-image",
    "gatsby-plugin-sharp",
    "gatsby-transformer-sharp",
    {
      resolve: "gatsby-source-filesystem",
      options: {
        name: "images",
        path: "./src/images/",
      },
      __key: "images",
    },
    {
      resolve: "gatsby-plugin-manifest",
      options: {
        name: "Daniel Holzmann - Full-Stack Developer & AI Engineer",
        short_name: "Daniel H.",
        start_url: "/",
        background_color: "#0A0A0F",
        theme_color: "#00FF41",
        display: "minimal-ui",
        icon: "src/images/icon.png",
      },
    },
    "gatsby-plugin-sitemap",
    {
      resolve: "gatsby-plugin-google-gtag",
      options: {
        trackingIds: ["UA-159299329-1"],
        gtagConfig: {
          anonymize_ip: true,
        },
        pluginConfig: {
          head: true,
        },
      },
    },
  ],
};

export default config;
