const { series, watch, parallel, src, dest } = require("gulp");
const electron = require("electron");
const proc = require("child_process");
const argv = require("yargs").argv;
const ts = require("gulp-typescript");
const del = require("del");
const stream = require("stream");

const TARGET_DIR = "target";

function createTransformTS(glob = "./src/**/**.ts") {
  return function transfromTS() {
    return src(glob).pipe(ts({})).pipe(dest(TARGET_DIR));
  };
}

const copy = parallel(
  runner("copyProto", () => src("./src/**/**.proto").pipe(dest(TARGET_DIR))),
  runner("copyHtml", () => src("./src/**/**.html").pipe(dest(TARGET_DIR))),
  runner("copyCss", () => src("./src/**/**.css").pipe(dest(TARGET_DIR)))
);

function dev(doneDev) {
  const instanceCount = parseInt(argv.instanceCount) || 1;
  let children = [];
  let watcher = null;
  function clearChildren(done) {
    if (children && children.length) {
      children.forEach((child) => {
        child.removeAllListeners();
        child.kill();
      });
    }
    done();
  }
  function makeChildren() {
    return parallel(
      Array.from({ length: instanceCount }).map((_v, k) =>
        createSpawnElectron(k)
      )
    );
  }
  function createSpawnElectron(alias) {
    return function spawnElectron(done) {
      child = proc.spawn(electron, [TARGET_DIR]);
      child.stdout
        .pipe(
          new stream.Transform({
            transform(chunk, enc, callback) {
              this.push("instantce[" + alias + "]: " + String(chunk));
              callback();
            },
          })
        )
        .pipe(process.stdout);
      children.push(child);
      child.on("exit", (code) => {
        const index = children.findIndex((one) => one === child);
        children.splice(index, 1);
        if (children && !children.length) {
          doneDev && doneDev(code);
          watcher && watcher.close();
          process.exit(code);
        }
      });
      done();
    };
  }
  series(clean, series(parallel(copy, createTransformTS()), makeChildren()))();

  watcher = watch(["./src"]);
  watcher.on("change", function (path) {
    console.log("[watch] file " + path + " changed");
    series(
      /\.ts$/.test(path) ? createTransformTS(path) : copy,
      clearChildren,
      makeChildren()
    )();
  });
}

function clean(done) {
  del.sync([TARGET_DIR], done());
}

function build(done) {
  const child = proc.spawn("electron-builder", process.argv.slice(2));
  child.stdout.pipe(process.stdout);
  child.on("exit", (code) => {
    done(code);
  });
}

function runner(displayName, callback) {
  callback.displayName = displayName;
  return callback;
}

exports.dev = dev;
exports.compile = parallel(copy, createTransformTS());
exports.clean = clean;
exports.build = build;
