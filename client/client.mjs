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
        this.clientId = null;
        this.config = this.loadConfig();
        this.netServer = null;
        this.websocket = null;
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

        console.log("[INFO]\tLaunching websocket client . . . ");
        this.websocket = new WebSocket(websocketUri);
        console.log(
            "[INFO]\tWebsocket client running on " + websocketUri + " . . . ",
        );

        this.manageSession(this.websocket);
    }

    manageSession(websocket) {
        const netsocket = null;
        console.log("[INFO]\tNew websocket connected . . . ");

        websocket.on("open", () => {
            this._send_websocket_message(websocket, {
                signal: "CLIENT_AUTH_INIT",
            });
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

        websocket.on("close", (status) => {
            console.log("[INFO]\tTerminating websocket connection . . . ");
            this.websocket = null;
            process.exit(status);
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

    serverMsg(netsocket, message) {
        console.log("[DEBUG]\tnetsocket-message: " + message.data);
        /*if (message.data)
            return this._send_netsocket_message(netsocket, message.data);
        else return;*/
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

    loadConfig() {
        const configFile = fs.readFileSync(
            import.meta.dirname + "/" + "config.yml",
            "utf8",
        );
        if (typeof configFile == "string") return yaml.parse(configFile);
        else return false;
    }

    end() {
        this.websocket.terminate();
        this.websocket = null;
        return true;
    }
}

export default Client;
