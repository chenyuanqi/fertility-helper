// 备小孕 - 通用JavaScript功能

// 模拟数据存储
const mockData = {
  user: {
    nickname: '小龙',
    avgCycleLength: 28,
    avgLutealPhase: 14
  },
  records: [
    {
      date: '2024-01-15',
      temperature: { value: 36.5, time: '07:00', method: 'oral' },
      menstruation: { padCount: 3 },
      intimacy: [{ time: '22:00' }]
    },
    {
      date: '2024-01-16',
      temperature: { value: 36.6, time: '07:00', method: 'oral' },
      menstruation: { padCount: 2 }
    },
    {
      date: '2024-01-17',
      temperature: { value: 36.8, time: '07:00', method: 'oral' }
    }
  ],
  currentCycle: {
    startDate: '2024-01-10',
    length: null,
    ovulationDate: null
  }
};

// TabBar导航控制
function initTabBar() {
  const tabItems = document.querySelectorAll('.tab-item');
  
  tabItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      
      // 移除所有active类
      tabItems.forEach(tab => tab.classList.remove('active'));
      
      // 添加active类到当前项
      this.classList.add('active');
      
      // 获取目标页面
      const targetPage = this.getAttribute('data-page');
      
      // 模拟页面跳转
      console.log('导航到页面:', targetPage);
      
      // 实际项目中这里会做页面跳转
      // 由于是原型，我们只是改变active状态
    });
  });
}

// 模态框控制
class Modal {
  constructor(modalId) {
    this.modal = document.getElementById(modalId);
    this.isVisible = false;
    
    if (this.modal) {
      this.bindEvents();
    }
  }
  
  bindEvents() {
    // 点击背景关闭
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hide();
      }
    });
    
    // ESC键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
  }
  
  show() {
    if (this.modal) {
      this.modal.classList.add('show');
      this.isVisible = true;
      document.body.style.overflow = 'hidden';
    }
  }
  
  hide() {
    if (this.modal) {
      this.modal.classList.remove('show');
      this.isVisible = false;
      document.body.style.overflow = '';
    }
  }
}

// 消息提示
class Toast {
  static show(message, type = 'info', duration = 2000) {
    // 创建toast元素
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 显示
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // 自动隐藏
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 200);
    }, duration);
  }
  
  static success(message, duration) {
    this.show(message, 'success', duration);
  }
  
  static error(message, duration) {
    this.show(message, 'error', duration);
  }
  
  static warning(message, duration) {
    this.show(message, 'warning', duration);
  }
}

// 日期工具函数
const DateUtils = {
  // 格式化日期
  format(date, format = 'YYYY-MM-DD') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day);
  },
  
  // 获取今天日期
  today() {
    return this.format(new Date());
  },
  
  // 添加天数
  addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  },
  
  // 计算天数差
  diffDays(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
  }
};

// 数字键盘组件
class NumberKeyboard {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.value = '';
    this.maxLength = options.maxLength || 4;
    this.allowDecimal = options.allowDecimal !== false;
    this.onInput = options.onInput || null;
    this.onConfirm = options.onConfirm || null;
    
    this.render();
    this.bindEvents();
  }
  
  render() {
    const keys = [
      '1', '2', '3',
      '4', '5', '6',
      '7', '8', '9',
      '.', '0', '删除'
    ];
    
    let html = '<div class="number-keyboard">';
    html += '<div class="keyboard-display">';
    html += `<span class="keyboard-value">${this.value || '0'}</span>`;
    html += '</div>';
    html += '<div class="keyboard-keys">';
    
    keys.forEach(key => {
      const className = key === '删除' ? 'key delete' : 
                       key === '.' ? 'key decimal' : 'key';
      html += `<button class="${className}" data-key="${key}">${key}</button>`;
    });
    
    html += '</div>';
    html += '<div class="keyboard-actions">';
    html += '<button class="btn btn-secondary" id="keyboardCancel">取消</button>';
    html += '<button class="btn btn-primary" id="keyboardConfirm">确认</button>';
    html += '</div>';
    html += '</div>';
    
    this.container.innerHTML = html;
  }
  
  bindEvents() {
    const keys = this.container.querySelectorAll('.key');
    const display = this.container.querySelector('.keyboard-value');
    const cancelBtn = this.container.querySelector('#keyboardCancel');
    const confirmBtn = this.container.querySelector('#keyboardConfirm');
    
    keys.forEach(key => {
      key.addEventListener('click', () => {
        const keyValue = key.getAttribute('data-key');
        
        if (keyValue === '删除') {
          this.value = this.value.slice(0, -1);
        } else if (keyValue === '.') {
          if (this.allowDecimal && !this.value.includes('.')) {
            this.value += keyValue;
          }
        } else {
          if (this.value.length < this.maxLength) {
            this.value += keyValue;
          }
        }
        
        display.textContent = this.value || '0';
        
        if (this.onInput) {
          this.onInput(this.value);
        }
      });
    });
    
    cancelBtn.addEventListener('click', () => {
      this.value = '';
      display.textContent = '0';
    });
    
    confirmBtn.addEventListener('click', () => {
      if (this.onConfirm) {
        this.onConfirm(this.value);
      }
    });
  }
  
  setValue(value) {
    this.value = String(value);
    const display = this.container.querySelector('.keyboard-value');
    if (display) {
      display.textContent = this.value || '0';
    }
  }
  
  getValue() {
    return this.value;
  }
}

