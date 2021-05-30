import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as constants from "@/common/constants";
import { EnhanceCanvas } from "@/app/renderer/components";
import { useMessageSender, useMessageListener } from "@/app/renderer/hooks";
import { formatSpeed } from "@/common/util";
import { ISpeedReportMessage } from "@/common/interface";
import { AddressInfo } from "net";

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;

export default function App() {
  const [isWorking, setIsWorking] = useState(false);
  const [isServer, setIsServer] = useState(false);
  const [clearRectTimeStamp, setClearRectTimeStamp] = useState(Date.now());
  const [imageData, setImageData] = useState<ImageData | null>(null);

  const messageSend = useMessageSender();

  useMessageListener(
    constants.ChannelType.CLIENT_ON_SERVER_CONNECTED,
    () => {
      setIsWorking(true);
      setIsServer(false);
    },
    [setIsServer, setIsWorking]
  );

  useMessageListener(
    constants.ChannelType.SERVER_ON_SERVE_START,
    () => {
      setIsWorking(true);
      setIsServer(true);
    },
    [setIsServer, setIsWorking]
  );

  useMessageListener(
    [
      constants.ChannelType.CLIENT_ON_SERVER_DISCONNECTED,
      constants.ChannelType.SERVER_ON_SERVE_STOP,
    ],
    () => {
      setClearRectTimeStamp(Date.now());
      setIsWorking(false);
    },
    [setIsWorking, setClearRectTimeStamp]
  );

  useMessageListener(
    [
      constants.ChannelType.CLIENT_ON_RECEIVED_BROADCAST_MESSAGE,
      constants.ChannelType.SERVER_ON_RECERIVED_BROADCAST_MESSAGE,
    ],
    (data) => {
      const imageData = new ImageData(
        Uint8ClampedArray.from(data),
        CANVAS_WIDTH,
        CANVAS_HEIGHT
      );
      setImageData(imageData);
    },
    [setImageData]
  );

  const handleClickReset = useCallback(() => {
    setClearRectTimeStamp(Date.now());
  }, [setClearRectTimeStamp]);

  const handleBroadcastBitmap = useCallback(
    (bitmap) => {
      messageSend(
        isServer
          ? constants.ChannelType.SERVER_BROADCAST_MESSAGE
          : constants.ChannelType.CLIENT_BROADCAST_MESSAGE,
        bitmap
      );
    },
    [messageSend, isServer]
  );

  return (
    <div>
      <NetStatus />
      <ConnectionStatus isWorking={isWorking} />
      <ServerControl isWorking={isWorking} isServer={isServer} />
      <ClientControl isWorking={isWorking} isServer={isServer} />
      <EnhanceCanvas
        disabled={!isWorking}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        clearRectTimeStamp={clearRectTimeStamp}
        onChange={handleBroadcastBitmap}
        imageData={imageData}
      />
      <button onClick={handleClickReset}>reset</button>
    </div>
  );
}

interface INetStatus {}

function NetStatus({}: INetStatus) {
  const [upstreamSpeed, setUpstreamSpeed] = useState(0);
  const [downstreamSpeed, setDownstreamSpeed] = useState(0);

  useMessageListener(
    constants.ChannelType.REPORT_UP_STREAM_SPEED,
    (msg: ISpeedReportMessage) => {
      setUpstreamSpeed(msg.chunkSize / msg.interval);
    },
    [setUpstreamSpeed]
  );

  useMessageListener(
    constants.ChannelType.REPORT_DOWN_STREAM_SPEED,
    (msg: ISpeedReportMessage) => {
      setDownstreamSpeed(msg.chunkSize / msg.interval);
    },
    [setDownstreamSpeed]
  );

  return (
    <div className="box_net-status">
      <span className="label_speed" data-type="upstream">
        {formatSpeed(upstreamSpeed)}
      </span>
      <span className="label_speed" data-type="downstream">
        {formatSpeed(downstreamSpeed)}
      </span>
    </div>
  );
}

interface IConnectionStatus {
  isWorking: boolean;
}

function ConnectionStatus({ isWorking }: IConnectionStatus) {
  const connectionStatus = useMemo(() => {
    return isWorking
      ? constants.ConnectionStatus.ACTIVE
      : constants.ConnectionStatus.INACTIVE;
  }, [isWorking]);
  const [localAddress, setLocalAddress] = useState("");

  useMessageListener(
    constants.ChannelType.SERVER_ON_SERVE_START,
    (address: AddressInfo) => {
      setLocalAddress(
        address.family + " " + address.address + ":" + address.port
      );
    },
    [setLocalAddress]
  );

  useMessageListener(
    constants.ChannelType.SERVER_ON_SERVE_STOP,
    () => {
      setLocalAddress("");
    },
    [setLocalAddress]
  );

  return (
    <div className="box status">
      <div data-status={connectionStatus} className="status-light" />
      <div>{localAddress}</div>
    </div>
  );
}

interface IServerControl {
  isWorking: boolean;
  isServer: boolean;
}

function ServerControl({ isWorking, isServer }: IServerControl) {
  const messageSend = useMessageSender();

  const handleClickServerStart = useCallback(() => {
    messageSend(constants.ChannelType.SERVER_START);
  }, [messageSend]);

  const handleClickServerStop = useCallback(() => {
    messageSend(constants.ChannelType.SERVER_STOP);
  }, [messageSend]);

  return (
    <div className="box box_server-controll">
      <button disabled={isWorking} onClick={handleClickServerStart}>
        start server
      </button>
      <button
        disabled={!(isWorking && isServer)}
        onClick={handleClickServerStop}
      >
        stop server
      </button>
    </div>
  );
}

interface IClientControl {
  isWorking: boolean;
  isServer: boolean;
}

function ClientControl({ isServer, isWorking }: IClientControl) {
  const [addr, setAddr] = useState("");
  const messageSend = useMessageSender();

  const handleAddrInput = useCallback(
    (event) => {
      setAddr(event.target.value);
    },
    [setAddr]
  );

  const handleClickClientStart = useCallback(() => {
    const [host, port] = addr.split(":");
    messageSend(constants.ChannelType.CLIENT_START_CONNECT, { host, port });
  }, [messageSend, addr]);

  const handleClickClientStop = useCallback(() => {
    messageSend(constants.ChannelType.CLIENT_STOP_CONNECT);
  }, [messageSend]);

  return (
    <div className="box box_client-controll">
      <input type="text" value={addr} onInput={handleAddrInput} />
      <button disabled={isWorking} onClick={handleClickClientStart}>
        connect to server
      </button>
      <button
        disabled={!(isWorking && !isServer)}
        onClick={handleClickClientStop}
      >
        disconnect to server
      </button>
    </div>
  );
}
