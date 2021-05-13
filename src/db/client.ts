import { PrismaClient } from "@prisma/client"
import { app } from "electron";
import { constants as fsContants} from 'fs';
import path from "path";
import fs from "fs";

function createUrlPrisma(path : string){
    const url = "file:"+path;
    const prisma = new PrismaClient({
        datasources: {
          db: {
            url: url
          },
        },
      })
    return prisma;
}

function createPrisma(){
    if (!app){
        return undefined; //renderer process chain
    }
    let prisma : PrismaClient;
    if (app.isPackaged){
        const envDbPath = path.join(app.getAppPath(),process.env.DATABASE_FOLDER_PATH!);
        const appDataDbPath = path.join(app.getPath("userData"),path.basename(envDbPath));
        try {
            fs.accessSync(appDataDbPath, fsContants.F_OK);
        }
        catch (err){
            fs.copyFileSync(envDbPath,appDataDbPath);
        }
        finally {
            prisma = createUrlPrisma(appDataDbPath);
        }
    }
    else {
        prisma = new PrismaClient(); 
    }
    return prisma;
}

const prisma : PrismaClient = createPrisma()!;
export default prisma