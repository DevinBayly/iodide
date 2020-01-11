import { store } from "./store";
import messagePasser from "../shared/utils/redux-to-port-message-passer";
import { evaluateText } from "./actions/eval-actions";
import { iomdParser } from "./iomd-tools/iomd-parser";

function unpackExtensionMessage(msg) {
  // parse the data json string, msg parameter is actually e.data
  const msgObj = JSON.parse(msg);
  // perform a conversion of message type to action type
  switch (msgObj.exMessageType) {
    case "EVAL_CHUNK": {
      // piggy back on the existing evaluateText action
      return evaluateText();
    }
    case "DELETE_TEXT": {
      const line = msgObj.cursorPosition[0];
      const { range } = msgObj;
      const col = msgObj.cursorPosition[1];
      const retVal = {
        type: "EXTENSION_DELETE_TEXT",
        line,
        range,
        col
      };
      return retVal;
    }
    case "INSERT_TEXT": {
      const line = msgObj.cursorPosition[0];
      const col = msgObj.cursorPosition[1];
      const retVal = {
        type: "EXTENSION_CURSOR_UPDATE",
        text: msgObj.text,
        line,
        range: msgObj.range,
        col
      };
      return retVal;
    }
    case "REPLACE_ALL": {
      return {
        type: "UPDATE_IOMD_CONTENT",
        iomd: msgObj.text,
        iomdChunks: iomdParser(msgObj.text)
      };
    }
    default:
      return {};
  }
}
let extensionConnected = false; // this is for use in the update function
let iodidePort;
function initWebExtPort() {
  messagePasser.connectDispatch(store.dispatch);

  // connect store disptach to the message passer
  //
  const extensionChannel = new MessageChannel();
  const { port1 } = extensionChannel;
  const { port2 } = extensionChannel;

  // sends message from iodide to the extension triggering a connection, why does it have to wait? is the extension still loading?
  window.postMessage(
    { direction: "iodide-to-extension", message: "startup" },
    "*",
    [port2]
  );

  function handleExtensionMessage(e) {
    extensionConnected = true;
    // parse the json object that is included in the e.data
    const dispatchObject = unpackExtensionMessage(e.data); // this object will have info that can be transformed into the action type to dispatch
    // recreating the dispatch at end of updateJSMD
    messagePasser.dispatch(dispatchObject);
  }

  port1.onmessage = handleExtensionMessage;
  iodidePort = port1;
}
export function sendExtensionMessage(msg) {
  iodidePort.postMessage(msg);
}
export function extensionPortStatus() {
  return extensionConnected;
}
export default initWebExtPort;
