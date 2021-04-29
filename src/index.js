try {
  require("electron-reloader")(module);
} catch (_) {}

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { createConnection, createServer } = require("./net");
const events = require("./channelTypes");
const { SizedChunkStream } = require("./stream");

if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
    minWidth: 800,
    minHeight: 700,
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  // mainWindow.webContents.openDevTools();

  /**
   * As TCP Server
   */
  ipcMain.on(events.SERVER_START, (evt) => {
    const sizedChunkStream = new SizedChunkStream(960000);

    const { listen, srv, getSockets, send } = createServer({
      onConnected: () => {
        mainWindow.webContents.send(events.SERVER_ON_CLIENT_CONNECTED);
      },
      onDisconnected: () => {
        mainWindow.webContents.send(events.SERVER_ON_CLIENT_DISCONNECTED);
      },
      onReceiveData: (data) => {
        // mainWindow.webContents.send(
        //   events.SERVER_ON_RECERIVED_BROADCAST_MESSAGE,
        //   data
        // );
        sizedChunkStream.write(data);
      },
    });

    sizedChunkStream.on("data", (data) => {
      mainWindow.webContents.send(
        events.SERVER_ON_RECERIVED_BROADCAST_MESSAGE,
        data
      );
    });

    const handleServerStop = () => {
      ipcMain.removeListener(
        events.SERVER_BROADCAST_MESSAGE,
        handleServerSendData
      );
      const sockets = getSockets();
      sockets.forEach((socket) => {
        socket.destroy();
        socket.unref();
      });
      srv.close(() => {
        srv.unref();
      });
    };
    const handleServerSendData = (evt, data) => {
      send(data);
    };
    ipcMain.on(events.SERVER_BROADCAST_MESSAGE, handleServerSendData);
    listen(() => {
      evt.reply(events.SERVER_ON_SERVE_START, srv.address());
      app.once("window-all-closed", handleServerStop);
      ipcMain.once(events.SERVER_STOP, handleServerStop);
    });
  });

  /**
   * As TCP Client
   */
  ipcMain.on(events.CLIENT_START_CONNECT, (evt, { port, host } = {}) => {
    const { connection, send } = createConnection({
      port,
      host,
      // onReceiveData: (data) => {
      //   mainWindow.webContents.send(
      //     events.CLIENT_ON_RECEIVED_BROADCAST_MESSAGE,
      //     data
      //   );
      // },
      onConnected: () => {
        mainWindow.webContents.send(events.CLIENT_ON_SERVER_CONNECTED);
      },
      onDisconnected: () => {
        mainWindow.webContents.send(events.CLIENT_ON_SERVER_DISCONNECTED);
      },
    });

    const sizedChunkStream = new SizedChunkStream(960000);

    connection.pipe(sizedChunkStream);

    sizedChunkStream.on("data", (data) => {
      mainWindow.webContents.send(
        events.CLIENT_ON_RECEIVED_BROADCAST_MESSAGE,
        data
      );
    });

    const handelClientStop = () => {
      ipcMain.removeListener(
        events.CLIENT_BROADCAST_MESSAGE,
        handleClientSendData
      );
      connection.end();
      connection.destroy();
      connection.unref();
    };
    const handleClientSendData = (evt, data) => {
      send(data);
    };
    ipcMain.on(events.CLIENT_BROADCAST_MESSAGE, handleClientSendData);
    app.once("window-all-closed", handelClientStop);
    ipcMain.on(events.CLIENT_STOP_CONNECT, handelClientStop);
  });
};

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
