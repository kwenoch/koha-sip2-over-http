#!/usr/bin/env node

import * as fs from "fs";
import * as net from "node:net";
import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";
import { v6 as uuid } from "uuid";
import { WebSocketServer } from "ws";
import * as yaml from "yaml";

const rl = new readline.createInterface({ input, output });

class Server {
    constructor() {
        this.config = this.loadConfig();
        this.websocketServer = null;

        if (!this.config) process.exit(127);

        console.log("[INFO]\tLoaded server . . . ");
    }

    init() {
        const websocketUri =
            "ws://" +
            this.config.websocket.host +
            ":" +
            this.config.websocket.port;
        const netsocketUri =
            "tcp://" + this.config.sip2.host + ":" + this.config.sip2.port;

        console.log("[INFO]\tLaunching websocket server . . . ");
        this.websocketServer = new WebSocketServer({
            host: this.config.websocket.host,
            port: this.config.websocket.port,
        });
        console.log(
            "[INFO]\tWebsocket server running on " + websocketUri + " . . . ",
        );

        this.websocketServer.on("connection", (websocket) => {
            console.log("[INFO]\tLaunching netsocket client . . . ");
            websocket["netsocket"] = new net.createConnection({
                host: this.config.sip2.host,
                port: this.config.sip2.port,
            });
            websocket.netsocket["initialised"] = false;
            console.log(
                "[INFO]\tNetsocket client running on " +
                    netsocketUri +
                    " . . . ",
            );

            this.manageSession(websocket);
        });

        this.websocketServer.on("close", () => {
            this.websocketServer.clients.forEach((client) => {
                if (client.readyState === 1) client.terminate();
                return true;
            });
        });

        this.websocketServer.on("error", (error) => {
            this.websocketServer.close();

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

    manageSession(websocket) {
        const netsocket = websocket.netsocket;
        websocket["clientId"] = uuid().toString();

        console.log("[INFO]\tNew netsocket connected . . . ");

        websocket.on("open", () => {
            // nothing to do, keep event listener
            // to nullify default behaviours
        });

        netsocket.on("connect", () => {
            // nothing to do, keep event listener
            // to nullify default behaviours
        });

        websocket.on("message", (data) => {
            const message = JSON.parse(data);
            console.log(
                "[INFO]\tWebsocket message received: " +
                    JSON.stringify(message),
            );

            if (message.signal == "CLIENT_AUTH_INIT")
                this.clientAuthInit(websocket, message);
            else if (message.signal == "CLIENT_MSG")
                this.clientMsg(netsocket, message);
        });

        netsocket.on("data", (data) => {
            const message = data.toString().replace(/\r?\n|\r/g, "");
            console.log("[INFO]\tNetsocket message received: " + message);

            this.serverMsg(websocket, message);
        });

        websocket.on("close", () => {
            console.log(
                "[INFO]\tTerminating websocket connection: " +
                    websocket.clientId,
            );
            if (websocket.netsocket != undefined) websocket.netsocket.end();
        });

        netsocket.on("end", () => {
            console.log("[INFO]\tTerminating netsocket connection  . . . ");
            if (websocket != undefined) websocket.terminate();
        });

        websocket.on("error", (error) => {
            console.error(error);
            netsocket.end();
            websocket.terminate();
        });

        netsocket.on("error", (error) => {
            console.error(error);
            netsocket.end();
            websocket.terminate();
        });

        // accept sip messages from stdin
        rl.on("line", (input) => {
            this.serverMsg(websocket, input);
        });
    }

    clientAuthInit(websocket, message) {
        message["id"] = websocket.clientId;
        console.log("[INFO]\tNew client ID: " + websocket.clientId);

        message["signal"] = "SERVER_AUTH_ACK";
        message["data"] = { result: "AUTH_OK" };

        websocket.netsocket.initialised = true;
        console.log(
            "[INFO]\tClient initialisation complete: " + websocket.clientId,
        );

        return this._send_websocket_message(websocket, message);
    }

    clientMsg(netsocket, message) {
        let readyStateEvaluator = setInterval(() => {
            if (netsocket.initialised === true) {
                if (message.data) {
                    this._send_netsocket_message(netsocket, message.data);
                } else {
                    console.log("[ERROR]\tNo message data found!");
                }
                clearInterval(readyStateEvaluator);
            }
        });
    }

    serverMsg(websocket, payload = "") {
        return this._send_websocket_message(websocket, {
            id: websocket.clientId,
            signal: "SERVER_MSG",
            data: payload,
        });
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
        return this.websocketServer.close();
    }
}

export default Server;
