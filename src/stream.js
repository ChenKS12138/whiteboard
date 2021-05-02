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
    this._contentIndex = 0;
    this._prefixIndex = 0;
    this._prefixBuffer = Buffer.alloc(4);
  }
  _transform(chunk, enc, callback) {
    const data = Buffer.from(chunk);
    let dataIndex = 0;
    while (dataIndex < data.length) {
      if (this._prefixIndex < 4) {
        const appendSize = Math.max(
          0,
          Math.min(4 - this._prefixIndex, data.length - dataIndex)
        );
        data.copy(
          this._prefixBuffer,
          this._prefixIndex,
          dataIndex,
          dataIndex + appendSize
        );
        dataIndex += appendSize;
        this._prefixIndex += appendSize;
      } else {
        const contentSize = bufferToNum(this._prefixBuffer);
        const appendSize = Math.max(
          0,
          Math.min(contentSize - this._contentIndex, data.length - dataIndex)
        );
        data.copy(
          this._buffer,
          this._contentIndex,
          dataIndex,
          dataIndex + appendSize
        );
        this._contentIndex += appendSize;
        dataIndex += appendSize;
        if (this._contentIndex >= contentSize) {
          const result = Buffer.alloc(contentSize);
          this._buffer.copy(result, 0, 0, contentSize);
          this.push(result, enc);
          this._contentIndex = 0;
          this._prefixIndex = 0;
        }
      }
    }
    callback();
  }
}

class CompressStream extends stream.Transform {
  _transform(chunk, enc, callback) {
    const compressed = zlib.deflateSync(chunk);
    this.push(compressed, enc);
    callback();
  }
}

class DecompressStream extends stream.Transform {
  _transform(chunk, enc, callback) {
    const decompressed = zlib.inflateSync(chunk);
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

class EmitterEventStream extends stream.PassThrough {
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

class ThrottleStream extends stream.Transform {
  constructor(interval = 0) {
    super();
    this._interval = interval;
    this._lock = false;
  }
  _transform(chunk, enc, callback) {
    if (!this._lock) {
      this._lock = true;
      this.push(chunk, enc);
      const timer = setTimeout(() => {
        this._lock = false;
        clearTimeout(timer);
      }, this._interval);
    }
    callback();
  }
}

module.exports = {
  WebContentsEventStream,
  EmitterEventStream,
  ServerBroadcastStream,
  SizePrefixedChunkEncodeStream,
  SizePrefixedChunkDecodeStream,
  CompressStream,
  DecompressStream,
  GenerateDiffStream,
  ApplyDiffStream,
  ThrottleStream,
  numToBuffer,
  bufferToNum,
};
