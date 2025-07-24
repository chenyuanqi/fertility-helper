// 微信小程序类型定义

// 全局类型定义
declare global {
  // 微信小程序全局对象
  const wx: any;
  const getApp: () => IAppOption;
  const getCurrentPages: () => any[];
  
  // 页面对象接口
  interface IPageOption {
    data?: any;
    onLoad?(options: any): void;
    onReady?(): void;
    onShow?(): void;
    onHide?(): void;
    onUnload?(): void;
    onPullDownRefresh?(): void;
    onReachBottom?(): void;
    onShareAppMessage?(options: any): any;
    onPageScroll?(options: any): void;
    onResize?(options: any): void;
    onTabItemTap?(options: any): void;
    [key: string]: any;
  }
  
  // 应用对象接口
  interface IAppOption {
    globalData?: any;
    onLaunch?(options: any): void;
    onShow?(options: any): void;
    onHide?(): void;
    onError?(error: string): void;
    onPageNotFound?(options: any): void;
    [key: string]: any;
  }
  
  // 组件对象接口
  interface IComponentOption {
    data?: any;
    properties?: any;
    methods?: any;
    behaviors?: any[];
    created?(): void;
    attached?(): void;
    ready?(): void;
    moved?(): void;
    detached?(): void;
    relations?: any;
    externalClasses?: string[];
    options?: any;
    lifetimes?: any;
    pageLifetimes?: any;
    observers?: any;
    [key: string]: any;
  }
}

// 导出全局函数类型
declare function Page(options: IPageOption): void;
declare function App(options: IAppOption): void;
declare function Component(options: IComponentOption): void;
declare function getApp(): IAppOption;
declare function getCurrentPages(): any[];

export {};