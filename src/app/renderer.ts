import { IpcService } from "../ipc/IpcService";
import {VertexApi,VertexApiReturn, VertexPos} from "../ipc/VerticesApi";
import { QueryChannel } from "../ipc/QueryChannel";
import {ElementDefinition} from 'cytoscape';
import * as _ from "lodash";
import cytoscape = require('cytoscape');
import { AttributeApi, AttributeApiReturn,Document, ElementDocuments } from "../ipc/AttributesApi";
import { AttributeChannel } from "../ipc/AttributesChannel";
import { Element, ElementName, FileApi, FileApiReturn } from "../ipc/FilesApi";
import { FileChannel } from "../ipc/FileChannel";
import { IpcHandler } from "../ipc/IpcHandler";
import { Workspace } from ".prisma/client";
import {ipcRenderer} from 'electron';
import { WorkspaceChannel } from "../ipc/WorkspaceChannel";
import { WorkspaceApi, WorkspaceApiReturn, WorkspaceWinApi, WorkspaceWinApi_ } from "../ipc/WorkspaceApi";
import { ClassMethods } from "../ipc/RemoteApi";
import Bootstrap from "bootstrap";
import cuid = require("cuid");
//const ipcRenderer : IpcRenderer  = require('electron').ipcRenderer;

//TODO: REMOVE! DEBUG for reload after actions
const {getCurrentWindow} = require('electron').remote;
function reloadWindow(){
  getCurrentWindow().reload();
}


const ipc = new IpcService(ipcRenderer);

const handler = new IpcHandler(ipcRenderer);

function initTooltips(){
  const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new Bootstrap.Tooltip(tooltipTriggerEl,{
      container: 'body'
    });
  })
}

initWorkspace();

function savePositions(){
  const vPos : VertexPos[] = cy.nodes().map((n)=>{
    return {id : n.id(), pos : n.position()}
  })
  let posParams : VertexApi<"updatePositions"> = {method : "updatePositions", params : [{vPos : vPos}]}
  return ipc.send<VertexApiReturn<"updatePositions">>(QueryChannel.QEURY_CHANNEL, posParams);
}

function saveWpName(){
  let saveParams : AttributeApi<"updateWorkspace"> = {method : "updateWorkspace", params : [{
    wpID : workSpace!.id,newName : workSpace!.name,newMode : workSpace!.isTreeMode,
  }]}
  return ipc.send<AttributeApiReturn<"updateWorkspace">>(AttributeChannel.ATTRIBUTE_CHANNEL, saveParams);
}


function saveWorkspace(){
  let savePromise = savePositions().then(()=>saveWpName());
  savePromise.then((wp)=>{
      createToast("bg-success","Проект успешно сохранен!");
  });
}
function closeWorkspace(){
  let savePromise = savePositions().then(()=>saveWpName());
  savePromise.then((wp)=>{
    let closeParams : WorkspaceApi<"closeWorkspace"> = {method : "closeWorkspace", params : [{}]}
    return ipc.send<WorkspaceApiReturn<"closeWorkspace">>(WorkspaceChannel.WORKSPACE_CHANNEL, closeParams);
  });
}

ipcRenderer.on(WorkspaceChannel.WORKSPACE_CHANNEL,(ev,req)=>{
  let userReq = req as WorkspaceWinApi<ClassMethods<WorkspaceWinApi_>>;
  switch(userReq.method){
    case "saveWorkspace": {
      saveWorkspace();
      break;
    };
    case "closeWorkspace": {
      closeWorkspace();
      break;
    };
    case "findInWorkspace": {
      toggleRightPane(true);
      toggleFullSearch(true);
      break;
    };
  }
});

document.getElementById('reload')!.addEventListener('click', () => {
  reloadWindow();
});

let workSpace : Workspace | null = null;
let cy : cytoscape.Core;
let currentEle : cytoscape.SingularData | null = null
const tapHandler = function(event : cytoscape.EventObject){
  let evtTarget = event.target;
  if (evtTarget === cy){
    // disableDocsTable(true);
    toggleRightPane(false);
    return;
  }
  // disableDocsTable(false);
  toggleFullSearch(false);
  toggleRightPane(true);
  const ele : cytoscape.SingularData = evtTarget;
  currentEle = ele;
  let eleType : "Edge"|"Vertex" = ele.isNode() ? "Vertex" : "Edge";
  let attrParams : AttributeApi<"getElementDocuments"> = {
    method : "getElementDocuments", 
    params : [{ele: eleType,id : ele.id()}
  ]};
  ipc.send<AttributeApiReturn<"getElementDocuments">>(AttributeChannel.ATTRIBUTE_CHANNEL, attrParams).then((ele) => {
    (<HTMLInputElement>document.getElementById('elem-name'))!.value = ele.name;    
    const tableDiv = document.getElementById('docs-table')!;
    tableDiv.innerHTML = "";
    if (!_.isEmpty(ele.documents)){
      tableDiv.appendChild(createTable(ele));
    }
  });
};


function initModeRadio(isTreeMode : boolean){
  const radioModes = document.querySelectorAll<HTMLInputElement>('input[name="graph-mode"]');
  if (isTreeMode){
   (<HTMLInputElement>document.getElementById("tree-mode")).checked = true;
  }
  else {
    (<HTMLInputElement>document.getElementById("process-mode")).checked = true;
  }
}

function initWorkspace(){
    let getParams : WorkspaceApi<"getWorkspace"> = {method : "getWorkspace", params : [{}]}
    ipc.send<WorkspaceApiReturn<"getWorkspace">>(WorkspaceChannel.WORKSPACE_CHANNEL, getParams).then((wp)=>{
      if (_.isNil(wp))
        return;
      workSpace = wp;
      (<HTMLInputElement>document.getElementById('wp-name'))!.value = _.isEmpty(workSpace!.name) ? "MetaProcess" : workSpace!.name;
      cy = initGraph(workSpace.isTreeMode);

      initTooltips();
      initModeRadio(workSpace.isTreeMode);
      toggleSearchButtons(true);
      toggleHelpBtns(false);
      // toggleRightPane(false);
      setWorkspaceMode(workSpace);
    })
}

function initGraph(isTreeMode : boolean) : cytoscape.Core{
//get edges and vertices in cytoscape format
let vParams: VertexApi<"getCytoVertices"> = { method: "getCytoVertices", params: [{wpID : workSpace!.id}]};
let eParams: VertexApi<"getCytoEdges"> = { method: "getCytoEdges", params: [{wpID : workSpace!.id}] };
let cv : Promise<ElementDefinition[]> = ipc.send<VertexApiReturn<"getCytoVertices">>(QueryChannel.QEURY_CHANNEL, vParams);
let ce : Promise<ElementDefinition[]> = ipc.send<VertexApiReturn<"getCytoEdges">>(QueryChannel.QEURY_CHANNEL, eParams);
//merge nodes and vertices in one promise
let cve = Promise.all([ce,cv]).then(([ce,cv]) => {
  ce = _.map(ce,e=>_.assign(e, {classes: isTreeMode ? "tree-edges" : "process-edges"}));
  return [...ce, ...cv]
});
const successColor = getComputedStyle(document.documentElement).getPropertyValue("--bs-success");
const dangerColor = getComputedStyle(document.documentElement).getPropertyValue("--bs-danger");
const infoColor = getComputedStyle(document.documentElement).getPropertyValue("--bs-info");
const cy = cytoscape({
  container: document.getElementById('cy'),
  boxSelectionEnabled: false,
  style: [
    {
      selector: 'node',
      css: {
        'label': 'data(name)',
        'text-valign': 'top',
        'text-halign': 'center',
        'shape' : 'round-tag'
      }
    },
    {
      selector: ':parent',
      css: {
        'text-valign': 'top',
        'text-halign': 'center',
      }
    },
    {
      selector: 'edge',
      css: {
        'label': 'data(name)',
        'text-margin-y' : -10,
        'curve-style': 'bezier',
      }
    },
    {
      selector: '.tree-edges',
      css: {
        'target-arrow-shape': 'none',
        'label': ''
      }
    },
    {
      selector: '.process-edges',
      css: {
        'target-arrow-shape': 'triangle'
      }
    },
    {
      selector: 'node.highlight',
      css: {
        'background-color' : "#00FFff",
      }
    },
    {
      selector: '.highlight',
      css: {
        'background-color' : infoColor,
        'line-color': infoColor,
        'target-arrow-color' : infoColor
      }
    },
    {
      selector: '.highlight-success',
      css: {
        'background-color' : successColor,
        'line-color': successColor,
        'target-arrow-color' : successColor
      }
    },
    {
      selector: '.highlight-danger',
      css: {
        'background-color' : dangerColor,
        'line-color': dangerColor,
        'target-arrow-color' : dangerColor,
      }
    }
  ],
  elements: cve,
  layout: {
    name: 'preset',
    padding: 5
  }
});
//center graph in window
cy.center();
cy.on('tap', tapHandler);
return cy;
}


