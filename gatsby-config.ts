import type { GatsbyConfig } from "gatsby";
import {
  buildClientSchema,
  getIntrospectionQuery,
  type IntrospectionQuery,
} from "gatsby/graphql";
import dotenv from "dotenv";

dotenv.config({
  path: `.env.${process.env.NODE_ENV}`,
});

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const githubHeaders = {
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
};

// GitHub's schema references its root `Query` type from places other than
// `Query.relay`, which is the only one Gatsby's third-party schema merge
// special-cases:
// - Apollo Federation's `union _Entity` (which includes `Query`) via
//   `Query._entities`;
// - `Query` implements `interface Node`, so it is one of Node's possible types.
// Either path drags GitHub's `Query` in as a second type named "Query" and
// schema building fails. Cut those references before the schema is built.
const createGitHubSchema = async () => {
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: { ...githubHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ query: getIntrospectionQuery() }),
  });
  const { data, errors } = (await response.json()) as {
    data?: IntrospectionQuery;
    errors?: unknown;
  };
  if (!response.ok || !data) {
    throw new Error(
      `GitHub introspection failed (${response.status}): ${JSON.stringify(errors)}`,
    );
  }

  const queryTypeName = data.__schema.queryType.name;
  const types = data.__schema.types
    .filter((type) => type.name !== "_Entity")
    .map((type) => {
      if (type.kind === "OBJECT" && type.name === queryTypeName) {
        return {
          ...type,
          fields: type.fields.filter((field) => field.name !== "_entities"),
          interfaces: [],
        };
      }
      if (type.kind === "INTERFACE") {
        return {
          ...type,
          possibleTypes: type.possibleTypes.filter(
            (possible) => possible.name !== queryTypeName,
          ),
        };
      }
      return type;
    });

  return buildClientSchema({ __schema: { ...data.__schema, types } });
};

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
      resolve: "gatsby-source-graphql",
      options: {
        typeName: "GitHub",
        fieldName: "github",
        url: GITHUB_GRAPHQL_URL,
        headers: githubHeaders,
        createSchema: createGitHubSchema,
      },
    },
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
