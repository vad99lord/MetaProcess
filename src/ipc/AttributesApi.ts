import { Directory, Edge, Prisma, PrismaClient, Vertex } from '@prisma/client';
import cuid from 'cuid';
import * as _ from "lodash";
import { Element, ElementName, ElementType } from './FilesApi';
import { ClassMethods, MethodArgumentTypes, RemoteApi } from './RemoteApi';
import { VertexApi_ } from './VerticesApi';


export interface AttributeApi<T extends ClassMethods<AttributeApi_>> extends RemoteApi{
    method : T,
    params : MethodArgumentTypes<typeof AttributeApi_.prototype[T]>,
};
export type AttributeApiReturn<T extends keyof AttributeApi_> = Prisma.PromiseReturnType<typeof AttributeApi_.prototype[T]>
//export type VertexApiGenericReturn<T extends keyof VertexApi_> = ReturnType<typeof VertexApi_.prototype[T]>


const prisma = new PrismaClient();


export type ElementDocuments = Element & ElementName & {documents : Document[]}
export type DocumentElements = {doc : Document, edges : Edge[], vertices : Vertex[]}
export type Document = Directory & DocumentType
export type DocumentType = {type : Extract<Prisma.ModelName,"Directory"|"File">}

interface V extends Element {
    type : Extract<ElementType["type"],"Vertex">
}
interface E extends Element {
    type : Extract<ElementType["type"],"Edge">
}

export class AttributeApi_ {

    //TODO: check if coords copying is needed somewhere ??
    public async cloneElementsDocuments(params: {VIDs: string[], EIDs : string[], wpID : string} ){
        const suffix = "_копия";
        
        const sourceV = await prisma.vertex.findMany({
            where : {
                id : {
                    in : params.VIDs
                }
            }
        });
        const sourceVIDs = _.map(sourceV,"id");
        let sourceE = await prisma.edge.findMany({
            where : {
                id : {
                    in : params.EIDs
                }
            }
        });
        //add metalinks to edges set
        const metaE = await prisma.edge.findMany({
            where : {
                inMeta : true,
                startID : {
                    in : sourceVIDs,
                },
                endID : {
                    in : sourceVIDs,
                }
            }
        });
        sourceE =  _.concat(sourceE,metaE);
        const sourceEIDs = _.map(sourceE,"id");
        const docsSelParams = {
            where : {
                OR: [{
                    edges: {
                        some: {
                            id: {
                                in: sourceEIDs,
                            }
                        }
                    }
                },
                {
                    vertices: {
                        some: {
                            id: {
                                in: sourceVIDs,
                            }
                        }
                    }
                }],
            },
            include : {
                edges : {
                    select : {
                        id : true,
                    },
                    where : {
                        id : {
                            in : sourceEIDs
                        }
                    } 
                },
                vertices : {
                    select : {
                        id : true,
                    },
                    where : {
                        id : {
                            in : sourceVIDs
                        }
                    } 
                }
            }
        }
        const sourceF = await prisma.file.findMany(docsSelParams);
        const sourceD = await prisma.directory.findMany(docsSelParams);

        const VIDsMap = new Map<string,string>();
        _.forEach(sourceV,(sV) => {
            VIDsMap.set(sV.id,cuid());
        });
        const cloneV = _.map(sourceV,(sV) => {
            const cVPromise = prisma.vertex.create({
                data : {
                    name : sV.name+suffix,
                    meta : sV.meta,
                    id : VIDsMap.get(sV.id),
                    workspaceID : params.wpID
                }
            });
            // VIDsMap.set(sV.id,cV.id);
            return cVPromise;
        });
        //await prisma.$transaction([...cloneV]);

        const EIDsMap = new Map<string,string>();
        _.forEach(sourceE,(sE) => {
            EIDsMap.set(sE.id,cuid());
        });
        const cloneE = _.map(sourceE,(sE) => {
            const cEPromise = prisma.edge.create({
                data : {
                    name : sE.name+suffix,
                    inMeta : sE.inMeta,
                    startID : VIDsMap.get(sE.startID)!,
                    endID : VIDsMap.get(sE.endID)!,
                    id : EIDsMap.get(sE.id)!,
                    workspaceID : params.wpID
                }
            });
            //cEPromise.then((cE)=>EIDsMap.set(sE.id,cE.id));
            return cEPromise;
        });
        //await prisma.$transaction([...cloneE]);

        const cloneF = _.map(sourceF,(sF) => {
            const connVParams = {
                connect : _.forEach(sF.vertices,(sFV)=>sFV.id = VIDsMap.get(sFV.id)!),
            }
            const connEParams = {
                connect : _.forEach(sF.edges,(sFE)=>sFE.id = EIDsMap.get(sFE.id)!),
            }
            const cFPromise = prisma.file.upsert({
                create : {
                    name : sF.name+suffix,
                    fullPath : sF.fullPath,
                    valid : false,
                    vertices : connVParams,
                    edges : connEParams
                },
                update : {
                    vertices : connVParams,
                    edges : connEParams
                },
                where : {
                    autoindex_File_1 : {
                        name : sF.name+suffix,
                        fullPath : sF.fullPath,
                    }
                },
            });
            return cFPromise;
        });

        const cloneD = _.map(sourceD,(sD) => {
            const connVParams = {
                connect : _.forEach(sD.vertices,(sDV)=>sDV.id = VIDsMap.get(sDV.id)!),
            }
            const connEParams = {
                connect : _.forEach(sD.edges,(sDE)=>sDE.id = EIDsMap.get(sDE.id)!),
            }
            const cDPromise = prisma.directory.upsert({
                where : {
                    autoindex_Directory_1 : {
                        name : sD.name+suffix,
                        fullPath : sD.fullPath,
                    }
                },
                create : {
                    name : sD.name+suffix,
                    fullPath : sD.fullPath,
                    valid : false,
                    vertices : connVParams,
                    edges : connEParams
                },
                update : {
                    vertices : connVParams,
                    edges : connEParams
                }
            });
            return cDPromise;
        });

        await prisma.$transaction([...cloneV,...cloneE,...cloneF,...cloneD]);
        const eleIDs = {VIDs : VIDsMap,EIDs : EIDsMap};
        return eleIDs;
    }
    
