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
            port: this.config.websocket.port,
        });
        console.log(
            "[INFO]\tWebsocket server running on " + websocketUri + " . . . ",
        );

        this.websocketServer.on("connection", (websocket) => {
            console.log("[INFO]\tLaunching netsocket client . . . ");
            websocket["initialised"] = false;
            websocket["netsocket"] = new net.createConnection({
                host: this.config.sip2.host,
                port: this.config.sip2.port,
            });
            console.log(
                "[INFO]\tNetsocket client running on " +
                    netsocketUri +
                    " . . . ",
            );

            this.manageSession(websocket);
        });
    }

    loadConfig() {
        const configFile = fs.readFileSync(
            import.meta.dirname + "/" + "config.yml",
            "utf8",
        );
        if (typeof configFile == "string") return yaml.parse(configFile);
        else return false;
    }

    manageSession(websocket) {
        const netsocket = websocket["netsocket"];
        websocket["clientId"] = uuid().toString();

        console.log("[INFO]\tNew websocket connected . . . ");

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
                "[INFO]\tTerminating websocket connection " +
                    websocket.clientId +
                    " . . . ",
            );
            if (websocket["netsocket"] != undefined)
                websocket["netsocket"].end();
            websocket = null;
        });

        netsocket.on("end", () => {
            console.log("[INFO]\tTerminating netsocket connection  . . . ");
            if (websocket != undefined) websocket.terminate();
            websocket["netsocket"] = null;
        });

        websocket.on("error", console.error);

        netsocket.on("error", console.error);

        // accept sip messages from stdin
        rl.on("line", (input) => {
            this.serverMsg(websocket, input);
        });
    }

    clientAuthInit(websocket, message) {
        message["id"] = websocket.clientId;
        message["signal"] = "SERVER_AUTH_ACK";
        message["data"] = { result: "AUTH_OK" };
        websocket["initialised"] = true;

        return this._send_websocket_message(websocket, message);
    }

    clientMsg(netsocket, message) {
        if (message.data)
            return this._send_netsocket_message(netsocket, message.data);
        else return false;
    }

    serverMsg(websocket, payload = "") {
        console.log("[INFO]\tNew netsocket payload: " + payload);
        return this._send_websocket_message(websocket, {
            id: websocket.clientId,
            signal: "SERVER_MSG",
            data: payload,
        });
    }

    _readyWebsocket(websocket) {
        if (websocket.readyState === 1 && websocket["initialised"] === true)
            return true;
        else return false;
    }

    _readyNetsocket(netsocket) {
        if (netsocket.readyState === "open") return true;
        else false;
    }

    _send_websocket_message(websocket, input = {}) {
        const message = JSON.stringify(input);
        if (typeof message !== "string") {
            console.log("[ERR]\tWebsocket message could not be stringified");
            return false;
        }

        let readyStateEvaluator = setInterval(() => {
            if (this._readyWebsocket(websocket)) {
                clearInterval(readyStateEvaluator);
                websocket.send(message);
                console.log("[INFO]\tWebsocket message sent: " + message);
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
            if (this._readyNetsocket(netsocket)) {
                clearInterval(readyStateEvaluator);
                netsocket.write(message + "\r\n", "utf-8");
                console.log("[INFO]\tNetsocket message sent: " + message);
            }
        }, 15);

        return true;
    }

    end() {
        return this.websocketServer.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) client.terminate();
            client = null;
            return true;
        });
    }
}

export default Server;
