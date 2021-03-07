export interface RemoteApi{
    method : string,
    params? : any
}

/*export interface RemoteApiReturn{
    returns : any
}*/


export type ClassMethods<C> = keyof C;
export type MethodArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;
