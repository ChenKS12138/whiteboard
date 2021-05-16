const btn1Ele = document.querySelector("#btn1");
const btn2Ele = document.querySelector("#btn2");
const btn3Ele = document.querySelector("#btn3");
const btn4Ele = document.querySelector("#btn4");
const btn5Ele = document.querySelector("#btn5");

const upStreamLabelEle = document.querySelector(
  ".label_speed[data-type='upstream']"
);
const downStreamLabelEle = document.querySelector(
  ".label_speed[data-type='downstream']"
);

const inputEle = document.querySelector("#input");
const canvasEle = document.querySelector("#cav");
const localAddressEle = document.querySelector("#local-address");
const statusLight = document.querySelector("#status-light");

console.log(upStreamLabelEle, downStreamLabelEle);

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
  const imageData = new ImageData(Uint8ClampedArray.from(data), 600, 400);
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
    if (store.isPress === true && evt.offsetX <= 600 && evt.offsetY <= 400) {
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

electron.reportUpStreamSpeed((_evt, info) => {
  const speed = Math.round(info.chunkSize / info.interval);
  upStreamLabelEle.innerText = formatSpeed(speed);
});

electron.reportDownStreamSpeed((_evt, info) => {
  const speed = Math.round(info.chunkSize / info.interval);
  downStreamLabelEle.innerText = formatSpeed(speed);
});

function broadcastBitmap() {
  const bitmap = Uint8Array.from(
    store.context.getImageData(0, 0, 600, 400).data
  );
  if (store.isServer) {
    electron.serverBroadcastMessage(bitmap);
  } else {
    electron.clientBroadcastMessage(bitmap);
  }
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

/**
 * @param {number} speedNum
 * @returns {string}
 */
function formatSpeed(speedNum) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let index = 0;
  while (index < units.length && speedNum > 1024) {
    speedNum = Math.round(speedNum / 1024);
    index += 1;
  }
  return String(speedNum) + units[index] + "/s";
}
