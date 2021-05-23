import * as stream from "stream";

export class GenerateDiffStream extends stream.Transform {
  private _buffer: Buffer;
  constructor(buffer: Buffer) {
    super();
    this._buffer = buffer || null;
  }
  _transform(
    chunk: Buffer,
    enc: BufferEncoding,
    callback: stream.TransformCallback
  ) {
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

export class ApplyDiffStream extends stream.Transform {
  private _buffer: Buffer;
  constructor(buffer: Buffer) {
    super();
    this._buffer = buffer || null;
  }
  _transform(
    chunk: Buffer,
    enc: BufferEncoding,
    callback: stream.TransformCallback
  ) {
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
