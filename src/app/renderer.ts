import { IpcService } from "../ipc/IpcService";
import {VertexApi,VertexApiReturn, VertexApi_} from "../ipc/VerticesApi";
import { QueryChannel } from "../ipc/QueryChannel";
import {ElementDefinition,NodeDefinition,EdgeDefinition} from 'cytoscape';
import * as _ from "lodash";
import cytoscape = require('cytoscape');
import { removeListener } from "process";
import { AttributeApi, AttributeApiReturn,DocumentType,Document } from "../ipc/AttributesApi";
import { AttributeChannel } from "../ipc/AttributesChannel";
import { Element, FileApi, FileApiReturn } from "../ipc/FilesApi";
import { FileChannel } from "../ipc/FileChannel";
const { ipcRenderer} = require('electron');

//TODO: REMOVE! DEBUG for reload after actions
const {getCurrentWindow} = require('electron').remote;
function reloadWindow(){
  getCurrentWindow().reload();
}
const ipc = new IpcService(ipcRenderer);

document.getElementById('reload')!.addEventListener('click', () => {
  reloadWindow();
});

/*document.getElementById('test')!.addEventListener('click', () => {
  let users : VertexApi<"getVertices"> = {method : "getVertices", params : []};

  ipc.send<VertexApiReturn<"getVertices">>(QueryChannel.QEURY_CHANNEL, users).then((vertices) => {
    let verticesStr = "";
    vertices.forEach(v => {
      verticesStr += v.id + " "+ v.name + "<br>";
    });
    document.getElementById('test_text')!.innerHTML = verticesStr;
  }
  );

});*/


//get edges and vertices in cytoscape format
let cv : Promise<ElementDefinition[]> = ipc.send<VertexApiReturn<"getCytoVertices">>(QueryChannel.QEURY_CHANNEL, {method : "getCytoVertices", params : []});
let ce : Promise<ElementDefinition[]> = ipc.send<VertexApiReturn<"getCytoEdges">>(QueryChannel.QEURY_CHANNEL, {method : "getCytoEdges", params : []});
//merge nodes and vertices in one promise
let cve = Promise.all([ce,cv]).then(([ce,cv]) => {return [...ce, ...cv]});


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
        'target-arrow-shape': 'triangle'
      }
    },
    {
      selector: 'node.highlight',
      css: {
        'background-color' : "#00FFff",
      }
    }
  ],
  elements: cve,
  layout: {
    name: 'preset',
    padding: 5
  }
});


function addEdge(source : cytoscape.NodeSingular, target : cytoscape.NodeSingular){
  // console.log(source.id());
  // console.log(target.id());
  if (!source.edgesTo(target).empty()) {
    alert('edge is already presented');
    return;
  }
  let edgeParams : VertexApi<"createEdge"> = {method : "createEdge", params : 
    [{name : "testEdge",startID : source.id(), endID : target.id()}]
  }
  ipc.send<VertexApiReturn<"createEdge">>(QueryChannel.QEURY_CHANNEL, edgeParams).then((edge) => {
    cy.add([
      { group: 'edges', data: { id: edge.id, source: edge.startID, target: edge.endID, name : edge.name}}
    ]);
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
  let vetrexParams : VertexApi<"createVertex"> = {method : "createVertex", params : [{name : "testVertex"}]};
  ipc.send<VertexApiReturn<"createVertex">>(QueryChannel.QEURY_CHANNEL, vetrexParams).then((vertex) => {
    cy.add([
      { group: 'nodes', data: { id: vertex.id, name : vertex.name}}
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
    params : [{unionName : "testUnionVertex",childrenID : childrenID, unionParentID : unionParentID}]};
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
      params : [{parentID : parentID,childrenID : childrenID}]};
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


cy.on('tap', function(event){
  let evtTarget = event.target;
  if (evtTarget === cy){
    //document.getElementById('docs-table')!.innerHTML="";
    //document.getElementById('elem-name')!.innerHTML = "";
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
    row.id = "docs-table_"+doc.id;
    for (let docProp of _.values(_.pick(doc,"name","fullPath","type"))){
      let cell = document.createElement('td');
      cell.appendChild(document.createTextNode(docProp));
      row.appendChild(cell);
    } 
    row.addEventListener('click',(e)=>{
        let name = row.firstChild!.textContent;
        let path = row.firstChild!.nextSibling!.textContent;
        let fullPath = path!+"/"+name!;
        //console.log(fullPath);
        let dialogParams : FileApi<"openFile"> = {
          method : "openFile", 
          params : [{fullPath : fullPath}]
        };
        ipc.send<FileApiReturn<"openFile">>(FileChannel.FILE_CHANNEL, dialogParams).then((err) => {
           if (err !== ""){
             console.log("error opening file: "+err);
             return;
           }
        });
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
        const tableBody = <HTMLTableSectionElement>document.getElementsByTagName('tbody')[0];
        createRow(tableBody,doc!);
    });

}

document.getElementById('open-file-dialog')!.addEventListener('click',() => {
  openDialog("openFile");
});
document.getElementById('open-dir-dialog')!.addEventListener('click',() => {
  openDialog("openDirectory");
});
