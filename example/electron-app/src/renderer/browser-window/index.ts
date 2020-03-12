import {subscribableLikeToObservable} from "electron-rpc-api";

import "./index.scss";

// this "cleanup" code is recommended if you create/destroy
// the renderer processes dynamically multiple times
const cleanupPromise = new Promise<void>((resolve) => {
    // WARN: don"t call ".destroy()" on BrowserWindow in main process but ".close()"
    // since app needs "window.onbeforeunload" to be triggered
    window.onbeforeunload = () => resolve();
});

const ipcMainApiClient = __ELECTRON_EXPOSURE__.buildIpcMainClient({
    // this "cleanup" code is recommended if you create/destroy
    // the renderer processes dynamically multiple times
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
    const disableForm = (disable: boolean) => {
        disable
            ? fieldset.setAttribute("disabled", "disabled")
            : fieldset.removeAttribute("disabled")
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
                await append(`<span class="badge badge-danger">${message}</span>`);
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

async function append(html: string) {
    document.body
        .appendChild(document.createElement("div"))
        .innerHTML = await ipcMainSanitizeHtmlMethod(html);
}