function toggleFullSearch(show : boolean){
  const tableDiv = document.getElementById('table-div')!;
  const searchdiv = document.getElementById('search-div')!;
  if (show){
    tableDiv.classList.add("d-none");
    searchdiv.classList.remove("h-50","border-bottom");
    searchdiv.classList.add("h-100");
  }
  else{
    tableDiv.classList.remove("d-none");
    searchdiv.classList.remove("h-100");
    searchdiv.classList.add("h-50","border-bottom");
  }
}

document.getElementById('search-open')!.addEventListener('click',(ev) => {
  toggleRightPane(true);
  toggleFullSearch(true);
});

function disableDocsTable(disable : boolean){
  document.getElementById('docs-table')!.innerHTML="";
  const elemInput = (<HTMLInputElement>document.getElementById('elem-name'))!;
  elemInput.value = "";
  elemInput.disabled = disable;
  (<HTMLInputElement>document.getElementById('update-elem-name'))!.disabled = disable;
  document.querySelectorAll<HTMLButtonElement>("#docs-ele-btns button").forEach((btn) => {
    btn.disabled = disable;
  });
  // if (disable)
  //   document.getElementById('table-div')!.classList.add("d-none");
  // else {
  //   document.getElementById('table-div')!.classList.remove("d-none");
  //   const searchdiv = document.getElementById('search-div')!;
  //   searchdiv.classList.remove("h-100");
  //   searchdiv.classList.add("h-50");
  // }  
}

function toggleRightPane(show : boolean){
  const colR = document.getElementById('right-pane')!;
  if (show){
    colR.classList.remove('d-none');
    fitZoom();
  }
  else{
    colR.classList.add('d-none');
    fitZoom();
  }
}

document.getElementById('wp-name')!.addEventListener('input',(ev) => {
  const wpInput = <HTMLInputElement>ev.target;
  workSpace!.name = wpInput.value;
});

function createToast(color : "bg-success"|"bg-danger", message : string){
  const toast = document.getElementById("toast")!;
  toast.querySelector("#toast-text")!.innerHTML = message;
  toast.classList.remove("d-none","bg-success","bg-danger");
  toast.classList.add(color);
  new Bootstrap.Toast(toast).show();
}

function addEdge(source : cytoscape.NodeSingular, target : cytoscape.NodeSingular){
  if (!source.edgesTo(target).empty()||workSpace!.isTreeMode&&!target.edgesTo(source).empty()) {
    createToast("bg-danger","Связь уже существует!");
    disableFuncMode();
    return;
  }
  if (source.same(target)) {
    // alert("can't make self loops");
    createToast("bg-danger","Создание связи-петли невозможно!");
    disableFuncMode();
    return;
  }
  let edgeParams : VertexApi<"createEdge"> = {method : "createEdge", params : 
    [{startID : source.id(), endID : target.id(), wpID : workSpace!.id}]
  }
  ipc.send<VertexApiReturn<"createEdge">>(QueryChannel.QEURY_CHANNEL, edgeParams).then((edge) => {
    const cyEdge = cy.add([
      { group: 'edges', data: { id: edge.id, source: edge.startID, target: edge.endID, name : edge.name}}
    ]);
    setEdgeStyle(cyEdge.edges(),workSpace!);
    cyEdge.edges().flashClass("highlight-success",500);
    disableFuncMode();
  });
}

function toggleFunctionMode(enable : boolean){
  if (enable){
    toggleHelpBtns(true);
    cy.removeListener('tap', tapHandler);
  }
  else{
    toggleHelpBtns(false);
    cy.on('tap', tapHandler);
  }
}

// document.addEventListener("keydown", function(event) {
//   const key = event.key;
//   if (key === "Enter") {
//       console.log("esc");
//   }
// });


const funcCB = new Map<HTMLElement,((e: MouseEvent) => void)>();
const funcKeyCB = new Set<((e: KeyboardEvent) => void)>();
let funcBtn : HTMLButtonElement | null = null;
const successBtn : HTMLButtonElement = (() => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.classList.add("btn","btn-success");
  const successSVG = createSVGElement("check2");
  successSVG.classList.value = "";
  btn.appendChild(successSVG);
  return btn;
})();
function enableFuncMode(closeCb : ()=>void,
                        successCB?: ()=>void,
                        funcBtnID ?: string){
  toggleFunctionMode(true);
  const closeBtn = document.getElementById("close-btn")!;
  addFuncListener(closeBtn,closeCb,"Escape");
  if (!_.isNil(successCB)){
    addFuncListener(successBtn,successCB,"Enter");
  }
  if (!_.isNil(funcBtnID)){
    setFuncBtn(funcBtnID);
  }
}
function setFuncBtn(funcBtnID : string){
  funcBtn = <HTMLButtonElement>document.getElementById(funcBtnID)!;
  // console.log(funcBtn);
  funcBtn.replaceWith(successBtn);
}

function disableFuncMode(){
  toggleFunctionMode(false);
  removeFuncListeners();
  if (!_.isNull(funcBtn)){
    successBtn.replaceWith(funcBtn);
  }
  funcBtn = null;
}

function toggleCloseButton(show : boolean){
  const closeBtn = document.getElementById('close-btn')!;
  if (show){
    closeBtn.classList.remove('d-none');
  }
  else{
    closeBtn.classList.add('d-none');
  }
}

function addFuncListener(elem : HTMLElement, cb : ()=>void, keyBind ?: string){
  //const btn = elem;
  const clickListener = () => {
    cb();
    disableFuncMode();
  }
  elem.addEventListener('click',clickListener);
  funcCB.set(elem,clickListener);
  if(_.isNil(keyBind)){
    return;
  }
  const keyListener = (e: KeyboardEvent) => {
    const key = e.key;
    if (key === keyBind) {
      if (!_.isNull(elem.parentNode)){
        clickListener();
        // console.log(keyBind);
      }
    }
  }
  document.addEventListener("keydown", keyListener);
  funcKeyCB.add(keyListener);
}

function removeFuncListeners(){
  funcCB.forEach((cb,elem)=>{
    // const btn = document.getElementById(elemID)!;
    elem.removeEventListener('click',cb);
  });
  funcCB.clear();
  funcKeyCB.forEach((cb)=>{
    document.removeEventListener("keydown",cb);
  });
  funcKeyCB.clear();
};


function toggleHelpAlert(show : boolean){
  const helpAlert = document.getElementById('help-alert')!;
  if (show){
    helpAlert.classList.remove('d-none');
  }
  else{
    helpAlert.classList.add('d-none');
  }
} 

