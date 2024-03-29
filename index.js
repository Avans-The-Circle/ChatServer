import { createServer } from 'http';
import { parse } from 'url';
import lzstring from 'lz-string';
import { WebSocketServer } from 'ws';
import { readFileSync } from 'fs';
import forge from 'node-forge';
import fetch from 'cross-fetch';

let publicKey = forge.pki.publicKeyFromPem(readFileSync('./keys/public.pem'));
const server = createServer({
    // key: readFileSync('./keys/key.pem'),
    // cert: readFileSync('./keys/cert.pem'),
    // secureOptions: constants.SSL_OP_NO_TLSv1_1 | constants.SSL_OP_NO_TLSv1_2 | constants.SSL_OP_NO_SSLv2 | constants.SSL_OP_NO_SSLv3,
    // ciphers: null
});

const wss = new WebSocketServer({noServer: true});
// const wssBinary = new WebSocketServer({noServer: true});
// wssBinary.binaryType = "blob";
//
//
// wssBinary.on('connection', function connection(ws) {
//     console.log("[binary]Connection started", ws.streamId)
//     ws.on('message', async function message(data, isBinary) {
//         console.log("[binary]received data", isBinary)
//         wss.clients.forEach(function each(client) {
//             if (ws.streamId === client.streamId) {
//                 client.send(data, {binary: isBinary});
//             }
//         });
//     });
// });

server.on('upgrade', function upgrade(request, socket, head) {
    // const {pathname} = parse(request.url);
    // if (pathname.split('/')[1] === "binary") {
    //     console.log("Upgrading to binary stream", pathname)
    //     wssBinary.handleUpgrade(request, socket, head, function done(ws) {
    //         ws.streamId = pathname.split('/')[2]
    //         wssBinary.emit('connection', ws, request);
    //     });
    // } else {
    // }
    console.log("Upgrading to websocket")
    wss.handleUpgrade(request, socket, head, function done(ws) {
        wss.emit('connection', ws, request);
    });
});

const port = process.env.PORT || 8080;
const isProd = port !== 8080;
let apiUrl = "http://localhost:8050";
if (isProd) {
    apiUrl = "http://the-circle-backend.herokuapp.com";
}

console.log(`Running in ${isProd ? "Production" : "local"} mode!`)
server.listen(port);

// const wss = new WebSocketServer({ port: process.env.PORT || 8080 });43
console.log("Running in port", port)
wss.on('connection', function connection(ws) {
    console.log("new connection", ws.streamId)
    ws.on('message', async function message(data) {
        data = JSON.parse(data);
        if (data.compressed === true) {
            data = JSON.parse(lzstring.decompress(data.data));
        }
        // console.log(`[Incomming]${data.type}`);
        switch (data.type) {
            case "OPEN_CONNECTION":
                ws.streamId = data.streamId;
                ws.isStreamer = data.isStreamer ?? false;
                ws.isChatter = data.isChatter ?? false;
                ws.isWatcher = data.isWatcher ?? false;

                let streamerList = [];
                wss.clients.forEach(function each(client) {
                    if (client.isStreamer) {
                        streamerList.push(client.streamId)
                    }
                });
                console.log(`Broadcasting ${streamerList.length} streamers`)
                wss.clients.forEach(function each(client) {
                    if (client.isWatcher) {
                        client.send(JSON.stringify({
                            "type": "AVAILABLE_CLIENTS",
                            "streamerList": streamerList,
                        }));
                    }
                });
                ws.send(JSON.stringify({"type": "CONFIRM_CONNECTION", "streamId": data.streamId}));
                break;
            case "STREAM_FRAME":
                // console.log(`[${data.frameCounter}]incomming frame ${data.frame_timing} == ${(new Date()).getTime()}`)
                let clientCount = 0;
                wss.clients.forEach(function each(client) {
                    if (ws.streamId === client.streamId && client.isWatcher) {
                        clientCount++;
                    }
                });
                try {
                    let md = forge.md.sha256.create();
                    md.update(data.frame);
                    let signature = data.signature;
                    let verified = publicKey.verify(md.digest().bytes(), signature);
                    if (verified) {
                        wss.clients.forEach(function each(client) {
                            if (ws.streamId === client.streamId && client.isWatcher) {
                                client.send(JSON.stringify({
                                    "type": "INCOMMING_STREAM",
                                    "frame": data.frame,
                                    "clientCount": clientCount,
                                    "signature": data.signature
                                }));
                            }
                        });
                        doPostStream(lzstring.decompress(data.frame), ws.streamId)
                    }
                } catch (error) {
                    console.log(error);
                }

                ws.send(JSON.stringify({
                    "type": "SEND_NEXT_FRAME",
                    "clientCount": clientCount,
                }))
                break;
            case "SEND_MESSAGE":
                if (ws.streamId === -1) return;
                console.log(`message '${data.message}' received from '${data.sender}'`);
                try {
                    let mdMsg = forge.md.sha256.create();
                    mdMsg.update(data.message, "utf8");
                    let signatureMsg = data.signature;
                    let verify = publicKey.verify(mdMsg.digest().bytes(), signatureMsg);
                    if (verify) {
                        wss.clients.forEach(function each(client) {
                            if (ws.streamId === client.streamId && client.isChatter) {
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
                //Message to backend
                doPost(data)
                break;
        }
    });

    async function doPost(data) {
        try {
            const today = new Date();
            const date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
            const time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
            const dateTime = date + ' ' + time;

            const res = await fetch(`${apiUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    stream: "Stream " + ws.streamId,
                    sender: data.sender,
                    message: data.message,
                    timestamp: dateTime

                })

            })

            // const json = await res.json()
            // console.log(json);
            // result = JSON.stringify(json)
        } catch (error) {
            console.log("Stream API request failed")
            // console.log(error);
        }
    }

    async function doPostStream(data, streamId) {
        try {
            const today = new Date();
            const date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
            const time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
            const dateTime = date + ' ' + time;

            const res = await fetch(`${apiUrl}/api/stream`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    stream: "Stream " + streamId,
                    base64: data,
                    timestamp: dateTime,
                }),
            });

            // const json = await res.json();
            // console.log(json);
            // result = JSON.stringify(json);
        } catch (error) {
            console.log("Stream API request failed")
            // console.log(error);
        }
    }

});
