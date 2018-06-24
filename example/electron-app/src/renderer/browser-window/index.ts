import xss from "xss";
import "./index.scss";

import {IPC_MAIN_API_SERVICE} from "@src/shared/ipc-main-api-definition";

const ipcMainApiClient = IPC_MAIN_API_SERVICE.buildClient(/*{ipcRenderer: customIpcRenderer, options: {timeoutMs: 1500}}*/);
const ipcMainPingMethod = ipcMainApiClient("ping"); // type-safe API method resolving

const input = document.querySelector("[name=domain]") as HTMLInputElement;
const times = document.querySelector("[name=times]") as HTMLInputElement;
const form = document.querySelector("form") as HTMLFormElement;

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    ipcMainPingMethod({domain: input.value, times: Number(times.value)}).subscribe( // type-safe API method calling
        ({domain, value}) => append(`<span class="badge badge-light">${domain}</span> <small>${value}</small>`),
        ({message}) => append(`<span class="badge badge-danger">${message}</span>`), // error handling
    );
});

function append(html: string) {
    document.body
        .appendChild(document.createElement("div"))
        .innerHTML = xss(html, {whiteList: {span: ["class"], small: []}});
}
