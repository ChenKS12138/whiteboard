const stream = require("stream");
const zlib = require("zlib");

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

class CompressStream extends stream.Transform {
  _transform(chunk, enc, callback) {
    const compressed = zlib.brotliCompressSync(chunk);
    this.push(compressed, enc);
    callback();
  }
}

class DecompressStream extends stream.Transform {
  _transform(chunk, enc, callback) {
    const decompressed = zlib.brotliDecompressSync(chunk);
    this.push(decompressed, enc);
    callback();
  }
}

class GenerateDiffStream extends stream.Transform {
  constructor(buffer) {
    super();
    this._buffer = buffer || null;
  }
  _transform(chunk, enc, callback) {
    const len = chunk.length;
    if (this._buffer === null) {
      this._buffer = Buffer.alloc(len).fill(0x00);
    }
    const diff = Buffer.alloc(len);
    for (let i = 0; i < len; i++) {
      diff[i] = chunk[i] - this._buffer[i];
    }
    this.push(diff, enc);
    chunk.copy(this._buffer, 0, 0, len);
    callback();
  }
}

class ApplyDiffStream extends stream.Transform {
  constructor(buffer) {
    super();
    this._buffer = buffer || null;
  }
  _transform(chunk, enc, callback) {
    const len = chunk.length;
    if (this._buffer === null) {
      this._buffer = Buffer.alloc(len).fill(0x00);
    }
    for (let i = 0; i < len; i++) {
      this._buffer[i] += chunk[i];
    }
    this.push(this._buffer, enc);
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
      evt.returnValue = undefined;
      this.write(data);
    });
  }
}

class ServerBroadcastStream extends stream.Duplex {
  constructor() {
    super();
    this._sockets = [];
  }
  addSocket(socket) {
    socket.on("data", (chunk) => {
      if (!this.push(chunk)) {
        socket.pause();
      }
    });
    this._sockets.forEach((one) => {
      one.pipe(socket);
      socket.pipe(one);
    });
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
  _read() {
    for (let i = 0; i < this._sockets.length; i++) {
      this._sockets[i].resume();
    }
  }
  _write(input, encoding, done) {
    let waiting = this._sockets.length;
    if (waiting === 0) {
      return done();
    }
    for (var i = 0; i < this._sockets.length; ++i) {
      this._sockets[i].write(input, encoding, function () {
        waiting--;
        if (waiting === 0) {
          return done();
        }
      });
    }
  }
  _destroy() {
    this._sockets.forEach((socket) => {
      socket.unpipe(this);
      this.unpipe(socket);
      socket.destroy();
      socket.unref();
    });
  }
}

module.exports = {
  WebContentsEventStream,
  IpcMainEventStream,
  ServerBroadcastStream,
  SizePrefixedChunkEncodeStream,
  SizePrefixedChunkDecodeStream,
  CompressStream,
  DecompressStream,
  GenerateDiffStream,
  ApplyDiffStream,
};
