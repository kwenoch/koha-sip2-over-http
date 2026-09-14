#!/usr/bin/env node
import Client from "./client.mjs";

const client = new Client();
client.start();

process.on("SIGINT", () => {
    (client.finish() && process.exit(0)) || process.exit(1);
});

process.on("SIGQUIT", () => {
    (client.finish() && process.exit(0)) || process.exit(1);
});

process.on("SIGTERM", () => {
    (client.finish() && process.exit(0)) || process.exit(1);
});
