import sanitizeHtml from "sanitize-html";
import {Subscription} from "rxjs";

import "./index.scss";
import {IPC_MAIN_API_SERVICE} from "src/shared/ipc-main-api-definition";

const subscription = new Subscription();
const cleanupPromise = new Promise<void>((resolve) => {
    // WARN: don"t call ".destroy()" on BrowserWindow in main process but ".close()"
    // since app needs "window.onbeforeunload" to be triggered, see cleanup logic in preload script
    window.onbeforeunload = () => {
        resolve();
        subscription.unsubscribe();
    };
});

const ipcMainApiClient = IPC_MAIN_API_SERVICE.client({
    options: {finishPromise: cleanupPromise, timeoutMs: 1000 * 3 /* 3 seconds */},
});
const ipcMainPingMethod = ipcMainApiClient("ping"); // type-safe API method resolving

const input = document.querySelector("[name=domain]") as HTMLInputElement;
const times = document.querySelector("[name=times]") as HTMLInputElement;
const form = document.querySelector("form") as HTMLFormElement;

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    subscription.add(
        ipcMainPingMethod({domain: input.value, times: Number(times.value)}).subscribe( // type-safe API method calling
            ({domain, value}) => append(`<span class="badge badge-light">${domain}</span> <small>${value}</small>`),
            ({message}) => append(`<span class="badge badge-danger">${message}</span>`), // error handling
        ),
    );
});

function append(html: string) {
    document.body
        .appendChild(document.createElement("div"))
        .innerHTML = sanitizeHtml(
        html,
        {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat(["span"]),
            allowedClasses: {
                span: ["badge", "badge-light", "badge-danger"],
            },
        },
    );
}
