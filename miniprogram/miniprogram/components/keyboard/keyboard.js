// components/keyboard/keyboard.js
const { Validator } = require('../../utils/validator');

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否显示键盘
    visible: {
      type: Boolean,
      value: false
    },
    // 键盘标题
    title: {
      type: String,
      value: '请输入体温'
    },
    // 初始值
    value: {
      type: String,
      value: ''
    },
    // 最大长度
    maxLength: {
      type: Number,
      value: 5
    },
    // 最小值
    minValue: {
      type: Number,
      value: 35.0
    },
    // 最大值
    maxValue: {
      type: Number,
      value: 42.0
    },
    // 小数位数
    decimalPlaces: {
      type: Number,
      value: 1
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    displayValue: '',
    inputValue: ''
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      this.initValue();
    }
  },

  /**
   * 监听属性变化
   */
  observers: {
    'value': function(newValue) {
      this.initValue();
    },
    'visible': function(visible) {
      if (visible) {
        this.initValue();
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 初始化值
     */
    initValue() {
      const value = this.properties.value || '';
      this.setData({
        inputValue: value,
        displayValue: value || '0.0'
      });
    },

    /**
     * 数字键点击
     */
    onKeyTap(e) {
      const key = e.currentTarget.dataset.key;
      const { inputValue, maxLength, decimalPlaces } = this.data;
      const currentValue = inputValue.toString();

      // 处理小数点
      if (key === '.') {
        if (currentValue.includes('.')) {
          return; // 已经有小数点了
        }
        if (currentValue === '') {
          this.updateValue('0.');
          return;
        }
      }

      // 处理数字
      if (key !== '.') {
        // 检查长度限制
        if (currentValue.length >= maxLength) {
          return;
        }

        // 检查小数位数限制
        if (currentValue.includes('.')) {
          const decimalPart = currentValue.split('.')[1];
          if (decimalPart && decimalPart.length >= decimalPlaces) {
            return;
          }
        }
      }

      // 更新值
      const newValue = currentValue + key;
      this.updateValue(newValue);
    },

    /**
     * 删除键点击
     */
    onDeleteTap() {
      const { inputValue } = this.data;
      const currentValue = inputValue.toString();
      
      if (currentValue.length > 0) {
        const newValue = currentValue.slice(0, -1);
        this.updateValue(newValue);
      }
    },

    /**
     * 更新值
     */
    updateValue(value) {
      const displayValue = value || '0.0';
      this.setData({
        inputValue: value,
        displayValue: displayValue
      });
    },

    /**
     * 验证输入值
     */
    validateValue(value) {
      if (!value || value === '') {
        return { valid: false, message: '请输入体温值' };
      }

      const numValue = parseFloat(value);
      
      // 使用工具类验证
      const validation = Validator.validateTemperature(numValue);
      if (!validation.valid) {
        return validation;
      }

      // 检查范围
      if (numValue < this.properties.minValue || numValue > this.properties.maxValue) {
        return { 
          valid: false, 
          message: `体温应在${this.properties.minValue}°C - ${this.properties.maxValue}°C之间` 
        };
      }

      return { valid: true };
    },

    /**
     * 取消按钮点击
     */
    onCancelTap() {
      this.triggerEvent('cancel');
    },

    /**
     * 确定按钮点击
     */
    onConfirmTap() {
      const { inputValue } = this.data;
      
      // 验证输入
      const validation = this.validateValue(inputValue);
      if (!validation.valid) {
        wx.showToast({
          title: validation.message,
          icon: 'none',
          duration: 2000
        });
        return;
      }

      // 触发确认事件
      this.triggerEvent('confirm', {
        value: parseFloat(inputValue)
      });
    },

    /**
     * 遮罩点击
     */
    onMaskTap() {
      this.triggerEvent('cancel');
    }
  }
});