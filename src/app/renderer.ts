import { IpcService } from "../ipc/IpcService";
import {VertexApi,VertexApiReturn, VertexApi_} from "../ipc/VerticesApi";
import { QueryChannel } from "../ipc/QueryChannel";
import {ElementDefinition,NodeDefinition,EdgeDefinition} from 'cytoscape';
import cytoscape = require('cytoscape');
const { ipcRenderer } = require('electron');

const ipc = new IpcService(ipcRenderer);


document.getElementById('test')!.addEventListener('click', () => {
  let users : VertexApi<"getVertices"> = {method : "getVertices", params : []};

  ipc.send<VertexApiReturn<"getVertices">>(QueryChannel.QEURY_CHANNEL, users).then((vertices) => {
    let verticesStr = "";
    vertices.forEach(v => {
      verticesStr += v.id + " "+ v.name + "<br>";
    });
    document.getElementById('test_text')!.innerHTML = verticesStr;
  }
  );

});


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
  ],

  elements: 
    /*nodes: [
      { data: { id: 'a', label : 'sfdsf', parent: 'b' } },
      { data: { id: 'b' , parent: 'z' } },
      { data: { id: 'c', parent: 'b' } },
      { data: { id: 'd' }},
      { data: { id: 'e' } },
      { data: { id: 'f', parent: 'e' }},
      { data: { id: 'z' } },
    ],
    edges: [
      { data: { id: 'ad', source: 'a', target: 'd' } },
      { data: { id: 'eb', source: 'e', target: 'b' } }

    ]*/
    cve
    //edges: ce
  ,

  layout: {
    name: 'preset',
    padding: 5
  }
});

document.getElementById('add edge')!.addEventListener('click',() => {
	let nodes = cy.nodes(":selected");
 	if (nodes.size()==2){
  	console.log(nodes[0].id());
    console.log(nodes[1].id());
  	cy.add([
  { group: 'edges', data: { id: nodes[0].id()+nodes[1].id(), source: nodes[0].id(), target: nodes[1].id()} }]);
  };
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

document.getElementById('add vertex')!.addEventListener('click',() => {
	cy.add([
  	{ group: 'nodes', data: { id: makeid(2) }},
  ]);
});

document.getElementById('add parent')!.addEventListener('click',() => {
	const parent = cy.add([
  	{ group: 'nodes', data: { id: makeid(2) }},
  ]);
	let nodes = cy.nodes(":selected");
 	if (nodes.size()>1){
  nodes.forEach(function( ele ){
    ele.move({parent: parent.id()})
	});
  }
});
