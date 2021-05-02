const stream = require("stream");
const {
  DecompressStream,
  CompressStream,
  SizePrefixedChunkEncodeStream,
  SizePrefixedChunkDecodeStream,
} = require("../src/stream");

describe("compress stream", () => {
  it("should zip and unzip", (done) => {
    const texts = ["hello", "", "world", "asdfnkl;asdfj13123414234"];
    const iter = texts[Symbol.iterator]();
    stream.pipeline(
      new stream.Readable({
        read() {
          const curr = iter.next();
          this.push(curr.done ? null : curr.value);
        },
      }),
      new CompressStream(),
      new DecompressStream(),
      new stream.Writable({
        write(chunk, enc, callback) {
          expect(texts.includes(chunk.toString())).toBe(true);
          callback();
        },
      }),
      (err) => {
        expect(err).toBeUndefined();
        done();
      }
    );
  });
});

describe("sized chunk", () => {
  it("should prefix chunk", (done) => {
    const data = Buffer.from("hellohello");
    stream.pipeline(
      new stream.Readable({
        read() {
          this.push(data);
          this.push(null);
        },
      }),
      new SizePrefixedChunkEncodeStream(),
      new stream.Transform({
        transform(chunk, enc, callback) {
          chunk = Buffer.from(chunk);
          for (const item of chunk) {
            this.push(Buffer.from([item]), enc);
          }
          callback();
        },
      }),
      new SizePrefixedChunkDecodeStream(1024),
      new stream.Writable({
        write(chunk, enc, callback) {
          expect(chunk.toString()).toBe(data.toString());
          callback();
        },
      }),
      (err) => {
        if (err) {
          console.error(err);
        }
        expect(err).toBeUndefined();
        done();
      }
    );
  });
});
