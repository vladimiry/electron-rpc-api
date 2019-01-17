import ping from "ping";
import {app} from "electron";
import {from, interval, of} from "rxjs";
import {map, switchMap, take} from "rxjs/operators";

import {IPC_MAIN_API_SERVICE, IpcMainApi} from "src/shared/ipc-main-api-definition";
import {TODO} from "src/shared/model";

export function register(): IpcMainApi {
    const api: IpcMainApi = {
        ping: ({domain, times}) => interval(1000).pipe(
            take(times),
            switchMap(() => from(ping.promise.probe(domain))),
            map(({alive, avg}: TODO) => {
                if (!alive) {
                    throw new Error(`Host "${domain}" is unreachable`);
                }
                return {domain, value: Number(avg)};
            }),
        ),
        quitApp: () => {
            app.quit();
            return of(null);
        },
    };

    IPC_MAIN_API_SERVICE.registerApi(api);

    return api;
}
