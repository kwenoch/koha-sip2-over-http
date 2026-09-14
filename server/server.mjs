#!/usr/bin/env node

import * as net from "node:net";
import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";
import { v6 as uuid } from "uuid";
import { WebSocketServer } from "ws";

const rl = new readline.createInterface({ input, output });

class Server {
    constructor() {
        this.websocketServer = null;
        console.log("[INFO]\tLoaded server . . . ");
    }

    start() {
        console.log("[INFO]\tLaunching server . . . ");
        this.websocketServer = new WebSocketServer({ port: 8765 });
        console.log("[INFO]\tServer running on ws://localhost:8765 . . . ");

        this.websocketServer.on("connection", (websocket) => {
            const netClient = new net.createConnection({ port: 6043 });
            this.manageSession(websocket);
        });
    }

    manageSession(websocket) {
        websocket["clientId"] = uuid().toString();

        console.log("[INFO]\tNew client connected . . . ");

        websocket.on("message", (data) => {
            const message = JSON.parse(data);
            console.log("[INFO]\tMessage received: " + JSON.stringify(message));

            if (message.signal == "CLIENT_AUTH_INIT")
                this.clientAuthInit(websocket, message);
        });

        websocket.on("close", () => {
            console.log(
                "[INFO]\tTerminating connection " +
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
        console.log("[INFO]\tNew payload: " + payload);
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
