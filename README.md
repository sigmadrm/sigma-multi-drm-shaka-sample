# 1. Introduction
- Your application's license server may require some form of authentication so that it only delivers licenses to paying users. In this tutorial, we're going to use various license server endpoints that require various forms of authentication.

- Please note that the license server we are using in this tutorial is a Widevine license server, so you will need to use Chrome to follow along. Because EME requires a secure URL, you will also need to use localhost or https for this tutorial. See the note at the top of DRM Configuration for more information.

# 2. Require
- **Html 5 Browsers:**

    |Html 5 browsers |Widevine|Playready|
    |----------------|--------|---------|
    |Chromee (Window, MacOS, Android, ChromeOS, Linux)|Yes|No|
    |Firefox (Window, MacOS, Linux)|Yes|No|
    |Microsoft Edge (Window, MacOS, Android)|Yes|Yes|
    |Safari (Safari 8+ on MacOS, Safari on iOS 11.2+)|No|No|
    |Opera (Window, MacOS)|Yes|No|
    |Internet Explorer (Window 8.1+)|No|Yes|
- **Smart TVs:**

    |Smart TVs |Widevine|Playready|
    |----------------|--------|---------|
    |SamSung Tizen (2016-2017, 2018+ Models)|Yes|Yes|
    |SamSung Tizen&Orsay (2010-2015 Models)|No|Yes|
    |LG (WebOS 3.0+)|Yes|Yes|
    |LG (WebOS 1.2 & Netcast)|No|Yes|
    |Smart TV Alliance (LG, Philips, Toshiba, Panasonic)|Yes|Yes|
    |Android TV|Yes|Yes|
    

# 3. Integrate license into Shaka Player
**Step 1: We'll also need to configure the player to use this license server before it loads the manifest:**
**Example:**

        const manifestUri =
            "http://sigmadrm.com/live/BigBuckBunny.mp4/manifest.mpd";
        const licenseWidevineServer = "https://license.staging.sigmadrm.com/license/verify/widevine";
        const licensePlayreadyServer = "https://license.staging.sigmadrm.com/license/verify/playready";
        player.configure({
            drm: {
              servers: { 
                'com.widevine.alpha': licenseWidevineServer, 
                'com.microsoft.playready': licensePlayreadyServer 
              }
            }
        });
        // Try to load a manifest.
        try {
            await player.load(manifestUri);
            // The video should now be playing!  
        } catch (e) {
            onError(e);
        }

|Props          |Description                        |Type   |Example|
|---------------|-----------------------------------|-------|-------|
|licenseWidevineServer  |Url of the license Widevice server if protected.|String|https://license.staging.sigmadrm.com/license/verify/widevine|
|licensePlayreadyServer  |Url of the license Playready server if protected.|String|https://license.staging.sigmadrm.com/license/verify/playready|
|manifestUri    |Url video			    |String |http://sigmadrm.com/live/BigBuckBunny.mp4/manifest.mpd|

**Step 2: Config Resquest Header**
**Example:**
```
    player.getNetworkingEngine().registerRequestFilter(function(type, request) {
        // Only add headers to license requests:
        if (type == shaka.net.NetworkingEngine.RequestType.LICENSE) {
            // This is the specific header name and value the server wants:
            request.headers['Content-Type'] = 'application/octet-stream'
            request.headers['custom-data'] = btoa(JSON.stringify({
                userId: 'USER_ID',
                sessionId: "SESSION_ID",
                merchantId: "MERCHANT_ID",
                appId: "APP_ID"
            }))
        }
    });

```
**Step 3: Config Response Header**
**Example:**
```
    player.getNetworkingEngine().registerResponseFilter(function(type, response) {
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

```
# 4. Thông tin tích hợp

- MERCHANT_ID:

# 5. Demo: **```[Demo source code](https://link/)```**