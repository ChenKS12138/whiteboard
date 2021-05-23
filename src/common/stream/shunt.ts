import * as stream from "stream";
import { ISubStreamRule } from "../interface";

export class ShuntStream<T = any> extends stream.Writable {
  private _rules: {
    matcher: (chunk: any) => boolean;
    upstream: stream.Readable;
  }[];
  constructor(subStreamRules: ISubStreamRule<T>[] = []) {
    super({
      objectMode: true,
    });
    this._rules = subStreamRules.map((streamRule) => {
      const { matcher, buildSubPipeline } = streamRule;
      const upstream = new stream.PassThrough({
        objectMode: true,
      });
      buildSubPipeline(upstream);
      return {
        matcher,
        upstream,
      };
    });
  }
  _write(chunk: T, enc: BufferEncoding, callback: stream.TransformCallback) {
    const target = this._rules.find((one) => one.matcher(chunk));
    if (target && target.upstream) {
      target.upstream.push(chunk, enc);
    }
    callback();
  }
}
