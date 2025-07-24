// 设置页面
Page({
  data: {
    userInfo: {
      age: 25,
      averageCycleLength: 28
    },
    reminders: {
      morningTemp: true,
      fertileWindow: true
    }
  },

  onLoad(options) {
    console.log('设置页面加载');
    this.loadSettings();
  },

  onReady() {
    console.log('设置页面渲染完成');
  },

  // 加载设置
  loadSettings() {
    // TODO: 从本地存储加载设置
    console.log('加载用户设置');
  },

  // 切换提醒
  onReminderToggle(e) {
    const { type } = e.currentTarget.dataset;
    const key = `reminders.${type}`;
    this.setData({
      [key]: !this.data.reminders[type]
    });
  },

  // 保存设置
  onSave() {
    // TODO: 保存到本地存储
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });
  },

  // 数据导出
  onExportData() {
    wx.showToast({
      title: '导出功能开发中',
      icon: 'none'
    });
  },

  // 清除数据
  onClearData() {
    wx.showModal({
      title: '确认清除',
      content: '清除后数据无法恢复，是否继续？',
      success: (res) => {
        if (res.confirm) {
          // TODO: 清除本地数据
          wx.showToast({
            title: '清除成功',
            icon: 'success'
          });
        }
      }
    });
  }
});
