/**
 * 简单依赖注入容器
 */

type ServiceFactory<T> = () => T;

class ServiceContainer {
  private instances = new Map<string, unknown>();
  private factories = new Map<string, ServiceFactory<unknown>>();

  /**
   * 注册服务实例
   */
  register<T>(name: string, instance: T): void {
    this.instances.set(name, instance);
  }

  /**
   * 注册服务工厂（延迟初始化）
   */
  registerFactory<T>(name: string, factory: ServiceFactory<T>): void {
    this.factories.set(name, factory as ServiceFactory<unknown>);
  }

  /**
   * 获取服务实例
   */
  get<T>(name: string): T {
    if (this.instances.has(name)) {
      return this.instances.get(name) as T;
    }
    if (this.factories.has(name)) {
      const instance = this.factories.get(name)!();
      this.instances.set(name, instance);
      return instance as T;
    }
    throw new Error(`Service not found: ${name}`);
  }

  /**
   * 检查服务是否已注册
   */
  has(name: string): boolean {
    return this.instances.has(name) || this.factories.has(name);
  }
}

export const container = new ServiceContainer();

/**
 * 服务名称常量
 */
export const SERVICES = {
  TAURI_BRIDGE: 'tauriBridge',
  EDITOR: 'editor',
  AI_ASSISTANT: 'aiAssistant',
  FILE_EXPLORER: 'fileExplorer',
  APP: 'app',
  I18N: 'i18n',
} as const;

export type ServiceName = typeof SERVICES[keyof typeof SERVICES];
