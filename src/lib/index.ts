import {Model} from "pubsub-to-stream-api";

export * from "./ipc-main-api-service";
export * from "./webview-api-service";

export type ApiMethod<I, O> = Model.Action<I, O>;
