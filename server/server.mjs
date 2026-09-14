#!/usr/bin/env node

import * as net from "node:net";
import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";
import { v6 as uuid } from "uuid";
import { WebSocketServer } from "ws";

const rl = new readline.createInterface({ input, output });

const config = {
    websocket: {
        host: "localhost",
        port: 8765,
    },
    sip2: {
        host: "localhost",
        port: 6043,
    },
};

class Server {
    constructor() {
        this.websocketServer = null;
        console.log("[INFO]\tLoaded server . . . ");
    }

    start() {
        const netsocketUri =
            "tcp://" + config.sip2.host + ":" + config.sip2.port;

        console.log("[INFO]\tLaunching websocket server . . . ");
        this.websocketServer = new WebSocketServer({
            port: config.websocket.port,
        });
        console.log(
            "[INFO]\tWebsocket server running on ws://localhost:8765 . . . ",
        );

        this.websocketServer.on("connection", (websocket) => {
            console.log("[INFO]\tLaunching netsocket client . . . ");
            const netsocket = new net.createConnection({
                host: config.sip2.host,
                port: config.sip2.port,
            });
            console.log(
                "[INFO]\tNetsocket client running on " +
                    netsocketUri +
                    " . . . ",
            );

            this.manageSession(websocket, netsocket);
        });
    }

    manageSession(websocket, netsocket) {
        websocket["clientId"] = uuid().toString();

        console.log("[INFO]\tNew client connected . . . ");

        websocket.on("message", (data) => {
            const message = JSON.parse(data);
            console.log(
                "[INFO]\tWebsocket message received: " +
                    JSON.stringify(message),
            );

            if (message.signal == "CLIENT_AUTH_INIT")
                this.clientAuthInit(websocket, message);
        });

        netsocket.on("data", (data) => {
            const message = data.toString();
            console.log("[INFO]\tNetsocket message received: " + message);

            this.serverMsg(websocket, message);
        });

        websocket.on("close", () => {
            console.log(
                "[INFO]\tTerminating websocket connection " +
                    websocket.clientId +
                    " . . . ",
            );
            websocket = null;
        });

        websocket.on("error", console.error);

        // accept sip messages from stdin
        rl.on("line", (input) => {
            this.serverMsg(websocket, input);
        });
    }

    serverMsg(websocket, payload = "") {
        console.log("[INFO]\tNew websocket payload: " + payload);
        return this._send_message(websocket, {
            id: websocket.clientId,
            signal: "SERVER_MSG",
            data: payload,
        });
    }

    clientAuthInit(websocket, message) {
        message["id"] = websocket.clientId;
        message["signal"] = "SERVER_AUTH_ACK";
        message["data"] = { result: "AUTH_OK" };

        return this._send_message(websocket, message);
    }

    _send_message(websocket, input = {}) {
        const message = JSON.stringify(input);
        if (typeof message !== "string") {
            console.log("[ERR]\tMessage could not be stringified");
            return false;
        }

        websocket.send(message);
        console.log("[INFO]\tMessage sent: " + message);
        return true;
    }

    finish() {
        this.websocketServer.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                console.log(
                    "[INFO]\tTerminating connection " +
                        client.clientId +
                        " . . . ",
                );

                this._send_message(client, {
                    signal: "SERVER_FIN",
                });
            }
            client.terminate();
        });

        return true;
    }
}

export default Server;
