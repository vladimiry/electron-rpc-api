import {ElectronWindow} from "src/shared/model";

declare global {
    const __ELECTRON_EXPOSURE__: ElectronWindow["__ELECTRON_EXPOSURE__"];
}

declare var window: Window; // eslint-disable-line no-var
