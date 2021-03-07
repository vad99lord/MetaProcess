import { PrismaClient, Prisma } from '@prisma/client'
import { ClassMethods, MethodArgumentTypes, RemoteApi } from './RemoteApi';
import {EdgeDefinition, ElementDefinition, NodeDefinition} from 'cytoscape';

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


}






/*
type OnlyClassMethods<T> = {
    [K in keyof T]: [K] extends (...args: any[]) => any ? [K] : never
}[keyof T]

let sdf : keyof User = 'getUsers';
const a : User = new User();
User.prototype[sdf]("fds", 3);
callMethod('foo') // error
callMethod('member1')// error

let dfsdf = User.prototype.getUserEmail.name;
const testUserObj = {
    static async getUserEmail(param: string) {
        const users = await prisma.user.findMany({ select: { email: true } });
        return users;
    }
}

namespace custom {
    export async function getUserEmail(param: string) {
        const users = await prisma.user.findMany({ select: { email: true } });
        return users;
    }
}

type R = keyof typeof custom;

type TestArguments = ArgumentTypes<typeof getUserEmail>

type FunctionArgs<F extends (...args: any) => Promise<any>> =
    {
        f: Function,
        args: ArgumentTypes<F>,
        returns: Prisma.PromiseReturnType<F>
    }

type UserApiKeys = keyof User;
type UserApiFuncs = typeof User.prototype.getUserEmail | typeof User.prototype.getUserEmail;
type api = { k: UserApiKeys, f: FunctionArgs<UserApiFuncs> }


const userAPI : api = {
    k : 'getUsers', f : {f : User.prototype.getUserEmail, args : ['sdf'], returns : [{email : 'email'}]}
}

let f = userAPI.f.returns;


/*export type RemoteApi<F extends Function> = { [K: string]: FunctionArgs<F> }[];



let u: User = new User();
u['']
for (let f in u) {
    let g = u[f];
}

const UserAPI: RemoteApi = {
    "test": { F: User.prototype.getUserEmail, args }
}


export type sdf = Keys<typeof UserApi>;

type pick = { keys: Array<keyof typeof UserApi> }
*/
