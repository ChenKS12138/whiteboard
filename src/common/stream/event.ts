import * as Electron from "electron";
import * as stream from "stream";

export class WebContentsEventStream extends stream.Writable {
  private _webContents: Electron.webContents;
  private _event: string;
  constructor(webContents: Electron.webContents, event: string) {
    super();
    this._webContents = webContents;
    this._event = event;
  }
  _write(chunk: Buffer, enc: BufferEncoding, callback: any) {
    this._webContents.send(this._event, chunk);
    callback();
  }
}

export class EmitterEventStream extends stream.PassThrough {
  constructor(ipcMain: Electron.IpcMain, event: string) {
    super();
    ipcMain.on(event, (evt, data) => {
      evt.returnValue = undefined;
      this.write(data);
    });
  }
}
