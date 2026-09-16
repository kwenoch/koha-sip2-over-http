#!/usr/bin/env node

import * as fs from "fs";
import * as net from "node:net";
import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";
import { WebSocket } from "ws";
import * as yaml from "yaml";

const rl = readline.createInterface({ input, output });

class Client {
    constructor() {
        this.config = this.loadConfig();
        this.netsocketServer = null;

        if (!this.config) process.exit(127);

        console.log("[INFO]\tLoaded client . . . ");
    }

    init() {
        const websocketUri =
            "ws://" +
            this.config.websocket.host +
            ":" +
            this.config.websocket.port;
        const netsocketUri =
            "tcp://" + this.config.sip2.host + ":" + this.config.sip2.port;

        console.log("[INFO]\tLaunching netsocket server . . . ");
        this.netsocketServer = new net.createServer();
        this.netsocketServer.listen({
            host: this.config.sip2.host,
            port: this.config.sip2.port,
        });
        console.log(
            "[INFO]\tNetsocket server running on " + netsocketUri + " . . . ",
        );

        this.netsocketServer.on("connection", (netsocket) => {
            console.log("[INFO]\tLaunching websocket client . . . ");
            netsocket["websocket"] = new WebSocket(websocketUri);
            console.log(
                "[INFO]\tWebsocket client running on " +
                    websocketUri +
                    " . . . ",
            );
            netsocket.websocket["initialised"] = false;

            this.manageSession(netsocket);
        });

        this.netsocketServer.on("close", () => {
            // nothing to do, keep event listener
            // to nullify default behaviours
        });

        this.netsocketServer.on("error", (error) => {
            this.netsocketServer.close();

            if (error.errno) {
                return process.exit(error.errno);
            } else {
                return process.exit(127);
            }
        });
    }

    loadConfig() {
        const configFile = fs.readFileSync(
            import.meta.dirname + "/" + "config.yml",
            "utf8",
        );
        const config = yaml.parse(configFile);

        if (typeof config === "object") {
            console.log("[INFO]\tConfig loaded successfully . . . ");
            return config;
        } else {
            console.log("[ERROR]\tConfig loading failed . . . ");
            return false;
        }
    }

    manageSession(netsocket) {
        const websocket = netsocket.websocket;

        console.log("[INFO]\tNew websocket connected . . . ");

        netsocket.on("connect", () => {
            // nothing to do, keep event listener
            // to nullify default behaviours
        });

        websocket.on("open", () => {
            this._send_websocket_message(websocket, {
                signal: "CLIENT_AUTH_INIT",
            });
        });

        netsocket.on("data", (data) => {
            const message = data.toString().replace(/\r?\n|\r/g, "");
            console.log("[INFO]\tNetsocket message received: " + message);

            this.clientMsg(websocket, message);
        });

        websocket.on("message", (data) => {
            const message = JSON.parse(data);
            console.log(
                "[INFO]\tWebsocket message received: " +
                    JSON.stringify(message),
            );

            if (message.signal == "SERVER_AUTH_ACK")
                this.serverAuthAck(websocket, message);
            else if (message.signal == "SERVER_MSG")
                this.serverMsg(netsocket, message);
        });

        netsocket.on("end", () => {
            console.log("[INFO]\tTerminating netsocket connection  . . . ");
            if (netsocket.websocket != undefined)
                netsocket.websocket.terminate();
        });

        websocket.on("close", () => {
            console.log("[INFO]\tTerminating websocket connection . . . ");
            if (netsocket != undefined) netsocket.end();
        });

        netsocket.on("error", (error) => {
            console.error(error);
            websocket.terminate();
            netsocket.end();
        });

        websocket.on("error", (error) => {
            console.error(error);
            websocket.terminate();
            netsocket.end();
        });

        // accept sip messages from stdin
        rl.on("line", (input) => {
            this.clientMsg(websocket, input);
        });
    }

    clientMsg(websocket, payload = "") {
        let readyStateEvaluator = setInterval(() => {
            if (websocket.initialised === true) {
                this._send_websocket_message(websocket, {
                    id: this.clientId,
                    signal: "CLIENT_MSG",
                    data: payload,
                });
                clearInterval(readyStateEvaluator);
            }
        }, 15);

        return true;
    }

    serverAuthAck(websocket, message) {
        this.clientId = message["id"];
        console.log("[INFO]\tNew client ID: " + this.clientId);

        websocket.initialised = true;
        console.log("[INFO]\tClient initialisation complete . . . ");

        message["signal"] = "CLIENT_AUTH_ACK";
        delete message.data;

        return this._send_websocket_message(websocket, message);
    }

    serverMsg(netsocket, message) {
        if (!message.data) {
            console.log("[ERROR]\tNo message data found!");
            return;
        }

        this._send_netsocket_message(netsocket, message.data);
        return true;
    }

    _send_websocket_message(websocket, input = {}) {
        const message = JSON.stringify(input);
        if (typeof message !== "string") {
            console.log("[ERR]\tWebsocket message could not be stringified");
            return false;
        }

        let readyStateEvaluator = setInterval(() => {
            if (websocket.readyState === 1) {
                websocket.send(message);
                console.log("[INFO]\tWebsocket message sent: " + message);
                clearInterval(readyStateEvaluator);
            }
        }, 15);

        return true;
    }

    _send_netsocket_message(netsocket, input = "") {
        const message = input.toString().replace(/\r?\n|\r/g, "");
        if (typeof message !== "string") {
            console.log("[ERR]\tNetsocket message could not be stringified");
            return false;
        }

        let readyStateEvaluator = setInterval(() => {
            if (netsocket.readyState === "open") {
                netsocket.write(message + "\r\n", "utf-8");
                console.log("[INFO]\tNetsocket message sent: " + message);
                clearInterval(readyStateEvaluator);
            }
        }, 15);

        return true;
    }

    end() {
        return this.netsocketServer.close();
    }
}

export default Client;
