import { Prisma, PrismaClient } from '@prisma/client';
import cuid from 'cuid';
import { ElementDefinition, Position } from 'cytoscape';
import * as _ from "lodash";
import { Element } from './FilesApi';
import { ClassMethods, MethodArgumentTypes, RemoteApi } from './RemoteApi';
import prisma from '../db/client';

export interface VertexApi<T extends ClassMethods<VertexApi_>> extends RemoteApi{
    method : T,
    params : MethodArgumentTypes<typeof VertexApi_.prototype[T]>,
};
export type VertexApiReturn<T extends keyof VertexApi_> = Prisma.PromiseReturnType<typeof VertexApi_.prototype[T]>
//export type VertexApiGenericReturn<T extends keyof VertexApi_> = ReturnType<typeof VertexApi_.prototype[T]>

export type VertexPos = Prisma.VertexGetPayload<{
    select: { id: true}
  }> & {pos : Position}

export type EdgeData = Prisma.EdgeGetPayload<{
    select: { name: true, startID : true, endID : true}
  }>

// const prisma = new PrismaClient();


export class VertexApi_ {
    public async getVertices(params?: any) {
        const users = await prisma.vertex.findMany();
        return users;
    }

    public async findElements(params: {searchName: string, wpID : string}){
        const nameArgs = _.isEqual(params.searchName,"*") ? {} : {
            OR : [{
                name : {
                    contains : _.toLower(params.searchName),
                }
            },{
                name : {
                    contains : _.capitalize(params.searchName),
                },
            }]
        }
        let findVArgs = {
            where : {
                workspaceID : params.wpID,
            }
        };
        if (!_.isNil(nameArgs.OR)){
            findVArgs = _.merge(findVArgs,{where : nameArgs});
        }
        const verts = await prisma.vertex.findMany(findVArgs);
        let findEArgs = _.merge(findVArgs,{where : {inMeta : false}});
        const edges = await prisma.edge.findMany(findEArgs);
        /*let eles : Element[] = _.map(verts,(v)=> {
                return _.assign(v,{type : "Vertex"} as ElementType);
        });
        eles = _.concat(eles,_.map(edges,(e)=> {
            return _.assign(e,{type : "Edge"} as ElementType);
        }));*/
        return {vertices : verts, edges : edges};
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


    public async createSourceEdges(params: {name ?: string, startID : string, endID : string[], inMeta ?: boolean, wpID : string}){
        const name = !_.isNil(params.name) ? _.times(params.endID.length,_.constant(params.name)) : await this.createEdgesName(params.startID,params.endID);
        const edges : EdgeData[] = _.map(params.endID,(eID,ind)=>{
            return {name : name[ind],startID : params.startID,endID : eID};
        })
        return this.createManyEdges({edges : edges, inMeta : params.inMeta, wpID : params.wpID});
    }

    private async createManyEdges(params: {edges : EdgeData[], inMeta ?: boolean, wpID : string}){
        const edgesID = _.times(params.edges.length,cuid);
        const edgesPromise = _.map(_.zip(edgesID,params.edges),(e) => prisma.edge.create({
                data : {
                    id : e[0]!,
                    name : e[1]!.name,
                    startVertex : {
                        connect : {
                            id : e[1]!.startID
                        }
                    },
                    endVertex : {
                        connect : {
                            id : e[1]!.endID
                        }
                    },
                    inMeta : params.inMeta ?? false,
                    workspace : {
                        connect : {
                            id : params.wpID
                        }
                    }
                }
            }));
        await prisma.$transaction(edgesPromise);
        const edges = await prisma.edge.findMany({where : {id : {in : edgesID}}});
        return edges;    
    } 

    private async createEdgesName(startID: string, endId : string[]){
        const src = await prisma.vertex.findUnique({where : {id : startID},select : {name : true}});
        const dests = await prisma.vertex.findMany({where : {id : {in : endId}}, select : {name : true}});
        const names = _.map(dests,(dest)=>{
            const name = src!.name+"-"+dest.name;
            return name;
        })
        return names;
    }

    public async createEdge(params: {name ?: string, startID : string, endID : string, inMeta ?: boolean, wpID : string}){
        const name = params.name ?? _.first(await this.createEdgesName(params.startID,[params.endID]))!;
        const edge = await prisma.edge.create({
            data : {
                name : name,
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
                workspace : {
                    connect : {
                        id : params.wpID
                    }
                }
            }
        })
        return edge;
    }

    public async createVertex(params : {name : string, meta? : boolean, wpID : string}){
        const vertex = await prisma.vertex.create({
            data : {
                name : params.name,
                meta : params.meta ?? false,
                workspace : {
                    connect : {
                        id : params.wpID
                    }
                } 
            }
        })
        return vertex;
    }

    public async getCytoVertices(params: {vertexID ?: string[], wpID : string}){
        let vertexParams = {
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
                },
                x : true,
                y : true
            },
            where : {
                id : {},
                workspaceID : params.wpID
            }
        }
        if (!_.isNil(params?.vertexID)){
            vertexParams.where.id = {in : params.vertexID};
        }
        const vertices = await prisma.vertex.findMany(vertexParams)
        let cytoVerts : ElementDefinition[] = [];
        vertices.forEach((v) => 
            cytoVerts.push({group : "nodes", 
            data : {id : v.id, name: v.name, parent: v.endEdges[0]?.startID},
            position : {x : v.x, y : v.y}
        })
        )
        return cytoVerts;
    }

    public async getCytoEdges(params: {edgeID ?: string[], wpID : string}){
        const edgesParams = {
            select : {
                id: true,
                name: true,
                startID: true,
                endID: true,
            },
            where : {
                inMeta : false,
                id : {},
                workspaceID : params.wpID
            }
        }
        if (!_.isNil(params?.edgeID)){
            edgesParams.where.id = {in : params.edgeID};
        }
        const edges = await prisma.edge.findMany(edgesParams);
        let cytoEdges : ElementDefinition[] = [];
        edges.forEach((e) => 
            cytoEdges.push({group : "edges", data : {id : e.id, source: e.startID, target : e.endID, name: e.name}})
        )
        return cytoEdges;
    }

    public async deleteVertex(params : {verticesID: string[]}){
        const docDelete = {
            where : {
                vertices : {
                    every : {
                        id : {
                            in : params.verticesID
                        }
                    }
                },
                edges : {
                    every : {
                        OR: [{
                            startID : {
                            in : params.verticesID
                        }
                    },
                    {
                        endID : {
                            in : params.verticesID
                        }
                    }]
                }
            }
        }
    }
        const files = prisma.file.deleteMany(docDelete);
        const dirs = prisma.directory.deleteMany(docDelete);
        //deleteMany doesn't work for vertex table
        //deleting all edges firstly manually
        const edges = prisma.edge.deleteMany({
                where : {
                    OR: [
                        {
                            startID : {
                                in : params.verticesID
                            }
                        },
                        {
                            endID : {
                                in : params.verticesID
                            }
                        },
                    ]
                }
            });
        const vertices = prisma.vertex.deleteMany({
            where : {
                id : {
                    in : params.verticesID
                }
            }
        });
        const delEles = await prisma.$transaction([dirs,files,edges,vertices]);
        return delEles;
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
        const docsDelete = {
            where : {
                edges : {
                    every : {
                        id : {
                            in: params.edgesID
                        }
                    }
                },
                vertices : {
                    every : {
                        id : {
                            in: []
                        }
                    }
                }
            }
        }
        const files = prisma.file.deleteMany(docsDelete);
        const dirs = prisma.directory.deleteMany(docsDelete);
        const edges = prisma.edge.deleteMany({
                where : {
                    id : { 
                        in: params.edgesID
                    }
                }
            });
        const delEles = await prisma.$transaction([dirs,files,edges]);
        return delEles;
    }

    public async unionParent(params: {unionName: string, childrenID: string[] , unionParentID? : string, wpID : string}){
        let metaV = await this.createVertex({name : params.unionName, meta : true, wpID : params.wpID});
        metaV = await this.includeParent({parentID: metaV.id, childrenID: params.childrenID, wpID : params.wpID});
        if (!_.isNil(params.unionParentID)){
            await this.createEdge({
                name: VertexApi_.createMetaEdgeName(metaV.id),
                startID : params.unionParentID!,
                endID : metaV.id,
                inMeta : true,
                wpID : params.wpID
            })
        }
        return metaV;
    }

    private static createMetaEdgeName(cuid : string) : string{
        return "meta" + _.truncate(cuid, {
            "length" : 10,
        })
    }

    public async includeParent(params: {parentID: string, childrenID: string[], wpID : string}){
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

        const eData : EdgeData[] = _.map(params.childrenID,(childID)=>{
            return {name : VertexApi_.createMetaEdgeName(childID),startID : metaV.id,endID : childID}; 
        });
        const edges = this.createManyEdges({edges : eData, inMeta : true, wpID : params.wpID});
        return metaV;
    }

    public async updatePositions(params: {vPos : VertexPos[]}) {
        const vertPromise = _.map(params.vPos,(vP) => {
            const v = prisma.vertex.update({
                where : {id : vP.id},
                data : {x: vP.pos.x, y: vP.pos.y} 
            })
            return v;
        });
        await prisma.$transaction([...vertPromise]);
        const vertices = prisma.vertex.findMany({
            where : {id : {in : _.map(params.vPos,"id")}},
        })
        return vertices;
    }
}

