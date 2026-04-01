{
  description = "PolyOdds local development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          system = "x86_64-linux";
          config.allowUnfree = true;
        };
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_24
            postgresql_18
            sqlx-cli
            pkg-config
            openssl
            claude-code
          ];

          shellHook = ''
            export DATABASE_URL="''${DATABASE_URL:-postgres://polyodds:polyodds@localhost:5432/polyodds}"
            export JWT_SECRET="''${JWT_SECRET:-dev-only-change-me-to-at-least-32-bytes}"
            export FRONTEND_ORIGIN="''${FRONTEND_ORIGIN:-http://localhost:5173}"
            export BIND_ADDR="''${BIND_ADDR:-127.0.0.1:3000}"
            export RUST_LOG="''${RUST_LOG:-backend=debug,tower_http=info}"
          '';
        };
      }
    );
}
