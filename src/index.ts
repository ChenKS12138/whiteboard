import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import * as stream from "stream";
import { createConnection, createServer } from "./util/net";
import * as constants from "./util/constants";
import {
  ApplyDiffStream,
  CompressStream,
  DecompressStream,
  EmitterEventStream,
  EncodeBitmapBroadcastUpdateMessageStream,
  GenerateDiffStream,
  ShuntStream,
  SizePrefixedChunkDecodeStream,
  SizePrefixedChunkEncodeStream,
  SpeedTestStream,
  ThrottleStream,
  UpdateMessageDecodeStream,
  WebContentsEventStream,
} from "./util/stream";

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

  /**
   * As TCP Server
   */
  ipcMain.on(constants.ChannelType.SERVER_START, (evt) => {
    const { srv, broadcastStream } = createServer();

    broadcastStream.on("startServer", () => {
      evt.reply(constants.ChannelType.SERVER_ON_SERVE_START, srv.address());
      app.once("window-all-closed", () => {
        broadcastStream.emit("stopServer");
      });
      ipcMain.once(constants.ChannelType.SERVER_STOP, () => {
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
      new SizePrefixedChunkDecodeStream(),
      new SpeedTestStream({
        interval: 1000,
        reportSpeed: (...args) =>
          mainWindow.webContents.send(
            constants.ChannelType.REPORT_DOWN_STREAM_SPEED,
            ...args
          ),
      }),
      new DecompressStream(),
      new UpdateMessageDecodeStream(),
      new ShuntStream([
        {
          matcher(updateMessage) {
            return (
              updateMessage &&
              updateMessage.dataKind === constants.DataKind.BITMAP &&
              updateMessage.deliveryKind === constants.DeliveryKind.BROADCASTED
            );
          },
          buildSubPipeline(upstream) {
            stream.pipeline(
              upstream,
              new stream.Transform({
                transform(updateMessage, enc, callback) {
                  this.push(updateMessage.chunk, enc);
                  callback();
                },
                objectMode: true,
              }),
              new ApplyDiffStream(bitmapBuffer),
              new WebContentsEventStream(
                mainWindow.webContents,
                constants.ChannelType.SERVER_ON_RECERIVED_BROADCAST_MESSAGE
              ),
              () => {}
            );
          },
        },
      ]),
      () => {}
    );

    broadcastStream.on("joinNewClient", (socket) => {
      stream.pipeline(
        new stream.Readable({
          read() {
            this.push(bitmapBuffer);
            this.push(null);
          },
        }),
        new EncodeBitmapBroadcastUpdateMessageStream(),
        new CompressStream(),
        new SizePrefixedChunkEncodeStream(),
        new stream.Writable({
          write(chunk, enc, callback) {
            socket.write(chunk);
            callback();
          },
        }),
        () => {}
      );
    });

    // Pipe Msg, Server -> Client
    stream.pipeline(
      new EmitterEventStream(
        ipcMain,
        constants.ChannelType.SERVER_BROADCAST_MESSAGE
      ),
      new ThrottleStream(16),
      new GenerateDiffStream(bitmapBuffer),
      new EncodeBitmapBroadcastUpdateMessageStream(),
      new CompressStream(),
      new SpeedTestStream({
        interval: 1000,
        reportSpeed: (...args) =>
          mainWindow.webContents.send(
            constants.ChannelType.REPORT_UP_STREAM_SPEED,
            ...args
          ),
      }),
      new SizePrefixedChunkEncodeStream(),
      broadcastStream,
      () => {}
    );
  });

  /**
   * As TCP Client
   */
  ipcMain.on(
    constants.ChannelType.CLIENT_START_CONNECT,
    (evt, { port, host } = {}) => {
      const { connection } = createConnection({
        port,
        host,
      });

      connection.on("connect", () => {
        mainWindow.webContents.send(
          constants.ChannelType.CLIENT_ON_SERVER_CONNECTED
        );
      });

      connection.on("close", () => {
        mainWindow.webContents.send(
          constants.ChannelType.CLIENT_ON_SERVER_DISCONNECTED
        );
        connection.destroy();
      });

      app.once("window-all-closed", () => {
        connection.end();
      });

      ipcMain.on(constants.ChannelType.CLIENT_STOP_CONNECT, () => {
        connection.end();
      });

      const bitmapBuffer = Buffer.alloc(960000);

      // Pipe Msg, Server -> Client
      stream.pipeline(
        connection,
        new SizePrefixedChunkDecodeStream(),
        new SpeedTestStream({
          interval: 1000,
          reportSpeed: (...args) =>
            mainWindow.webContents.send(
              constants.ChannelType.REPORT_DOWN_STREAM_SPEED,
              ...args
            ),
        }),
        new DecompressStream(),
        new UpdateMessageDecodeStream(),
        new ShuntStream([
          {
            matcher(updateMessage) {
              return (
                updateMessage &&
                updateMessage.dataKind === constants.DataKind.BITMAP &&
                updateMessage.deliveryKind ===
                  constants.DeliveryKind.BROADCASTED
              );
            },
            buildSubPipeline(upstream) {
              stream.pipeline(
                upstream,
                new stream.Transform({
                  transform(updateMessage, enc, callback) {
                    this.push(updateMessage.chunk, enc);
                    callback();
                  },
                  objectMode: true,
                }),
                new ApplyDiffStream(bitmapBuffer),
                new WebContentsEventStream(
                  mainWindow.webContents,
                  constants.ChannelType.SERVER_ON_RECERIVED_BROADCAST_MESSAGE
                ),
                () => {}
              );
            },
          },
        ]),
        () => {}
      );

      // Pipe Msg, Client -> Server
      stream.pipeline(
        new EmitterEventStream(
          ipcMain,
          constants.ChannelType.CLIENT_BROADCAST_MESSAGE
        ),
        new ThrottleStream(16),
        new GenerateDiffStream(bitmapBuffer),
        new EncodeBitmapBroadcastUpdateMessageStream(),
        new CompressStream(),
        new SpeedTestStream({
          interval: 1000,
          reportSpeed: (...args) =>
            mainWindow.webContents.send(
              constants.ChannelType.REPORT_UP_STREAM_SPEED,
              ...args
            ),
        }),
        new SizePrefixedChunkEncodeStream(),
        connection,
        () => {}
      );
    }
  );
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
