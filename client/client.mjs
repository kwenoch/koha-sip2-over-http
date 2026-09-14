#!/usr/bin/env node

import * as net from "node:net";
import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";
import { WebSocket } from "ws";

const rl = readline.createInterface({ input, output });

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

class Client {
    constructor() {
        this.clientId = null;
        this.netServer = null;
        this.websocket = null;
        console.log("[INFO]\tLoaded client . . . ");
    }

    start() {
        const websocketUri =
            "ws://" + config.websocket.host + ":" + config.websocket.port;

        console.log("[INFO]\tLaunching websocket client . . . ");
        this.websocket = new WebSocket(websocketUri);
        console.log(
            "[INFO]\tWebsocket client running on " + websocketUri + " . . . ",
        );

        this.manageSession(this.websocket);
    }

    manageSession(websocket) {
        console.log("[INFO]\tNew websocket connected . . . ");

        websocket.on("open", () => {
            this._send_websocket_message(websocket, {
                signal: "CLIENT_AUTH_INIT",
            });
        });

        websocket.on("message", (data) => {
            const message = JSON.parse(data);
            console.log("[INFO]\tWebsocket message received: " + JSON.stringify(message));

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
        return this._send_websocket_message(websocket, {
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

        return this._send_websocket_message(websocket, message);
    }

    _send_websocket_message(websocket, input = {}) {
        const message = JSON.stringify(input);
        if (typeof message !== "string") {
            console.log("[ERR]\tWebsocket message could not be stringified");
            return false;
        }

        websocket.send(message);
        console.log("[INFO]\tWebsocket message sent: " + message);
        return true;
    }

    finish() {
        console.log("[INFO]\tTerminating websocket connection . . . ");
        this._send_websocket_message(this.websocket, {
            id: this.clientId,
            signal: "CLIENT_FIN",
        });

        this.websocket.terminate();
        this.websocket = null;

        return true;
    }
}

export default Client;
