// components/loading/loading.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否显示
    visible: {
      type: Boolean,
      value: false
    },
    // 加载文本
    text: {
      type: String,
      value: '加载中...'
    },
    // 加载类型 fullscreen/inline/overlay
    type: {
      type: String,
      value: 'inline'
    },
    // 加载动画类型 circle/dots/wave/pulse
    spinnerType: {
      type: String,
      value: 'circle'
    },
    // 尺寸 small/normal/large
    size: {
      type: String,
      value: 'normal'
    },
    // 延迟显示时间（毫秒）
    delay: {
      type: Number,
      value: 0
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    actualVisible: false,
    delayTimer: null
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    detached() {
      // 清理定时器
      if (this.data.delayTimer) {
        clearTimeout(this.data.delayTimer);
      }
    }
  },

  /**
   * 监听属性变化
   */
  observers: {
    'visible': function(visible) {
      this.handleVisibleChange(visible);
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 处理显示状态变化
     */
    handleVisibleChange(visible) {
      // 清理之前的定时器
      if (this.data.delayTimer) {
        clearTimeout(this.data.delayTimer);
        this.setData({ delayTimer: null });
      }

      if (visible) {
        // 显示加载
        if (this.properties.delay > 0) {
          // 延迟显示
          const timer = setTimeout(() => {
            this.setData({ 
              actualVisible: true,
              delayTimer: null 
            });
          }, this.properties.delay);
          
          this.setData({ delayTimer: timer });
        } else {
          // 立即显示
          this.setData({ actualVisible: true });
        }
      } else {
        // 隐藏加载
        this.setData({ actualVisible: false });
      }
    },

    /**
     * 显示加载
     */
    show(options = {}) {
      const { text, type, spinnerType, size } = options;
      
      const updateData = { actualVisible: true };
      
      if (text !== undefined) updateData.text = text;
      if (type !== undefined) updateData.type = type;
      if (spinnerType !== undefined) updateData.spinnerType = spinnerType;
      if (size !== undefined) updateData.size = size;
      
      this.setData(updateData);
    },

    /**
     * 隐藏加载
     */
    hide() {
      this.setData({ actualVisible: false });
      
      // 清理定时器
      if (this.data.delayTimer) {
        clearTimeout(this.data.delayTimer);
        this.setData({ delayTimer: null });
      }
    },

    /**
     * 切换显示状态
     */
    toggle() {
      this.setData({ 
        actualVisible: !this.data.actualVisible 
      });
    }
  }
});