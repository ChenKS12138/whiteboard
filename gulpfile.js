const { series, watch, parallel } = require("gulp");
const electron = require("electron");
const proc = require("child_process");
const argv = require("yargs").argv;

function dev(doneDev) {
  const instanceCount = parseInt(argv.instanceCount) || 1;
  let children = [];
  function clearChildren(done) {
    if (children && children.length) {
      children.forEach((child) => {
        child.removeAllListeners();
        child.kill();
      });
    }
    done();
  }
  function spawnElectron(done) {
    child = proc.spawn(electron, ["."]);
    children.push(child);
    child.on("exit", (code) => {
      const index = children.findIndex((one) => one === child);
      children.splice(index, 1);
      if (children && !children.length) {
        doneDev(code);
        process.exit(code);
      }
    });
    done();
  }
  watch(
    ["./src", "package,json"],
    { ignoreInitial: false },
    series(
      clearChildren,
      parallel(Array.from({ length: instanceCount }).fill(spawnElectron))
    )
  );
}

exports.dev = dev;
