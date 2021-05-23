import * as stream from "stream";

export class ThrottleStream extends stream.Transform {
  private _interval: number;
  private _callback: (() => void) | null;
  constructor(interval = 0) {
    super();
    this._interval = interval;
    this._callback = null;
  }
  _transform(
    chunk: Buffer,
    enc: BufferEncoding,
    callback: stream.TransformCallback
  ) {
    if (this._callback === null) {
      this.push(chunk, enc);
      this._callback = function () {};
      const timer = setTimeout(() => {
        this._callback && this._callback();
        clearTimeout(timer);
        this._callback = null;
      }, this._interval);
    } else {
      this._callback = function () {
        this.push(chunk, enc);
      };
    }
    callback();
  }
}
