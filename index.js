import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', function connection(ws) {
    ws.on('message', function message(data) {
        data = JSON.parse(data);
        console.log(data);
        switch (data.type) {
            case "OPEN":
                ws.streamId = data.streamId;
                break;
            case "SEND":
                wss.clients.forEach(function each(client) {
                    if (data.streamId == client.streamId) {
                        ws.send(JSON.stringify({
                            "type": "chatMessage",
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
