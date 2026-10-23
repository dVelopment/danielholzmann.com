{ pkgs, config, ... }:

{
  # https://devenv.sh/packages/
  packages = [
    pkgs.git
    pkgs._1password-cli
  ];

  # https://devenv.sh/languages/javascript/
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22;
    npm.enable = true;
    npm.install.enable = true;
  };

  # From secretspec.toml via the devenv.yaml `secretspec` integration. Needed
  # by gatsby-source-graphql (GitHub GraphQL API) at build/develop time.
  env.GITHUB_TOKEN = config.secretspec.secrets.GITHUB_TOKEN or "";

  # See full reference at https://devenv.sh/reference/options/
}
