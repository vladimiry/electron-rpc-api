import * as Lib from "pubsub-to-rpc-api";
import {Observable} from "rxjs";

// tslint:disable-next-line:no-any
export type Any = any;

export type Arguments<F extends (...x: Any[]) => Any> =
    F extends (...args: infer A) => Any ? A : never;

export type Unpacked<T> =
    T extends Promise<infer U2> ? U2 :
        T extends Observable<infer U3> ? U3 :
            T;

export const MODULE_NAME = "electron-rpc-api";

export const ONE_SECOND_MS = 1000;

export const EMPTY_FN: Lib.Model.LoggerFn = () => {}; // tslint:disable-line:no-empty

export const LOG_STUB: Readonly<Lib.Model.Logger> = {
    error: EMPTY_FN,
    warn: EMPTY_FN,
    info: EMPTY_FN,
    verbose: EMPTY_FN,
    debug: EMPTY_FN,
};
