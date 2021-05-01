const stream = require("stream");
const zlib = require("zlib");

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

class SizePrefixedChunkEncodeStream extends stream.Transform {
  constructor() {
    super();
  }
  _transform(chunk, enc, callback) {
    this.push(Buffer.concat([numToBuffer(chunk.length), chunk]), enc);
    callback();
  }
}

class SizePrefixedChunkDecodeStream extends stream.Transform {
  constructor(maxChunkSize) {
    super();
    this._buffer = Buffer.alloc(maxChunkSize);
    this._index = 0;
    this._prefixIndex = 0;
    this._prefixBuffer = Buffer.alloc(4);
  }
  _transform(chunk, enc, callback) {
    const data = Buffer.from(chunk);
    if (this._prefixIndex < 4) {
      const appendSize = Math.min(4 - this._prefixIndex, data.length);
      data.copy(this._prefixBuffer, this._prefixIndex, 0, appendSize);
      this._prefixIndex += appendSize;
    }
    if (this._prefixIndex >= 4) {
      let index = this._prefixIndex;
      const size = bufferToNum(this._prefixBuffer);
      while (index < data.length) {
        const appendSize = Math.min(size - this._index, data.length - index);
        data.copy(this._buffer, this._index, index, index + appendSize);
        this._index += appendSize;
        index += appendSize;
        if (this._index >= size) {
          this.push(this._buffer.slice(0, size), enc);
          this._index = 0;
          this._prefixIndex = 0;
        }
      }
    }
    callback();
  }
}

class GzipStream extends stream.Transform {
  _transform(chunk, enc, callback) {
    this.push(zlib.gzipSync(chunk), enc);
    callback();
  }
}

class GunzipStream extends stream.Transform {
  _transform(chunk, enc, callback) {
    this.push(zlib.gunzipSync(chunk), enc);
    callback();
  }
}

function numToBuffer(num) {
  return Buffer.from([
    (num >> 24) & 255,
    (num >> 16) & 255,
    (num >> 8) & 255,
    num & 255,
  ]);
}

function bufferToNum(buf) {
  return (buf[0] << 24) + (buf[1] << 16) + (buf[2] << 8) + buf[3];
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
  SizePrefixedChunkEncodeStream,
  SizePrefixedChunkDecodeStream,
  GzipStream,
  GunzipStream,
};
