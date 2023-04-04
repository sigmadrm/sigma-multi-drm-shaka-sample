var manifestURI = 'MANIFEST_URI';
var CERTIFICATE_PATH =
  'https://cert-staging.sigmadrm.com/app/fairplay/{MERCHANT_ID}/{APP_ID}';
var FAIRPLAY_STAGE =
  'https://license-staging.sigmadrm.com/license/verify/fairplay';

var licenseURL;

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

  player.getNetworkingEngine().registerRequestFilter(function (type, request) {
    if (type == shaka.net.NetworkingEngine.RequestType.LICENSE) {
      request.uris = [licenseURL];
      request.method = 'POST';
      request.headers['Content-Type'] = 'application/json';
      request.headers['custom-data'] = btoa(
        JSON.stringify({
          userId: 'USER_ID',
          sessionId: 'SESSION_ID',
          merchantId: 'MERCHANT_ID',
          appId: 'APP_ID',
        })
      );
      const originalPayload = new Uint8Array(request.body);
      const base64Payload =
        shaka.util.Uint8ArrayUtils.toStandardBase64(originalPayload);
      request.body = JSON.stringify({
        spc: base64Payload,
        assetId: new URL(licenseURL).searchParams.get('assetId'),
      });
    }
  });
  player
    .getNetworkingEngine()
    .registerResponseFilter(function (type, response) {
      // Only manipulate license responses:
      if (type == shaka.net.NetworkingEngine.RequestType.LICENSE) {
        // This is the wrapped license, which is a JSON string.
        try {
          const wrappedString = shaka.util.StringUtils.fromUTF8(response.data);
          // Parse the JSON string into an object.
          const wrapped = JSON.parse(wrappedString);
          // This is a base64-encoded version of the raw license.
          const rawLicenseBase64 = wrapped.license;
          // Decode that base64 string into a Uint8Array and replace the response
          response.data =
            shaka.util.Uint8ArrayUtils.fromBase64(rawLicenseBase64);
          // Read additional fields from the server.
          // The server we are using in this tutorial does not send anything useful.
          // In practice, you could send any license metadata the client might need.
          // Here we log what the server sent to the JavaScript console for
          // inspection.
        } catch (err) {
          console.error('Failed to parse license: ', err);
        }
      }
    });
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

async function play() {
  const response = await fetch(CERTIFICATE_PATH);
  if (!response.ok) {
    alert('Could not get certificate!');
    return;
  }
  const certificate = await response.arrayBuffer();
  player.configure({
    drm: {
      servers: {
        'com.apple.fps.1_0': FAIRPLAY_STAGE,
      },
      advanced: {
        'com.apple.fps.1_0': {
          serverCertificate: new Uint8Array(certificate),
        },
      },
    },
  });
  player.configure('drm.initDataTransform', (initData, type, drmInfo) => {
    if (type != 'skd') return initData;
    const skdURL = shaka.util.StringUtils.fromBytesAutoDetect(initData);
    const contentId = new URL(skdURL).searchParams.get('assetId');
    const cert = player.drmInfo().serverCertificate;
    licenseURL = skdURL.replace('skd://', 'https://');
    return shaka.util.FairPlayUtils.initDataTransform(
      initData,
      contentId,
      cert
    );
  });

  try {
    await player.load(manifestURI);
    console.log('The video has now been loaded!');
  } catch (exception) {
    shakaOnError(exception);
  }
}

initApp();
