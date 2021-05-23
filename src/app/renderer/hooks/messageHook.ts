import React, { useCallback, useEffect, useMemo } from "react";
import { ipcRenderer } from "electron";
import * as constants from "@/common/constants";

export function useMessageSender() {
  const sender = useCallback(
    (key: string | constants.ChannelType, ...args) => {
      if (Array.isArray(key)) {
        key.forEach((one) => {
          ipcRenderer.send(one, ...args);
        });
      } else {
        ipcRenderer.send(key, ...args);
      }
    },
    [ipcRenderer]
  );
  return sender;
}

export function useMessageListener(
  key: string | string[] | constants.ChannelType | constants.ChannelType[],
  callback: (...args: any[]) => void,
  deps: any[]
) {
  useEffect(() => {
    if (Array.isArray(key)) {
      key.forEach((one) => {
        ipcRenderer.on(one, (evt, ...rest) => {
          callback(...rest);
        });
      });
    } else {
      ipcRenderer.on(key, (evt, ...rest) => {
        callback(...rest);
      });
    }
    return () => {
      if (Array.isArray(key)) {
        key.forEach((one) => {
          ipcRenderer.off(one, (evt, ...rest) => {
            callback(...rest);
          });
        });
      } else {
        ipcRenderer.off(key, (evt, ...rest) => {
          callback(...rest);
        });
      }
    };
  }, [...deps]);
}
