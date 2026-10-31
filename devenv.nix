{ pkgs, ... }:

{
  # https://devenv.sh/packages/
  # Bun is the only JS runtime (see bunfig.toml). No Node.
  packages = [
    pkgs.git
    pkgs.bun
  ];

  # https://devenv.sh/tasks/
  tasks."site:install" = {
    # Frozen: an older bun or a package.json/bun.lock drift errors instead of rewriting
    # bun.lock. devenv reports the failed task (✖) but still opens the shell.
    exec = "bun install --frozen-lockfile";
    before = [ "devenv:enterShell" ];
  };

  # Headless Chromium for the printed-CV check in `bun test`; downloads once, then no-ops.
  tasks."site:browsers" = {
    exec = "bunx playwright install chromium";
    after = [ "site:install" ];
    before = [ "devenv:enterShell" ];
  };

  # https://devenv.sh/processes/ — `devenv up` runs the Astro dev server.
  processes.astro.exec = "bun run dev";

  # See full reference at https://devenv.sh/reference/options/
}
