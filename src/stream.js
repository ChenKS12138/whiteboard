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

module.exports = {
  SizedChunkStream,
};
