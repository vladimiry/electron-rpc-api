import * as Lib from "pubsub-to-rpc-api";
import {IpcMessageEvent, IpcRenderer, WebviewTag} from "electron";

import * as PM from "./private/model";
import {requireIpcRenderer} from "./private/electron-require";

type RegisterApiIpcRenderer = Pick<IpcRenderer, "on" | "removeListener" | "sendToHost">;

const ipcRendererEventEmittersCache = new WeakMap<RegisterApiIpcRenderer, Lib.Model.CombinedEventEmitter>();
const webViewTagEventEmittersCache = new WeakMap<WebviewTag, Lib.Model.CombinedEventEmitter>();

export const createWebViewApiService: <AD extends Lib.Model.ApiDefinition<AD>>(
    input: Lib.Model.CreateServiceInput<AD>,
) => {
    register: (
        actions: PM.Arguments<Lib.Model.CreateServiceReturn<AD>["register"]>[0],
        options?: {
            ipcRenderer?: RegisterApiIpcRenderer;
            logger?: Lib.Model.Logger;
        },
    ) => ReturnType<Lib.Model.CreateServiceReturn<AD>["register"]>;
    client: (
        webView: WebviewTag,
        arg?: { options?: Lib.Model.CallOptions },
    ) => ReturnType<Lib.Model.CreateServiceReturn<AD>["caller"]>;
} = (...createServiceArgs) => {
    const baseService: Readonly<ReturnType<typeof Lib.createService>> = Lib.createService(...createServiceArgs);

    return {
        register(actions, options) {
            const {
                ipcRenderer = requireIpcRenderer(),
                logger,
            } = options || {} as Exclude<typeof options, undefined>;
            const cachedEm: Lib.Model.CombinedEventEmitter = (
                ipcRendererEventEmittersCache.get(ipcRenderer)
                ||
                (() => {
                    const em: typeof cachedEm = {
                        on: ipcRenderer.on.bind(ipcRenderer),
                        removeListener: ipcRenderer.removeListener.bind(ipcRenderer),
                        emit: ipcRenderer.sendToHost.bind(ipcRenderer),
                    };

                    ipcRendererEventEmittersCache.set(ipcRenderer, em);

                    return em;
                })()
            );
            const onEventResolver: Lib.Model.ProviderOnEventResolver = (...[/* event */, payload]) => {
                return {
                    payload,
                    emitter: cachedEm,
                };
            };

            return baseService.register(
                actions,
                cachedEm,
                {
                    logger,
                    onEventResolver,
                },
            );
        },
        client(webView, arg) {
            const {options} = arg || {} as Exclude<typeof arg, undefined>;
            const cachedEm: Lib.Model.CombinedEventEmitter = (
                webViewTagEventEmittersCache.get(webView)
                ||
                (() => {
                    const clientOnEventResolver: Lib.Model.ClientOnEventResolver<[IpcMessageEvent]> = ({args: [payload]}) => {
                        // first argument of the IpcMessageEvent.args is th needed payload
                        return {payload};
                    };
                    const ipcMessageEventName = "ipc-message";
                    const em: typeof cachedEm = {
                        on: (event, listener) => {
                            webView.addEventListener(ipcMessageEventName, (ipcMessageEvent) => {
                                if (ipcMessageEvent.channel !== event) {
                                    return;
                                }

                                const {payload} = clientOnEventResolver(ipcMessageEvent);

                                listener(payload);
                            });
                            return em;
                        },
                        removeListener: (...[/*event*/, listener]) => {
                            webView.removeEventListener(ipcMessageEventName, listener);
                            return em;
                        },
                        emit: webView.send.bind(webView),
                    };

                    webViewTagEventEmittersCache.set(webView, em);

                    return em;
                })()
            );

            return baseService.caller(
                {emitter: cachedEm, listener: cachedEm},
                options,
            );
        },
    };
};