function toggleHelpBtns(show : boolean){
  toggleCloseButton(show);
  toggleHelpAlert(show);
}

function showHelpText(helpText : string){
  const helpAlert = document.getElementById('help-alert')!;
  // toggleHelpAlert(true);
  helpAlert.innerHTML = helpText;
}

//const nodesConst : cytoscape.NodeSingular[] = [];
function onAddEdge(){
  showHelpText("Выберите исходную категорию:");
  let nodes : cytoscape.NodeSingular[] = []
  let addEdgeCallback = function(evt : cytoscape.EventObject){
    nodes.push(evt.target);
    if (nodes.length == 2){
      addEdge(_.first(nodes)!,_.last(nodes)!);
      nodes = []
      cy.removeListener('select','node',addEdgeCallback);
    }
    else{
      showHelpText("Выберите конечную категорию:");
    }
  }
  return addEdgeCallback;
}

document.getElementById('add edge')!.addEventListener('click',() => {
  const edgeCb = onAddEdge();
  enableFuncMode(()=>{
    cy.removeListener('select','node',edgeCb);
  });
  cy.elements(":selected").unselect();
  cy.addListener('select','node', edgeCb);
});

let mainV: cytoscape.NodeSingular[] = [];
function addSrcEdges(){
  if (_.isEmpty(mainV)){
    cy.one('select','node', (evt) => {
      mainV.push(evt.target);
      showHelpText("Выберите конечные категории:");
      cy.one('select','node', (evt) => {
        setFuncBtn("add src edges");
      });
    }); 
  }
  else {
    const src = _.first(mainV)!;
    let dests = cy.nodes(":selected").subtract(src);
    if (dests.empty()){
      mainV = [];
      // disableFuncMode();
      return;
    }
    if (!src.edgesTo(dests).empty()||workSpace!.isTreeMode&&!src.edgesWith(dests).empty()) {
      // alert("edge is already presented");
      createToast("bg-danger","Связь уже существует!");
      mainV = [];
      return;
    }

    let srcID = src.id();
    const destIDs = dests.map(function( ele ){
      return ele.id();
    });

    let edgesParams : VertexApi<"createSourceEdges"> = {
      method : "createSourceEdges", 
      params : [{startID : srcID, endID : destIDs, wpID : workSpace!.id}]};
    ipc.send<VertexApiReturn<"createSourceEdges">>(QueryChannel.QEURY_CHANNEL, edgesParams).then((edges) => {
      const cytoEdges = _.map(edges,(edge)=>{
        const ce : ElementDefinition = { 
          group: 'edges',
          data: {
             id: edge.id,
             source: edge.startID,
             target: edge.endID,
             name : edge.name
            }
          }
        return ce;  
      });
      const cyEdges = cy.add(cytoEdges);
      setEdgeStyle(cyEdges.edges(),workSpace!);
      cyEdges.flashClass("highlight-success",500);
      mainV = [];
      // disableFuncMode();  
    });

    /*nodes.move({parent: _.first(mainParent)!.id()});
    mainParent = [];  */
  }
}
document.getElementById('add src edges')!.addEventListener('click',() => {
  enableFuncMode(()=>{
    mainV = [];
    cy.removeListener('select');
    cy.selectionType("single");
  },()=>{
    addSrcEdges();
    cy.selectionType("single");
  });
  cy.elements(":selected").unselect();
  showHelpText("Выберите исходную категорию:");
  cy.selectionType("additive");
  addSrcEdges();
});

function addVertex(){
  let vetrexParams : VertexApi<"createVertex"> = {method : "createVertex", params : [{name : "категория",wpID : workSpace!.id}]};
  ipc.send<VertexApiReturn<"createVertex">>(QueryChannel.QEURY_CHANNEL, vetrexParams).then((vertex) => {
    //make sure added vertex is centered in visible model part
    const ex = cy.extent()
    const modelCenter = {x : ex.x1+ex.w/2,y : ex.y1+ex.h/2}
    const v = cy.add([
      { group: 'nodes', data: { id: vertex.id, name : vertex.name}, position : modelCenter}
    ]);
    v.nodes().flashClass("highlight-success",500);
  });
}
document.getElementById('add vertex')!.addEventListener('click',() => {
    addVertex();
});


function unionParent(){
  let nodes = cy.nodes(":selected");
  if (nodes.empty())
    return;
  let parents = nodes.parent();
  if (parents.size()>1){
      // alert("selected nodes have different parents!");
      createToast("bg-danger","Выбранные категории включены в разные мета-категории!");
      return;
  }
  let unionParentID : string | undefined;
  if (parents.nonempty()){
    unionParentID = parents.first().id();
  }
  const childrenID = nodes.map(function( ele ){
    return ele.id();
  });

  let unionParams : VertexApi<"unionParent"> = {
    method : "unionParent", 
    params : [{unionName : "мета-категория",childrenID : childrenID, unionParentID : unionParentID, wpID : workSpace!.id}]};
  ipc.send<VertexApiReturn<"unionParent">>(QueryChannel.QEURY_CHANNEL, unionParams).then((unionParent) => {
    const parent = cy.add([
      { group: 'nodes', data: { id: unionParent.id, name : unionParent.name, parent : unionParentID}}
    ]);
    nodes.move({parent: unionParent.id});
    parent.flashClass('highlight-sucess', 500);
  });
}
document.getElementById('union parent')!.addEventListener('click',() => {
  const selectListener = (evt : cytoscape.EventObject) => {
    setFuncBtn("union parent");
  };
  enableFuncMode(()=>{
    cy.removeListener('select','node',selectListener);
    cy.selectionType("single");
  },()=>{
    unionParent();
    cy.selectionType("single");
  });
  cy.elements(":selected").unselect();
  cy.one('select','node',selectListener); 
  showHelpText("Выберите категории:");
  cy.selectionType("additive");
	//unionParent();
});


let mainParent : cytoscape.NodeSingular[] = [];
function includeParent(){
  if (_.isEmpty(mainParent)){
    cy.one('select','node', (evt) => {
      mainParent.push(evt.target);
      showHelpText("Выберите категории:");
      cy.one('select','node', (evt) => {
        setFuncBtn("include parent");
      });
    });
  }
  else {
    const parent = _.first(mainParent)!;
    //substract parent from selected set in case it's been selected
    let nodes = cy.nodes(":selected").subtract(parent);
    if (nodes.empty()){
      mainParent = [];
      // disableFuncMode();
      return;
    }

    let parentID = parent.id();
    const childrenID = nodes.map(function( ele ){
      return ele.id();
    });

    let includeParams : VertexApi<"includeParent"> = {
      method : "includeParent", 
      params : [{parentID : parentID,childrenID : childrenID, wpID : workSpace!.id}]};
    ipc.send<VertexApiReturn<"includeParent">>(QueryChannel.QEURY_CHANNEL, includeParams).then((inclParent) => {
        nodes.move({parent: inclParent.id});
        mainParent = [];
        parent.flashClass('highlight-success', 500);
        // disableFuncMode();  
    });

    /*nodes.move({parent: _.first(mainParent)!.id()});
    mainParent = [];  */
  }
}
document.getElementById('include parent')!.addEventListener('click',() => {
  // includeParent();
  enableFuncMode(()=>{
    mainParent = [];
    cy.removeListener('select');
    cy.selectionType("single");
  },()=>{
    includeParent();
    cy.selectionType("single");
  });
  cy.elements(":selected").unselect();
  showHelpText("Выберите мета-категорию:");
  cy.selectionType("additive");
  includeParent();
});


