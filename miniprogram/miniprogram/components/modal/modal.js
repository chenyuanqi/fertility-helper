// components/modal/modal.js
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
    // 标题
    title: {
      type: String,
      value: ''
    },
    // 内容
    content: {
      type: String,
      value: ''
    },
    // 图标类型 success/warning/error/info
    icon: {
      type: String,
      value: ''
    },
    // 是否显示关闭按钮
    showClose: {
      type: Boolean,
      value: false
    },
    // 是否显示底部
    showFooter: {
      type: Boolean,
      value: true
    },
    // 是否显示取消按钮
    showCancel: {
      type: Boolean,
      value: true
    },
    // 是否显示确认按钮
    showConfirm: {
      type: Boolean,
      value: true
    },
    // 取消按钮文本
    cancelText: {
      type: String,
      value: '取消'
    },
    // 确认按钮文本
    confirmText: {
      type: String,
      value: '确定'
    },
    // 确认按钮是否禁用
    confirmDisabled: {
      type: Boolean,
      value: false
    },
    // 点击遮罩是否关闭
    maskClosable: {
      type: Boolean,
      value: true
    },
    // 动画类型 scale/slide
    animation: {
      type: String,
      value: 'scale'
    },
    // 弹窗位置 center/bottom/fullscreen
    position: {
      type: String,
      value: 'center'
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    animationClass: '',
    iconSrc: ''
  },

  /**
   * 监听属性变化
   */
  observers: {
    'visible': function(visible) {
      if (visible) {
        this.updateAnimationClass();
        this.updateIconSrc();
      }
    },
    'icon': function() {
      this.updateIconSrc();
    },
    'animation, position': function() {
      this.updateAnimationClass();
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 更新动画类名
     */
    updateAnimationClass() {
      const { animation, position } = this.properties;
      let animationClass = '';
      
      if (position === 'bottom') {
        animationClass = 'modal-animation-slide';
      } else if (animation === 'scale') {
        animationClass = 'modal-animation-scale';
      } else if (animation === 'slide') {
        animationClass = 'modal-animation-slide';
      }
      
      this.setData({ animationClass });
    },

    /**
     * 更新图标路径
     */
    updateIconSrc() {
      const { icon } = this.properties;
      let iconSrc = '';
      
      switch (icon) {
        case 'success':
          iconSrc = '/assets/icons/success.png';
          break;
        case 'warning':
          iconSrc = '/assets/icons/warning.png';
          break;
        case 'error':
          iconSrc = '/assets/icons/error.png';
          break;
        case 'info':
          iconSrc = '/assets/icons/info.png';
          break;
      }
      
      this.setData({ iconSrc });
    },

    /**
     * 遮罩点击
     */
    onMaskTap() {
      if (this.properties.maskClosable) {
        this.triggerEvent('close');
      }
    },

    /**
     * 关闭按钮点击
     */
    onCloseTap() {
      this.triggerEvent('close');
    },

    /**
     * 取消按钮点击
     */
    onCancelTap() {
      this.triggerEvent('cancel');
    },

    /**
     * 确认按钮点击
     */
    onConfirmTap() {
      if (this.properties.confirmDisabled) {
        return;
      }
      this.triggerEvent('confirm');
    }
  }
});