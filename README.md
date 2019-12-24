# electron-rpc-api

[![Build Status](https://travis-ci.org/vladimiry/electron-rpc-api.svg?branch=master)](https://travis-ci.org/vladimiry/electron-rpc-api)

Is a wrapper around the Electron's IPC for building type-safe API based RPC-like and reactive interactions.

You describe an API structure and communication channel only once creating an API Service instance and then you share that instance between provider and client. It means that API method names and types of the input/return parameters on the client side are the same as on the provider side, so you get a type-safety on both sides having no overhead in runtime, thanks to TypeScript.

The module provides `createIpcMainApiService` and `createWebViewApiService` factory-like functions that can be used to create respective service instances.

## Getting started

Your project needs `rxjs` module to be installed, which is a peer dependency of this project.

`IpcMainApiService` usage example is shown below. It's based on the [example app](example/electron-app), so you can jump there and run the app.

- First of all an API structure needs to be defined ([example/electron-app/src/shared/ipc-main-api-definition.ts](example/electron-app/src/shared/ipc-main-api-definition.ts)):
    ```typescript
    // no need to put API implementation logic here
    // but only API definition and service instance creating
    // as this file is supposed to be shared between the provider and client implementations
    import {ActionType, ScanService, createIpcMainApiService} from "electron-rpc-api";
    
    const apiDefinition = {
        ping: ActionType.Observable<{ domain: string, times: number }, { domain: string, value: number }>(),
        quitApp: ActionType.Promise(),
    };
    
    export const IPC_MAIN_API_SERVICE = createIpcMainApiService({
        channel: "some-event-name", // event name used to communicate between the event emitters
        apiDefinition,
    });
    
    // optionally exposing inferred API structure
    export type ScannedIpcMainApiService = ScanService<typeof IPC_MAIN_API_SERVICE>;
    ```

- API methods implementation and registration in `main` process using previously created `IPC_MAIN_API_SERVICE` service instance ([example/electron-app/src/main/ipc-main-api.ts](example/electron-app/src/main/ipc-main-api.ts)):
    ```typescript
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
            async quitApp() {
                app.quit();
            },
        };
    
        IPC_MAIN_API_SERVICE.register(api);
    
        return api;
    }
    ```

- And finally calling the API methods in `renderer` process using the same service instance ([example/electron-app/src/renderer/browser-window-preload/index.ts](example/electron-app/src/renderer/browser-window-preload/index.ts)):
    ```typescript
    import {Subscription} from "rxjs";
    
    import {IPC_MAIN_API_SERVICE} from "src/shared/ipc-main-api-definition";
    
    const subscription = new Subscription();
    const cleanupPromise = new Promise<void>((resolve) => {
        // WARN: don"t call ".destroy()" on BrowserWindow in main process but ".close()"
        // since app needs "window.onbeforeunload" to be triggered
        window.onbeforeunload = () => {
            resolve();
            subscription.unsubscribe();
        };
    });
    
    const ipcMainApiClient = IPC_MAIN_API_SERVICE.client({
        options: {finishPromise: cleanupPromise, timeoutMs: 1000 * 3 /* 3 seconds */},
    });
    const ipcMainPingMethod = ipcMainApiClient("ping"); // type-safe API method resolving
    const sanitizeHtmlMethod = ipcMainApiClient("sanitizeHtml"); // type-safe API method resolving
    
    window.addEventListener("DOMContentLoaded", () => {
        const input = document.querySelector("[name=domain]") as HTMLInputElement;
        const times = document.querySelector("[name=times]") as HTMLInputElement;
        const form = document.querySelector("form") as HTMLFormElement;
    
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
    
            subscription.add(
                ipcMainPingMethod({domain: input.value, times: Number(times.value)}).subscribe( // type-safe API method calling
                    async ({domain, value}) => await append(`<span class="badge badge-light">${domain}</span> <small>${value}</small>`),
                    async ({message}) => await append(`<span class="badge badge-danger">${message}</span>`), // error handling
                ),
            );
        });
    });
    
    async function append(html: string) {
        document.body
            .appendChild(document.createElement("div"))
            .innerHTML = await sanitizeHtmlMethod(html);
    }
    ```

Method resolving and method calling are type-safe actions here:

![type-safety](README-img1.gif)
