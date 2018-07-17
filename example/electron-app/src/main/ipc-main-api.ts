import ping from "ping";
import {app} from "electron";
import {map, switchMap, take} from "rxjs/operators";
import {EMPTY, from, interval} from "rxjs";

import {AnyType} from "src/shared/model";
import {IPC_MAIN_API_SERVICE, IpcMainApi} from "src/shared/ipc-main-api-definition";

export function register(): IpcMainApi {
    const api: IpcMainApi = {
        ping: ({domain, times}) => interval(1000).pipe(
            take(times),
            switchMap(() => from(ping.promise.probe(domain))),
            map(({alive, avg}: AnyType) => {
                if (!alive) {
                    throw new Error(`Host "${domain}" is unreachable`);
                }
                return {domain, value: Number(avg)};
            }),
        ),
        quitApp: () => {
            app.quit();
            return EMPTY;
        },
    };

    IPC_MAIN_API_SERVICE.registerApi(api);

    return api;
}
