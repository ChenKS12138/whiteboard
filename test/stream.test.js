const stream = require("stream");
const {
  DecompressStream,
  CompressStream,
  SizePrefixedChunkEncodeStream,
  SizePrefixedChunkDecodeStream,
  numToBuffer,
  bufferToNum,
  ThrottleStream,
} = require("../src/stream");

describe("number2buffer & buffer2number", () => {
  it("should convert well", (done) => {
    const testcases = [0, 255, 960000, 1, 100, 1000];
    for (const num of testcases) {
      expect(bufferToNum(numToBuffer(num))).toBe(num);
    }
    done();
  });
});

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
    const text = "hellohello";
    const data = Buffer.from(text);
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
          expect(chunk.toString()).toBe(text);
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

describe("throttle stream", () => {
  it("shoudle throttle well", (done) => {
    const upStream = new stream.PassThrough();
    const resultIter = ["1", "3"][Symbol.iterator]();

    upStream.write("1");
    upStream.write("2");
    setTimeout(() => {
      upStream.write("3");
      upStream.end();
    }, 1000);

    stream.pipeline(
      upStream,
      new ThrottleStream(1000),
      new stream.Writable({
        write(chunk, enc, callback) {
          expect(chunk.toString()).toBe(resultIter.next().value);
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
