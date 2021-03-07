import { PrismaClient, Prisma } from '@prisma/client'
import { ClassMethods, MethodArgumentTypes, RemoteApi } from './RemoteApi';

export interface VertexApi<T extends ClassMethods<VertexApi_>> extends RemoteApi{
    method : T,
    params : MethodArgumentTypes<typeof VertexApi_.prototype[T]>,
};
export type VertexApiReturn<T extends keyof VertexApi_> = Prisma.PromiseReturnType<typeof VertexApi_.prototype[T]>
/*export interface UserApiReturn<T extends keyof User> extends RemoteApiReturn{
    returns : Prisma.PromiseReturnType<typeof User.prototype[T]>
}*/

const prisma = new PrismaClient();


export class VertexApi_ {
    public async getVertices(params?: any) {
        const users = await prisma.vertex.findMany();
        return users;
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
