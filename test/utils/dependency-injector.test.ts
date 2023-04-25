import { describe, expect, it } from "@jest/globals";
import { Inject } from "../../src/utils/dependency-injector/inject";
import { Service } from "../../src/utils/dependency-injector/service";

class Foo {
  foo() {
    return "foo";
  }
}

class Bar {
  bar() {
    return "bar";
  }
}

class Baz {
  baz() {
    return "baz";
  }
}

describe("Dependency Injection", () => {
  it("should inject dependencies defined in decorators", () => {
    class TestService extends Service {
      @Inject(() => Foo)
      declare foo: Foo;

      @Inject(() => Bar)
      declare bar: Bar;

      runDeps() {
        return this.foo.foo() + "," + this.bar.bar();
      }
    }

    const test = new TestService();

    expect(test.runDeps()).toBe("foo,bar");
  });

  it("should override the default dependencies when provided to init()", () => {
    class TestService extends Service {
      @Inject(() => Foo)
      declare foo: Foo;

      @Inject(() => Bar)
      declare bar: Bar;

      runDeps() {
        return this.foo.foo() + "," + this.bar.bar();
      }
    }

    class BarReplacement {
      bar() {
        return "bar-replacement";
      }
    }

    const test = TestService.init([Bar, BarReplacement]);

    expect(test.runDeps()).toBe("foo,bar-replacement");
    expect(Object.getPrototypeOf(test).constructor.name).toEqual("TestService");
  });

  it("should provide default dependencies", () => {
    class TestService extends Service {
      @Inject(() => Foo)
      declare foo: Foo;

      @Inject(() => Bar)
      declare bar: Bar;

      @Inject(() => Baz)
      declare baz: Baz;

      runDeps() {
        return this.foo.foo() + "," + this.bar.bar() + "," + this.baz.baz();
      }
    }

    Service.setDefaultDependency(Bar, {
      bar() {
        return "bar-replacement";
      },
    });

    Service.setDefaultDependency(
      Baz,
      class {
        baz() {
          return "baz-replacement";
        }
      }
    );

    const test = new TestService();

    expect(test.runDeps()).toBe("foo,bar-replacement,baz-replacement");
  });

  it("should propagate dependencies to nested services", () => {
    class TestService extends Service {
      @Inject(() => Foo)
      declare foo: Foo;

      @Inject(() => Bar)
      declare bar: Bar;

      runDeps() {
        return this.foo.foo() + "," + this.bar.bar();
      }
    }

    class TestService2 extends Service {
      @Inject(() => TestService)
      declare testService: TestService;

      runDeps() {
        return this.testService.runDeps();
      }
    }

    class TestService3 extends Service {
      @Inject(() => TestService2)
      declare testService2: TestService2;

      runDeps() {
        return this.testService2.runDeps();
      }
    }

    const test = TestService3.init([Bar, { bar: () => "not-a-bar" }]);

    expect(test.runDeps()).toBe("foo,not-a-bar");
  });

  it("overriding dependency should affect the result of spawnService()", () => {
    class TestService extends Service {
      @Inject(() => Foo)
      declare foo: Foo;

      runDeps() {
        return this.foo.foo();
      }
    }

    class TestService2 extends Service {
      runDeps() {
        const nestedService = this.spawnService(TestService);
        return nestedService.runDeps();
      }
    }

    class TestServiceReplacement {
      runDeps() {
        return "TestServiceReplacement";
      }
    }

    const test = TestService2.init([TestService, TestServiceReplacement]);

    expect(test.runDeps()).toBe("TestServiceReplacement");
  });

  describe("spawnService()", () => {
    it("should propagate dependencies to nested services", () => {
      class TestService extends Service {
        @Inject(() => Foo)
        declare foo: Foo;

        @Inject(() => Bar)
        declare bar: Bar;

        runDeps() {
          return this.foo.foo() + "," + this.bar.bar();
        }
      }

      class TestService2 extends Service {
        runDeps() {
          const nestedService = this.spawnService(TestService);
          return nestedService.runDeps();
        }
      }

      class TestService3 extends Service {
        runDeps() {
          const nestedService = this.spawnService(TestService2);
          return nestedService.runDeps();
        }
      }

      const test = TestService3.init([Bar, { bar: () => "qux" }]);

      expect(test.runDeps()).toBe("foo,qux");
    });

    it("should properly override given dependencies", () => {
      class TestService extends Service {
        @Inject(() => Bar)
        declare bar: Bar;

        runDeps() {
          return this.bar.bar();
        }
      }

      class TestService2 extends Service {
        @Inject(() => Foo)
        declare foo: Foo;

        runDeps() {
          const nestedService = this.spawnService(TestService);
          return this.foo.foo() + "," + nestedService.runDeps();
        }
      }

      class TestService3 extends Service {
        runDeps() {
          const nestedService = this.spawnService(
            TestService2,
            [Foo, { foo: () => "1234" }],
            [Bar, { bar: () => "abcd" }]
          );
          return nestedService.runDeps();
        }
      }

      const test = TestService3.init([Bar, { bar: () => "qux" }]);

      expect(test.runDeps()).toBe("1234,abcd");
    });
  });
});
