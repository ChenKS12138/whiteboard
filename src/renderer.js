let totalSend = 0,
  totalReceive = 0;

const btn1Ele = document.querySelector("#btn1");
const btn2Ele = document.querySelector("#btn2");
const btn3Ele = document.querySelector("#btn3");
const btn4Ele = document.querySelector("#btn4");
const btn5Ele = document.querySelector("#btn5");

const inputEle = document.querySelector("#input");
const canvasEle = document.querySelector("#cav");
const canvasHiddenEle = document.querySelector("#cav-hidden");
const localAddressEle = document.querySelector("#local-address");
const statusLight = document.querySelector("#status-light");

/**
 * State
 */

const store = new Proxy(
  {
    isWorking: false,
    isServer: false,
    isPress: false,
    lastX: 0,
    lastY: 0,
    context: canvasEle.getContext("2d"),
    contextHidden: canvasHiddenEle.getContext("2d"),
  },
  {
    set(target, key, value) {
      if (key === "isWorking") {
        if (value) {
          statusLight.dataset.status = "active";
          setTimeout(() => {
            if (store.isServer) {
              btn1Ele.disabled = true;
              btn2Ele.disabled = true;
              inputEle.disabled = true;
              btn3Ele.disabled = false;
              btn4Ele.disabled = true;
            } else {
              btn1Ele.disabled = true;
              btn2Ele.disabled = true;
              inputEle.disabled = true;
              btn3Ele.disabled = true;
              btn4Ele.disabled = false;
            }
            canvasEle.dataset.disabled = "false";
          });
        } else {
          statusLight.dataset.status = "inactive";
          localAddressEle.innerText = "";
          btn1Ele.disabled = false;
          btn2Ele.disabled = false;
          inputEle.disabled = false;
          btn3Ele.disabled = true;
          btn4Ele.disabled = true;
          canvasEle.dataset.disabled = "true";
          store.context.clearRect(0, 0, 600, 400);
        }
      }
      target[key] = value;
    },
  }
);

/**
 * Common
 */

const handleReceivedBroadcastMessage = (evt, data) => {
  const originPixels = store.context.getImageData(0, 0, 600, 400).data;
  const incPixels = Int8Array.from(data);
  for (let i = 0; i < incPixels.length; i++) {
    originPixels[i] += incPixels[i];
  }
  const imageData = new ImageData(originPixels, 600, 400);
  store.context.putImageData(imageData, 0, 0);
};

canvasEle.addEventListener("mousedown", (evt) => {
  if (canvasEle.dataset.disabled === "false") {
    store.lastX = evt.offsetX;
    store.lastY = evt.offsetY;
    store.isPress = true;
  }
});

canvasEle.addEventListener("mouseup", (evt) => {
  if (canvasEle.dataset.disabled === "false") {
    if (store.isPress) {
      drawLine(
        store.context,
        store.lastX,
        store.lastY,
        evt.offsetX,
        evt.offsetY
      );
      store.isPress = false;
      broadcastBitmap();
    }
  }
});

canvasEle.addEventListener("mousemove", (evt) => {
  if (canvasEle.dataset.disabled === "false") {
    if (store.isPress === true) {
      drawLine(
        store.context,
        store.lastX,
        store.lastY,
        evt.offsetX,
        evt.offsetY
      );
      store.lastX = evt.offsetX;
      store.lastY = evt.offsetY;
      broadcastBitmap();
    }
  }
});

btn5Ele.addEventListener("click", () => {
  store.context.clearRect(0, 0, 600, 400);
  broadcastBitmap();
});

/**
 * For TCP Server
 */

btn1Ele.addEventListener("click", () => {
  if (!store.isWorking) {
    electron.serverStart();
  }
});

btn3Ele.addEventListener("click", () => {
  if (store.isWorking) {
    electron.serverStop();
    store.isWorking = false;
  }
});

electron.serverOnServeStart((evt, address) => {
  localAddressEle.innerText = String(
    address.family + " " + address.address + ":" + address.port
  );
  store.isServer = true;
  store.isWorking = true;
});

electron.serverOnServeStop(() => {
  localAddressEle.innerText = "";
  store.isWorking = false;
});

electron.serverOnReceivedBroadcastMessage(handleReceivedBroadcastMessage);

/**
 * For TCP Client
 */

btn2Ele.addEventListener("click", () => {
  const value = inputEle.value;
  const [host, port] = value.split(":");
  electron.clientStartConnect({ host, port });
});

btn4Ele.addEventListener("click", () => {
  if (store.isWorking) {
    electron.clientStopConnect();
    store.isWorking = false;
  }
});

electron.clientOnServerConnected(() => {
  store.isServer = false;
  store.isWorking = true;
});

electron.clientOnServerDisconnected(() => {
  store.isWorking = false;
});

electron.clientOnReceivedBroadCastMessage(handleReceivedBroadcastMessage);

function broadcastBitmap() {
  const bitmap = Uint8Array.from(
    diffContext(store.context, store.contextHidden)
  );
  if (store.isServer) {
    electron.serverBroadcastMessage(bitmap);
  } else {
    electron.clientBroadcastMessage(bitmap);
  }
  syncContext(store.context, store.contextHidden);
}

function diffContext(context1, contex2) {
  const pixels1 = context1.getImageData(0, 0, 600, 400).data;
  const pixels2 = contex2.getImageData(0, 0, 600, 400).data;
  const diff = new Int8Array(960000);
  for (let i = 0; i < pixels1.length; i++) {
    diff[i] = pixels1[i] - pixels2[i];
  }
  return diff;
}

function syncContext(sourceContext, targetContext) {
  const sourcePixels = sourceContext.getImageData(0, 0, 600, 400).data;
  const targetPixels = targetContext.getImageData(0, 0, 600, 400).data;
  for (let i = 0; i < targetPixels.length; i++) {
    targetPixels[i] = sourcePixels[i];
  }
  targetContext.putImageData(new ImageData(targetPixels, 600, 400), 0, 0);
}

function drawLine(context, x1, y1, x2, y2) {
  context.beginPath();
  context.strokeStyle = "black";
  context.lineWidth = 1;
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
  context.closePath();
}
