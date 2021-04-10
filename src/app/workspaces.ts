import { IpcService } from "../ipc/IpcService";
import * as _ from "lodash";
import { IpcHandler } from "../ipc/IpcHandler";
import { AttributeApi, AttributeApiReturn } from "../ipc/AttributesApi";
import { Workspace } from ".prisma/client";
import { AttributeChannel } from "../ipc/AttributesChannel";
import {ipcRenderer} from 'electron';
import { WorkspaceChannel } from "../ipc/WorkspaceChannel";
import { WorkspaceApi, WorkspaceApiReturn, WorkspaceWinApi, WorkspaceWinApi_ } from "../ipc/WorkspaceApi";
import { ClassMethods } from "../ipc/RemoteApi";
import { IpcSender } from "../ipc/IpcSender";
//const ipcRenderer : IpcRenderer  = require('electron').ipcRenderer;

const ipc = new IpcService(ipcRenderer);

ipcRenderer.on(WorkspaceChannel.WORKSPACE_CHANNEL,(ev,req)=>{
    let userReq = req as WorkspaceWinApi<ClassMethods<WorkspaceWinApi_>>;
    if (userReq.method!=="updateWorkspace"){
      return;
    }
    getWorkspaces();
  });

function createTable(data: AttributeApiReturn<"getWorkspaces">) {
    const table = document.createElement('table');
    const tableHead = document.createElement('thead');
    let row = document.createElement('tr');
    for (let wpProp in _.omit(_.first(data)!, ["id"])) {
        let cell = document.createElement('td');
        cell.appendChild(document.createTextNode(wpProp));
        row.appendChild(cell);
    }
    tableHead.appendChild(row);
    table.appendChild(tableHead);


    const tableBody = document.createElement('tbody');
    data.forEach((wp) => createRow(tableBody, wp));
    table.appendChild(tableBody);
    return table;
}



function createRow(tableBody: HTMLTableSectionElement, wp: Workspace) {
    let row = document.createElement('tr');
    //row.id = wp.id;
    let cell = document.createElement('td');
    cell.appendChild(document.createTextNode(wp.name));
    row.appendChild(cell);

    cell = document.createElement('td');
    cell.appendChild(document.createTextNode(wp.createdAt.toDateString()));
    row.appendChild(cell);

    row.addEventListener('click', (e) => {
        //send wp to main window for opening
        let openParams : WorkspaceApi<"createWorkspace"> = {method : "createWorkspace", params : [{wpID : wp.id}]}
        ipc.send<WorkspaceApiReturn<"createWorkspace">>(WorkspaceChannel.WORKSPACE_CHANNEL, openParams);      
    });
    row.addEventListener('contextmenu', (e) => {
        let delParams: AttributeApi<"deleteWorkspace"> = {
            method: "deleteWorkspace",
            params: [{ wpID: wp.id }]
        };
        ipc.send<AttributeApiReturn<"deleteWorkspace">>(AttributeChannel.ATTRIBUTE_CHANNEL, delParams).then((wp) => {
            console.log(wp);
            tableBody.removeChild(row);
        });
    });
    tableBody.appendChild(row);
}


function getWorkspaces(){
    ipc.send<AttributeApiReturn<"getWorkspaces">>(AttributeChannel.ATTRIBUTE_CHANNEL, { method: "getWorkspaces", params: []}).then((wps) => {
        const tableDiv = document.getElementById('wp-table')!;
        tableDiv.innerHTML = "";
        tableDiv.appendChild(createTable(wps));
    });
}

getWorkspaces();

document.getElementById('add-workspace')!.addEventListener('click',() => {
    addWorkspace();
  });

function addWorkspace() {
    const wpName = "MetaProcess_New";
    const createParams : AttributeApi<"createWorkspace"> = { method: "createWorkspace", params: [{name : wpName}]};
    ipc.send<AttributeApiReturn<"createWorkspace">>(AttributeChannel.ATTRIBUTE_CHANNEL, createParams).then((wp) => {
        const tableBody = <HTMLTableSectionElement>document.getElementById('wp-table')!.getElementsByTagName('tbody')[0];
        createRow(tableBody,wp);
    });
}
