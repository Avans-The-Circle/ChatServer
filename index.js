import { WebSocketServer } from 'ws';
import NodeMediaServer from 'node-media-server'

const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: false,
    ping: 60,
    ping_timeout: 30,
  },
  http: {
    port: 8000,
    mediaroot: './media/server',
    allow_origin: '*',
  },
  trans: {
    ffmpeg: './ffmpeg.exe',
    tasks: [
      {
        app: 'live',
        hls: true,
        hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
        dash: true,
        dashFlags: '[f=dash:window_size=3:extra_window_size=5]'
      }
    ]
  }
}

var nms = new NodeMediaServer(config)

const wss = new WebSocketServer({ port: process.env.PORT || 8080 });
console.log("Running in port", process.env.PORT || 8080)
wss.on('connection', function connection(ws) {
    ws.on('message', function message(data) {
        data = JSON.parse(data);
        // console.log(data);
        switch (data.type) {
            case "OPEN_CONNECTION":
                ws.streamId = data.streamId;
                ws.send(JSON.stringify({ "type": "CONFIRM_CONNECTION", "streamId": data.streamId }));
                break;
            case "STREAM_FRAME":
                wss.clients.forEach(function each(client) {
                    if (ws.streamId === client.streamId) {
                        client.send(JSON.stringify({
                            "type": "INCOMMING_STREAM",
                            "frame": data.frame,
                        }
                        ));
                    }
                });
                break;
            case "SEND_MESSAGE":
                if (ws.streamId === -1) return;
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

nms.run();