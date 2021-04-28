const btn1Ele = document.querySelector("#btn1");
const btn2Ele = document.querySelector("#btn2");
const btn3Ele = document.querySelector("#btn3");
const btn4Ele = document.querySelector("#btn4");

const inputEle = document.querySelector("#input");
const textareaEle = document.querySelector("#textarea");
const localAddressEle = document.querySelector("#local-address");
const statusLight = document.querySelector("#status-light");

/**
 * State
 */

const store = new Proxy(
  {
    isWorking: false,
    isServer: false,
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
            textareaEle.disabled = false;
          });
        } else {
          statusLight.dataset.status = "inactive";
          localAddressEle.innerText = "";
          btn1Ele.disabled = false;
          btn2Ele.disabled = false;
          inputEle.disabled = false;
          btn3Ele.disabled = true;
          btn4Ele.disabled = true;
          textareaEle.disabled = true;
          textareaEle.value = "";
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
  const text = new TextDecoder().decode(data);
  textareaEle.value = text;
};

textareaEle.addEventListener("input", (event) => {
  if (store.isWorking) {
    const data = textareaEle.value;
    if (store.isServer) {
      electron.serverBroadcastMessage(data);
    } else {
      electron.clientBroadcastMessage(data);
    }
  }
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
