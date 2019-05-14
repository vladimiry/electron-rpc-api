import {Observable} from "rxjs";

// tslint:disable-next-line:no-any
export type Any = any;

export type Arguments<F extends (...x: Any[]) => Any> =
    F extends (...args: infer A) => Any ? A : never;

export type Unpacked<T> =
    T extends Promise<infer U2> ? U2 :
        T extends Observable<infer U3> ? U3 :
            T;

export const MODULE_NAME_PREFIX = "[electron-rpc-api]";

export const ONE_SECOND_MS = 1000;
