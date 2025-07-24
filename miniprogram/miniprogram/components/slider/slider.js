// components/slider/slider.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 标题
    title: {
      type: String,
      value: ''
    },
    // 当前值
    value: {
      type: Number,
      value: 0
    },
    // 选项配置
    options: {
      type: Array,
      value: [
        { value: 0, label: '无', description: '无月经', position: 0 },
        { value: 1, label: '少量', description: '1-2片卫生巾，颜色较淡', position: 25 },
        { value: 2, label: '中等', description: '3-4片卫生巾，正常颜色', position: 50 },
        { value: 3, label: '较多', description: '5-6片卫生巾，颜色较深', position: 75 },
        { value: 4, label: '大量', description: '7片以上卫生巾，颜色深红', position: 100 }
      ]
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    fillWidth: 0,
    thumbPosition: 0,
    isDragging: false,
    startX: 0,
    trackWidth: 0,
    trackLeft: 0
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      this.updateSliderPosition();
      this.getTrackInfo();
    }
  },

  /**
   * 监听属性变化
   */
  observers: {
    'value, options': function() {
      this.updateSliderPosition();
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 获取滑条轨道信息
     */
    getTrackInfo() {
      const query = this.createSelectorQuery();
      query.select('.slider-track').boundingClientRect((rect) => {
        if (rect) {
          this.setData({
            trackWidth: rect.width,
            trackLeft: rect.left
          });
        }
      }).exec();
    },

    /**
     * 更新滑条位置
     */
    updateSliderPosition() {
      const { value, options } = this.properties;
      const currentOption = options.find(option => option.value === value);
      
      if (currentOption) {
        this.setData({
          fillWidth: currentOption.position,
          thumbPosition: currentOption.position
        });
      }
    },

    /**
     * 根据位置计算值
     */
    getValueByPosition(position) {
      const { options } = this.properties;
      let closestOption = options[0];
      let minDistance = Math.abs(position - options[0].position);

      options.forEach(option => {
        const distance = Math.abs(position - option.position);
        if (distance < minDistance) {
          minDistance = distance;
          closestOption = option;
        }
      });

      return closestOption.value;
    },

    /**
     * 触摸开始
     */
    onTouchStart(e) {
      if (this.properties.disabled) return;

      const touch = e.touches[0];
      this.setData({
        isDragging: true,
        startX: touch.clientX
      });
      
      this.getTrackInfo();
    },

    /**
     * 触摸移动
     */
    onTouchMove(e) {
      if (this.properties.disabled || !this.data.isDragging) return;

      const touch = e.touches[0];
      const { trackWidth, trackLeft } = this.data;
      
      if (trackWidth === 0) return;

      // 计算相对位置
      const relativeX = touch.clientX - trackLeft;
      const position = Math.max(0, Math.min(100, (relativeX / trackWidth) * 100));
      
      // 更新位置
      this.setData({
        fillWidth: position,
        thumbPosition: position
      });

      // 计算对应的值
      const newValue = this.getValueByPosition(position);
      
      // 触发变化事件
      this.triggerEvent('change', {
        value: newValue,
        option: this.properties.options.find(opt => opt.value === newValue)
      });
    },

    /**
     * 触摸结束
     */
    onTouchEnd(e) {
      if (this.properties.disabled) return;

      this.setData({
        isDragging: false
      });

      // 吸附到最近的刻度
      const { thumbPosition } = this.data;
      const newValue = this.getValueByPosition(thumbPosition);
      const targetOption = this.properties.options.find(opt => opt.value === newValue);
      
      if (targetOption) {
        this.setData({
          fillWidth: targetOption.position,
          thumbPosition: targetOption.position
        });

        // 触发确认事件
        this.triggerEvent('confirm', {
          value: newValue,
          option: targetOption
        });
      }
    },

    /**
     * 标签点击
     */
    onLabelTap(e) {
      if (this.properties.disabled) return;

      const value = e.currentTarget.dataset.value;
      const option = this.properties.options.find(opt => opt.value === value);
      
      if (option) {
        this.setData({
          fillWidth: option.position,
          thumbPosition: option.position
        });

        // 触发事件
        this.triggerEvent('change', { value, option });
        this.triggerEvent('confirm', { value, option });
      }
    }
  }
});