function removeVertex(){
  let nodes = cy.nodes(":selected");
  //explicitly add all descendant nodes to remove set
  //as deleting parent's vertex imply deleting all of its contents
  let nodesChilds = nodes.descendants().union(nodes);
  nodesChilds.flashClass('highlight-danger', 1000);
  const childrenID = nodesChilds.map(function( ele ){
    return ele.id();
  });
  let removeParams : VertexApi<"deleteVertex"> = {
    method : "deleteVertex", 
    params : [{verticesID : childrenID}
  ]};
  ipc.send<VertexApiReturn<"deleteVertex">>(QueryChannel.QEURY_CHANNEL, removeParams).then((v) => {
      nodes.remove(); 
  });
}
document.getElementById('delete vertex')!.addEventListener('click',() => {
  // removeVertex();
  const selectListener = (evt : cytoscape.EventObject) => {
    setFuncBtn("delete vertex");
  };
  enableFuncMode(()=>{cy.removeListener('select','node',selectListener);
                       cy.selectionType("single");},
                 ()=>{removeVertex();
                       cy.selectionType("single");});
  cy.elements(":selected").unselect();
  cy.one('select','node',selectListener); 
  showHelpText("Выберите категории:");
  cy.selectionType("additive");
});


function removeEdge(){
  let edges = cy.edges(":selected");
  const childrenID = edges.map(function( ele ){
    return ele.id();
  });
  edges.flashClass('highlight-danger', 500);
  let removeParams : VertexApi<"deleteEdge"> = {
    method : "deleteEdge", 
    params : [{edgesID : childrenID}
  ]};
  ipc.send<VertexApiReturn<"deleteEdge">>(QueryChannel.QEURY_CHANNEL, removeParams).then((e) => {
      edges.remove(); 
  });
}
document.getElementById('delete edge')!.addEventListener('click',() => {
  const selectListener = (evt : cytoscape.EventObject) => {
    setFuncBtn("delete edge");
  };
  enableFuncMode(()=>{cy.removeListener('select','edge',selectListener);
                       cy.selectionType("single");},
                 ()=>{removeEdge();
                       cy.selectionType("single");});
  cy.elements(":selected").unselect();
  cy.one('select','edge',selectListener); 
  showHelpText("Выберите связи:");
  cy.selectionType("additive");
  // removeEdge();
});


function removeParent(){
  let parents = cy.nodes(":selected:parent");
  const parentsID = parents.map(function( ele ){
    return ele.id();
  });
  parents.flashClass('highlight-danger', 500);
  let removeParams : VertexApi<"deleteVertex"> = {
    method : "deleteVertex", 
    params : [{verticesID : parentsID}
  ]};
  ipc.send<VertexApiReturn<"deleteVertex">>(QueryChannel.QEURY_CHANNEL, removeParams).then((v) => {
      parents.children().move({parent : null});
      parents.remove();  
  });
}
document.getElementById('remove parent')!.addEventListener('click',() => {
  //removeParent();
  const selectListener = (evt : cytoscape.EventObject) => {
    setFuncBtn("remove parent");
  };
  enableFuncMode(()=>{cy.removeListener('select','$node > node',selectListener);
                       cy.selectionType("single");},
                 ()=>{removeParent();
                       cy.selectionType("single");});
  cy.elements(":selected").unselect();
  cy.one('select','$node > node',selectListener); 
  showHelpText("Выберите мета-категории:");
  cy.selectionType("additive");
});

document.getElementById('elem-name')!.addEventListener('keydown',(e) => {
  const key = e.key;
  if (key === "Enter") {
    updateName();
  }
})
function updateName(){
  let eles = cy.elements(":selected");
  if (eles.empty()){
      // alert("select element to update name!");
      createToast("bg-danger","Выберите элемент для обновления названия!");
      return;
  }
  else {
    if (eles.size()>1){
        // alert("select 1 element onlyto update name!");
        createToast("bg-danger","Выберите только 1 элемент для обновления названия!");
        return;
    }
    else {
       const ele = eles.first();
       let elemName = (<HTMLInputElement>document.getElementById('elem-name'))!.value;
       if (ele.data('name')===elemName){
          // alert("same name!");
          return;
       }
       let updateParams : VertexApi<"updateElementName"> = {method : "updateElementName", params : [{
            element : {id : ele.id(),type : ele.isNode() ? "Vertex" : "Edge"},
            newName : elemName}]
      }
        ipc.send<VertexApiReturn<"updateElementName">>(QueryChannel.QEURY_CHANNEL, updateParams).then((updEle) => {
            if (_.isNil(updEle)){
              return;
            }
            ele.data("name",updEle.name);
        });
    }
  }
}
document.getElementById('update-elem-name')!.addEventListener('click',() => {
  updateName();
})

function translateStr(en : string, tranlationMap : Map<string,string>){
  const translation = tranlationMap.get(en);
  return translation ?? en;
}

function createTable(data : AttributeApiReturn<"getElementDocuments">){
  const table = document.createElement('table');
  table.classList.add("table","table-hover","table-bordered","text-center");
  const tableHead = document.createElement('thead');
  let row = document.createElement('tr');
  row.classList.add("d-flex","flex-wrap");
  //const colSizes = {name : 'col-4',fullPath : 'col-4',type : 'col-2',action : 'col-2'};
  const tabHeader = _.assign(_.pick(data.documents[0],"name","fullPath","type"),{action:{}});
  const translationHeader = new Map<string,string>([["name","название"],["fullPath", "полный путь"],["type","тип"],["action","действие"]]);
  const transHeader = _.mapKeys(tabHeader,(val,key)=>translateStr(key,translationHeader));
  const docPropCols = _.zip(_.keys(transHeader),['col-4','col-4','col-2','col-2']);
  for (let docPropCol of docPropCols){
    let cell = document.createElement('th');
    cell.classList.add(docPropCol[1]!);
    cell.scope="col";
    cell.appendChild(document.createTextNode(docPropCol[0]!));
    row.appendChild(cell);
  } 
  tableHead.appendChild(row);
  table.appendChild(tableHead);

  
  const tableBody = document.createElement('tbody');
  data.documents.forEach((doc) => createRow(tableBody,doc));
  table.appendChild(tableBody);
  return table;
}


function getDocIconName(doc : Document){
  let docIconName : string;
  if (doc.valid){
    docIconName = doc.type==="Directory" ? "folder" : "file-earmark";
  }
  else {
    docIconName = doc.type==="Directory" ? "folder-x" : "file-earmark-x";
  }
  return docIconName;
}

function getDocDelIconName(doc : Document){
  const delIconName = doc.type==="Directory" ? "folder-minus" : "file-earmark-minus";
  return delIconName;
}

function setDocValid(doc: Document,row : HTMLTableRowElement, docIconCell : HTMLTableDataCellElement, valid : boolean){
    if (!valid){
      row.classList.add('table-danger',"text-danger");
      doc.valid = false;
    }
    else {
      row.classList.remove('table-danger',"text-danger");
      doc.valid = true;
    }
    const updDocSVG = createSVGElement(getDocIconName(doc));
    docIconCell.innerHTML="";
    docIconCell.appendChild(updDocSVG);
}

function updateDocRow(row : HTMLTableRowElement, docName : HTMLParagraphElement,
                      docPath :  HTMLParagraphElement, pathTooltip : Bootstrap.Tooltip, docIconCell : HTMLTableDataCellElement,
                      delBtn : HTMLButtonElement, doc: Document,updDoc : Document){
  _.assign(doc,updDoc);                      
  setDocValid(doc,row,docIconCell,doc.valid);
  docName.innerHTML = updDoc.name;
  docPath.innerHTML = updDoc.fullPath;
  docPath.title = doc.fullPath;
  pathTooltip.dispose();
  pathTooltip = new Bootstrap.Tooltip(docPath,{container : 'body'});
  const updDelSVG = createSVGElement(getDocDelIconName(doc));
  updDelSVG.classList.add('wh-reset');
  delBtn.innerHTML="";
  delBtn.appendChild(updDelSVG);
}

