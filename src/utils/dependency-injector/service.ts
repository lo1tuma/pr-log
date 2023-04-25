import type { Constructor } from "./inject";
import { ServiceMetadata } from "./metadata";

export interface Injectable {
  __init_service?: (
    dependencies: Dependencies | Map<Injectable, DependencyOverride>
  ) => any;
  new (): any;
}
export type DependencyOverride = Injectable | object;

export type Dependencies = Array<[Constructor, DependencyOverride]>;

const defaultDependencies = new Map<Constructor, InstanceType<Injectable>>();

function isConstructor(obj: object): obj is Injectable {
  // @ts-expect-error
  return !!obj.prototype && !!obj.prototype.constructor;
}

function initializeDependency(
  dependency: any,
  overrides: Dependencies | Map<Injectable, DependencyOverride>
) {
  if (isConstructor(dependency)) {
    if (dependency.__init_service) {
      return dependency.__init_service(overrides);
    } else {
      return new dependency();
    }
  } else {
    return dependency;
  }
}

export class Service {
  private static __init_service<T extends typeof Service>(
    this: T,
    dependencies: Dependencies | Map<Constructor, DependencyOverride>
  ): InstanceType<T> {
    const orgClassName = this.name;
    const dependenciesOverrides = new Map(dependencies);

    const classes = {} as any;

    classes[orgClassName] = class extends (this as any) {
      __dependenciesOverrides() {
        return dependenciesOverrides;
      }
      __reflectProto() {
        return this;
      }
    };

    Object.defineProperty(classes[orgClassName], "name", { value: orgClassName });

    return new classes[orgClassName]();
  }

  /**
   * By default each injected dependency is a new instance of the given class.
   * This method allows to either replace the constructor of the dependency with
   * another one, or provide a value that will be injected instead.
   */
  static setDefaultDependency<T extends Injectable>(
    dependencyConstructor: T,
    instance: InstanceType<T> | T
  ) {
    defaultDependencies.set(dependencyConstructor, instance);
  }

  /**
   * Initialize a service and injects the provided dependencies into it and it's
   * dependents. When a dependency is not provided but is used by the Service, the
   * default one will be used.
   */
  static init<T extends typeof Service>(
    this: T,
    ...dependencies: Dependencies
  ): InstanceType<T> {
    return this.__init_service(dependencies);
  }

  protected declare __reflectProto?: () => object;
  protected declare __dependenciesOverrides?: () => Map<Constructor, DependencyOverride>;

  constructor() {
    this.__initializeDependencies();
  }

  private __initializeDependencies() {
    const proto = this.__reflectProto?.() ?? Object.getPrototypeOf(this);

    const dependenciesOverrides = this.__dependenciesOverrides?.() ?? new Map();

    const keys = Reflect.getMetadata(ServiceMetadata.Keys, proto);

    if (keys)
      for (const key of keys) {
        const getDefault: () => Injectable = Reflect.getMetadata(
          ServiceMetadata.Inject,
          proto,
          key
        );
        const defaultDependency = getDefault();

        const override = dependenciesOverrides.get(defaultDependency);

        if (override) {
          Object.assign(this, {
            [key]: initializeDependency(override, dependenciesOverrides),
          });
        } else {
          const defaultInstance = defaultDependencies.get(defaultDependency);

          if (defaultInstance) {
            Object.assign(this, {
              [key]: initializeDependency(defaultInstance, dependenciesOverrides),
            });
          } else {
            Object.assign(this, {
              [key]: initializeDependency(defaultDependency, dependenciesOverrides),
            });
          }
        }
      }

    return this;
  }

  /**
   * Instantiate a service. If this service has some dependencies overridden,
   * those will be propagated to the new service.
   *
   * This is especially useful when you want to create a new instance of a service
   * conditionally, since that's not possible with the `Inject()` decorator.
   */
  protected spawnService<S extends typeof Service>(
    service: S,
    ...overrides: Dependencies
  ): InstanceType<S> {
    const dependenciesOverrides = this.__dependenciesOverrides?.() ?? new Map();

    for (const [dependency, override] of overrides) {
      dependenciesOverrides.set(dependency, override);
    }

    const override = dependenciesOverrides.get(service);
    if (override) {
      return initializeDependency(override, dependenciesOverrides);
    }

    return service.__init_service(dependenciesOverrides);
  }
}
