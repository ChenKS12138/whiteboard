import * as constants from "./constants";
import type { Readable } from "stream";

export interface IUpdateMessage {
  uuid: string;
  dataKind: constants.DataKind;
  deliveryKind: constants.DeliveryKind;
  chunk: Buffer;
}

export interface ISubStreamRule<T = any> {
  matcher: (chunk: T) => boolean;
  buildSubPipeline: (upstream: Readable) => void;
}

export interface ISpeedReportMessage {
  chunkSize: number;
  interval: number;
}
