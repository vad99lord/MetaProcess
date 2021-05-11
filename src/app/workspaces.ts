import { Workspace } from "@prisma/client";
import { table } from "console";
import { ipcRenderer } from 'electron';
import * as _ from "lodash";
import { AttributeApi, AttributeApiReturn } from "../ipc/AttributesApi";
import { AttributeChannel } from "../ipc/AttributesChannel";
import { IpcService } from "../ipc/IpcService";
import { ClassMethods } from "../ipc/RemoteApi";
import { WorkspaceApi, WorkspaceApiReturn, WorkspaceWinApi, WorkspaceWinApi_ } from "../ipc/WorkspaceApi";
import { WorkspaceChannel } from "../ipc/WorkspaceChannel";
//const ipcRenderer : IpcRenderer  = require('electron').ipcRenderer;

const ipc = new IpcService(ipcRenderer);

ipcRenderer.on(WorkspaceChannel.WORKSPACE_CHANNEL,(ev,req)=>{
    let userReq = req as WorkspaceWinApi<ClassMethods<WorkspaceWinApi_>>;
    if (userReq.method!=="updateWorkspace"){
      return;
    }
    getWorkspaces();
  });

function createSVGElement(svgName : string){
    const svgIconsPath = "../../icons/custom-icons.svg";
    const svgFullPath = svgIconsPath + "#" + svgName;
    const svgElem = document.createElementNS("http://www.w3.org/2000/svg",'svg');
    svgElem.classList.add('bi');
    svgElem.setAttribute('width',"1em");
    svgElem.setAttribute('height',"1em");
    svgElem.setAttribute('fill',"currentColor");
	const useElem = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    useElem.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', svgFullPath);
    svgElem.appendChild(useElem);
    return svgElem;
}

function translateStr(en : string, tranlationMap : Map<string,string>){
    const translation = tranlationMap.get(en);
    return translation ?? en;
}
function createTable(data: AttributeApiReturn<"getWorkspaces">) {
    const table = document.createElement('table');
    table.classList.add('table','table-hover');
    const tableHead = document.createElement('thead');
    tableHead.classList.add('thead-light');
    let row = document.createElement('tr');
    const wpHeader = _.assign(_.omit(_.first(data)!, ["id","isTreeMode"]),{"action" : {}});
    const translationHeader = new Map<string,string>([["name","название"],["createdAt", "создано"],["action","действие"]]);
    const transHeader = _.mapKeys(wpHeader,(val,key)=>translateStr(key,translationHeader));
    for (let wpProp in transHeader) {
        let cell = document.createElement('th');
        cell.scope = "col";
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
    //row.classList.add("cursor-pointer");
    let cell = document.createElement('td');
    //cell.scope = "row";
    const wpNameLink = document.createElement('a');
    wpNameLink.classList.add('link-primary','text-decoration-none','cursor-pointer');
    wpNameLink.innerHTML = wp.name; 
    wpNameLink.addEventListener('click', (e) => {
        //send wp to main window for opening
        let openParams : WorkspaceApi<"createWorkspace"> = {method : "createWorkspace", params : [{wpID : wp.id}]}
        ipc.send<WorkspaceApiReturn<"createWorkspace">>(WorkspaceChannel.WORKSPACE_CHANNEL, openParams);      
    });
    cell.appendChild(wpNameLink);
    row.appendChild(cell);

    cell = document.createElement('td');
    cell.appendChild(document.createTextNode(wp.createdAt.toLocaleDateString()));
    row.appendChild(cell);

    cell = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.classList.add('btn','btn-outline-danger','shadow-none');
    const delSVG = createSVGElement('trash');
    delBtn.appendChild(delSVG);
    delBtn.addEventListener('click',(e)=>{
        let delParams: AttributeApi<"deleteWorkspace"> = {
            method: "deleteWorkspace",
            params: [{ wpID: wp.id }]
        };
        ipc.send<AttributeApiReturn<"deleteWorkspace">>(AttributeChannel.ATTRIBUTE_CHANNEL, delParams).then((wp) => {
            tableBody.removeChild(row);
            if (!tableBody.hasChildNodes()){
                setEmptyTable();
            }
        });
    })
    cell.appendChild(delBtn);
    row.appendChild(cell);
    tableBody.appendChild(row);
}


function getWorkspaces(){
    ipc.send<AttributeApiReturn<"getWorkspaces">>(AttributeChannel.ATTRIBUTE_CHANNEL, { method: "getWorkspaces", params: []}).then((wps) => {
        setEmptyTable();
        const tableDiv = document.getElementById('wp-table')!;
        if (!_.isEmpty(wps)){
            setTable(createTable(wps));
        }
        else{
            setEmptyTable();
        }
    });
}

getWorkspaces();

document.getElementById('add-workspace')!.addEventListener('click',() => {
    addWorkspace();
  });
 
function setEmptyTable() {
    const tableDiv = document.getElementById('wp-table')!;
    tableDiv.innerHTML = "";
    const emptyStr = "Проекты пока не созданы...";
    const emptyText = document.createElement("h4");
    emptyText.innerText = emptyStr;
    emptyText.classList.add("text-center","my-5");
    tableDiv.appendChild(emptyText);
}

function setTable(table : HTMLTableElement) {
    const tableDiv = document.getElementById('wp-table')!;
    tableDiv.innerHTML = "";
    tableDiv.appendChild(table);
}

function addWorkspace() {
    const wpName = "МетаПроцесс";
    const createParams : AttributeApi<"createWorkspace"> = { method: "createWorkspace", params: [{name : wpName}]};
    ipc.send<AttributeApiReturn<"createWorkspace">>(AttributeChannel.ATTRIBUTE_CHANNEL, createParams).then((wp) => {
        const tableBody = document.getElementById('wp-table')!.getElementsByTagName('tbody')[0];
        if (_.isNil(tableBody)){
            setTable(createTable([wp]));
        }
        else {
            createRow(tableBody,wp);
        }
    });
}
