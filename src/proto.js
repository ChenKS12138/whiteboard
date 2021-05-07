const protobuf = require("protobufjs");
const path = require("path");
const root = protobuf.loadSync(path.join(__dirname, "./UpdateMessage.proto"));
const UpdateMessage = root.lookupType("whiteboardpackage.UpdateMessage");

module.exports = {
  UpdateMessage,
};