function createRow(tableBody: HTMLTableSectionElement, doc : Document){
  let row = document.createElement('tr');
  row.classList.add("d-flex","flex-wrap");
  // if (!doc.valid){
  //   row.classList.add('table-danger','text-danger');
  // }
    //row.id = "docs-table_"+doc.id;

    const docNameCell = document.createElement('th');
    docNameCell.classList.add('col-4');
    const docNameLink = document.createElement('a');
    docNameLink.classList.add("link-primary","text-decoration-none","cursor-pointer");
    const docName = document.createElement('p');
    docName.classList.add('text-truncate');
    docName.innerHTML = doc.name;
    docNameLink.appendChild(docName);
    docNameCell.appendChild(docNameLink);

    const docPathCell = document.createElement('td');
    docPathCell.classList.add('col-4');
    const docPath = document.createElement('p');
    docPath.classList.add('text-truncate');
    docPath.innerHTML = doc.fullPath;
    docPath.setAttribute('data-bs-toggle',"tooltip");
    docPath.setAttribute('data-bs-placement',"right");
    docPath.title = doc.fullPath;
    const pathTooltip = new Bootstrap.Tooltip(docPath,{container : 'body'});
    docPathCell.appendChild(docPath);

    const docIconCell = document.createElement('td');
    docIconCell.classList.add('col-2');
    setDocValid(doc,row,docIconCell,doc.valid);
    // const docIcon = createSVGElement(getDocIconName(doc));
    // docIconCell.appendChild(docIcon);

    const delCell = document.createElement('td');
    delCell.classList.add('col-2');
    const delBtn = document.createElement('button');
    delBtn.classList.add('btn','btn-outline-danger','shadow-none');
    const delSVG = createSVGElement(getDocDelIconName(doc));
    delSVG.classList.add('wh-reset');
    delBtn.appendChild(delSVG);
    delCell.appendChild(delBtn);

    row.appendChild(docNameCell);
    row.appendChild(docPathCell);
    row.appendChild(docIconCell);
    row.appendChild(delCell);

    docNameLink.addEventListener('click',(e)=>{
        if (!doc.valid){
            let dialogParams : FileApi<"openFileDialog"> = {
              method : "openFileDialog", 
              params : [{type : doc.type==="Directory" ? "openDirectory": "openFile", title : "choose item to retag:"}]
            };
            ipc.send<FileApiReturn<"openFileDialog">>(FileChannel.FILE_CHANNEL, dialogParams).then((dialogReturn) => {
              if (dialogReturn.canceled){
                return;
              }
              const fullPath = dialogReturn.filePaths[0];
              let updateParams : FileApi<"updateDoc"> = {
                method : "updateDoc", 
                params : [{doc : doc, newPath : fullPath, valid : true}]
              };
              ipc.send<FileApiReturn<"updateDoc">>(FileChannel.FILE_CHANNEL, updateParams).then((updDoc) =>{
                  //if doc is newly connected
                  if (!_.isNil(updDoc)){
                    updateDocRow(row,docName,docPath,pathTooltip,docIconCell,delBtn,doc,updDoc);
                  }
                  else {
                      let eles = cy.elements(":selected");
                      if (eles.empty() || eles.size() > 1){
                          // alert("select one element to update document!");
                          createToast("bg-danger","Выберите 1 элемент для обновления связи с документом!");
                          return;
                      }
                      const elem : Element = {
                        id: eles.first().id(),
                        type: eles.first().isNode() ? "Vertex" : "Edge"
                      }
                      let disconParams : FileApi<"disconnectDocument"> = {
                        method : "disconnectDocument", 
                        params : [{ele : elem, docType : doc.type, docID : doc.id}]
                      };
                      ipc.send<FileApiReturn<"disconnectDocument">>(FileChannel.FILE_CHANNEL, disconParams).then((delDoc) =>{
                          if (_.isNil(delDoc)){
                            return;
                          }
                          //tableBody.removeChild(row);
                          let conParams : FileApi<"connectDocument"> = {
                            method : "connectDocument", 
                            params : [{type : doc.type, fullPath : fullPath, 
                              vertexID : elem.type==="Vertex" ? [elem.id] : undefined, 
                              edgeID : elem.type==="Edge" ? [elem.id] : undefined,}]
                          };
                          ipc.send<FileApiReturn<"connectDocument">>(FileChannel.FILE_CHANNEL, conParams).then((conDoc) =>{
                              if (_.isNil(conDoc)){
                                return;
                              }
                              updateDocRow(row,docName,docPath,pathTooltip,docIconCell,delBtn,doc,conDoc);
                              //createRow(tableBody,conDoc);
                          });
                      });
                  }
              });
            });
        }
        else {
        let dialogParams : FileApi<"openFile"> = {
          method : "openFile", 
          params : [{doc : doc}]
        };
        ipc.send<FileApiReturn<"openFile">>(FileChannel.FILE_CHANNEL, dialogParams).then((err) => {
           if (!_.isEmpty(err)){
              setDocValid(doc,row,docIconCell,false);
           }
           else {
              setDocValid(doc,row,docIconCell,true);
           }
        });
      }
    });

    delBtn.addEventListener('click',(e)=>{
      let eles = cy.elements(":selected");
      if (eles.empty() || eles.size() > 1){
          // alert("select one element to untag document!");
          createToast("bg-danger","Выберите один элемент для разрыва связи с документом!");
          return;
      }
      const ele : Element = {
         id: eles.first().id(),
         type: eles.first().isNode() ? "Vertex" : "Edge"
      }
      //const docID : number = Number(_.last(_.split(row.id,"_"))!);
      //const docType = row.lastChild!.textContent! as DocumentType['type'];
      const docID = doc.id;
      const docType = doc.type;
      let disconnParams : FileApi<"disconnectDocument"> = {
        method : "disconnectDocument", 
        params : [{ele : ele,docType : docType,docID : docID}]
      };
      ipc.send<FileApiReturn<"disconnectDocument">>(FileChannel.FILE_CHANNEL, disconnParams).then((doc) => {
           //console.log(doc);
           tableBody.removeChild(row);
      });
    });
    tableBody.appendChild(row);
}

function openDialog(itemType : "openFile"|"openDirectory"){
  let dialogParams : FileApi<"openFileDialog"> = {
    method : "openFileDialog", 
    params : [{type : itemType}]
  };
  ipc.send<FileApiReturn<"openFileDialog">>(FileChannel.FILE_CHANNEL, dialogParams).then((dialogReturn) => {
     if (dialogReturn.canceled){
       console.log("dialog cancelled");
       return;
     }
     //console.log(dialogReturn.filePaths[0]);
     const fullPath = dialogReturn.filePaths[0];
     const docType = itemType === "openFile" ? "File" : "Directory";
     tagDocument(docType,fullPath);
  });
}


function tagDocument(itemType : "File"|"Directory",fullPath : string){
    let nodes = cy.nodes(":selected");
    let edges = cy.edges(":selected");
    if (nodes.empty() && edges.empty()){
        // alert("choose edges or nodes to tag!");
        createToast("bg-danger","Выберите элементы для привязки к документу");
        return;
    }
    const nodesID = nodes.map(function(ele){
      return ele.id();
    });
    const edgesID = edges.map(function(ele){
      return ele.id();
    });

    let docParams : FileApi<"connectDocument"> = {
      method : "connectDocument", 
      params : [{
        type : itemType,
        fullPath : fullPath, 
        edgeID: edges.nonempty() ? edgesID : undefined, 
        vertexID : nodes.nonempty() ? nodesID: undefined}]
    };
    ipc.send<FileApiReturn<"connectDocument">>(FileChannel.FILE_CHANNEL, docParams).then((doc) => {
        const tableBody = <HTMLTableSectionElement>document.getElementById('docs-table')!.getElementsByTagName('tbody')[0];
        if (!_.isNil(tableBody)){
          createRow(tableBody,doc!);
        }
        else {
          if (_.isNil(currentEle)){
            return;
          }
          cy.getElementById(currentEle.id()).emit('tap');
        }  
    });

}

