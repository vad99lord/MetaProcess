import { PrismaClient, Prisma, File, Directory, Edge, Vertex } from '@prisma/client'
import { ClassMethods, MethodArgumentTypes, RemoteApi } from './RemoteApi';
import {DocumentType,Document} from './AttributesApi';
import * as _ from "lodash";
import {shell} from 'electron';
import { dialog } from 'electron';
import path from 'path';

export interface FileApi<T extends ClassMethods<FileApi_>> extends RemoteApi{
    method : T,
    params : MethodArgumentTypes<typeof FileApi_.prototype[T]>,
};
export type FileApiReturn<T extends keyof FileApi_> = Prisma.PromiseReturnType<typeof FileApi_.prototype[T]>

export type Element = Prisma.VertexGetPayload<{
    select: { id: true }
  }> & {type : Extract<Prisma.ModelName,"Vertex"|"Edge">}

const prisma = new PrismaClient();

export class FileApi_ {
    public async openFile(params: {fullPath: string}) {
        const err =  await shell.openPath(params.fullPath);
        return err;
    }

    public async openFileDialog(params: {type: "openFile"|"openDirectory"}){
        let openDialogReturn = await dialog.showOpenDialog({
            title : "Choose item to tag:",
            properties: [params.type],
            filters: [
                { name: 'All Files', extensions: ['*'] }
            ]
        })
        return openDialogReturn;
    }


    public async disconnectDocument(params : {ele : Element,
        docType : DocumentType['type'],
        docID : number,
    }){
        let docParams = {
            where : {
                id : params.docID,
            },
            include : {
                vertices : true,
                edges : true,
            }
        }
        let docTags: (Directory & { vertices: Vertex[]; edges: Edge[]; }) | null = null;
        if (params.docType === "Directory"){
            docTags = await prisma.directory.findUnique(docParams);
        }    
        else if (params.docType === "File"){
            docTags = await prisma.file.findUnique(docParams);
        }
        let doc : Directory | File | null = null;
        if (!_.isNil(docTags)){
            if (_.size(docTags!.vertices)+_.size(docTags!.edges) === 1){
                //delete document, only one current element is connected with it
                let deleteArgs = {where : {id : params.docID}};
                if (params.docType === "Directory"){
                    doc = await prisma.directory.delete(deleteArgs);
                }    
                else if (params.docType === "File"){
                    doc = await prisma.file.delete(deleteArgs);
                }
                return doc;
            }
        }

        let disconnData = {id : params.ele.id}
        let disconnParams = {
            where : {
                id : docTags!.id
            },
            data : {}};
        if (params.ele.type === "Edge"){
            disconnParams.data = {
                edges : {
                    disconnect : disconnData
                }
            }
        }    
        else if (params.ele.type === "Vertex"){
            disconnParams.data = {
                vertices : {
                    disconnect : disconnData
                }
            }
        }

        if (params.docType === "Directory"){
            doc = await prisma.directory.update(disconnParams);
        }    
        else if (params.docType === "File"){
            doc = await prisma.file.update(disconnParams);
        }
        return doc;
    }

    //TODO: add check if already in db connect to the file
    public async connectDocument(params : {
        type : DocumentType['type'],
        fullPath: string, 
        vertexID?: string[], 
        edgeID?: string[]
    }){
        const name = path.basename(params.fullPath);
        const dirPath = path.dirname(params.fullPath);
        const docData = {
                name : name,
                fullPath : dirPath,
            }  
        let fileParams : Prisma.FileUpsertArgs = {create : _.clone(docData),
            update : {},
            where : {}
        } 
        if (!_.isNil(params.vertexID)){
            let connData = {connect : _.map(params.vertexID, (id)=>{return {id : id}})};
            fileParams.update.vertices = connData;
            fileParams.create.vertices = connData;
        }
        if (!_.isNil(params.edgeID)){
            let connData = {connect :  _.map(params.edgeID, (id)=>{return {id : id}})};
            fileParams.update.edges = connData;
            fileParams.create.edges = connData; 
        }
        let doc : Document | null = null;
        if (params.type === "File"){
            fileParams.where.autoindex_File_1 = _.clone(docData);
            const file = await prisma.file.upsert(fileParams);
            let docType : DocumentType = {type : "File"}
            doc = _.assign(file,docType);
        }
        if (params.type === "Directory"){
            let docParams = fileParams as Prisma.DirectoryUpsertArgs;
            docParams.where.autoindex_Directory_1 = _.clone(docData);
            const dir = await prisma.directory.upsert(docParams);
            let docType : DocumentType = {type : "Directory"};
            doc = _.assign(dir,docType);
        }
        return doc;
    }

    //unused method for type resolving in channels
    public noArgs(params?: any){
        return new Promise(params);
    }

}