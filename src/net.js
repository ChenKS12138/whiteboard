const net = require("net");

function createServer({ onReceiveData, onConnected, onDisconnected } = {}) {
  let sockets = [];
  const srv = net.createServer((socket) => {
    sockets.push(socket);
    onConnected && onConnected(socket);
    socket.on("data", (data) => {
      onReceiveData && onReceiveData(data);
      sockets.forEach((one) => {
        one !== socket && one.write(data);
      });
    });
    socket.on("end", () => {
      sockets = sockets.filter((one) => one !== socket);
      onDisconnected && onDisconnected(socket);
    });
  });
  const listen = (cb) => {
    srv.listen({ port: 0, host: "0.0.0.0" }, cb);
  };
  const send = (data) => {
    sockets.forEach((socket) => {
      socket.write(data);
    });
  };
  const getSockets = () => sockets;
  return {
    getSockets,
    srv,
    listen,
    send,
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
  const send = (data) => {
    conn.write(data);
  };
  return { connection: conn, send };
}

module.exports = {
  createServer,
  createConnection,
};
