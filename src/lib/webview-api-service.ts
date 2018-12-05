import {IpcRenderer} from "electron";
import {Model, Service} from "pubsub-to-stream-api";

import {AnyType} from "./model";

export class WebViewApiService<Api extends Model.ActionsRecord<Extract<keyof Api, string>>> extends Service<Api> {
    public registerApi(
        actions: Api,
        {ipcRenderer: instance, logger}: {
            ipcRenderer?: Pick<IpcRenderer, "on" | "removeListener" | "sendToHost">;
            logger?: Model.Logger;
        } = {},
    ) {
        const ipcRenderer = instance || require("electron").ipcRenderer;
        const em: Model.CombinedEventEmitter = {
            on: (event, listener) => {
                ipcRenderer.on(event, (...args: AnyType[]) => listener(args[1]));
                return em;
            },
            off: ipcRenderer.removeListener.bind(ipcRenderer) as AnyType,
            emit: (event, ...args) => {
                ipcRenderer.sendToHost(event, ...args);
                return true;
            },
        };

        return this.register(actions, em, {logger});
    }

    public buildClient(webView: Electron.WebviewTag, {options}: { options?: Model.CallOptions } = {}) {
        const listenEvent = "ipc-message";
        const eventEmitter: Model.CombinedEventEmitter = {
            on: (event, listener) => {
                webView.addEventListener(listenEvent, ({channel, args}) => {
                    if (channel !== event) {
                        return;
                    }
                    listener(args[0]);
                });
                return eventEmitter;
            },
            off: (
                // @ts-ignore
                event,
                listener,
            ) => {
                webView.removeEventListener(listenEvent, listener);
                return eventEmitter;
            },
            emit: webView.send.bind(webView) as AnyType,
        };

        return this.caller({emitter: eventEmitter, listener: eventEmitter}, options);
    }
}
