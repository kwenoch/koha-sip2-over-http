#!/usr/bin/env node
import Client from "./client.mjs";

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

const client = new Client();
client.init();

process.on("SIGINT", () => {
    (client.end() && process.exit(0)) || process.exit(1);
});

process.on("SIGQUIT", () => {
    (client.end() && process.exit(0)) || process.exit(1);
});

process.on("SIGTERM", () => {
    (client.end() && process.exit(0)) || process.exit(1);
});
