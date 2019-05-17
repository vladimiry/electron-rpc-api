import * as PM from "./../private/model";

export function curryOwnFunctionMembers<T extends object | ((...a: PM.Any) => PM.Any)>(
    src: T,
    ...args: PM.Any[]
): T {
    const dest: T = typeof src === "function"
        ? src.bind(undefined) :
        Object.create(null);

    for (const key of Object.getOwnPropertyNames(src)) {
        const srcMember = (src as PM.Any)[key];

        if (typeof srcMember === "function") {
            (dest as PM.Any)[key] = srcMember.bind(src, ...args);
        }
    }

    return dest;
}