document.getElementById('open-file-dialog')!.addEventListener('click',() => {
  openDialog("openFile");
});
document.getElementById('open-dir-dialog')!.addEventListener('click',() => {
  openDialog("openDirectory");
});



function createElementsDocsList(data : AttributeApiReturn<"findElementsDocuments">, docElesList : HTMLElement){
  _.forEach(data,(eleDocs)=>{
    const collapseID = cuid();
    const eleLink = document.createElement('a');
    eleLink.href = "#"+collapseID;
    eleLink.classList.add("list-group-item","list-group-item-action","collapsed");
    eleLink.setAttribute("data-bs-toggle", "collapse");
    
    const eleRow = document.createElement('div');
    eleRow.classList.add('row',"align-items-center");

    const colEleIcon = document.createElement('div');
    colEleIcon.classList.add('col-auto');
    const eleIconName = eleDocs.type==="Vertex" ? "bookmark" : "edge-plus";
    const docIcon = createSVGElement(eleIconName);
    docIcon.classList.add("bi-search");
    colEleIcon.appendChild(docIcon);

    const colDoc = document.createElement('div');
    colDoc.classList.add('col','w-25');
    const flexRow = document.createElement('div');
    flexRow.classList.add("d-flex","justify-content-between","align-items-center");
    const eleName = document.createElement('h5');
    eleName.classList.add("text-truncate","w-75");
    eleName.innerText = eleDocs.name;

    const iconsCol = document.createElement('div');
    iconsCol.classList.add("d-flex","flex-column","align-items-end");
    const elesSpan = document.createElement('span');
    elesSpan.classList.add("badge","bg-primary","rounded-pill","mb-1");
    elesSpan.innerText = _.toString(eleDocs.documents.length);
    const expandIcon = createSVGElement("chevron-down");
    expandIcon.classList.add("bi-search","bi-chevron-down");

    iconsCol.appendChild(elesSpan);
    iconsCol.appendChild(expandIcon);
    flexRow.appendChild(eleName);
    flexRow.appendChild(iconsCol);
    colDoc.appendChild(flexRow);

    eleRow.appendChild(colEleIcon);
    eleRow.appendChild(colDoc);

    eleLink.appendChild(eleRow);

    const elesDiv = document.createElement('div');
    elesDiv.classList.add("collapse");
    elesDiv.id = collapseID;
    elesDiv.setAttribute("data-bs-parent","#collapse-parent");
    const cardDiv = document.createElement('div');
    cardDiv.classList.add("card","card-body","pt-0");

    const openBtn = document.createElement('button');
    openBtn.type = "button";
    openBtn.classList.add("btn","btn-sm","my-3","align-self-start");
    openBtn.innerText = "Выделить элемент "; //or document
    connectHtmlElement(openBtn,eleDocs.id);
    const openIcon = createSVGElement("box-arrow-up-right");
    openIcon.classList.add("wh-reset");
    openBtn.appendChild(openIcon);
    cardDiv.appendChild(openBtn);

    const elesList = document.createElement('ul');
    elesList.classList.add("list-group","list-group-flush");
    _.forEach(eleDocs.documents,(doc)=>{
      const eleItem = document.createElement('li');
      eleItem.classList.add("list-group-item","d-flex","justify-content-between",
      "align-items-center","list-group-item-action","cursor-pointer");
      
      const namesDiv = document.createElement('div');
      namesDiv.classList.add("w-25","flex-grow-1");
      const docName = document.createElement('h6');
      docName.classList.add("text-truncate","w-75");
      docName.innerText = doc.name;
      const docPath = document.createElement('p');
      docPath.classList.add("m-0","text-truncate","w-75");
      docPath.innerText = doc.fullPath;
      namesDiv.appendChild(docName);
      namesDiv.appendChild(docPath);

      const docIconDiv = document.createElement('div');
      docIconDiv.classList.add("align-self-center");
      const docIcon = createSVGElement(getDocIconName(doc));
      docIconDiv.appendChild(docIcon);

      eleItem.appendChild(namesDiv);
      eleItem.appendChild(docIconDiv);
      elesList.appendChild(eleItem);

      //connectHtmlDoc(eleItem,doc);
      connectLiDoc(eleItem,doc);
    }); 
    cardDiv.appendChild(elesList);
    elesDiv.appendChild(cardDiv);

    docElesList.appendChild(eleLink);
    docElesList.appendChild(elesDiv);
  });  
  setActiveListItems();
}


function connectHtmlElement(elem : HTMLElement, eleID : string){
  elem.addEventListener('click',(e)=>{
    const ele = cy.getElementById(eleID);
    const fitMaxZoom = 1;
    const maxZoom = cy.maxZoom();
    cy.maxZoom( fitMaxZoom );
    cy.fit(ele);
    cy.maxZoom( maxZoom );
    ele.flashClass('highlight', 500);
  });
}


function replaceDocIcon(parent : HTMLElement, doc : Document){
  const docIcon = createSVGElement(getDocIconName(doc));
  docIcon.classList.add("bi-search");
  const oldSvg = parent.querySelector("svg")!;
  oldSvg.replaceWith(docIcon);
}

function connectButtonDoc(btn : HTMLButtonElement, parent: HTMLElement, doc :Document){
  const btnErrorClass = "btn-outline-danger";
  const parentErrorClass = "list-group-item-danger";
  if (!doc.valid){
    btn.classList.add(btnErrorClass);
  }
  btn.addEventListener('click',(e)=>{
    let dialogParams : FileApi<"openFile"> = {
      method : "openFile", 
      params : [{doc : doc}]
    };
    ipc.send<FileApiReturn<"openFile">>(FileChannel.FILE_CHANNEL, dialogParams).then((err) => {
       if (!_.isEmpty(err)){
          doc.valid = false;
          btn.classList.add(btnErrorClass);
          parent.classList.add(parentErrorClass);
          replaceDocIcon(parent,doc);
       }
       else {
          doc.valid = true;
          btn.classList.remove(btnErrorClass);
          parent.classList.remove(parentErrorClass);
          replaceDocIcon(parent,doc);
       }
    });
  });
}

function connectLiDoc(li : HTMLLIElement, doc :Document){
  const liErrorClass = "list-group-item-danger";
  if (!doc.valid){
    li.classList.add(liErrorClass);
  }
  li.addEventListener('click',(e)=>{
    let dialogParams : FileApi<"openFile"> = {
      method : "openFile", 
      params : [{doc : doc}]
    };
    ipc.send<FileApiReturn<"openFile">>(FileChannel.FILE_CHANNEL, dialogParams).then((err) => {
       if (!_.isEmpty(err)){
          doc.valid = false;
          li.classList.add(liErrorClass);
          replaceDocIcon(li,doc);
       }
       else {
          doc.valid = true;
          li.classList.remove(liErrorClass);
          replaceDocIcon(li,doc);
       }
    });
  });
}

