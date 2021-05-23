import { contextBridge, ipcRenderer } from "electron";
import * as constants from "./util/constants";

contextBridge.exposeInMainWorld("electron", {
  /**
   * TCP Server
   */
  // renderer -> main
  ...createContextBridgeMessageApi(
    constants.ChannelType.SERVER_START,
    ipcRenderer
  ),
  ...createContextBridgeMessageApi(
    constants.ChannelType.SERVER_STOP,
    ipcRenderer
  ),
  ...createContextBridgeMessageApi(
    constants.ChannelType.SERVER_BROADCAST_MESSAGE,
    ipcRenderer
  ),
  // main -> renderer
  ...createContextBridgeReplyApi(
    constants.ChannelType.SERVER_ON_SERVE_START,
    ipcRenderer
  ),
  ...createContextBridgeReplyApi(
    constants.ChannelType.SERVER_ON_SERVE_STOP,
    ipcRenderer
  ),
  ...createContextBridgeReplyApi(
    constants.ChannelType.SERVER_ON_CLIENT_CONNECTED,
    ipcRenderer
  ),
  ...createContextBridgeReplyApi(
    constants.ChannelType.SERVER_ON_CLIENT_DISCONNECTED,
    ipcRenderer
  ),
  ...createContextBridgeReplyApi(
    constants.ChannelType.SERVER_ON_RECERIVED_BROADCAST_MESSAGE,
    ipcRenderer
  ),
  /**
   * TCP Client
   */
  // renderer -> main
  ...createContextBridgeMessageApi(
    constants.ChannelType.CLIENT_START_CONNECT,
    ipcRenderer
  ),
  ...createContextBridgeMessageApi(
    constants.ChannelType.CLIENT_STOP_CONNECT,
    ipcRenderer
  ),
  ...createContextBridgeMessageApi(
    constants.ChannelType.CLIENT_BROADCAST_MESSAGE,
    ipcRenderer
  ),
  // main -> renderer
  ...createContextBridgeReplyApi(
    constants.ChannelType.CLIENT_ON_SERVER_CONNECTED,
    ipcRenderer
  ),
  ...createContextBridgeReplyApi(
    constants.ChannelType.CLIENT_ON_SERVER_DISCONNECTED,
    ipcRenderer
  ),
  ...createContextBridgeReplyApi(
    constants.ChannelType.CLIENT_ON_RECEIVED_BROADCAST_MESSAGE,
    ipcRenderer
  ),
  /**
   * common
   */
  // main -> renderer
  ...createContextBridgeReplyApi(
    constants.ChannelType.REPORT_DOWN_STREAM_SPEED,
    ipcRenderer
  ),
  ...createContextBridgeReplyApi(
    constants.ChannelType.REPORT_UP_STREAM_SPEED,
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
