import { IpcService } from "../ipc/IpcService";
import {VertexApi,VertexApiReturn, VertexApi_} from "../ipc/VerticesApi";
import { QueryChannel } from "../ipc/QueryChannel";
const { ipcRenderer } = require('electron');

const ipc = new IpcService(ipcRenderer);


document.getElementById('test')!.addEventListener('click', () => {
  let users : VertexApi<"getVertices"> = {method : "getVertices", params : []};

  ipc.send<VertexApiReturn<"getVertices">>(QueryChannel.QEURY_CHANNEL, users).then((vertices) => {
    let verticesStr = "";
    vertices.forEach(v => {
      verticesStr += v.id+" "+v.name + " "+ v.meta + "<br>";
    });
    document.getElementById('test_text')!.innerHTML = verticesStr;
  }
  );

});