function connectHtmlDoc(elem : HTMLElement, doc :Document){
  let errorClass : string;
  switch(true) {
    case elem instanceof HTMLButtonElement: {
      errorClass = "btn-outline-danger";
      break;
    }
    case elem instanceof HTMLLIElement: {
      errorClass = "list-group-item-danger";
      break;
    }
    default: {
      errorClass = "invalid";
      break;
    }
  }
  if (!doc.valid){
    elem.classList.add(errorClass);
  }
  elem.addEventListener('click',(e)=>{
    let dialogParams : FileApi<"openFile"> = {
      method : "openFile", 
      params : [{doc : doc}]
    };
    ipc.send<FileApiReturn<"openFile">>(FileChannel.FILE_CHANNEL, dialogParams).then((err) => {
       if (!_.isEmpty(err)){
          elem.classList.add(errorClass);
       }
       else {
          elem.classList.remove(errorClass);
       }
    });
  });
}


function findElementsWithDocs(searchValue : string) {
  let searchParams: VertexApi<"findElements"> = { method: "findElements", params: [{ searchName: searchValue, wpID : workSpace!.id }] };
  ipc.send<VertexApiReturn<"findElements">>(QueryChannel.QEURY_CHANNEL, searchParams).then((eles) => {
    const emptySearchTxt = document.getElementById('empty-search')!;
    if (_.isEmpty(eles.edges)&&_.isEmpty(eles.vertices)) {
      document.getElementById('collapse-parent')!.innerHTML="";
      emptySearchTxt.classList.remove('d-none');
      toggleSearchButtons(true);
      return;
    }
    emptySearchTxt.classList.add('d-none');
    toggleSearchButtons(false);
    
    let vIDs: {id : string, name : string, childIDs : string[]}[] = [];
    if (!_.isEmpty(eles.vertices)) {
      let nodes = cy.nodes();
      vIDs = _.map(eles.vertices, (v) => {
        const node = nodes.getElementById(v.id);
        const nChilds = node.descendants();
        const ids = nChilds.map(function (ele) {
          return ele.id();
        });
        return { id : node.id(), name: v.name, childIDs: ids };
      })
    }
    let eIDs = !_.isEmpty(eles.edges) ? _.map(eles.edges, "id") : [];
    let searchParams: AttributeApi<"findElementsDocuments"> = { method: "findElementsDocuments", params: [{ searchV: vIDs, searchE: eIDs }] };
    ipc.send<AttributeApiReturn<"findElementsDocuments">>(AttributeChannel.ATTRIBUTE_CHANNEL, searchParams).then((eleDocs) => {
      if (_.isEmpty(eleDocs)) {
        return;
      }
      // const tableDiv = document.getElementById('search-table')!;
      // tableDiv.innerHTML = "";
      const docElesList = document.getElementById("collapse-parent")!;
      docElesList.innerHTML = "";
      createElementsDocsList(eleDocs,docElesList);
    });
  });
}

function createDocsElementsTable(data : AttributeApiReturn<"findDocumentsElements">,docElesList : HTMLElement){
  let docsEles = _.map(data,(docEles)=>{
    const edgesData : (ElementName & Element)[] = _.map(docEles.edges, (e)=>{return {id : e.id, name : e.name,type : "Edge"}});
    let nodes = cy.nodes();
    let descNodes = cy.collection();
    _.forEach(docEles.vertices, (v) => {
          let n = nodes.getElementById(v.id);
          descNodes = descNodes.add(n);
    });
    descNodes = descNodes.union(descNodes.ancestors());
    const nodesData : (ElementName & Element)[] = descNodes.map((ele) => { return {id : ele.id(), name : ele.data('name'),type : "Vertex"}});
    const elesData = _.concat(edgesData,nodesData);
    return {doc : docEles.doc,//_.pick(docEles.doc,["name","fullPath","type"]),
     eles : elesData};
  });
  
  _.forEach(docsEles,(docEles)=>{
    const collapseID = cuid();
    const docLink = document.createElement('a');
    docLink.href = "#"+collapseID;
    docLink.classList.add("list-group-item","list-group-item-action","collapsed");
    if (!docEles.doc.valid){
      docLink.classList.add("list-group-item-danger");
    }

    const docRow = document.createElement('div');
    docRow.classList.add('row');

    const colDocIcon = document.createElement('div');
    colDocIcon.classList.add('col-auto',"d-flex","align-items-center");
    const docIcon = createSVGElement(getDocIconName(docEles.doc));
    docIcon.classList.add("bi-search");
    colDocIcon.appendChild(docIcon);

    const colDoc = document.createElement('div');
    colDoc.classList.add('col','w-25');

    const rowName = document.createElement('div');
    rowName.classList.add("d-flex","justify-content-between","align-items-start");
    const docName = document.createElement('h5');
    docName.classList.add("mb-1","text-truncate","w-75");
    docName.innerText = docEles.doc.name;
    const elesSpan = document.createElement('span');
    elesSpan.classList.add("badge","bg-primary","rounded-pill");
    elesSpan.innerText = _.toString(docEles.eles.length);
    rowName.appendChild(docName);
    rowName.appendChild(elesSpan);

    const rowPath = <HTMLDivElement>rowName.cloneNode(false);
    const docPath = document.createElement('p');
    docPath.classList.add("mb-1","text-truncate","w-75");
    docPath.innerText = docEles.doc.fullPath;
    const expandIcon = createSVGElement("chevron-down");
    expandIcon.classList.add("bi-search","bi-chevron-down");
    rowPath.appendChild(docPath);
    rowPath.appendChild(expandIcon);

    colDoc.appendChild(rowName);
    colDoc.appendChild(rowPath);

    docRow.appendChild(colDocIcon);
    docRow.appendChild(colDoc);

    docLink.appendChild(docRow);
    docLink.setAttribute("data-bs-toggle", "collapse");

    const elesDiv = document.createElement('div');
    elesDiv.classList.add("collapse");
    elesDiv.id = collapseID;
    const cardDiv = document.createElement('div');
    cardDiv.classList.add("card","card-body","pt-0");

    const openBtn = document.createElement('button');
    openBtn.type = "button";
    openBtn.classList.add("btn","btn-sm","my-3","align-self-start");
    openBtn.innerText = "Открыть документ "; //or document
    // connectHtmlDoc(openBtn,docEles.doc);
    connectButtonDoc(openBtn,docLink,docEles.doc);
    const openIcon = createSVGElement("box-arrow-up-right");
    openIcon.classList.add("wh-reset");
    openBtn.appendChild(openIcon);
    cardDiv.appendChild(openBtn);

    const elesList = document.createElement('ul');
    elesList.classList.add("list-group","list-group-flush");
    _.forEach(docEles.eles,(ele)=>{
      const eleItem = document.createElement('li');
      eleItem.classList.add("list-group-item","d-flex","justify-content-between",
      "align-items-center","list-group-item-action","cursor-pointer");
      eleItem.innerText=ele.name;
      const eleIconName = ele.type==="Vertex" ? "bookmark" : "edge-plus";
      const eleIcon = createSVGElement(eleIconName);
      expandIcon.classList.add("bi-search");
      connectHtmlElement(eleItem,ele.id);
      eleItem.appendChild(eleIcon);

      elesList.appendChild(eleItem);
    }); 
    cardDiv.appendChild(elesList);
    elesDiv.appendChild(cardDiv);
    elesDiv.setAttribute("data-bs-parent","#collapse-parent");

    docElesList.appendChild(docLink);
    docElesList.appendChild(elesDiv);
  });  
  setActiveListItems();
}


function findDocumentsWithElements(searchValue : string) {
  let searchParams: AttributeApi<"findDocumentsElements"> = { method: "findDocumentsElements", params: [{ searchName: searchValue, wpID : workSpace!.id }] };
  ipc.send<AttributeApiReturn<"findDocumentsElements">>(AttributeChannel.ATTRIBUTE_CHANNEL, searchParams).then((docEles) => {
    const emptySearchTxt = document.getElementById('empty-search')!;
    if (_.isEmpty(docEles)) {
      document.getElementById('collapse-parent')!.innerHTML="";
      emptySearchTxt.classList.remove('d-none');
      toggleSearchButtons(true);
      return;
    }
    emptySearchTxt.classList.add('d-none');
    toggleSearchButtons(false);
    const tableDiv = document.getElementById('search-table')!;
    tableDiv.innerHTML = "";
    const docElesList = document.getElementById("collapse-parent")!;
    docElesList.innerHTML = "";
    createDocsElementsTable(docEles,docElesList);
  });
}


