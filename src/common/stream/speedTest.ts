import * as stream from "stream";
import { ISpeedReportMessage } from "../interface";

interface ISpeedTestStreamOption {
  interval: number;
  reportSpeed: (speed: ISpeedReportMessage) => void;
}

export class SpeedTestStream extends stream.Transform {
  private chunkSize: number;
  constructor(options: ISpeedTestStreamOption) {
    super();
    const interval = options.interval;
    const reportSpeed = options.reportSpeed;
    this.chunkSize = 0;
    const t = setInterval(() => {
      reportSpeed && reportSpeed({ chunkSize: this.chunkSize, interval });
      this.chunkSize = 0;
    }, interval);
    this.on("end", () => {
      clearTimeout(t);
    });
  }
  _transform(
    chunk: Buffer,
    enc: BufferEncoding,
    callback: stream.TransformCallback
  ) {
    chunk.length && (this.chunkSize += chunk.length);
    this.push(chunk, enc);
    callback();
  }
}
