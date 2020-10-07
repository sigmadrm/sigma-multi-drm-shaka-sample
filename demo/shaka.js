var manifestUri =
    //'http://123.30.235.196:5635/live_pro/vtv1.stream/manifest.mpd';
    //'http://123.30.235.196:5635/live/vtv1.stream/manifest.mpd'
    'http://123.30.235.196:5635/vod_pro/BigBuckBunny.mp4/manifest.mpd';

function initApp() {
    // Install built-in polyfills to patch browser incompatibilities.
    shaka.polyfill.installAll();

    // Check to see if the browser supports the basic APIs Shaka needs.
    if (shaka.Player.isBrowserSupported()) {
        // Everything looks good!
        initPlayer();
    } else {
        // This browser does not have the minimum set of APIs we need.
        console.error('Browser not supported!');
    }
}

function initPlayer() {
    // Create a Player instance.
    var video = document.getElementById('video');
    var player = new shaka.Player(video);
    // shaka.media.ManifestParser.registerParserByExtension("m3u8", shaka.hls.HlsParser);
    // shaka.media.ManifestParser.registerParserByMime("Application/vnd.apple.mpegurl", shaka.hls.HlsParser);

    // Attach player to the window to make it easy to access in the JS console.
    window.player = player;

    // Listen for error events.
    player.addEventListener('error', onErrorEvent);
    player.configure({
        drm: {
            servers: {
                // 'com.widevine.alpha': "http://192.168.3.52:9000/",
                'com.widevine.alpha': "https://license.sigmadrm.com/license/verify/widevine",
                'com.microsoft.playready': "https://license.sigmadrm.com/license/verify/playready",
                //'com.microsoft.playready': "https://lic.drmtoday.com/license-proxy-headerauth/drmtoday/RightsManager.asmx",
            }
        }
    });

    player.getNetworkingEngine().registerRequestFilter(function (type, request) {
        if (type == shaka.net.NetworkingEngine.RequestType.LICENSE) {
            //            request.allowCrossSiteCredentials = true;
            console.log("init header request license");
            request.headers['content-type'] = "application/octet-stream";
            request.headers['custom-data'] = btoa(JSON.stringify({
                userId: '3-6849382',
                sessionId: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzLTY4NDkzODIiLCJjaGFubmVsSWQiOiJrLXBsdXMtcG0taGQiLCJzZXNzaW9uSWQiOiIxNDYyMDAwMTYwNjUiLCJleHBpcmVkQXQiOjE1OTc1NjAwOTQsImV4cCI6MTU5NzU2MDA5NCwiaWF0IjoxNTk2Njk2MDk0fQ.FW0585_WiYsrXelTHhTyPzKETxM8GcEjgYw8DiWld8A",
                merchantId: "d5321abd-6676-4bc1-a39e-6bb763029e54",
                appId: "3930f331-e337-42b7-9619-00a0c12c16cb"
            }))
        }
    });
    player.getNetworkingEngine().registerResponseFilter(function (type, response) {
        // Alias some utilities provided by the library.
        var StringUtils = shaka.util.StringUtils;
        var Uint8ArrayUtils = shaka.util.Uint8ArrayUtils;

        // Only manipulate license responses:
        if (type == shaka.net.NetworkingEngine.RequestType.LICENSE) {
            // This is the wrapped license, which is a JSON string.
            try {
                var wrappedString = StringUtils.fromUTF8(response.data);
                // Parse the JSON string into an object.
                var wrapped = JSON.parse(wrappedString);

                // This is a base64-encoded version of the raw license.
                var rawLicenseBase64 = wrapped.license;
                // Decode that base64 string into a Uint8Array and replace the response
                // data.  The raw license will be fed to the Widevine CDM.
                response.data = Uint8ArrayUtils.fromBase64(rawLicenseBase64);

                // Read additional fields from the server.
                // The server we are using in this tutorial does not send anything useful.
                // In practice, you could send any license metadata the client might need.
                // Here we log what the server sent to the JavaScript console for
                // inspection.
                console.log(wrapped);
            }
            catch (err) {

            }
        }
    });
}

function play(url) {
    // Try to load a manifest.
    // This is an asynchronous process.
    window.player.load(url).then(function () {
        // This runs if the asynchronous load is successful.
        console.log('The video has now been loaded!');
    }).catch(function (onError) { console.log(onError) });  // onError is executed if the asynchronous load fails.
}

function onErrorEvent(event) {
    // Extract the shaka.util.Error object from the event.
    onError(event.detail);
}

function onError(error) {
    // Log the error.
    console.error('Error code', error.code, 'object', error);
}

document.addEventListener('DOMContentLoaded', initApp);
