import * as sinon from "sinon";
import anyTest, {TestFn} from "ava";

import * as PM from "lib/private/model";
import {ActionType, ScanService} from "lib";
import {rewiremock} from "./rewiremock";

const test = anyTest as TestFn<TestContext>;

const apiDefinition = {
    stringToNumber: ActionType.Promise<[string], number>(),
};

test.beforeEach(async (t) => {
    t.context.mocks = await buildMocks();
});

test("createIpcMainApiService", async (t) => {
    const {createIpcMainApiService: createIpcMainApiServiceMocked} = await rewiremock.around(
        () => import("lib"),
        (mock) => {
            mock(() => import("lib/private/electron-require")).with(t.context.mocks["lib/private/electron-require"] as PM.Any);
            mock(() => import("pubsub-to-rpc-api")).with(t.context.mocks["pubsub-to-rpc-api"]);
        },
    );
    const apiService = createIpcMainApiServiceMocked({
        channel: "ch1",
        apiDefinition,
    });
    const actions: ScanService<typeof apiService>["ApiImpl"] = {
        stringToNumber: async (input) => Number(input),
    };
    const registerSpy = sinon.spy(apiService, "register");
    const createServiceSpy = t.context.mocks._mockData["pubsub-to-rpc-api"].createService;
    const {requireIpcMain: ipcMain, requireIpcRenderer: ipcRenderer} = t.context.mocks._mockData["lib/private/electron-require"];

    // register
    t.true(registerSpy.notCalled);
    apiService.register(actions);
    t.is(1, registerSpy.callCount);
    t.true((registerSpy.calledWith as PM.Any)(actions));
    t.true(ipcMain.on.bind.calledWithExactly(ipcMain));
    t.true(ipcMain.emit.bind.calledWithExactly(ipcMain));
    t.true(ipcMain.removeListener.bind.calledWithExactly(ipcMain));

    // register with custom ipcMain
    const {requireIpcMain: ipcMainOption} = (await buildMocks())._mockData["lib/private/electron-require"];
    apiService.register(actions, {ipcMain: ipcMainOption} as PM.Any);
    t.is(2, registerSpy.callCount);
    t.true(ipcMainOption.on.bind.calledWithExactly(ipcMainOption));
    t.true(ipcMainOption.emit.bind.calledWithExactly(ipcMainOption));
    t.true(ipcMainOption.removeListener.bind.calledWithExactly(ipcMainOption));

    // should be called after "register" got called
    const callerSpy = sinon.spy(createServiceSpy.returnValues[0], "caller");

    // client
    t.true(callerSpy.notCalled);
    apiService.client();
    t.is(1, callerSpy.callCount);
    t.true(ipcRenderer.removeListener.bind.calledWithExactly(ipcRenderer));
    t.true(ipcRenderer.send.bind.calledWithExactly(ipcRenderer));

    // client with custom ipcRenderer
    const {requireIpcRenderer: ipcRendererOption} = (await buildMocks())._mockData["lib/private/electron-require"];
    apiService.client({ipcRenderer: ipcRendererOption} as PM.Any);
    t.is(2, callerSpy.callCount);
    t.true(ipcRendererOption.removeListener.bind.calledWithExactly(ipcRendererOption));
    t.true(ipcRendererOption.send.bind.calledWithExactly(ipcRendererOption));
});

test.serial("createWebViewApiService", async (t) => {
    const {createWebViewApiService: createWebViewApiServiceMocked} = await rewiremock.around(
        () => import("lib"),
        (mock) => {
            mock(() => import("lib/private/electron-require")).with(t.context.mocks["lib/private/electron-require"] as PM.Any);
            mock(() => import("pubsub-to-rpc-api")).with(t.context.mocks["pubsub-to-rpc-api"]);
        },
    );
    const apiService = createWebViewApiServiceMocked({
        channel: "ch1",
        apiDefinition,
    });
    const actions: ScanService<typeof apiService>["ApiImpl"] = {
        stringToNumber: async (input) => Number(input),
    };
    const registerSpy = sinon.spy(apiService, "register");
    const createServiceSpy = t.context.mocks._mockData["pubsub-to-rpc-api"].createService;
    const {requireIpcRenderer: ipcRenderer} = t.context.mocks._mockData["lib/private/electron-require"];
    const {webView} = t.context.mocks._mockData;

    // register
    t.true(registerSpy.notCalled);
    t.true(ipcRenderer.on.bind.notCalled);
    t.true(ipcRenderer.removeListener.bind.notCalled);
    t.true(ipcRenderer.sendToHost.bind.notCalled);
    apiService.register(actions);
    t.is(1, registerSpy.callCount);
    t.true((registerSpy.calledWithExactly as PM.Any)(actions));
    t.true(ipcRenderer.on.bind.calledWithExactly(ipcRenderer));
    t.true(ipcRenderer.removeListener.bind.calledWithExactly(ipcRenderer));
    t.true(ipcRenderer.sendToHost.bind.calledWithExactly(ipcRenderer));

    // register with custom ipcRenderer
    const {requireIpcRenderer: ipcRendererOption} = (await buildMocks())._mockData["lib/private/electron-require"];
    apiService.register(actions, {ipcRenderer: ipcRendererOption} as PM.Any);
    t.is(2, registerSpy.callCount);
    t.true(ipcRendererOption.removeListener.bind.calledWithExactly(ipcRendererOption));

    // should be called after "register" got called
    const callerSpy = sinon.spy(createServiceSpy.returnValues[0], "caller");

    // client
    t.true(callerSpy.notCalled);
    apiService.client(webView as PM.Any);
    t.is(1, callerSpy.callCount);
    // t.true(webView.send.bind.calledWithExactly(webView));
});

interface TestContext {
    mocks: PM.Unpacked<ReturnType<typeof buildMocks>>;
}

function emptyFn() {} // tslint:disable-line:no-empty

async function buildMocks() {
    const constructBindStub = () => ({bind: sinon.stub().returns(emptyFn)});

    const lib = {...await import("pubsub-to-rpc-api")};

    const _mockData = {
        "lib/private/electron-require": {
            requireIpcMain: {
                on: constructBindStub(),
                emit: constructBindStub(),
                removeListener: constructBindStub(),
            },
            requireIpcRenderer: {
                on: constructBindStub(),
                removeListener: constructBindStub(),
                send: constructBindStub(),
                sendToHost: constructBindStub(),
            },
        },
        "pubsub-to-rpc-api": {
            createService: sinon.spy(lib, "createService"),
        },
        "webView": {
            addEventListener: constructBindStub(),
            removeEventListener: constructBindStub(),
            send: constructBindStub(),
            isConnected: true,
        },
    };

    return {
        _mockData,
        "lib/private/electron-require": {
            requireIpcMain: () => _mockData["lib/private/electron-require"].requireIpcMain,
            requireIpcRenderer: () => _mockData["lib/private/electron-require"].requireIpcRenderer,
        },
        "pubsub-to-rpc-api": lib,
    };
}
