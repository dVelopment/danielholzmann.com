{ pkgs, config, ... }:

{
  # https://devenv.sh/packages/
  packages = [
    pkgs.git
    pkgs._1password-cli
  ];

  # https://devenv.sh/languages/javascript/
  # Bun is the package manager and script runner; Gatsby itself still runs on
  # Node (its CLI shebang is `node`), so keep a Node runtime without npm.
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs-slim_22;
    bun.enable = true;
    bun.install.enable = true;
  };

  # From secretspec.toml via the devenv.yaml `secretspec` integration. Needed
  # by gatsby-source-graphql (GitHub GraphQL API) at build/develop time.
  env.GITHUB_TOKEN = config.secretspec.secrets.GITHUB_TOKEN or "";

  # https://devenv.sh/processes/ — `devenv up` runs the Gatsby dev server.
  processes.gatsby.exec = "bun run develop";

  # See full reference at https://devenv.sh/reference/options/
}
