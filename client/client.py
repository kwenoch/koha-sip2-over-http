import json

from websockets.sync.client import connect


class Client:
    def __init__(self):
        print("[INFO]\tLaunching client . . . ")
        with connect("ws://localhost:8765") as websocket:
            self.websocket = websocket
            self.manageSession()

    def manageSession(self):
        self.clientAuthSend()

        while True:
            message = json.loads(self.websocket.recv())

            if message:
                print("[INFO]\tMessage received: " + json.dumps(message))
            else:
                self._send_message({"error":"MALFORMED_MESSAGE"})
                exit(500)

    def clientAuthSend(self):
        self._send_message({"signal":"CLIENT_AUTH_INIT"})

    def _send_message(self, message):
        message = json.dumps(message)
        print("[INFO]\tMessage sent: " + message)
        return self.websocket.send(message)
