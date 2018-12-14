import {IpcRenderer, WebviewTag} from "electron";
import {Model, Service} from "pubsub-to-stream-api";

import {AnyType} from "./model";

type RegisterApiIpcRenderer = Pick<IpcRenderer, "on" | "removeListener" | "sendToHost">;

const registerApiEventEmitters = new WeakMap<RegisterApiIpcRenderer, Model.CombinedEventEmitter>();
const buildClientEventEmitters = new WeakMap<WebviewTag, Model.CombinedEventEmitter>();

export class WebViewApiService<Api extends Model.ActionsRecord<Extract<keyof Api, string>>> extends Service<Api> {
    public registerApi(
        actions: Api,
        {
            ipcRenderer = require("electron").ipcRenderer,
            logger,
        }: {
            ipcRenderer?: RegisterApiIpcRenderer;
            logger?: Model.Logger;
        } = {},
    ) {
        let em = registerApiEventEmitters.get(ipcRenderer);

        if (!em) {
            const newEm: Model.CombinedEventEmitter = {
                on: (event, listener) => {
                    ipcRenderer.on(event, (...args: AnyType[]) => listener(args[1]));
                    return newEm;
                },
                off: ipcRenderer.removeListener.bind(ipcRenderer) as AnyType,
                emit: (event, ...args) => {
                    ipcRenderer.sendToHost(event, ...args);
                    return true;
                },
            };
            registerApiEventEmitters.set(ipcRenderer, newEm);
            em = newEm;
        }

        return this.register(actions, em, {logger});
    }

    public buildClient(webView: WebviewTag, {options}: { options?: Model.CallOptions } = {}) {
        let em = buildClientEventEmitters.get(webView);

        if (!em) {
            const listenEvent = "ipc-message";
            const newEm: Model.CombinedEventEmitter = {
                on: (event, listener) => {
                    webView.addEventListener(listenEvent, ({channel, args}) => {
                        if (channel !== event) {
                            return;
                        }
                        listener(args[0]);
                    });
                    return newEm;
                },
                off: (
                    // @ts-ignore
                    event,
                    listener,
                ) => {
                    webView.removeEventListener(listenEvent, listener);
                    return newEm;
                },
                emit: webView.send.bind(webView) as AnyType,
            };
            em = newEm;
        }

        return this.caller({emitter: em, listener: em}, options);
    }
}
