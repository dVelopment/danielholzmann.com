{ pkgs, ... }:

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

  # See full reference at https://devenv.sh/reference/options/
}
