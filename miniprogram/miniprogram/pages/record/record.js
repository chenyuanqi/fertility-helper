// 记录页面
Page({
  data: {
    temperature: '',
    menstrualFlow: 'medium',
    hasIntercourse: false,
    note: ''
  },

  onLoad(options) {
    console.log('记录页面加载');
  },

  onReady() {
    console.log('记录页面渲染完成');
  },

  // 体温输入
  onTemperatureInput(e) {
    this.setData({
      temperature: e.detail.value
    });
  },

  // 经量选择
  onFlowChange(e) {
    const { value } = e.currentTarget.dataset;
    this.setData({
      menstrualFlow: value
    });
  },

  // 备注输入
  onNoteInput(e) {
    this.setData({
      note: e.detail.value
    });
  },

  // 同房记录
  onIntercourseToggle() {
    this.setData({
      hasIntercourse: !this.data.hasIntercourse
    });
  },

  // 保存记录
  onSave() {
    const { temperature, menstrualFlow, hasIntercourse, note } = this.data;
    
    // TODO: 保存到本地存储
    console.log('保存记录:', {
      temperature,
      menstrualFlow,
      hasIntercourse,
      note,
      date: new Date().toISOString().split('T')[0]
    });
    
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });
  }
});