    public async findElementsDocuments(params: {searchV: {id : string, name : string, childIDs : string[]}[], searchE : string[]} ){
        const includeArgs = {
            files : true,
            directories : true,
        }

        let elesDocs : ElementDocuments[] = [];

        if (!_.isEmpty(params.searchV)){
            let vFilesDirs = await Promise.all(_.map(params.searchV,async (vs) => {
                const findVArgs = {
                    where : {
                        id : {
                            in : _.concat(vs.childIDs,vs.id)
                        }
                    },
                    include : includeArgs
                };
                return await prisma.vertex.findMany(findVArgs);
            }));
            if (!_.isEmpty(vFilesDirs)){
                elesDocs = _.map(vFilesDirs,(vfds,index)=> {
                    let dirs = _.uniqBy(_.flatten(_.map(vfds,"directories")),"id");
                    let docs =  _.map(dirs,(dir)=>{
                        const doc : Document = _.assign(dir,{type : "Directory"} as DocumentType);
                        return doc;
                    });
                    let files = _.uniqBy(_.flatten(_.map(vfds,"files")),"id");
                    docs =  _.concat(docs,_.map(files,(file)=>{
                        const doc : Document = _.assign(file,{type : "File"} as DocumentType);
                        return doc;
                    }));
                    const elemDocs : ElementDocuments = {type : "Vertex", id : params.searchV[index].id, name : params.searchV[index].name, documents: docs}
                    return elemDocs;
                });
            }
        }
        
        if (!_.isEmpty(params.searchE)){
            const findEArgs = {
                where : {
                    id : {in : params.searchE}
                },
                include : includeArgs
            };
            let eFilesDirs = await prisma.edge.findMany(findEArgs);
            if (!_.isEmpty(eFilesDirs)){
                elesDocs =_.concat(elesDocs,_.map(eFilesDirs,(eDoc)=>{
                    let docs : Document[] = [];
                    docs = _.map(eDoc.directories,(dir)=> {
                        return _.assign(dir,{type : "Directory"} as DocumentType);
                    });
                    docs = _.concat(docs,_.map(eDoc.files,(file)=> {
                        return _.assign(file,{type : "File"} as DocumentType);
                    }));
                    const elemDocs : ElementDocuments = {type : "Edge", id : eDoc.id, name : eDoc.name, documents: docs}
                    return elemDocs;
                }));
            }
        }
        return elesDocs;
    }
    
