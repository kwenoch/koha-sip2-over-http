#!/usr/bin/env node
import Client from "./client.mjs";

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
