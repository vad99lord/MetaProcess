import { IpcService } from "../ipc/IpcService";
import {VertexApi,VertexApiReturn, VertexApi_, VertexPos} from "../ipc/VerticesApi";
import { QueryChannel } from "../ipc/QueryChannel";
import {ElementDefinition,NodeDefinition,EdgeDefinition} from 'cytoscape';
import * as _ from "lodash";
import cytoscape = require('cytoscape');
import { removeListener } from "process";
import { AttributeApi, AttributeApiReturn,DocumentType,Document, ElementDocuments } from "../ipc/AttributesApi";
import { AttributeChannel } from "../ipc/AttributesChannel";
import { Element, ElementName, FileApi, FileApiReturn } from "../ipc/FilesApi";
import { FileChannel } from "../ipc/FileChannel";
import { IpcHandler } from "../ipc/IpcHandler";
import { CloseChannel } from "../ipc/CloseChannel";
import { clone } from "lodash";
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

var tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
  return new Bootstrap.Tooltip(tooltipTriggerEl);
})

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


ipcRenderer.once(WorkspaceChannel.WORKSPACE_CHANNEL,(ev,req)=>{
  let userReq = req as WorkspaceWinApi<ClassMethods<WorkspaceWinApi_>>;
  if (userReq.method!=="saveWorkspace"){
    return;
  }
  let savePromise = savePositions().then(()=>saveWpName());
  savePromise.then((wp)=>{
    let closeParams : WorkspaceApi<"closeWorkspace"> = {method : "closeWorkspace", params : [{}]}
    return ipc.send<WorkspaceApiReturn<"closeWorkspace">>(WorkspaceChannel.WORKSPACE_CHANNEL, closeParams);  
  });
});

document.getElementById('reload')!.addEventListener('click', () => {
  reloadWindow();
});

