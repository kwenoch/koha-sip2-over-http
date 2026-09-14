#!/usr/bin/env node

import * as net from "node:net";
import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";
import { WebSocket } from "ws";

const rl = readline.createInterface({ input, output });
const socket = new net.Socket();

class Client {
    constructor() {
        this.clientId = null;
        this.netServer = null;
        this.websocket = null;
        console.log("[INFO]\tLoaded client . . . ");
    }

    start() {
        console.log("[INFO]\tLaunching client . . . ");
        this.websocket = new WebSocket("ws://localhost:8765");
        console.log("[INFO]\tClient running on ws://localhost:8765 . . . ");

        this.manageSession(this.websocket);
    }

    manageSession(websocket) {
        console.log("[INFO]\tNew server connected . . . ");

        websocket.on("open", () => {
            this._send_message(websocket, {
                signal: "CLIENT_AUTH_INIT",
            });
        });

        websocket.on("message", (data) => {
            const message = JSON.parse(data);
            console.log("[INFO]\tMessage received: " + JSON.stringify(message));

            if (message.signal == "SERVER_AUTH_ACK")
                this.serverAuthAck(websocket, message);
        });

        websocket.on("close", (status) => {
            this.websocket = null;
            websocket = null;
        });

        websocket.on("error", console.error);

        // accept sip messages from stdin
        rl.on("line", (input) => {
            this.clientMsg(websocket, input);
        });
    }

    clientMsg(websocket, payload = "") {
        console.log("[INFO]\tNew payload: " + payload);
        return this._send_message(websocket, {
            id: this.clientId,
            signal: "CLIENT_MSG",
            data: payload,
        });
    }

    serverAuthAck(websocket, message) {
        this.clientId = message["id"];
        console.log("[INFO]\tNew client ID: " + this.clientId);

        message["signal"] = "CLIENT_AUTH_ACK";
        delete message.data;

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
        const websocket = this.websocket;

        this._send_message(websocket, {
            id: this.clientId,
            signal: "CLIENT_FIN",
        });

        this.websocket.terminate();
        console.log("[INFO]\tTerminating connection . . . ");
        return true;
    }
}

export default Client;
