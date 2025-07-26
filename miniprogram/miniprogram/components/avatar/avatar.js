// components/avatar/avatar.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 头像URL或本地路径
    src: {
      type: String,
      value: ''
    },
    // 头像尺寸（rpx）
    size: {
      type: Number,
      value: 120
    },
    // 是否可点击更换
    editable: {
      type: Boolean,
      value: false
    },
    // 默认头像
    defaultSrc: {
      type: String,
      value: ''
    },
    // 显示模式：aspectFill(裁剪) | aspectFit(适应)
    mode: {
      type: String,
      value: 'aspectFill'
    },
    // 用户名（用于alt属性）
    userName: {
      type: String,
      value: '用户'
    },
    // 是否显示边框
    showBorder: {
      type: Boolean,
      value: true
    },
    // 边框颜色
    borderColor: {
      type: String,
      value: '#ff6b9d'
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    currentSrc: '',
    isLoading: false,
    loadError: false,
    showOverlay: false,
    // 无障碍访问相关
    componentId: '',
    accessibilityLabel: '',
    accessibilityDescription: '',
    announceText: '',
    announceTimestamp: 0,
    isHighContrast: false,
    reducedMotion: false
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      this.initAccessibility();
      this.initAvatar();
    }
  },

  /**
   * 监听属性变化
   */
  observers: {
    'src': function(newSrc) {
      this.updateAvatarSrc(newSrc);
    },
    'userName, editable': function(userName, editable) {
      this.updateAccessibilityLabels();
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 初始化无障碍访问功能
     */
    initAccessibility() {
      // 生成唯一的组件ID
      const componentId = `avatar-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.setData({ componentId });
      
      // 初始化无障碍标签
      this.updateAccessibilityLabels();
      
      // 检测系统无障碍设置
      this.detectAccessibilitySettings();
    },

    /**
     * 更新无障碍标签
     */
    updateAccessibilityLabels() {
      const { userName, editable } = this.properties;
      const { loadError, isLoading } = this.data;
      
      let accessibilityLabel = '';
      let accessibilityDescription = '';
      
      if (isLoading) {
        accessibilityLabel = `${userName}的头像正在加载`;
        accessibilityDescription = '头像图片正在加载中，请稍候';
      } else if (loadError) {
        accessibilityLabel = `${userName}的头像加载失败`;
        accessibilityDescription = '头像图片加载失败，当前显示默认头像';
      } else {
        accessibilityLabel = `${userName}的头像`;
        accessibilityDescription = editable ? 
          '用户头像图片，点击可以更换头像，支持从相册选择或拍照' : 
          '用户头像图片';
      }
      
      this.setData({
        accessibilityLabel,
        accessibilityDescription
      });
    },

    /**
     * 检测系统无障碍设置
     */
    detectAccessibilitySettings() {
      // 检测是否启用了高对比度模式和减少动画
      try {
        wx.getSystemInfo({
          success: (res) => {
            // 根据系统信息调整无障碍设置
            const isHighContrast = res.theme === 'dark' || res.fontSizeSetting > 18;
            const reducedMotion = res.benchmarkLevel < 1; // 低性能设备减少动画
            
            this.setData({ 
              isHighContrast,
              reducedMotion
            });
            
            // 如果启用了高对比度模式，调整样式
            if (isHighContrast) {
              this.applyHighContrastMode();
            }
          }
        });
      } catch (error) {
        console.log('获取系统信息失败:', error);
      }
    },

    /**
     * 应用高对比度模式
     */
    applyHighContrastMode() {
      // 可以在这里添加额外的高对比度模式逻辑
      console.log('已启用高对比度模式');
    },

    /**
     * 键盘事件处理
     */
    onKeyDown(e) {
      if (!this.properties.editable) {
        return;
      }
      
      const { keyCode, key } = e.detail;
      
      // Enter键或空格键触发点击
      if (keyCode === 13 || keyCode === 32 || key === 'Enter' || key === ' ') {
        e.preventDefault();
        this.onAvatarTap();
        this.announceToScreenReader('头像更换选项已打开');
      }
      
      // Escape键取消操作
      if (keyCode === 27 || key === 'Escape') {
        this.setData({ showOverlay: false });
        this.announceToScreenReader('操作已取消');
      }
    },

    /**
     * 向屏幕阅读器宣布信息
     */
    announceToScreenReader(message) {
      this.setData({ 
        announceText: message,
        announceTimestamp: Date.now()
      });
      
      // 清除宣布文本
      setTimeout(() => {
        this.setData({ announceText: '' });
      }, 100);
    },

    /**
     * 初始化头像
     */
    initAvatar() {
      const { src } = this.properties;
      this.updateAvatarSrc(src);
    },

    /**
     * 更新头像源
     */
    updateAvatarSrc(src) {
      if (!src) {
        // 没有头像源时，显示默认占位符
        this.setData({
          currentSrc: '',
          isLoading: false,
          loadError: false
        });
        return;
      }

      this.setData({
        isLoading: true,
        loadError: false
      });

      // 检查是否为网络图片，如果是则先预加载
      if (src.startsWith('http')) {
        this.preloadImage(src);
      } else {
        this.setData({
          currentSrc: src,
          isLoading: false
        });
      }
    },

    /**
     * 预加载网络图片
     */
    preloadImage(src) {
      wx.getImageInfo({
        src: src,
        success: (res) => {
          this.setData({
            currentSrc: src,
            isLoading: false,
            loadError: false
          });
        },
        fail: (error) => {
          console.error('预加载图片失败:', error);
          // 预加载失败时，清空currentSrc，显示默认占位符
          this.setData({
            currentSrc: '',
            isLoading: false,
            loadError: true
          });
        }
      });
    },

    /**
     * 图片加载成功
     */
    onImageLoad(e) {
      this.setData({
        isLoading: false,
        loadError: false
      });
      
      // 更新无障碍标签
      this.updateAccessibilityLabels();
      
      // 向屏幕阅读器宣布加载成功
      this.announceToScreenReader('头像加载完成');
      
      // 触发加载成功事件
      this.triggerEvent('load', {
        src: this.data.currentSrc,
        detail: e.detail
      });
    },

    /**
     * 图片加载失败
     */
    onImageError(e) {
      console.error('头像加载失败:', e);
      
      // 图片加载失败时，清空currentSrc，显示默认占位符
      this.setData({
        currentSrc: '',
        isLoading: false,
        loadError: true
      });

      // 更新无障碍标签
      this.updateAccessibilityLabels();
      
      // 向屏幕阅读器宣布加载失败
      this.announceToScreenReader('头像加载失败，已显示默认头像');

      // 触发加载失败事件
      this.triggerEvent('error', {
        src: e.currentTarget.src,
        error: e.detail
      });
    },

    /**
     * 点击头像
     */
    onAvatarTap() {
      if (!this.properties.editable) {
        return;
      }

      // 显示遮罩效果
      this.setData({ showOverlay: true });
      
      setTimeout(() => {
        this.setData({ showOverlay: false });
      }, 200);

      // 触发点击事件
      this.triggerEvent('avatarTap', {
        currentSrc: this.data.currentSrc
      });

      // 显示上传选项
      this.showUploadOptions();
    },

    /**
     * 显示上传选项
     */
    showUploadOptions() {
      wx.showActionSheet({
        itemList: ['从相册选择', '拍照'],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.announceToScreenReader('已选择从相册选择图片');
            this.chooseFromAlbum();
          } else if (res.tapIndex === 1) {
            this.announceToScreenReader('已选择拍照');
            this.takePhoto();
          }
        },
        fail: (error) => {
          this.announceToScreenReader('已取消头像更换操作');
          console.log('用户取消选择');
        }
      });
    },

    /**
     * 从相册选择图片
     */
    chooseFromAlbum() {
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album'],
        success: (res) => {
          const tempFilePath = res.tempFilePaths[0];
          this.announceToScreenReader('图片选择成功，正在处理');
          this.handleImageSelected(tempFilePath);
        },
        fail: (error) => {
          console.error('选择图片失败:', error);
          this.announceToScreenReader('选择图片失败，请重试');
          wx.showToast({
            title: '选择图片失败',
            icon: 'none'
          });
        }
      });
    },

    /**
     * 拍照
     */
    takePhoto() {
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['camera'],
        success: (res) => {
          const tempFilePath = res.tempFilePaths[0];
          this.announceToScreenReader('拍照成功，正在处理');
          this.handleImageSelected(tempFilePath);
        },
        fail: (error) => {
          console.error('拍照失败:', error);
          this.announceToScreenReader('拍照失败，请重试');
          wx.showToast({
            title: '拍照失败',
            icon: 'none'
          });
        }
      });
    },

    /**
     * 处理选中的图片
     */
    handleImageSelected(tempFilePath) {
      this.setData({ isLoading: true });
      
      // 更新无障碍标签
      this.updateAccessibilityLabels();

      // 触发图片选择事件
      this.triggerEvent('imageSelected', {
        tempFilePath: tempFilePath,
        originalSrc: this.data.currentSrc
      });

      // 临时显示选中的图片
      this.setData({
        currentSrc: tempFilePath,
        isLoading: false
      });
      
      // 向屏幕阅读器宣布更换成功
      this.announceToScreenReader('头像更换成功');
    },

    /**
     * 外部调用：设置头像
     */
    setAvatar(src) {
      this.updateAvatarSrc(src);
    },

    /**
     * 外部调用：显示加载状态
     */
    showLoading() {
      this.setData({ isLoading: true });
    },

    /**
     * 外部调用：隐藏加载状态
     */
    hideLoading() {
      this.setData({ isLoading: false });
    },

    /**
     * 外部调用：显示错误状态
     */
    showError() {
      this.setData({ 
        loadError: true,
        isLoading: false 
      });
    }
  }
});