function searchDocsEles(){
  const searchInput = (<HTMLInputElement>document.getElementById('search-text'))!
  let searchValue = searchInput.value;
  if (_.isEmpty(searchValue)) {
    searchInput.classList.add('is-invalid');
    return;
  }
  searchInput.classList.remove('is-invalid');
  const searchDocs = (<HTMLSelectElement>document.getElementById("search-type"))!;
  if (_.isEqual(searchDocs.value,"eles")) {
    findElementsWithDocs(searchValue);
  }
  else {
    findDocumentsWithElements(searchValue);
  };
}
document.getElementById('search')!.addEventListener('click',() => {
  searchDocsEles();
})
document.getElementById('search-text')!.addEventListener('keydown',(e) => {
  const key = e.key;
  if (key === "Enter") {
      searchDocsEles();
  }
})

document.getElementById('search-clear')!.addEventListener('click',() => {
  (<HTMLInputElement>document.getElementById('search-text'))!.value = "";
});
document.getElementById('clear-results')!.addEventListener('click',(e) => {
  document.getElementById('collapse-parent')!.innerHTML = "";
  toggleSearchButtons(true);
});

function toggleSearchButtons(disable : boolean){
  document.querySelectorAll<HTMLButtonElement>("#results-btns button").forEach((btn) => {
    btn.disabled = disable;
  });
}


function cloneElements(){
  const nodes = cy.nodes(":selected");
  if (nodes.empty())
    return;
  const childs = nodes.descendants();
  const nChilds = nodes.union(childs);
  const ncEdges = nChilds.edgesWith(nChilds);
  const nodesID = nChilds.map(function( ele ){
    return ele.id();
  });
  const edgesID = ncEdges.map(function( ele ){
    return ele.id();
  });

  const cloneOffset : cytoscape.Position = {
    x : 200,
    y : 200
  }

  let cloneParams : AttributeApi<"cloneElementsDocuments"> = {
    method : "cloneElementsDocuments", 
    params : [{VIDs: nodesID, EIDs: edgesID, wpID : workSpace!.id}]};
  ipc.send<AttributeApiReturn<"cloneElementsDocuments">>(AttributeChannel.ATTRIBUTE_CHANNEL, cloneParams).then((eleIDs) => {
    let vParams: VertexApi<"getCytoVertices"> = { method: "getCytoVertices", params: [{vertexID : Array.from(eleIDs.VIDs.values()), wpID : workSpace!.id}]};
    let eParams: VertexApi<"getCytoEdges"> = { method: "getCytoEdges", params: [{ edgeID: Array.from(eleIDs.EIDs.values()), wpID : workSpace!.id }] };
      let cv : Promise<ElementDefinition[]> = ipc.send<VertexApiReturn<"getCytoVertices">>(QueryChannel.QEURY_CHANNEL, vParams);
      let ce : Promise<ElementDefinition[]> = ipc.send<VertexApiReturn<"getCytoEdges">>(QueryChannel.QEURY_CHANNEL, eParams);
      
      const clonedPos = new Map<string,cytoscape.Position>();
      eleIDs.VIDs.forEach((val, key) => {
         const sourceP = nChilds.getElementById(key).position();
         const cloneP : cytoscape.Position = {
           x : sourceP.x + cloneOffset.x,
           y :sourceP.y + cloneOffset.y
         };
         clonedPos.set(val,cloneP);
      });

      Promise.all([ce,cv]).then(([ce,cv]) => {
        _.forEach(cv,(v)=>{
            v.position = clonedPos.get(v.data.id!);
        });
        const cloneEles = [...ce, ...cv];
        cy.elements().unselect();
        const cytoEles = cy.add(cloneEles);
        setEdgeStyle(cytoEles.edges(),workSpace!);
        cytoEles.flashClass("highlight-success",500);
        cytoEles.select();
      });
  });
}
document.getElementById('clone elements')!.addEventListener('click',() => {
  const selectListener = (evt : cytoscape.EventObject) => {
    setFuncBtn("clone elements");
  };
  enableFuncMode(()=>{cy.removeListener('select','node',selectListener);
                       cy.selectionType("single");},
                 ()=>{cloneElements();
                       cy.selectionType("single");});
  cy.elements(":selected").unselect();
  cy.one('select','node',selectListener); 
  showHelpText("Выберите категории:");
  cy.selectionType("additive");
  //cloneElements();
});



function setEdgeStyle(edges : cytoscape.EdgeCollection, wp : Workspace){
  if (wp.isTreeMode){
    setTreeEdges(edges);
  }
  else {
    setProcessEdges(edges);
  }
}
function setTreeEdges(edges : cytoscape.EdgeCollection){
  edges.removeClass("process-edges");
  edges.addClass("tree-edges");
}

function setProcessEdges(edges : cytoscape.EdgeCollection){
  edges.removeClass("tree-edges");
  edges.addClass("process-edges");
}


function setWorkspaceMode(wp : Workspace){
  if (wp.isTreeMode){
    setTreeMode();
  }
  else {
    setProcessMode();
  }
}

function setTreeMode(){
  const cloneBtn = <HTMLButtonElement>document.getElementById('clone elements')!;
  const addEdgesBtn = <HTMLButtonElement>document.getElementById('add src edges')!;
  // cloneBtn.style.visibility = 'hidden';
  // cloneBtn.style.display = 'none';
  cloneBtn.disabled = true;
  addEdgesBtn.disabled = false;
  workSpace!.isTreeMode = true;
  setTreeEdges(cy.edges());
}

function setProcessMode(){
  const cloneBtn = <HTMLButtonElement>document.getElementById('clone elements')!;
  const addEdgesBtn = <HTMLButtonElement>document.getElementById('add src edges')!;
  // cloneBtn.style.visibility = 'visible';
  // cloneBtn.style.display = 'inline-block';
  cloneBtn.disabled = false;
  addEdgesBtn.disabled = true;
  workSpace!.isTreeMode = false;
  setProcessEdges(cy.edges());
}

document.querySelectorAll('input[name="graph-mode"]').forEach((elem) => {
  elem.addEventListener("change", function(event) {
    const newMode = (<HTMLInputElement>event.target).value;
    if (newMode==="tree"){
      setTreeMode();
    }
    else{
      setProcessMode();
    }
  });
});

document.getElementById('zoom-fit')!.addEventListener('click',() => {
  fitZoom();
});

function fitZoom(){
  cy.resize();
  cy.fit(undefined,5);
}


function setActiveListItems(){
  document.querySelectorAll('.list-group a').forEach((elem) => {
    elem.addEventListener('click', (e) => {
      document.querySelectorAll('.list-group a').forEach((el) => {
        el.classList.remove('active');
        if (!el.classList.contains('collapsed'))
          elem.classList.add('active');
      });
    })
  });
}

document.getElementById('collapse')!.addEventListener('click', () => {
  document.querySelectorAll('.list-group .collapse').forEach((el) => {
    el.classList.remove('show');
  });
  document.querySelectorAll('.list-group a').forEach((el) => {
    el.classList.remove('active');
    el.classList.add('collapsed');
  });
});
document.getElementById('expand')!.addEventListener('click', () => {
  document.querySelectorAll('.list-group .collapse').forEach((el) => {
    el.classList.add('show');
  });
  document.querySelectorAll('.list-group a').forEach((el) => {
    el.classList.remove('collapsed');
    el.classList.add('active');
  });
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