# Development

## Remote Android Debugging

- enable USB debugging in Android Dev settings
- connect device with USB to pc
- URL chrome://inspect/#devices
- the device type should appear on the page

### Port forwarding

Allows to run the app on ypur devive against the pc dev environment

- Port: port on device
- IP address and port: adress on the pc
- yellow bar on the top should confirm port porwarding and next to the device name a green dot with port should appear

![Chrome remote debugging](./remote-debugging.png)

- run the app on dev pc as usual -> accessible at address configured above
- access the app on device at localhost:\<port\> as configured above

### Debugging

Below your device on the chrome page there is a list of recently opened urls on your device chrome.

![url list on device](./remote-debugging-2.png)

- Next to the URL belonginf to your app click on "inspect"
- a new chrome window will open mirroring the device screen and with Chrome dev tools
  ![device dev screen ](./remote-debugging-3.png)

Happy debugging!
