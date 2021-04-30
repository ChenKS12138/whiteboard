const stream = require("stream");

class SizedChunkStream extends stream.Transform {
  constructor(bufferSize) {
    super({
      highWaterMark: bufferSize,
    });
    this._buffer = Buffer.alloc(bufferSize);
    this._bufferSize = bufferSize;
    this._index = 0;
  }
  _transform(buf, enc, callback) {
    const data = Buffer.from(buf);
    let index = 0;
    while (index < data.length) {
      const appendSize = Math.min(
        this._bufferSize - this._index,
        data.length - index
      );
      data.copy(this._buffer, this._index, index, index + appendSize);
      this._index += appendSize;
      index += appendSize;
      if (this._index >= this._bufferSize) {
        this.push(this._buffer, enc);
        this._index -= this._bufferSize;
      }
    }
    callback();
  }
}

class WebContentsEventStream extends stream.Writable {
  constructor(webContents, event) {
    super();
    this._webContents = webContents;
    this._event = event;
  }
  _write(chunk, enc, callback) {
    this._webContents.send(this._event, chunk);
    callback();
  }
}

class IpcMainEventStream extends stream.PassThrough {
  constructor(ipcMain, event) {
    super();
    ipcMain.on(event, (evt, data) => {
      this.write(data);
    });
  }
}

class ServerBroadcastStream extends stream.PassThrough {
  constructor() {
    super();
    this._sockets = [];
    this.pause();
  }
  _destroy() {
    this._sockets.forEach((socket) => {
      socket.unpipe(this);
      this.unpipe(socket);
      socket.destroy();
      socket.unref();
    });
  }
  addSocket(socket) {
    this._sockets.forEach((one) => {
      one.pipe(socket);
      socket.pipe(socket);
    });
    socket.pipe(this);
    this.pipe(socket);
    this._sockets.push(socket);
  }
  removeSocket(socket) {
    const index = this._sockets.findIndex((one) => one === socket);
    if (index !== -1) {
      this._sockets.splice(index, 1);
      this.unpipe(socket);
      socket.unpipe(this);
    }
  }
}

module.exports = {
  SizedChunkStream,
  WebContentsEventStream,
  IpcMainEventStream,
  ServerBroadcastStream,
};
