import { PrismaClient, Prisma } from '@prisma/client'
import { ClassMethods, MethodArgumentTypes, RemoteApi } from './RemoteApi';
import {EdgeDefinition, ElementDefinition, NodeDefinition} from 'cytoscape';
import { vertices } from '../../prisma/mocks';
import {Element} from './FilesApi';
import * as _ from "lodash";

export interface VertexApi<T extends ClassMethods<VertexApi_>> extends RemoteApi{
    method : T,
    params : MethodArgumentTypes<typeof VertexApi_.prototype[T]>,
};
export type VertexApiReturn<T extends keyof VertexApi_> = Prisma.PromiseReturnType<typeof VertexApi_.prototype[T]>
//export type VertexApiGenericReturn<T extends keyof VertexApi_> = ReturnType<typeof VertexApi_.prototype[T]>


const prisma = new PrismaClient();


export class VertexApi_ {
    public async getVertices(params?: any) {
        const users = await prisma.vertex.findMany();
        return users;
    }

    public async updateElementName(params: {element : Element, newName : string}) {
        let ele = null;
        const updateParams = {
            data : {
                name : params.newName
            },
            where : {
                id : params.element.id
            }
        };
        if (params.element.type === "Edge"){
            ele = await prisma.edge.update(updateParams);
        }
        else {
            if (params.element.type === "Vertex"){
                ele = await prisma.vertex.update(updateParams);
            } 
        }
        return ele;
    }

    public async createEdge(params: {name : string, startID : string, endID : string, inMeta ?: boolean}){
        const edge = await prisma.edge.create({
            data : {
                name : params.name,
                startVertex : {
                    connect : {
                        id : params.startID
                    }
                },
                endVertex : {
                    connect : {
                        id : params.endID
                    }
                },
                inMeta : params.inMeta ?? false,
            }
        })
        return edge;
    }
    public async createVertex(params : {name : string, meta? : boolean}){
        const vertex = await prisma.vertex.create({
            data : {
                name : params.name,
                meta : params.meta ?? false,
            }
        })
        return vertex;
    }

    public async getCytoVertices(params?: any){
        const vertices = await prisma.vertex.findMany({

            select : {
                id : true,
                name : true,
                endEdges : {
                    select : {
                        startID : true,
                    },
                    where : {
                        inMeta : true
                    },
                    take : 1,
                }
            }
        })
        let cytoVerts : ElementDefinition[] = [];
        vertices.forEach((v) => 
            cytoVerts.push({group : "nodes", data : {id : v.id, name: v.name, parent: v.endEdges[0]?.startID}})
        )
        return cytoVerts;
    }

    public async getCytoEdges(params?: any){
        const edges = await prisma.edge.findMany({
            select : {
                id: true,
                name: true,
                startID: true,
                endID: true,
            },
            where : {
                inMeta : false,
            }
        })
        let cytoEdges : ElementDefinition[] = [];
        edges.forEach((e) => 
            cytoEdges.push({group : "edges", data : {id : e.id, source: e.startID, target : e.endID, name: e.name}})
        )
        return cytoEdges;
    }

    public async deleteVertex(params : {verticesID: string[]}){
        //deleteMany doesn't work for vertex table
        //deleting all edges firstly manually
        await Promise.all(_.map(params.verticesID,async (vertexID) => {
            await prisma.edge.deleteMany({
                where : {
                    OR: [
                        {
                            startID : vertexID,
                        },
                        {
                            endID : vertexID,
                        },
                    ]
                }
            });
        }));
        const vertices = await prisma.vertex.deleteMany({
            where : {
                id : {
                    in : params.verticesID
                }
            }
        });
        return vertices;
    }

    public async deleteEdge(params : {edgesID: string[]}){
        //deleteMany doesn't work for many to many cascade tables
        /*const edges =  await Promise.all(_.map(params.edgesID,async (edgeID) => {
            return prisma.edge.delete({
                where : {
                    id : edgeID
                    }
            });
        }));
        return edges;*/
        const edges = await prisma.edge.deleteMany({
                where : {
                    id : { 
                        in: params.edgesID
                    }
                }
            });
        return edges;
    }

    public async unionParent(params: {unionName: string, childrenID: string[] , unionParentID? : string}){
        let metaV = await this.createVertex({name : params.unionName, meta : true});
        metaV = await this.includeParent({parentID: metaV.id, childrenID: params.childrenID})
        if (!_.isNil(params.unionParentID)){
            await this.createEdge({
                name: VertexApi_.createMetaEdgeName(metaV.id),
                startID : params.unionParentID!,
                endID : metaV.id,
                inMeta : true,
            })
        }
        return metaV;
    }

    private static createMetaEdgeName(cuid : string) : string{
        return "meta" + _.truncate(cuid, {
            "length" : 10,
        })
    }

    public async includeParent(params: {parentID: string, childrenID: string[]}){
        await prisma.edge.deleteMany({
            where : {
                endID : {
                    in : params.childrenID,
                },
                inMeta : true,
            }
        });
        const metaV = await prisma.vertex.update({
            where : {
                id : params.parentID,
            },
            data : {
                meta : true,
            }
        })

        let edges = await Promise.all(_.map(params.childrenID,async (childID) => {
            let edgeName = VertexApi_.createMetaEdgeName(childID);
            return await prisma.edge.create({
                data : {
                    name : edgeName,
                    startVertex : {
                        connect : {
                            id : metaV.id
                        }
                    },
                    endVertex : {
                        connect : {
                            id : childID
                        }
                    },
                    inMeta : true
                }
            })
        }));
        return metaV;
    }


}

