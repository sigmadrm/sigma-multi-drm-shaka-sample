var manifestURI = 'MANIFEST_URI';

function initApp() {
  // Install built-in polyfills to patch browser incompatibilities.
  shaka.polyfill.installAll();
  // Check to see if the browser supports the basic APIs Shaka needs.
  if (shaka.Player.isBrowserSupported()) {
    initPlayer();
  } else {
    console.error('Browser not supported!');
  }
}

function initPlayer() {
  // Create a Player instance.
  var video = document.getElementById('video');
  var player = new shaka.Player(video);
  // Attach player to the window to make it easy to access in the JS console.
  window.player = player;

  // Listen for error events.
  player.addEventListener('error', onErrorEvent);

  player.configure({
    drm: {
      servers: {
        'com.widevine.alpha':
          'https://license.sigmadrm.com/license/verify/widevine',
        'com.microsoft.playready':
          'https://license.sigmadrm.com/license/verify/playready',
      },
    },
  });

  player.getNetworkingEngine().registerRequestFilter(function (type, request) {
    if (type == shaka.net.NetworkingEngine.RequestType.LICENSE) {
      //   request.allowCrossSiteCredentials = true;
      request.headers['Content-type'] = 'application/octet-stream';
      request.headers['custom-data'] = btoa(
        JSON.stringify({
          userId: 'USER_ID',
          sessionId: 'SESSION_ID',
          merchantId: 'MERCHANT_ID',
          appId: 'APP_ID',
        })
      );
    }
  });
  player
    .getNetworkingEngine()
    .registerResponseFilter(function (type, response) {
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
        } catch (err) {}
      }
    });
}

async function play() {
  // Try to load a manifest.
  // This is an asynchronous process.
  try {
    await window.player.load(manifestURI);
    // This runs if the asynchronous load is successful.
    console.log('The video has now been loaded!');
  } catch (exception) {
    // shakaOnError is executed if the asynchronous load fails.
    shakaOnError(exception);
  }
}

function onErrorEvent(event) {
  // Extract the shaka.util.Error object from the event.
  shakaOnError(event.detail);
}

function shakaOnError(error) {
  alert(error);
  console.error('Error code', error.code, 'object', error);
  if (window.player) {
    window.player.detach();
  }
}

initApp();
