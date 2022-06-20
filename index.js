import { WebSocketServer } from 'ws';
import lzstring from 'lz-string';

const wss = new WebSocketServer({ port: process.env.PORT || 8080 });
console.log("Running in port", process.env.PORT || 8080)
wss.on('connection', function connection(ws) {
    console.log("new ocnnection")
    ws.on('message', async function message(data) {
        data = JSON.parse(data);
        if (data.compressed === true) {
            data = JSON.parse(lzstring.decompress(data.data));
        }
        // console.log(data);
        switch (data.type) {
            case "OPEN_CONNECTION":
                ws.streamId = data.streamId;
                ws.send(JSON.stringify({ "type": "CONFIRM_CONNECTION", "streamId": data.streamId }));
                break;
            case "STREAM_FRAME":
                console.log(`[${data.frameCounter}]incomming frame ${data.frame_timing} == ${(new Date()).getTime()}`)
                wss.clients.forEach(function each(client) {
                    if (ws.streamId === client.streamId) {
                        client.send(JSON.stringify({
                                "type": "INCOMMING_STREAM",
                                "frame": data.frame,
                            }
                        ));
                    }
                });
                ws.send(JSON.stringify({
                        "type": "SEND_NEXT_FRAME"
                    }
                ))
                break;
            case "SEND_MESSAGE":
                if(ws.streamId === -1) return;
                //Message to backend
                wss.clients.forEach(function each(client) {
                    if (ws.streamId === client.streamId) {
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
