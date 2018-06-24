import {Model, Service} from "pubsub-to-stream-api";

// tslint:disable-next-line:no-any
export type AnyType = any;

export type ApiMethod<I, O> = Model.Action<I, O>;

export type ApiMethodNoArgument<I> = Model.ActionWithoutInput<I>;
