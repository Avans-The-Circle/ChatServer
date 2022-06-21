import { createServer } from 'http';
import { parse } from 'url';
import lzstring from 'lz-string';
import { WebSocketServer } from 'ws';
import { readFileSync } from 'fs';
import forge from 'node-forge';


let publicKey = forge.pki.publicKeyFromPem(readFileSync('./keys/public.pem'));
let md = forge.md.sha256.create();
let signature;
const server = createServer({
    // key: readFileSync('./keys/key.pem'),
    // cert: readFileSync('./keys/cert.pem')
});
const wss = new WebSocketServer({ noServer: true });
const wssBinary = new WebSocketServer({ noServer: true });
wssBinary.binaryType = "blob";


wssBinary.on('connection', function connection(ws) {
    console.log("[binary]Connection started", ws.streamId)
    ws.on('message', async function message(data, isBinary) {
        console.log("[binary]received data", isBinary)
        wss.clients.forEach(function each(client) {
            if (ws.streamId === client.streamId) {
                client.send(data, { binary: isBinary });
            }
        });
    });
});

server.on('upgrade', function upgrade(request, socket, head) {
    const { pathname } = parse(request.url);
    if (pathname.split('/')[1] === "binary") {
        console.log("Upgrading to binary stream", pathname)
        wssBinary.handleUpgrade(request, socket, head, function done(ws) {
            ws.streamId = pathname.split('/')[2]
            wssBinary.emit('connection', ws, request);
        });
    } else {
        console.log("Upgrading to websocket")
        wss.handleUpgrade(request, socket, head, function done(ws) {
            wss.emit('connection', ws, request);
        });
    }
});

server.listen(8080);

// const wss = new WebSocketServer({ port: process.env.PORT || 8080 });43
console.log("Running in port", process.env.PORT || 8080)
wss.on('connection', function connection(ws) {
    console.log("new connection", ws.streamId)
    ws.on('message', async function message(data) {
        data = JSON.parse(data);
        if (data.compressed === true) {
            data = JSON.parse(lzstring.decompress(data.data));
        }
        switch (data.type) {
            case "OPEN_CONNECTION":
                ws.streamId = data.streamId;
                ws.send(JSON.stringify({ "type": "CONFIRM_CONNECTION", "streamId": data.streamId }));
                break;
            case "STREAM_FRAME":
                console.log(`[${data.frameCounter}]incomming frame ${data.frame_timing} == ${(new Date()).getTime()}`)
                try {
                    md.update(data.frame);
                    signature = data.signature;
                    let verified = publicKey.verify(md.digest().bytes(), signature);
                    if (verified) {
                        wss.clients.forEach(function each(client) {
                            if (ws.streamId === client.streamId) {
                                client.send(JSON.stringify({
                                    "type": "INCOMMING_STREAM",
                                    "frame": data.frame,
                                    "signature": data.signature
                                }
                                ));
                            }
                        });
                    }
                } catch (error) {
                    console.log(error);
                }
                ws.send(JSON.stringify({
                    "type": "SEND_NEXT_FRAME"
                }
                ))
                break;
            case "SEND_MESSAGE":
                if (ws.streamId === -1) return;
                //Message to backend
                try {
                    md.update(data.message, "utf8");
                    signature = data.signature;
                    let verify = publicKey.verify(md.digest().bytes(), signature);
                    if (verify) {
                        wss.clients.forEach(function each(client) {
                            if (ws.streamId === client.streamId) {
                                client.send(JSON.stringify({
                                    "type": "CHAT_MESSAGE",
                                    "message": data.message,
                                    "sender": data.sender,
                                    "signature": data.signature
                                }
                                ));
                            }
                        });
                    }
                } catch (error) {
                    console.log(error);
                }
                break;
        }
    });
});
