const { ipcRenderer, contextBridge } = require("electron");
const events = require("./channelTypes");

contextBridge.exposeInMainWorld("electron", {
  /**
   * TCP Server
   */
  // renderer -> main
  ...createContextBridgeMessageApi(events.SERVER_START, ipcRenderer),
  ...createContextBridgeMessageApi(events.SERVER_STOP, ipcRenderer),
  ...createContextBridgeMessageApi(
    events.SERVER_BROADCAST_MESSAGE,
    ipcRenderer
  ),
  // main -> renderer
  ...createContextBridgeReplyApi(events.SERVER_ON_SERVE_START, ipcRenderer),
  ...createContextBridgeReplyApi(events.SERVER_ON_SERVE_STOP, ipcRenderer),
  ...createContextBridgeReplyApi(
    events.SERVER_ON_CLIENT_CONNECTED,
    ipcRenderer
  ),
  ...createContextBridgeReplyApi(
    events.SERVER_ON_CLIENT_DISCONNECTED,
    ipcRenderer
  ),
  ...createContextBridgeReplyApi(
    events.SERVER_ON_RECERIVED_BROADCAST_MESSAGE,
    ipcRenderer
  ),
  /**
   * TCP Client
   */
  // renderer -> main
  ...createContextBridgeMessageApi(events.CLIENT_START_CONNECT, ipcRenderer),
  ...createContextBridgeMessageApi(events.CLIENT_STOP_CONNECT, ipcRenderer),
  ...createContextBridgeMessageApi(
    events.CLIENT_BROADCAST_MESSAGE,
    ipcRenderer
  ),
  // main -> renderer
  ...createContextBridgeReplyApi(
    events.CLIENT_ON_SERVER_CONNECTED,
    ipcRenderer
  ),
  ...createContextBridgeReplyApi(
    events.CLIENT_ON_SERVER_DISCONNECTED,
    ipcRenderer
  ),
  ...createContextBridgeReplyApi(
    events.CLIENT_ON_RECEIVED_BROADCAST_MESSAGE,
    ipcRenderer
  ),
});

function createContextBridgeMessageApi(key, ipcRenderer) {
  return {
    [key]: (...args) => ipcRenderer.send(key, ...args),
  };
}

function createContextBridgeReplyApi(key, ipcRender) {
  return {
    [key]: (cb) => ipcRender.on(key, cb),
  };
}
