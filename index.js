import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: process.env.PORT || 8080 });

wss.on('connection', function connection(ws) {
    ws.on('message', function message(data) {
        data = JSON.parse(data);
        console.log(data);
        switch (data.type) {
            case "OPEN_CONNECTION":
                ws.streamId = data.streamId;
                ws.send(JSON.stringify({ "type": "CONFIRM_CONNECTION", "streamId": data.streamId }));
                break;
            case "SEND_MESSAGE":
                if(ws.streamId == -1) return;
                //Message to backend
                wss.clients.forEach(function each(client) {
                    if (ws.streamId == client.streamId) {
                        client.send(JSON.stringify({
                            "type": "CHAT_MESSAGE",
                            "message": data.message,
                            "sender": data.sender
                        }
                        ));
                    }
                });
                break;
        }
    });
});
