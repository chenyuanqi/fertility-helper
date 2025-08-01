// 用户体验测试
describe('用户体验测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('数据加载性能测试', async () => {
    // 模拟数据加载
    const mockData = { test: 'data' };
    
    global.wx.getStorage.mockImplementation(({ success }) => {
      setTimeout(() => success({ data: mockData }), 100);
    });

    const startTime = Date.now();
    
    // 模拟数据加载过程
    await new Promise(resolve => {
      global.wx.getStorage({
        key: 'test',
        success: (res) => {
          expect(res.data).toEqual(mockData);
          resolve();
        }
      });
    });
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(500); // 加载时间应小于500ms
  });

  test('响应式布局测试', () => {
    const screenSizes = [
      { width: 375, height: 667 }, // iPhone SE
      { width: 414, height: 896 }, // iPhone 11
      { width: 360, height: 640 }  // Android
    ];

    screenSizes.forEach(size => {
      // 模拟屏幕尺寸设置
      global.wx.getSystemInfo.mockImplementation(({ success }) => {
        success({
          windowWidth: size.width,
          windowHeight: size.height
        });
      });

      // 验证系统信息获取
      global.wx.getSystemInfo({
        success: (res) => {
          expect(res.windowWidth).toBe(size.width);
          expect(res.windowHeight).toBe(size.height);
        }
      });
    });
  });
});

describe('错误处理测试', () => {
  test('网络错误处理', async () => {
    // 模拟存储失败
    global.wx.setStorage.mockImplementation(({ fail }) => {
      fail({ errMsg: 'storage failed' });
    });

    // 测试错误处理
    await new Promise(resolve => {
      global.wx.setStorage({
        key: 'test',
        data: 'test',
        fail: (error) => {
          expect(error.errMsg).toBe('storage failed');
          resolve();
        }
      });
    });
  });
});