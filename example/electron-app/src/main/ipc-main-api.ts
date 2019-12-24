import sanitizeHtml from "sanitize-html";
import tcpPing from "tcp-ping";
import {app} from "electron";
import {interval} from "rxjs";
import {map, mergeMap, take} from "rxjs/operators";
import {promisify} from "util";

import {IPC_MAIN_API_SERVICE, ScannedIpcMainApiService} from "src/shared/ipc-main-api-definition";

export function register(): ScannedIpcMainApiService["ApiClient"] {
    const api: ScannedIpcMainApiService["ApiImpl"] = {
        ping: ({domain, times}) => interval(/*one second*/ 1000).pipe(
            take(times),
            mergeMap(() => promisify(tcpPing.ping)({address: domain, attempts: times})),
            map(({avg: value}) => {
                if (typeof value === "undefined" || isNaN(value)) {
                    throw new Error(`Host "${domain}" is unreachable`);
                }
                return {domain, value};
            }),
        ),
        async sanitizeHtml(input) {
            return sanitizeHtml(
                input,
                {
                    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["span"]),
                    allowedClasses: {
                        span: ["badge", "badge-light", "badge-danger"],
                    },
                },
            );
        },
        async quitApp() {
            app.quit();
        },
    };

    IPC_MAIN_API_SERVICE.register(api);

    return api;
}
