#!/usr/bin/env node
import Server from "./server.mjs";

console.log(
    "                                                                                " +
        "\n" +
        "▗▖ ▗▖ ▗▄▖ ▗▖ ▗▖ ▗▄▖       ▗▄▄▖▗▄▄▄▖▗▄▄▖      ▄▄▄▄      ▗▖ ▗▖▗▄▄▄▖▗▄▄▄▖▗▄▄▖  ▗▄▄▖" +
        "\n" +
        "▐▌▗▞▘▐▌ ▐▌▐▌ ▐▌▐▌ ▐▌     ▐▌     █  ▐▌ ▐▌        █      ▐▌ ▐▌  █    █  ▐▌ ▐▌▐▌   " +
        "\n" +
        "▐▛▚▖ ▐▌ ▐▌▐▛▀▜▌▐▛▀▜▌      ▝▀▚▖  █  ▐▛▀▘      █▀▀▀      ▐▛▀▜▌  █    █  ▐▛▀▘  ▝▀▚▖" +
        "\n" +
        "▐▌ ▐▌▝▚▄▞▘▐▌ ▐▌▐▌ ▐▌     ▗▄▄▞▘▗▄█▄▖▐▌        █▄▄▄      ▐▌ ▐▌  █    █  ▐▌   ▗▄▄▞▘" +
        "\n" +
        "                                                                                " +
        "\n" +
        "\n" +
        "(c) 2026 Open Fifth Ltd" +
        "\n",
);

const server = new Server();
server.init();

process.on("SIGINT", () => {
    (server.end() && process.exit(0)) || process.exit(1);
});

process.on("SIGQUIT", () => {
    (server.end() && process.exit(0)) || process.exit(1);
});

process.on("SIGTERM", () => {
    (server.end() && process.exit(0)) || process.exit(1);
});