let workSpace : Workspace | null = null;
let cy : cytoscape.Core;


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
      
      //(<HTMLInputElement>document.getElementById('graph-mode')!).checked = workSpace.isTreeMode;
      initModeRadio(workSpace.isTreeMode);
      toggleSearchButtons(true);
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
const cy = cytoscape({
  container: document.getElementById('cy'),
  boxSelectionEnabled: false,
  style: [
    {
      selector: 'node',
      css: {
        'label': 'data(name)',
        'text-valign': 'top',
        'text-halign': 'center'
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
        'target-arrow-shape': 'none'
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
        'background-color' : "#00FFff",
        'line-color': '#00FFff'
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
cy.on('tap', function(event){
  let evtTarget = event.target;
  if (evtTarget === cy){
    document.getElementById('docs-table')!.innerHTML="";
    (<HTMLInputElement>document.getElementById('elem-name'))!.value = "";
    return;
  }
  const ele : cytoscape.SingularData = evtTarget;

  let eleType : "Edge"|"Vertex" = ele.isNode() ? "Vertex" : "Edge";
  let attrParams : AttributeApi<"getElementDocuments"> = {
    method : "getElementDocuments", 
    params : [{ele: eleType,id : ele.id()}
  ]};
  ipc.send<AttributeApiReturn<"getElementDocuments">>(AttributeChannel.ATTRIBUTE_CHANNEL, attrParams).then((ele) => {
    (<HTMLInputElement>document.getElementById('elem-name'))!.value = ele.name;
    
    const tableDiv = document.getElementById('docs-table')!;
    tableDiv.innerHTML = "";
    tableDiv.appendChild(createTable(ele));
  });

});
return cy;
}

document.getElementById('wp-name')!.addEventListener('input',(ev) => {
  const wpInput = <HTMLInputElement>ev.target;
  workSpace!.name = wpInput.value;
});

function addEdge(source : cytoscape.NodeSingular, target : cytoscape.NodeSingular){
  // console.log(source.id());
  // console.log(target.id());
  if (!source.edgesTo(target).empty()) {
    alert('edge is already presented');
    return;
  }
  let edgeParams : VertexApi<"createEdge"> = {method : "createEdge", params : 
    [{name : "testEdge",startID : source.id(), endID : target.id(), wpID : workSpace!.id}]
  }
  ipc.send<VertexApiReturn<"createEdge">>(QueryChannel.QEURY_CHANNEL, edgeParams).then((edge) => {
    const cyEdge = cy.add([
      { group: 'edges', data: { id: edge.id, source: edge.startID, target: edge.endID, name : edge.name}}
    ]);
    setEdgeStyle(cyEdge.edges(),workSpace!);
  });
}

//const nodesConst : cytoscape.NodeSingular[] = [];
function onAddEdge(){
  let nodes : cytoscape.NodeSingular[] = []
  let addEdgeCallback = function(evt : cytoscape.EventObject){
    nodes.push(evt.target);
    if (nodes.length == 2){
      addEdge(_.first(nodes)!,_.last(nodes)!);
      nodes = []
      cy.removeListener('select','node',addEdgeCallback);
    }
  }
  return addEdgeCallback;
}

document.getElementById('add edge')!.addEventListener('click',() => {
  cy.addListener('select','node', onAddEdge());
});

let mainV: cytoscape.EdgeSingular[] = [];
function addSrcEdges(){
  if (_.isEmpty(mainV)){
    cy.one('select','node', (evt) => {
      mainV.push(evt.target);
    });
  }
  else {
    const src = _.first(mainV)!;
    let dests = cy.nodes(":selected").subtract(src);
    if (dests.empty()){
      return;
    }

    let srcID = src.id();
    const destIDs = dests.map(function( ele ){
      return ele.id();
    });

    let edgesParams : VertexApi<"createSourceEdges"> = {
      method : "createSourceEdges", 
      params : [{name : "testEdge",startID : srcID, endID : destIDs, wpID : workSpace!.id}]};
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
      mainV = [];  
    });

    /*nodes.move({parent: _.first(mainParent)!.id()});
    mainParent = [];  */
  }
}
document.getElementById('add src edges')!.addEventListener('click',() => {
  addSrcEdges();
});

function makeid(length: number) {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
};


function addVertex(){
  let vetrexParams : VertexApi<"createVertex"> = {method : "createVertex", params : [{name : "testVertex",wpID : workSpace!.id}]};
  ipc.send<VertexApiReturn<"createVertex">>(QueryChannel.QEURY_CHANNEL, vetrexParams).then((vertex) => {
    //make sure added vertex is centered in visible model part
    const ex = cy.extent()
    const modelCenter = {x : ex.x1+ex.w/2,y : ex.y1+ex.h/2}
    cy.add([
      { group: 'nodes', data: { id: vertex.id, name : vertex.name}, position : modelCenter}
    ]);
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
      alert("selected nodes have different parents!");
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
    params : [{unionName : "testUnionVertex",childrenID : childrenID, unionParentID : unionParentID, wpID : workSpace!.id}]};
  ipc.send<VertexApiReturn<"unionParent">>(QueryChannel.QEURY_CHANNEL, unionParams).then((unionParent) => {
    cy.add([
      { group: 'nodes', data: { id: unionParent.id, name : unionParent.name, parent : unionParentID}}
    ]);
    nodes.move({parent: unionParent.id});
  });
}
document.getElementById('union parent')!.addEventListener('click',() => {
	unionParent()
});


let mainParent : cytoscape.NodeSingular[] = [];
function includeParent(){
  if (_.isEmpty(mainParent)){
    cy.one('select','node', (evt) => {
      mainParent.push(evt.target);
    });
  }
  else {
    const parent = _.first(mainParent)!;
    //substract parent from selected set in case it's been selected
    let nodes = cy.nodes(":selected").subtract(parent);
    if (nodes.empty()){
      return;
    }

    let parentID = parent.id();
    const childrenID = nodes.map(function( ele ){
      return ele.id();
    });

    let includeParams : VertexApi<"includeParent"> = {
      method : "includeParent", 
      params : [{parentID : parentID,childrenID : childrenID, wpID : workSpace!.id}]};
    ipc.send<VertexApiReturn<"includeParent">>(QueryChannel.QEURY_CHANNEL, includeParams).then((parent) => {
        nodes.move({parent: parent.id});
        mainParent = [];  
    });

    /*nodes.move({parent: _.first(mainParent)!.id()});
    mainParent = [];  */
  }
}
document.getElementById('include parent')!.addEventListener('click',() => {
  includeParent();
});


function removeVertex(){
  let nodes = cy.nodes(":selected");
  //explicitly add all descendant nodes to remove set
  //as deleting parent's vertex imply deleting all of its contents
  let nodesChilds = nodes.descendants().union(nodes);
  nodesChilds.flashClass('highlight', 1000);
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
  removeVertex();
});


function removeEdge(){
  let edges = cy.edges(":selected");
  const childrenID = edges.map(function( ele ){
    return ele.id();
  });
  let removeParams : VertexApi<"deleteEdge"> = {
    method : "deleteEdge", 
    params : [{edgesID : childrenID}
  ]};
  ipc.send<VertexApiReturn<"deleteVertex">>(QueryChannel.QEURY_CHANNEL, removeParams).then((e) => {
      edges.remove(); 
  });
}
document.getElementById('delete edge')!.addEventListener('click',() => {
  removeEdge();
});


function removeParent(){
  let parents = cy.nodes(":selected:parent");
  const parentsID = parents.map(function( ele ){
    return ele.id();
  });
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
  removeParent();
});


document.getElementById('update-elem-name')!.addEventListener('click',() => {
  let eles = cy.elements(":selected");
  if (eles.empty()){
      alert("select element to update name!");
      return;
  }
  else {
    if (eles.size()>1){
        alert("select 1 element onlyto update name!");
        return;
    }
    else {
       const ele = eles.first();
       let elemName = (<HTMLInputElement>document.getElementById('elem-name'))!.value;
       if (ele.data('name')===elemName){
          alert("same name!");
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
})



function createRow(tableBody: HTMLTableSectionElement, doc : Document){
  let row = document.createElement('tr');
  if (!doc.valid){
    row.classList.add('invalid');
  }
    row.id = "docs-table_"+doc.id;
    for (let docProp of _.values(_.pick(doc,"name","fullPath","type"))){
      let cell = document.createElement('td');
      cell.appendChild(document.createTextNode(docProp));
      row.appendChild(cell);
    } 
    row.addEventListener('click',(e)=>{
        /*let name = row.firstChild!.textContent;
        let path = row.firstChild!.nextSibling!.textContent;
        let fullPath = path!+"/"+name!;
        //console.log(fullPath);
        */
        if (!doc.valid){
            let dialogParams : FileApi<"openFileDialog"> = {
              method : "openFileDialog", 
              params : [{type : doc.type==="Directory" ? "openDirectory": "openFile"}]
            };
            ipc.send<FileApiReturn<"openFileDialog">>(FileChannel.FILE_CHANNEL, dialogParams).then((dialogReturn) => {
              if (dialogReturn.canceled){
                console.log("dialog cancelled");
                return;
              }
              const fullPath = dialogReturn.filePaths[0];
              let updateParams : FileApi<"updateDoc"> = {
                method : "updateDoc", 
                params : [{doc : doc, newPath : fullPath, valid : true}]
              };
              ipc.send<FileApiReturn<"updateDoc">>(FileChannel.FILE_CHANNEL, updateParams).then((updDoc) =>{
                  if (!_.isNil(updDoc)){
                    row.classList.remove('invalid');
                  }
                  else {
                      let eles = cy.elements(":selected");
                      if (eles.empty() || eles.size() > 1){
                          alert("select one element to update document!");
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
                          tableBody.removeChild(row);
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
                              createRow(tableBody,conDoc);
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
              row.classList.add('invalid');
           }
           else {
              row.classList.remove('invalid');
           }
        });
      }
    });
    row.addEventListener('contextmenu',(e)=>{
      let eles = cy.elements(":selected");
      if (eles.empty() || eles.size() > 1){
          alert("select one element to untag document!");
          return;
      }
      const ele : Element = {
         id: eles.first().id(),
         type: eles.first().isNode() ? "Vertex" : "Edge"
      }
      const docID : number = Number(_.last(_.split(row.id,"_"))!);
      const docType = row.lastChild!.textContent! as DocumentType['type'];
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


function createTable(data : AttributeApiReturn<"getElementDocuments">){
  const table = document.createElement('table');
  const tableHead = document.createElement('thead');
  let row = document.createElement('tr');
  for (let docProp in _.pick(data.documents[0],"name","fullPath","type")){
    let cell = document.createElement('td');
    cell.appendChild(document.createTextNode(docProp));
    row.appendChild(cell);
  } 
  tableHead.appendChild(row);
  table.appendChild(tableHead);

  
  const tableBody = document.createElement('tbody');
  data.documents.forEach((doc) => createRow(tableBody,doc));
  table.appendChild(tableBody);
  return table;
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
        alert("choose edges or nodes to tag!");
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
        createRow(tableBody,doc!);
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
    const eleIconName = eleDocs.type==="Vertex" ? "bookmark" : "diagram-2";
    const docIcon = createSVGElement(eleIconName);
    docIcon.classList.add("bi-search");
    colEleIcon.appendChild(docIcon);

    const colDoc = document.createElement('div');
    colDoc.classList.add('col','w-25');
    const flexRow = document.createElement('div');
    flexRow.classList.add("d-flex","justify-content-between","align-items-center");
    const eleName = document.createElement('h5');
    eleName.classList.add("text-truncate","w-75");
    eleName.innerHTML = eleDocs.name;

    const iconsCol = document.createElement('div');
    iconsCol.classList.add("d-flex","flex-column","align-items-end");
    const elesSpan = document.createElement('span');
    elesSpan.classList.add("badge","bg-primary","rounded-pill","mb-1");
    elesSpan.innerHTML = _.toString(eleDocs.documents.length);
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
    openBtn.innerHTML = "show element "; //or document
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
      docName.innerHTML = doc.name;
      const docPath = document.createElement('p');
      docPath.classList.add("m-0","text-truncate","w-75");
      docPath.innerHTML = doc.fullPath;
      namesDiv.appendChild(docName);
      namesDiv.appendChild(docPath);

      const docIconDiv = document.createElement('div');
      docIconDiv.classList.add("align-self-center");
      let docIconName;
      if (doc.valid){
        docIconName = doc.type==="Directory" ? "folder" : "file-earmark";
      }
      else {
        docIconName = doc.type==="Directory" ? "folder-x" : "file-earmark-x";
      }
      const docIcon = createSVGElement(docIconName);
      docIconDiv.appendChild(docIcon);

      eleItem.appendChild(namesDiv);
      eleItem.appendChild(docIconDiv);
      elesList.appendChild(eleItem);

      connectHtmlDoc(eleItem,doc);
    }); 
    cardDiv.appendChild(elesList);
    elesDiv.appendChild(cardDiv);

    docElesList.appendChild(eleLink);
    docElesList.appendChild(elesDiv);
  });  
  setActiveListItems();



  // const table = document.createElement('table');
  // const tableHead = document.createElement('thead');
  // let row = document.createElement('tr');

  // /*let omitData = _.map(data,(eleDocs)=>{
  //   return {id: eleDocs.id, name : eleDocs.name, documents : _.map(eleDocs.documents,(doc)=>_.omit(doc,["id"]))}
  // });*/
  // let omitData = data;

  // for (let docProp in _.first(_.first(omitData)!.documents)!){
  //   let cell = document.createElement('td');
  //   cell.appendChild(document.createTextNode(docProp));
  //   row.appendChild(cell);
  // } 
  // tableHead.appendChild(row);
  // table.appendChild(tableHead);
  
  // const tableBody = document.createElement('tbody');
  // const colCount = _.size(_.first(_.first(data)!.documents)!);
  // _.forEach(omitData,(eleDocs)=>{
  //   let row = document.createElement('tr');
  //   connectRowElement(row,eleDocs.id);
  //   /*row.addEventListener('click',(e)=>{
  //     const ele = cy.getElementById(eleDocs.id);
  //     const fitMaxZoom = 1;
  //     const maxZoom = cy.maxZoom();
  //     cy.maxZoom( fitMaxZoom );
  //     cy.fit(ele);
  //     cy.maxZoom( maxZoom );
  //     ele.flashClass('highlight', 500);
  //   });*/

  //   let cell = document.createElement('td');
  //   cell.appendChild(document.createTextNode(eleDocs.name));
  //   cell.colSpan = colCount;
  //   row.appendChild(cell);
  //   tableBody.appendChild(row);

  //   _.forEach(eleDocs.documents,(doc)=>{
  //     let row = document.createElement('tr');
  //     // if (!doc.valid){
  //     //   row.classList.add('invalid');
  //     // }
  //     _.forOwn(_.pick(doc,['name','fullPath','type']),(docVal)=>{
  //       let cell = document.createElement('td');
  //       cell.appendChild(document.createTextNode(docVal));
  //       row.appendChild(cell);
  //     });
  //     connectRowDoc(row,doc);
  //     /*row.addEventListener('click',(e)=>{
  //       let dialogParams : FileApi<"openFile"> = {
  //         method : "openFile", 
  //         params : [{doc : doc}]
  //       };
  //       ipc.send<FileApiReturn<"openFile">>(FileChannel.FILE_CHANNEL, dialogParams).then((err) => {
  //          if (!_.isEmpty(err)){
  //             row.classList.add('invalid');
  //          }
  //          else {
  //             row.classList.remove('invalid');
  //          }
  //       });
  //     });*/

  //     tableBody.appendChild(row);
  //   });

  // });
  // table.appendChild(tableBody);
  // return table;
}


function connectRowElement(row : HTMLTableRowElement, eleID : string){
  row.addEventListener('click',(e)=>{
    const ele = cy.getElementById(eleID);
    const fitMaxZoom = 1;
    const maxZoom = cy.maxZoom();
    cy.maxZoom( fitMaxZoom );
    cy.fit(ele);
    cy.maxZoom( maxZoom );
    ele.flashClass('highlight', 500);
  });
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


function connectRowDoc(row : HTMLTableRowElement, doc :Document){
  if (!doc.valid){
    row.classList.add('invalid');
  }
  row.addEventListener('click',(e)=>{
    let dialogParams : FileApi<"openFile"> = {
      method : "openFile", 
      params : [{doc : doc}]
    };
    ipc.send<FileApiReturn<"openFile">>(FileChannel.FILE_CHANNEL, dialogParams).then((err) => {
       if (!_.isEmpty(err)){
          row.classList.add('invalid');
       }
       else {
          row.classList.remove('invalid');
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
      emptySearchTxt.classList.remove('no-display');
      toggleSearchButtons(true);
      return;
    }
    emptySearchTxt.classList.add('no-display');
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
    let docIconName : string;
    if (docEles.doc.valid){
      docIconName = docEles.doc.type==="Directory" ? "folder" : "file-earmark";
    }
    else {
      docIconName = docEles.doc.type==="Directory" ? "folder-x" : "file-earmark-x";
    }
    //const docIconName = docEles.doc.type==="Directory" ? "folder" : "file-earmark";
    const docIcon = createSVGElement(docIconName);
    docIcon.classList.add("bi-search");
    colDocIcon.appendChild(docIcon);

    const colDoc = document.createElement('div');
    colDoc.classList.add('col','w-25');

    const rowName = document.createElement('div');
    rowName.classList.add("d-flex","justify-content-between","align-items-start");
    const docName = document.createElement('h5');
    docName.classList.add("mb-1","text-truncate","w-75");
    docName.innerHTML = docEles.doc.name;
    const elesSpan = document.createElement('span');
    elesSpan.classList.add("badge","bg-primary","rounded-pill");
    elesSpan.innerHTML = _.toString(docEles.eles.length);
    rowName.appendChild(docName);
    rowName.appendChild(elesSpan);

    const rowPath = <HTMLDivElement>rowName.cloneNode(false);
    const docPath = document.createElement('p');
    docPath.classList.add("mb-1","text-truncate","w-75");
    docPath.innerHTML = docEles.doc.fullPath;
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
    openBtn.innerHTML = "show element "; //or document
    connectHtmlDoc(openBtn,docEles.doc);
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
      eleItem.innerHTML=ele.name;
      const eleIconName = ele.type==="Vertex" ? "bookmark" : "diagram-2";
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

  /*const table = document.createElement('table');
  const tableHead = document.createElement('thead');
  let row = document.createElement('tr');
  for (let docProp in _.pick(_.first(docsEles)!.doc,["name","fullPath","type"])){
    let cell = document.createElement('td');
    cell.appendChild(document.createTextNode(docProp));
    row.appendChild(cell);
  } 
  tableHead.appendChild(row);
  table.appendChild(tableHead);
  
  const tableBody = document.createElement('tbody');
  const colCount = _.size(_.pick(_.first(docsEles)!.doc,["name","fullPath","type"]));
  _.forEach(docsEles,(docEles)=>{

    let row = document.createElement('tr');
    _.forOwn(_.pick(docEles.doc,["name","fullPath","type"]),(docVal)=>{
      let cell = document.createElement('td');
      cell.appendChild(document.createTextNode(docVal));
      row.appendChild(cell);
    });
    connectRowDoc(row,docEles.doc);
    tableBody.appendChild(row);

    _.forEach(docEles.eles,(ele)=>{
      let row = document.createElement('tr');

      let cell = document.createElement('td');
      cell.appendChild(document.createTextNode(ele.name));
      cell.colSpan = colCount-1;
      row.appendChild(cell);

      cell = document.createElement('td');
      cell.appendChild(document.createTextNode(ele.type));
      row.appendChild(cell);

      connectRowElement(row,ele.id);

      tableBody.appendChild(row);
    });
  });
  table.appendChild(tableBody);

  return table;*/
}


function findDocumentsWithElements(searchValue : string) {
  let searchParams: AttributeApi<"findDocumentsElements"> = { method: "findDocumentsElements", params: [{ searchName: searchValue, wpID : workSpace!.id }] };
  ipc.send<AttributeApiReturn<"findDocumentsElements">>(AttributeChannel.ATTRIBUTE_CHANNEL, searchParams).then((docEles) => {
    const emptySearchTxt = document.getElementById('empty-search')!;
    if (_.isEmpty(docEles)) {
      document.getElementById('collapse-parent')!.innerHTML="";
      emptySearchTxt.classList.remove('no-display');
      toggleSearchButtons(true);
      return;
    }
    emptySearchTxt.classList.add('no-display');
    toggleSearchButtons(false);
    const tableDiv = document.getElementById('search-table')!;
    tableDiv.innerHTML = "";
    const docElesList = document.getElementById("collapse-parent")!;
    docElesList.innerHTML = "";
    createDocsElementsTable(docEles,docElesList);
  });
}


document.getElementById('search')!.addEventListener('click',() => {
        let searchValue = (<HTMLInputElement>document.getElementById('search-text'))!.value;
        if (searchValue === "") {
          alert("empty query!");
          return;
        }
        //TODO case-insentive search for ciryllic!!!
        //searchValue = _.toLower(searchValue);  

        const searchDocs = (<HTMLSelectElement>document.getElementById("search-type"))!;
        if (_.isEqual(searchDocs.value,"eles")) {
          findElementsWithDocs(searchValue);
        }
        else {
          findDocumentsWithElements(searchValue);
        };
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
        cytoEles.select();
      });
  });
}
document.getElementById('clone elements')!.addEventListener('click',() => {
  cloneElements();
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
  // cloneBtn.style.visibility = 'hidden';
  // cloneBtn.style.display = 'none';
  cloneBtn.disabled = true;
  workSpace!.isTreeMode = true;
  setTreeEdges(cy.edges());
}

function setProcessMode(){
  const cloneBtn = <HTMLButtonElement>document.getElementById('clone elements')!;
  // cloneBtn.style.visibility = 'visible';
  // cloneBtn.style.display = 'inline-block';
  cloneBtn.disabled = false;
  workSpace!.isTreeMode = false;
  setProcessEdges(cy.edges());
}

/*document.getElementById('graph-mode')!.addEventListener('click',(e) => {
  const cb = <HTMLInputElement> e.target;
  if (cb.checked){
    setTreeMode();
  }
  else{
    setProcessMode();
  }
  console.log("Clicked, new value = " + cb.checked);
});*/

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
  cy.fit(undefined,5);
});



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
  const svgIconsPath = "../../node_modules/bootstrap-icons/bootstrap-icons.svg";
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

// document.getElementById('tester')!.addEventListener('click',() => {
//     const colR = document.getElementById('right')!;
//     const colL = document.getElementById('left')!;
//     if (colR.classList.contains("d-none")){
//       colR.classList.remove('d-none');
//       cy.resize();
//       cy.fit(undefined,5);
//     }
//     else {
//       colR.classList.add('d-none');
//       cy.resize();
//       cy.fit(undefined,5);
//     }
// });