// 滑条组件
class Slider {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.min = options.min || 0;
    this.max = options.max || 100;
    this.value = options.value || this.min;
    this.step = options.step || 1;
    this.labels = options.labels || [];
    this.onChange = options.onChange || null;
    
    this.render();
    this.bindEvents();
  }
  
  render() {
    let html = '<div class="slider-component">';
    html += '<div class="slider-track">';
    html += '<div class="slider-progress"></div>';
    html += '<div class="slider-thumb"></div>';
    html += '</div>';
    
    if (this.labels.length > 0) {
      html += '<div class="slider-labels">';
      this.labels.forEach(label => {
        html += `<span class="label">${label}</span>`;
      });
      html += '</div>';
    }
    
    html += '</div>';
    
    this.container.innerHTML = html;
    this.updateDisplay();
  }
  
  bindEvents() {
    const track = this.container.querySelector('.slider-track');
    const thumb = this.container.querySelector('.slider-thumb');
    
    let isDragging = false;
    
    const handleMove = (clientX) => {
      const rect = track.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const newValue = this.min + percentage * (this.max - this.min);
      
      this.value = Math.round(newValue / this.step) * this.step;
      this.updateDisplay();
      
      if (this.onChange) {
        this.onChange(this.value);
      }
    };
    
    // 鼠标事件
    thumb.addEventListener('mousedown', (e) => {
      isDragging = true;
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        handleMove(e.clientX);
      }
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
    
    // 触摸事件
    thumb.addEventListener('touchstart', (e) => {
      isDragging = true;
      e.preventDefault();
    });
    
    document.addEventListener('touchmove', (e) => {
      if (isDragging) {
        handleMove(e.touches[0].clientX);
      }
    });
    
    document.addEventListener('touchend', () => {
      isDragging = false;
    });
    
    // 点击轨道
    track.addEventListener('click', (e) => {
      if (e.target === track) {
        handleMove(e.clientX);
      }
    });
  }
  
  updateDisplay() {
    const progress = this.container.querySelector('.slider-progress');
    const thumb = this.container.querySelector('.slider-thumb');
    
    const percentage = (this.value - this.min) / (this.max - this.min);
    
    progress.style.width = `${percentage * 100}%`;
    thumb.style.left = `${percentage * 100}%`;
  }
  
  setValue(value) {
    this.value = Math.max(this.min, Math.min(this.max, value));
    this.updateDisplay();
  }
  
  getValue() {
    return this.value;
  }
}

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
  initTabBar();
  
  // 初始化样式
  const style = document.createElement('style');
  style.textContent = `
    /* 数字键盘样式 */
    .number-keyboard {
      background: var(--surface);
      border-radius: 12px 12px 0 0;
      padding: 16px;
    }
    
    .keyboard-display {
      text-align: center;
      padding: 20px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 16px;
    }
    
    .keyboard-value {
      font-size: 32px;
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .keyboard-keys {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .key {
      height: 48px;
      background: var(--background);
      border: none;
      border-radius: var(--border-radius);
      font-size: 18px;
      color: var(--text-primary);
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .key:hover {
      background: var(--border);
    }
    
    .key.delete {
      background: var(--error-color);
      color: white;
    }
    
    .keyboard-actions {
      display: flex;
      gap: 12px;
    }
    
    .keyboard-actions .btn {
      flex: 1;
    }
    
    /* 滑条组件样式 */
    .slider-component {
      padding: 16px 0;
    }
    
    .slider-track {
      height: 4px;
      background: var(--border);
      border-radius: 2px;
      position: relative;
      cursor: pointer;
    }
    
    .slider-progress {
      height: 4px;
      background: linear-gradient(90deg, var(--menstruation-light), var(--menstruation-heavy));
      border-radius: 2px;
      transition: width 0.2s;
    }
    
    .slider-thumb {
      width: 24px;
      height: 24px;
      background: var(--surface);
      border: 2px solid var(--primary-color);
      border-radius: 50%;
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      cursor: grab;
      box-shadow: var(--shadow-small);
    }
    
    .slider-thumb:active {
      cursor: grabbing;
      transform: translate(-50%, -50%) scale(1.2);
    }
    
    .slider-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
    }
    
    .slider-labels .label {
      font-size: 12px;
      color: var(--text-secondary);
    }
  `;
  document.head.appendChild(style);
});

// 全局变量
window.Modal = Modal;
window.Toast = Toast;
window.DateUtils = DateUtils;
window.NumberKeyboard = NumberKeyboard;
window.Slider = Slider;
window.mockData = mockData; 