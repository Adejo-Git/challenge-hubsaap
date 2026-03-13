/**
 * Mock @angular/core for Jest tests
 */

export class InjectionToken {
  constructor(public description: string, _options?: unknown) {
    void _options
  }
}

// Decorator factories
export function Injectable(_options?: unknown): ClassDecorator {
  void _options
  return (_target: object) => {
    void _target
    // no-op
  }
}

export function Inject(_token: unknown): ParameterDecorator {
  void _token
  return (_target: object, _propertyKey: string | symbol | undefined, _parameterIndex: number) => {
    void _target
    void _propertyKey
    void _parameterIndex
    // no-op mock implementation
  }
}

export function Optional(): ParameterDecorator {
  return (_target: object, _propertyKey: string | symbol | undefined, _parameterIndex: number) => {
    void _target
    void _propertyKey
    void _parameterIndex
    // no-op mock implementation
  }
}
