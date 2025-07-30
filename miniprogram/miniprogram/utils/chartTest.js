/**
 * 图表功能测试脚本
 * 用于验证图表显示和数据处理功能
 */

// 模拟测试用的图表数据
const testChartData = [
  {
    date: '2025-01-01',
    dateDisplay: '1月1日',
    temperature: {
      id: 'temp_1',
      date: '2025-01-01',
      time: '07:00',
      temperature: 36.3,
      note: '',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z'
    },
    menstrual: {
      id: 'mens_1',
      date: '2025-01-01',
      flow: 'medium',
      isStart: true,
      isEnd: false,
      note: '月经开始',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z'
    }
  },
  {
    date: '2025-01-02',
    dateDisplay: '1月2日',
    temperature: {
      id: 'temp_2',
      date: '2025-01-02',
      time: '07:00',
      temperature: 36.2,
      note: '',
      createdAt: '2025-01-02T00:00:00.000Z',
      updatedAt: '2025-01-02T00:00:00.000Z'
    },
    menstrual: {
      id: 'mens_2',
      date: '2025-01-02',
      flow: 'heavy',
      isStart: false,
      isEnd: false,
      note: '',
      createdAt: '2025-01-02T00:00:00.000Z',
      updatedAt: '2025-01-02T00:00:00.000Z'
    }
  },
  {
    date: '2025-01-03',
    dateDisplay: '1月3日',
    temperature: {
      id: 'temp_3',
      date: '2025-01-03',
      time: '07:00',
      temperature: 36.4,
      note: '',
      createdAt: '2025-01-03T00:00:00.000Z',
      updatedAt: '2025-01-03T00:00:00.000Z'
    },
    intercourse: [{
      id: 'inter_3',
      date: '2025-01-03',
      time: '22:00',
      protection: false,
      note: '',
      createdAt: '2025-01-03T00:00:00.000Z',
      updatedAt: '2025-01-03T00:00:00.000Z'
    }]
  },
  {
    date: '2025-01-04',
    dateDisplay: '1月4日',
    temperature: {
      id: 'temp_4',
      date: '2025-01-04',
      time: '07:00',
      temperature: 36.5,
      note: '',
      createdAt: '2025-01-04T00:00:00.000Z',
      updatedAt: '2025-01-04T00:00:00.000Z'
    }
  },
  {
    date: '2025-01-05',
    dateDisplay: '1月5日',
    temperature: {
      id: 'temp_5',
      date: '2025-01-05',
      time: '07:00',
      temperature: 36.7,
      note: '',
      createdAt: '2025-01-05T00:00:00.000Z',
      updatedAt: '2025-01-05T00:00:00.000Z'
    },
    intercourse: [{
      id: 'inter_5',
      date: '2025-01-05',
      time: '21:30',
      protection: true,
      note: '',
      createdAt: '2025-01-05T00:00:00.000Z',
      updatedAt: '2025-01-05T00:00:00.000Z'
    }]
  }
];

/**
 * 测试图表数据验证函数
 */
function testChartDataValidation() {
  console.log('=== 图表数据验证测试开始 ===');
  
  const stats = {
    totalDays: testChartData.length,
    temperatureDays: 0,
    menstrualDays: 0,
    intercourseDays: 0
  };
  
  testChartData.forEach((day, index) => {
    console.log(`第${index + 1}天 (${day.date}):`);
    
    // 检查日期显示
    if (day.dateDisplay) {
      console.log(`  ✓ 日期显示: ${day.dateDisplay}`);
    } else {
      console.log(`  ✗ 缺少日期显示`);
    }
    
    // 检查体温数据
    if (day.temperature && day.temperature.temperature) {
      stats.temperatureDays++;
      console.log(`  ✓ 体温: ${day.temperature.temperature}°C`);
    } else {
      console.log(`  - 无体温数据`);
    }
    
    // 检查月经数据
    if (day.menstrual && day.menstrual.flow && day.menstrual.flow !== 'none') {
      stats.menstrualDays++;
      console.log(`  ✓ 月经: ${day.menstrual.flow}`);
    } else {
      console.log(`  - 无月经数据`);
    }
    
    // 检查同房数据
    if (day.intercourse && day.intercourse.length > 0) {
      const validIntercourse = day.intercourse.filter(item => 
        item.type !== 'none' && item.time
      );
      if (validIntercourse.length > 0) {
        stats.intercourseDays++;
        console.log(`  ✓ 同房: ${validIntercourse.length}次`);
      } else {
        console.log(`  - 同房记录已过滤（无实际行为）`);
      }
    } else {
      console.log(`  - 无同房数据`);
    }
  });
  
  console.log('\n=== 统计结果 ===');
  console.log(`总天数: ${stats.totalDays}`);
  console.log(`有体温数据: ${stats.temperatureDays}天`);
  console.log(`有月经数据: ${stats.menstrualDays}天`);  
  console.log(`有同房数据: ${stats.intercourseDays}天`);
  console.log('=== 图表数据验证测试结束 ===\n');
  
  return stats;
}

/**
 * 测试日期标签生成函数
 */
function testDateLabelGeneration() {
  console.log('=== 日期标签生成测试开始 ===');
  
  const dataLength = testChartData.length;
  const maxLabels = 5;
  const displayIndexes = [];
  
  if (dataLength <= maxLabels) {
    // 如果数据点不多，显示所有点
    for (let i = 0; i < dataLength; i++) {
      displayIndexes.push(i);
    }
  } else {
    // 均匀分布显示标签
    displayIndexes.push(0); // 始终显示第一个
    
    const step = Math.floor((dataLength - 1) / (maxLabels - 1));
    for (let i = 1; i < maxLabels - 1; i++) {
      const index = step * i;
      if (index < dataLength) {
        displayIndexes.push(index);
      }
    }
    
    displayIndexes.push(dataLength - 1); // 始终显示最后一个
  }
  
  console.log(`数据长度: ${dataLength}, 最大标签数: ${maxLabels}`);
  console.log(`显示索引: [${displayIndexes.join(', ')}]`);
  
  displayIndexes.forEach(index => {
    if (testChartData[index]) {
      console.log(`索引 ${index}: ${testChartData[index].dateDisplay}`);
    }
  });
  
  console.log('=== 日期标签生成测试结束 ===\n');
  
  return displayIndexes;
}

// 如果是在Node.js环境中运行测试
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testChartData,
    testChartDataValidation,
    testDateLabelGeneration
  };
}

// 如果是在浏览器或小程序环境中运行测试
if (typeof console !== 'undefined') {
  // 运行所有测试
  testChartDataValidation();
  testDateLabelGeneration();
}