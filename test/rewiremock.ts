import rewiremock, {plugins} from "rewiremock";

rewiremock.overrideEntryPoint(module); // this is important

// and all stub names would be a relative
// rewiremock.addPlugin(plugins.relative);

// and all stubs should be used. Lets make it default!
rewiremock.addPlugin(plugins.usedByDefault);

export {
    rewiremock,
};
