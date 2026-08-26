#!/usr/bin/env node
import Server from "./server.mjs";

const server = new Server();
server.start();

process.on("SIGINT", () => {
    server.finish() && process.exit(0);
    // or
    process.exit(1);
});

process.on("SIGQUIT", () => {
    server.finish() && process.exit(0);
    // or
    process.exit(1);
});

process.on("SIGTERM", () => {
    server.finish() && process.exit(0);
    // or
    process.exit(1);
});
