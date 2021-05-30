import { BrowserWindow, app, ipcMain } from "electron";
import * as stream from "stream";
import * as constants from "@/common/constants";
import { createServer } from "@/common/net";
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
} from "@/common/stream";
import { IUpdateMessage } from "@/common/interface";

export function runServerApp(mainWindow: BrowserWindow) {
  ipcMain.on(constants.ChannelType.SERVER_START, (evt) => {
    const { broadcastStream, srv } = createServer();

    broadcastStream.on("startServer", () => {
      mainWindow.webContents.send(
        constants.ChannelType.SERVER_ON_SERVE_START,
        srv.address()
      );
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
      broadcastStream.end();
      mainWindow.webContents.send(constants.ChannelType.SERVER_ON_SERVE_STOP);
    });

    const bitmapBuffer = Buffer.alloc(960000);

    // Pipe Msg, Client -> Server
    stream.pipeline(
      broadcastStream,
      new SizePrefixedChunkDecodeStream(),
      new SpeedTestStream({
        interval: 1000,
        reportSpeed: (...args) => {
          mainWindow.webContents.send(
            constants.ChannelType.REPORT_DOWN_STREAM_SPEED,
            ...args
          );
        },
      }),
      new DecompressStream(),
      new UpdateMessageDecodeStream(),
      new ShuntStream<IUpdateMessage>([
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
}
