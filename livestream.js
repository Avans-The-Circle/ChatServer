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
            ffmpeg: 'C:/Hobby/FFMPEG/bin/ffmpeg.exe',
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
nms.run();