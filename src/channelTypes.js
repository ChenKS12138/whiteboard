const events = {
  SERVER_START: "serverStart",
  SERVER_STOP: "serverStop",
  SERVER_BROADCAST_MESSAGE: "serverBroadcastMessage",
  SERVER_ON_SERVE_START: "serverOnServeStart",
  SERVER_ON_SERVE_STOP: "serverOnServeStop",
  SERVER_ON_CLIENT_CONNECTED: "serverOnClientConnected",
  SERVER_ON_CLIENT_DISCONNECTED: "serverOnClientDisconnected",
  SERVER_ON_RECERIVED_BROADCAST_MESSAGE: "serverOnReceivedBroadcastMessage",
  CLIENT_START_CONNECT: "clientStartConnect",
  CLIENT_STOP_CONNECT: "clientStopConnect",
  CLIENT_BROADCAST_MESSAGE: "clientBroadcastMessage",
  CLIENT_ON_SERVER_CONNECTED: "clientOnServerConnected",
  CLIENT_ON_SERVER_DISCONNECTED: "clientOnServerDisconnected",
  CLIENT_ON_RECEIVED_BROADCAST_MESSAGE: "clientOnReceivedBroadCastMessage",
  REPORT_UP_STREAM_SPEED: "reportUpStreamSpeed",
  REPORT_DOWN_STREAM_SPEED: "reportDownStreamSpeed",
};

module.exports = events;
