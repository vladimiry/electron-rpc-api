export interface AppContext {
    readonly locations: AppContextLocations;
    uiContext?: AppUiContext;
}

export interface AppContextLocations {
    readonly app: string;
    readonly browserWindowIcon: string;
    readonly browserWindowPage: string;
    readonly browserWindowPreload: string;
    readonly trayIcon: string;
    readonly renderer: {
        readonly browserWindow: string;
    };
}

export interface AppUiContext {
    browserWindow: Electron.BrowserWindow;
    readonly tray: Electron.Tray;
}
