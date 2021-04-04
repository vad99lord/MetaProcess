import { PrismaClient, Prisma, File, Directory, Edge, Vertex } from '@prisma/client'
import { ClassMethods, MethodArgumentTypes, RemoteApi } from './RemoteApi';
import {DocumentType,Document} from './AttributesApi';
import * as _ from "lodash";
import {shell} from 'electron';
import { dialog } from 'electron';
import path from 'path';
import { constants as fsContants,PathLike,promises as fsPromises} from 'fs';

export interface FileApi<T extends ClassMethods<FileApi_>> extends RemoteApi{
    method : T,
    params : MethodArgumentTypes<typeof FileApi_.prototype[T]>,
};
export type FileApiReturn<T extends keyof FileApi_> = Prisma.PromiseReturnType<typeof FileApi_.prototype[T]>

export type Element = Prisma.VertexGetPayload<{
    select: { id: true }
  }> & ElementType
export type ElementType = {type : Extract<Prisma.ModelName,"Vertex"|"Edge">}
export type ElementName = Prisma.VertexGetPayload<{
    select: { name: true }
  }> & ElementType

const prisma = new PrismaClient();



export class FileApi_ {

    
    
    private async updateValid(doc : Document, valid : boolean){
        const updValid = {data : {valid : valid}, where : {id : doc.id}};
        let updDoc : Document | null = null;
            if (doc.type === "Directory"){
                const dir = await prisma.directory.update(updValid);
                let docType : DocumentType = {type : "Directory"};
                updDoc = _.assign(dir,docType);
            }    
            else if (doc.type === "File"){
                const dir = await prisma.file.update(updValid);
                let docType : DocumentType = {type : "File"};
                updDoc = _.assign(dir,docType);
            }
        return updDoc;
    }

    
    //implement case when doc to update is already found, reconnect with existing doc
    //and delete this one if it is connected to one elem only
    public async updateDoc(params: {doc : Document, newPath : string, valid? : boolean}){
        const name = path.basename(params.newPath);
        const dirPath = path.dirname(params.newPath);
        let updData = {data : {name : name, fullPath : dirPath}, where : {id : params.doc.id}};
        if (!_.isNil(params.valid)){
            updData = _.merge(updData,{data : {valid : params.valid}});
        }
        let updDoc : Document;
        if (params.doc.type === "Directory"){
            const dirDup = await prisma.directory.findUnique({where : {
                autoindex_Directory_1 : {
                    name : name,
                    fullPath : dirPath
                }
            }})
            if (!_.isNil(dirDup))
                return null;
            const dir = await prisma.directory.update(updData);
            let docType : DocumentType = {type : "Directory"};
            updDoc = _.assign(dir,docType);
            }    
        else {
            const fileDup = await prisma.file.findUnique({where : {
                autoindex_File_1 : {
                    name : name,
                    fullPath : dirPath
                }
            }})
            if (!_.isNil(fileDup))
                return null;
            const file = await prisma.file.update(updData);
            let docType : DocumentType = {type : "File"};
            updDoc = _.assign(file,docType);
            }   
        return updDoc;   
    }

    
    public async openFile(params: {doc: Document}) {
        const docPath = path.join(params.doc.fullPath!,params.doc.name!);
        const err =  await shell.openPath(docPath);
        if (_.isEmpty(err) && !params.doc.valid){
            const updateValid = {data : {valid : true}, where : {id : params.doc.id}};
            if (params.doc.type === "Directory"){
                await prisma.directory.update(updateValid);
            }    
            else if (params.doc.type === "File"){
                await prisma.file.update(updateValid);
            }
        }
        if (!_.isEmpty(err)){
            const updateValid = {data : {valid : false}, where : {id : params.doc.id}};
            if (params.doc.type === "Directory"){
                await prisma.directory.update(updateValid);
            }    
            else if (params.doc.type === "File"){
                await prisma.file.update(updateValid);
            }
        }
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
    private async checkFileExists(file : PathLike) {
        return fsPromises.access(file, fsContants.F_OK)
                 .then(() => true)
                 .catch(() => false)
      }
    
    public async checkDocsExist(params : any){
        const dirs = await prisma.directory.findMany();
        const files = await prisma.file.findMany();

        await Promise.all(dirs.map(async (dir) => {
            const fullPath = dir.fullPath + "/" + dir.name;
            dir.valid = await this.checkFileExists(fullPath);
          }));
        const validDirs = await prisma.directory.updateMany({
            where : {
                id : {
                    in: _.map(_.filter(dirs, (dir) => dir.valid),"id")
                }
            },
            data : {
                valid : true,
            }
        });
        const invalidDirs = await prisma.directory.updateMany({
            where : {
                id : {
                    in: _.map(_.filter(dirs, (dir) => !dir.valid),"id")
                }
            },
            data : {
                valid : false,
            }
        });
        
        await Promise.all(files.map(async (file) => {
            const fullPath = file.fullPath + "/" + file.name;
            file.valid = await this.checkFileExists(fullPath);
          })); 
          const validFiles = await prisma.file.updateMany({
            where : {
                id : {
                    in: _.map(_.filter(files, (file) => file.valid),"id")
                }
            },
            data : {
                valid : true,
            }
        });
        const invalidFiles = await prisma.file.updateMany({
            where : {
                id : {
                    in: _.map(_.filter(files, (file) => !file.valid),"id")
                }
            },
            data : {
                valid : false,
            }
        });
    }

    //unused method for type resolving in channels
    public noArgs(params?: any){
        return new Promise(params);
    }

}