import * as stream from "stream";
import type { Socket } from "net";

export class ServerBroadcastStream extends stream.Duplex {
  private _sockets: Socket[];
  constructor() {
    super();
    this._sockets = [];
  }
  addSocket(socket: Socket) {
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
  removeSocket(socket: Socket) {
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
  _write(input: Buffer, encoding: BufferEncoding, done: any) {
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
