try {
  require("electron-reloader")(module);
} catch (_) {}

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const stream = require("stream");
const { createConnection, createServer } = require("./net");
const events = require("./channelTypes");
const {
  WebContentsEventStream,
  IpcMainEventStream,
  SizePrefixedChunkEncodeStream,
  SizePrefixedChunkDecodeStream,
  GzipStream,
  GunzipStream,
  GenerateDiffStream,
  ApplyDiffStream,
} = require("./stream");

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
    const { srv, broadcastStream } = createServer();

    broadcastStream.on("startServer", () => {
      evt.reply(events.SERVER_ON_SERVE_START, srv.address());
      app.once("window-all-closed", () => {
        broadcastStream.emit("stopServer");
      });
      ipcMain.once(events.SERVER_STOP, () => {
        broadcastStream.emit("stopServer");
      });
    });

    broadcastStream.on("stopServer", () => {
      srv.close(() => {
        srv.unref();
      });
      broadcastStream.destroy();
    });

    const bitmapBuffer = Buffer.alloc(960000);

    // Pipe Msg, Client -> Server
    stream.pipeline(
      broadcastStream,
      new SizePrefixedChunkDecodeStream(960000),
      new GunzipStream(),
      new ApplyDiffStream(bitmapBuffer),
      new WebContentsEventStream(
        mainWindow.webContents,
        events.SERVER_ON_RECERIVED_BROADCAST_MESSAGE
      ),
      () => {}
    );

    /**
     * Compression Ratio About 1200/960000
     */

    // Pipe Msg, Server -> Client
    stream.pipeline(
      new IpcMainEventStream(ipcMain, events.SERVER_BROADCAST_MESSAGE),
      new GenerateDiffStream(bitmapBuffer),
      new GzipStream(),
      new SizePrefixedChunkEncodeStream(),
      broadcastStream,
      () => {}
    );
  });

  /**
   * As TCP Client
   */
  ipcMain.on(events.CLIENT_START_CONNECT, (evt, { port, host } = {}) => {
    const { connection } = createConnection({
      port,
      host,
    });

    connection.on("connect", () => {
      mainWindow.webContents.send(events.CLIENT_ON_SERVER_CONNECTED);
    });

    connection.on("close", () => {
      mainWindow.webContents.send(events.CLIENT_ON_SERVER_DISCONNECTED);
      connection.destroy();
    });

    app.once("window-all-closed", () => {
      connection.end();
    });

    ipcMain.on(events.CLIENT_STOP_CONNECT, () => {
      connection.end();
    });

    const bitmapBuffer = Buffer.alloc(960000);

    // Pipe Msg, Server -> Client
    stream.pipeline(
      connection,
      new SizePrefixedChunkDecodeStream(960000),
      new GunzipStream(),
      new ApplyDiffStream(bitmapBuffer),
      new WebContentsEventStream(
        mainWindow.webContents,
        events.CLIENT_ON_RECEIVED_BROADCAST_MESSAGE
      ),
      () => {}
    );

    // Pipe Msg, Client -> Server
    stream.pipeline(
      new IpcMainEventStream(ipcMain, events.CLIENT_BROADCAST_MESSAGE),
      new GenerateDiffStream(bitmapBuffer),
      new GzipStream(),
      new SizePrefixedChunkEncodeStream(),
      connection,
      () => {}
    );
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
