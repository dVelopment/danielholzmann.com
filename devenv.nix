{ pkgs, ... }:

{
  # https://devenv.sh/packages/
  packages = [
    pkgs.git
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

  # https://devenv.sh/processes/ — `devenv up` runs the Gatsby dev server.
  processes.gatsby.exec = "bun run develop";

  # See full reference at https://devenv.sh/reference/options/
}
