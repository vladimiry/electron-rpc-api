import {subscribableLikeToObservable} from "electron-rpc-api";

import "./index.scss";

// the below code block is recommended for adding if you create/destroy
// the renderer processes dynamically (multiple times)
const cleanupPromise = new Promise<void>((resolve) => {
    // don't call ".destroy()" on the BrowserWindow instance in the main process but ".close()"
    // since the app needs "window.beforeunload" event handler to be triggered
    window.addEventListener("beforeunload", () => resolve);
});

const ipcMainApiClient = __ELECTRON_EXPOSURE__.buildIpcMainClient({
    // the below code line is recommended for adding if you create/destroy
    // the renderer processes dynamically (multiple times)
    options: {finishPromise: cleanupPromise},
});

// resolved methods
const ipcMainPingMethod = ipcMainApiClient("ping"); // type-safe API method resolving
const ipcMainSanitizeHtmlMethod = ipcMainApiClient("sanitizeHtml"); // type-safe API method resolving

window.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("form") as HTMLFormElement;
    const fieldset = form.querySelector("fieldset") as HTMLFieldSetElement;
    const input = form.querySelector("[name=domain]") as HTMLInputElement;
    const times = form.querySelector("[name=times]") as HTMLInputElement;
    const quitBtn = form.querySelector(`[type="button"]`) as HTMLFormElement;
    const disableForm = (disable: boolean): void => {
        fieldset[disable ? "setAttribute" : "removeAttribute"]("disabled", "disabled");
    };

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        disableForm(true);

        // type-safe API method calling
        subscribableLikeToObservable(
            ipcMainPingMethod({domain: input.value, times: Number(times.value)})
        ).subscribe(
            async ({domain, value}) => {
                await append(`<span class="badge badge-light">${domain}</span> <small>${value}</small>`);
            },
            // "error" handler
            async ({message}) => {
                disableForm(false);
                await append(`<span class="badge badge-danger">${String(message)}</span>`);
            },
            // "complete" handler
            () => {
                disableForm(false);
            },
        );
    });

    quitBtn.addEventListener("click", async () => {
        await ipcMainApiClient("quitApp")();
    });
});

async function append(html: string): Promise<void> {
    document.body
        .appendChild(document.createElement("div"))
        .innerHTML = await ipcMainSanitizeHtmlMethod(html);
}
