import json
import uuid

from websockets.sync.server import serve


class Server:
    def __init__(self):
        print("[INFO]\tLaunching server . . . ")
        with serve(self.manageSession, "", 8765) as server_loop:
            server_loop.serve_forever()

    def manageSession(self, websocket):
        self.websocket = websocket

        for message in self.websocket:
            message = json.loads(message)

            if message:
                print("[INFO]\tMessage received: " + json.dumps(message))
            else:
                self._send_message({"error":"MALFORMED_MESSAGE"})
                break

            if self.clientAuthCheck(message) is False:
                self._send_message({"error":"SERVER_AUTH_FAILED"})
                break

    def clientAuthCheck(self, message):
        message["signal"] = "SERVER_AUTH_ACK"
        message["id"] = str(uuid.uuid4())
        return self._send_message(message)

    def _send_message(self, message):
        message = json.dumps(message)
        print("[INFO]\tMessage sent: " + message)
        return self.websocket.send(message)
