import * as protobuf from "protobufjs";
import * as path from "path";

const root = protobuf.loadSync(path.join(__dirname, "./UpdateMessage.proto"));

export const UpdateMessage = root.lookupType("whiteboardpackage.UpdateMessage");
