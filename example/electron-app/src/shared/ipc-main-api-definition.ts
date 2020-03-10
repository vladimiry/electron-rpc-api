// no need to put API implementation logic here
// but only API definition and service instance creating
// as this file is supposed to be shared between the provider and client implementations
import {ActionType, ScanService, createIpcMainApiService} from "electron-rpc-api";

const apiDefinition = {
    ping: ActionType.SubscribableLike<{ domain: string, times: number }, { domain: string, value: number }>(),
    sanitizeHtml: ActionType.Promise<string, string>(),
    quitApp: ActionType.Promise(),
};

export const IPC_MAIN_API_SERVICE = createIpcMainApiService({
    channel: "some-event-name", // event name used to communicate between the event emitters
    apiDefinition,
});

// optionally exposing inferred API structure
export type ScannedIpcMainApiService = ScanService<typeof IPC_MAIN_API_SERVICE>;
