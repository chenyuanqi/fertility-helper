// pages/record/record.js
Page({
  data: {
    recordType: 'temperature' // temperature, menstrual, intercourse
  },

  onLoad(options) {
    if (options.type) {
      this.setData({
        recordType: options.type
      });
    }
  }
});