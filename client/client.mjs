#!/usr/bin/env node

import { WebSocket } from "ws";

class Client {
    constructor() {
        this.clientId = null;
        console.log("[INFO]\tLoaded client . . . ");
    }

    start() {
        console.log("[INFO]\tLaunching client . . . ");
        this.websocket = new WebSocket("ws://localhost:8765");
        console.log("[INFO]\tClient running on ws://localhost:8765 . . . ");

        this.manageSession();
    }

    manageSession() {
        console.log("[INFO]\tNew server connected . . . ");

        this.websocket.on("open", () => {
            this._send_message({
                signal: "CLIENT_AUTH_INIT",
            });
        });

        this.websocket.on("message", (data) => {
            const message = JSON.parse(data);
            console.log("[INFO]\tMessage received: " + JSON.stringify(message));

            if (message.signal == "SERVER_AUTH_ACK")
                this.serverAuthAck(message);
        });

        this.websocket.on("close", (status) => {
            this.websocket = null;
        });

        this.websocket.on("error", console.error);
    }

    serverAuthAck(message) {
        this.clientId = message["id"];
        console.log("[INFO]\tNew client ID: " + this.clientId);

        message["signal"] = "CLIENT_AUTH_ACK";
        delete message.data;

        return this._send_message(message);
    }

    _send_message(input = {}) {
        const message = JSON.stringify(input);
        if (typeof message !== "string") {
            console.log("[ERR]\tMessage could not be stringified");
            return false;
        }

        this.websocket.send(message);
        console.log("[INFO]\tMessage sent: " + message);
        return true;
    }

    finish() {
        this._send_message({
            id: this.clientId,
            signal: "CLIENT_FIN",
        });

        this.websocket.terminate();
        console.log("[INFO]\tTerminating connection . . . ");
        return true;
    }
}

export default Client;
