const net = require("net");
const { ServerBroadcastStream } = require("./stream");

function createServer() {
  const broadcastStream = new ServerBroadcastStream();
  const srv = net.createServer((socket) => {
    broadcastStream.emit("joinNewClient", socket);
    broadcastStream.addSocket(socket);
    socket.on("end", () => {
      broadcastStream.removeSocket(socket);
    });
  });
  srv.listen({ port: 0, host: "0.0.0.0" }, () => {
    broadcastStream.emit("startServer");
  });

  return {
    srv,
    broadcastStream,
  };
}

function createConnection({
  port,
  host,
  onReceiveData,
  onConnected,
  onDisconnected,
} = {}) {
  const conn = net.createConnection({ port, host });
  conn.on("data", (data) => {
    onReceiveData && onReceiveData(data);
  });
  conn.on("connect", () => {
    onConnected && onConnected();
  });
  conn.on("close", () => {
    onDisconnected && onDisconnected();
  });
  conn.on("end", () => {
    conn.destroy();
    conn.unref();
  });
  return { connection: conn };
}

module.exports = {
  createServer,
  createConnection,
};
