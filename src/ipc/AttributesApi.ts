import { PrismaClient, Prisma, Directory} from '@prisma/client'
import { ClassMethods, MethodArgumentTypes, RemoteApi } from './RemoteApi';
import * as _ from "lodash";


export interface AttributeApi<T extends ClassMethods<AttributeApi_>> extends RemoteApi{
    method : T,
    params : MethodArgumentTypes<typeof AttributeApi_.prototype[T]>,
};
export type AttributeApiReturn<T extends keyof AttributeApi_> = Prisma.PromiseReturnType<typeof AttributeApi_.prototype[T]>
//export type VertexApiGenericReturn<T extends keyof VertexApi_> = ReturnType<typeof VertexApi_.prototype[T]>


const prisma = new PrismaClient();


export type ElementDocuments = Prisma.VertexGetPayload<{
    select: { name: true}
  }> & {documents : Document[]}

export type Document = Directory & DocumentType
export type DocumentType = {type : Extract<Prisma.ModelName,"Directory"|"File">}

export class AttributeApi_ {
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
        
        const elemDocs : ElementDocuments = {name : eleDocs!.name, documents: docs}
        return  elemDocs;
    }

    //unused method for type resolving in channels
    public noArgs(params?: any){
        return new Promise(params);
    }

}