    public async findDocumentsElements(params: {searchName: string, wpID : string}){
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
        let findArgs = {
            where : {
                OR : [{
                    vertices : {
                    some : {
                        workspaceID : params.wpID
                    }
                }
            },
                {
                    edges : {
                    some : {
                        workspaceID : params.wpID,
                        inMeta : false
                    }
                }
            }]
            },
            include : {
                vertices : {
                    where : {
                        workspaceID : params.wpID
                    }
                },
                edges : {
                    where : {
                        inMeta : false,
                        workspaceID : params.wpID
                    }    
                }
            }
        };
        if (!_.isNil(nameArgs.OR)){
            findArgs = _.merge(findArgs,{where : nameArgs});
        }
        let dirs = await prisma.directory.findMany(findArgs);
        let files = await prisma.file.findMany(findArgs);
        let docEles : DocumentElements[] = _.map(dirs,(dir)=> {
            const doc : Document = _.assign(dir,{type : "Directory"} as DocumentType);
            /*let eles : Element[] = _.map(dir.vertices,(v)=> {
                return _.assign(v,{type : "Vertex"} as ElementType);
            });
            eles = _.concat(eles,_.map(dir.edges,(e)=> {
                return _.assign(e,{type : "Edge"} as ElementType);
            }));*/
            return {doc : doc, edges : dir.edges, vertices : dir.vertices};
        });

        docEles = _.concat(docEles,_.map(files,(file)=> {
            const doc : Document = _.assign(file,{type : "File"} as DocumentType);
            return {doc : doc, edges : file.edges, vertices : file.vertices};
        }));
        return docEles;
    }


    public async getElementDocuments(params: {ele : Extract<Prisma.ModelName,"Edge"|"Vertex">, id : string}) {
        let eleDocs = null;
        if (params.ele === Prisma.ModelName.Edge){
            eleDocs = await prisma.edge.findUnique({
                where : {
                    id : params.id,
                },
                select : {
                    name : true,
                    files : true,
                    directories : true
                }
            });
        }
        else if (params.ele === Prisma.ModelName.Vertex){
            eleDocs = await prisma.vertex.findUnique({
                where : {
                    id : params.id,
                },
                select : {
                    name : true,
                    files : true,
                    directories : true
                }
            });
        }
        let docs : Document[] = [];
        docs = _.map(eleDocs?.directories,(dir)=> {
            return _.assign(dir,{type : "Directory"} as DocumentType);
        });
        docs = _.concat(docs,_.map(eleDocs?.files,(file)=> {
            return _.assign(file,{type : "File"} as DocumentType);
        }));
        
        const elemDocs : ElementDocuments = {type : params.ele, id : params.id, name : eleDocs!.name, documents: docs}
        return  elemDocs;
    }

    public async getWorkspace(params : {wpID ?: string}){
        const wp = !_.isNil(params.wpID) 
                        ? await prisma.workspace.findUnique({where : {id : params.wpID}})
                        : await prisma.workspace.findFirst();
        return wp;
    }

    public async getWorkspaces(params ?: any){
        const wp = await prisma.workspace.findMany({orderBy : {createdAt : "desc"}});
        return wp;
    }

    public async deleteWorkspace(params : {wpID : string}){
        const wp = await prisma.workspace.findUnique({
            where : {
                id : params.wpID
            },
            include : {
                edges : {
                    select : {
                        id : true
                    }
                },
                vertices : {
                    select : {
                        id : true
                    }
                }
            }
        })
        const delV = await VertexApi_.prototype["deleteVertex"]({verticesID : _.map(wp!.vertices,"id")});
        const delE = await VertexApi_.prototype["deleteEdge"]({edgesID : _.map(wp!.edges,"id")});
        const delWp = await prisma.workspace.delete({where : {id : wp!.id}});
        return delWp;
    }

    public async updateWorkspace(params : {wpID : string, newName : string, newMode : boolean}){
        const wp = await prisma.workspace.update({
            where : {
                id : params.wpID
            },
            data : {
                name : params.newName,
                isTreeMode : params.newMode
            }
        });
        return wp;
    }

    public async createWorkspace(params : {name : string}){
        const wp = await prisma.workspace.create({
            data : {
                name : params.name
            }
        });
        return wp;
    }

    //unused method for type resolving in channels
    public noArgs(params?: any){
        return new Promise(params);
    }

}

