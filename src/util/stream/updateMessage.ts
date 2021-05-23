import * as stream from "stream";
import * as proto from "../../proto";
import { v4 as uuidv4 } from "uuid";
import * as constants from "../constants";

export class EncodeBitmapBroadcastUpdateMessageStream extends stream.Transform {
  _transform(
    chunk: Buffer,
    enc: BufferEncoding,
    callback: stream.TransformCallback
  ) {
    const updateMessage = proto.UpdateMessage.create({
      uuid: uuidv4(),
      dataKind: constants.DataKind.BITMAP,
      deliveryKind: constants.DeliveryKind.BROADCASTED,
      chunk,
    });
    this.push(proto.UpdateMessage.encode(updateMessage).finish());
    callback();
  }
}

export class UpdateMessageDecodeStream extends stream.Transform {
  constructor() {
    super({ objectMode: true });
  }
  _transform(
    chunk: Buffer,
    enc: BufferEncoding,
    callback: stream.TransformCallback
  ) {
    const updateMessage = proto.UpdateMessage.decode(chunk);
    this.push(updateMessage);
    callback();
  }
}
