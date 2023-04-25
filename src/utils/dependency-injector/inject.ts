import { ServiceMetadata } from "./metadata";

export interface Constructor {
  new (): any;
}

/**
 * Mark a class property as a dependency. When the class is instantiated, the
 * dependency will be injected.
 *
 * If a default dependency is set via `Service.setDefaultDependency`, value
 * provided to that method will be the one injected by default.
 *
 * If a service is initiated using the `init()` method, the dependencies
 * provided to it will override the defaults.
 */
export const Inject = (dependency: () => Constructor) => {
  return (proto: object, key: string) => {
    const keys: string[] = Reflect.getMetadata(ServiceMetadata.Keys, proto) ?? [];

    Reflect.defineMetadata(ServiceMetadata.Keys, [...keys, key], proto);
    Reflect.defineMetadata(ServiceMetadata.Inject, dependency, proto, key);
  };
};
