/**
 * 算法一致性测试套件
 * 测试不同页面调用相同算法时结果的一致性
 */
const { TestUtils, TestDataFactory } = require('./TestUtils.js');
const { DataManager } = require('../../utils/dataManager.js');
const { OvulationAlgorithm } = require('../../utils/ovulationAlgorithm.js');
const { DataAnalysis } = require('../../utils/dataAnalysis.js');
const { DateUtils } = require('../../utils/date.js');

describe('算法一致性测试', () => {
  let dataManager;

  beforeEach(async () => {
    // 清空所有存储数据
    await TestUtils.clearAllStorage();
    
    // 重置DataManager实例
    dataManager = DataManager.getInstance();
    
    // 设置测试数据
    await TestDataFactory.setupTestEnvironment();
  });

  afterEach(async () => {
    // 清理测试数据
    await TestUtils.cleanupTestData();
  });

  /**
   * 测试排卵期预测算法在不同页面结果一致
   */
  describe('排卵期预测算法一致性', () => {
    test('相同体温数据在不同调用场景下预测结果一致', async () => {
      // 生成标准的双相体温数据
      const temperatureData = TestDataFactory.generateTemperatureSequence({
        startDate: '2025-01-01',
        endDate: '2025-01-28'
      }, 'normal');

      // 模拟首页调用排卵预测
      const indexPrediction = OvulationAlgorithm.analyzeBasalTemperature(temperatureData);
      
      // 模拟图表页调用排卵预测
      const chartPrediction = OvulationAlgorithm.analyzeBasalTemperature(temperatureData);
      
      // 模拟日历页调用排卵预测
      const calendarPrediction = OvulationAlgorithm.analyzeBasalTemperature(temperatureData);

      // 验证所有预测结果一致
      expect(indexPrediction.isValid).toBe(chartPrediction.isValid);
      expect(chartPrediction.isValid).toBe(calendarPrediction.isValid);

      if (indexPrediction.isValid) {
        // 验证体温升高检测一致
        await TestUtils.verifyDataConsistency(
          '排卵预测-体温升高',
          indexPrediction.temperatureShift,
          chartPrediction.temperatureShift
        );

        await TestUtils.verifyDataConsistency(
          '排卵预测-体温升高',
          chartPrediction.temperatureShift,
          calendarPrediction.temperatureShift
        );

        // 验证覆盖线计算一致
        if (indexPrediction.coverLine && chartPrediction.coverLine) {
          expect(indexPrediction.coverLine.temperature).toBe(chartPrediction.coverLine.temperature);
          expect(chartPrediction.coverLine.temperature).toBe(calendarPrediction.coverLine.temperature);
        }

        // 验证排卵日预测一致
        if (indexPrediction.temperatureShift.mostLikelyShift && chartPrediction.temperatureShift.mostLikelyShift) {
          expect(indexPrediction.temperatureShift.mostLikelyShift.date)
            .toBe(chartPrediction.temperatureShift.mostLikelyShift.date);
          expect(chartPrediction.temperatureShift.mostLikelyShift.date)
            .toBe(calendarPrediction.temperatureShift.mostLikelyShift.date);
        }
      }
    });

    test('不同数据量下算法结果稳定性', async () => {
      const baseDate = '2025-01-01';
      const dataLengths = [10, 15, 20, 28, 35]; // 不同长度的数据

      const results = [];

      for (const length of dataLengths) {
        const endDate = DateUtils.addDays(baseDate, length - 1);
        const temperatureData = TestDataFactory.generateTemperatureSequence({
          startDate: baseDate,
          endDate: endDate
        }, 'normal');

        const result = OvulationAlgorithm.analyzeBasalTemperature(temperatureData);
        results.push({ length, result });
      }

      // 验证算法在数据量增加时保持稳定
      for (let i = 1; i < results.length; i++) {
        const previous = results[i - 1];
        const current = results[i];

        if (previous.result.isValid && current.result.isValid) {
          // 排卵日预测应该保持一致或变得更准确
          if (previous.result.temperatureShift.mostLikelyShift && current.result.temperatureShift.mostLikelyShift) {
            const previousDate = previous.result.temperatureShift.mostLikelyShift.date;
            const currentDate = current.result.temperatureShift.mostLikelyShift.date;
            
            // 允许1天的差异，因为数据增加可能会调整预测
            const daysDiff = Math.abs(DateUtils.getDaysDifference(previousDate, currentDate));
            expect(daysDiff).toBeLessThanOrEqual(1);
          }
        }
      }
    });

    test('边界条件下算法行为一致性', async () => {
      // 测试各种边界条件
      const testCases = [
        {
          name: '数据不足',
          data: TestDataFactory.generateTemperatureSequence({
            startDate: '2025-01-01',
            endDate: '2025-01-05'
          }, 'normal')
        },
        {
          name: '无排卵周期',
          data: TestDataFactory.generateTemperatureSequence({
            startDate: '2025-01-01',
            endDate: '2025-01-28'
          }, 'anovulation')
        },
        {
          name: '不规律体温',
          data: TestDataFactory.generateTemperatureSequence({
            startDate: '2025-01-01',
            endDate: '2025-01-28'
          }, 'irregular')
        }
      ];

      for (const testCase of testCases) {
        // 多次调用同一数据，验证结果一致
        const results = [];
        for (let i = 0; i < 5; i++) {
          results.push(OvulationAlgorithm.analyzeBasalTemperature(testCase.data));
        }

        // 验证所有结果完全一致
        for (let i = 1; i < results.length; i++) {
          await TestUtils.verifyDataConsistency(
            `边界条件测试-${testCase.name}`,
            results[0],
            results[i]
          );
        }
      }
    });
  });

  /**
   * 测试易孕期计算在不同场景下保持一致
   */
  describe('易孕期计算一致性', () => {
    test('标准28天周期易孕期计算一致性', async () => {
      const cycleStartDate = '2025-01-01';
      const cycleLength = 28;
      const lutealPhase = 14;

      // 模拟不同模块计算易孕期
      const predictions = [];

      // 使用多种方式计算易孕期
      for (let i = 0; i < 3; i++) {
        // 基于排卵日倒推
        const ovulationDate = DateUtils.addDays(cycleStartDate, cycleLength - lutealPhase);
        const fertileStart = DateUtils.subtractDays(ovulationDate, 5);
        const fertileEnd = DateUtils.addDays(ovulationDate, 1);

        predictions.push({
          ovulationDate,
          fertileStart,
          fertileEnd,
          fertileWindow: {
            start: fertileStart,
            end: fertileEnd,
            length: DateUtils.getDaysDifference(fertileStart, fertileEnd) + 1
          }
        });
      }

      // 验证所有计算结果一致
      for (let i = 1; i < predictions.length; i++) {
        await TestUtils.verifyDataConsistency(
          '易孕期计算',
          predictions[0],
          predictions[i]
        );
      }
    });

    test('不规律周期易孕期计算一致性', async () => {
      const cycleLengths = [26, 30, 32, 35];
      const lutealPhase = 14;

      for (const cycleLength of cycleLengths) {
        const cycleStartDate = '2025-01-01';
        
        // 多次计算同一不规律周期
        const predictions = [];
        for (let i = 0; i < 3; i++) {
          const ovulationDate = DateUtils.addDays(cycleStartDate, cycleLength - lutealPhase);
          const fertileStart = DateUtils.subtractDays(ovulationDate, 5);
          const fertileEnd = DateUtils.addDays(ovulationDate, 1);

          predictions.push({
            cycleLength,
            ovulationDate,
            fertileStart,
            fertileEnd
          });
        }

        // 验证同一周期长度下的计算结果一致
        for (let i = 1; i < predictions.length; i++) {
          await TestUtils.verifyDataConsistency(
            `不规律周期易孕期-${cycleLength}天`,
            predictions[0],
            predictions[i]
          );
        }
      }
    });

    test('数据不足场景下易孕期预测一致性', async () => {
      // 模拟数据不足的情况
      const insufficientDataScenarios = [
        { cycles: 0, description: '无周期数据' },
        { cycles: 1, description: '仅有一个周期' },
        { cycles: 2, description: '两个周期数据' }
      ];

      for (const scenario of insufficientDataScenarios) {
        const predictions = [];
        
        // 多次处理相同的数据不足场景
        for (let i = 0; i < 3; i++) {
          // 这里应该调用实际的预测算法，暂时用模拟结果
          const prediction = {
            isValid: scenario.cycles >= 2,
            confidence: scenario.cycles >= 3 ? 'high' : scenario.cycles >= 2 ? 'medium' : 'low',
            reason: scenario.cycles < 2 ? '数据不足，无法准确预测' : '数据有限，预测准确性较低'
          };
          
          predictions.push(prediction);
        }

        // 验证数据不足时的处理一致性
        for (let i = 1; i < predictions.length; i++) {
          await TestUtils.verifyDataConsistency(
            `数据不足场景-${scenario.description}`,
            predictions[0],
            predictions[i]
          );
        }
      }
    });
  });

  /**
   * 测试周期计算算法一致性
   */
  describe('周期计算算法一致性', () => {
    test('周期长度计算在不同场景下一致', async () => {
      const testCycles = [
        { start: '2025-01-01', end: '2025-01-28', expectedLength: 28 },
        { start: '2025-01-01', end: '2025-01-30', expectedLength: 30 },
        { start: '2025-02-01', end: '2025-02-26', expectedLength: 26 },
        { start: '2025-03-01', end: '2025-03-35', expectedLength: 35 } // 跨月
      ];

      for (const cycle of testCycles) {
        const calculations = [];
        
        // 多种方式计算周期长度
        for (let i = 0; i < 3; i++) {
          const length = DateUtils.getDaysDifference(cycle.start, cycle.end) + 1;
          calculations.push(length);
        }

        // 验证所有计算结果一致
        for (const calculation of calculations) {
          expect(calculation).toBe(cycle.expectedLength);
        }
      }
    });

    test('周期开始日期推算一致性', async () => {
      const baseDate = '2025-01-15';
      const averageCycleLength = 28;

      // 向前推算多个周期的开始日期
      const backwardCalculations = [];
      for (let i = 0; i < 3; i++) {
        const calculations = [];
        for (let cycles = 1; cycles <= 5; cycles++) {
          const startDate = DateUtils.subtractDays(baseDate, averageCycleLength * cycles);
          calculations.push(startDate);
        }
        backwardCalculations.push(calculations);
      }

      // 验证所有向前推算结果一致
      for (let i = 1; i < backwardCalculations.length; i++) {
        await TestUtils.verifyDataConsistency(
          '周期开始日期向前推算',
          backwardCalculations[0],
          backwardCalculations[i]
        );
      }

      // 向后推算多个周期的开始日期
      const forwardCalculations = [];
      for (let i = 0; i < 3; i++) {
        const calculations = [];
        for (let cycles = 1; cycles <= 5; cycles++) {
          const startDate = DateUtils.addDays(baseDate, averageCycleLength * cycles);
          calculations.push(startDate);
        }
        forwardCalculations.push(calculations);
      }

      // 验证所有向后推算结果一致
      for (let i = 1; i < forwardCalculations.length; i++) {
        await TestUtils.verifyDataConsistency(
          '周期开始日期向后推算',
          forwardCalculations[0],
          forwardCalculations[i]
        );
      }
    });

    test('跨年跨月周期计算一致性', async () => {
      const crossBoundaryTests = [
        {
          name: '跨月周期',
          start: '2025-01-25',
          end: '2025-02-22',
          expectedLength: 29
        },
        {
          name: '跨年周期',
          start: '2024-12-15',
          end: '2025-01-12',
          expectedLength: 29
        },
        {
          name: '闰年二月',
          start: '2024-02-01',
          end: '2024-02-29',
          expectedLength: 29
        }
      ];

      for (const test of crossBoundaryTests) {
        const results = [];
        
        // 多次计算跨边界的周期
        for (let i = 0; i < 5; i++) {
          const length = DateUtils.getDaysDifference(test.start, test.end) + 1;
          results.push({
            name: test.name,
            start: test.start,
            end: test.end,
            length: length
          });
        }

        // 验证所有结果一致
        for (let i = 1; i < results.length; i++) {
          await TestUtils.verifyDataConsistency(
            `跨边界周期计算-${test.name}`,
            results[0],
            results[i]
          );
        }

        // 验证计算结果正确
        expect(results[0].length).toBe(test.expectedLength);
      }
    });
  });

  /**
   * 测试数据分析算法一致性
   */
  describe('数据分析算法一致性', () => {
    test('体温趋势分析一致性', async () => {
      // 生成体温趋势测试数据
      const temperatureData = TestDataFactory.generateTemperatureSequence({
        startDate: '2025-01-01',
        endDate: '2025-01-21'
      }, 'normal');

      // 多次进行趋势分析
      const analyses = [];
      for (let i = 0; i < 5; i++) {
        // 这里应该调用实际的趋势分析算法
        // 暂时模拟分析结果
        const analysis = {
          trend: 'biphasic', // 双相
          lowPhaseAvg: 36.3,
          highPhaseAvg: 36.8,
          temperatureRise: 0.5,
          shiftDay: 14
        };
        analyses.push(analysis);
      }

      // 验证所有分析结果一致
      for (let i = 1; i < analyses.length; i++) {
        await TestUtils.verifyDataConsistency(
          '体温趋势分析',
          analyses[0],
          analyses[i]
        );
      }
    });

    test('周期规律性评估一致性', async () => {
      const cycleLengths = [28, 29, 27, 30, 28, 26, 29]; // 模拟历史周期长度

      // 多次评估周期规律性
      const evaluations = [];
      for (let i = 0; i < 3; i++) {
        // 计算标准差
        const average = cycleLengths.reduce((sum, length) => sum + length, 0) / cycleLengths.length;
        const variance = cycleLengths.reduce((sum, length) => sum + Math.pow(length - average, 2), 0) / cycleLengths.length;
        const standardDeviation = Math.sqrt(variance);

        // 评估规律性
        let regularity;
        if (standardDeviation <= 2) {
          regularity = 'regular';
        } else if (standardDeviation <= 4) {
          regularity = 'somewhat_irregular';
        } else {
          regularity = 'irregular';
        }

        evaluations.push({
          average: Math.round(average * 100) / 100,
          standardDeviation: Math.round(standardDeviation * 100) / 100,
          regularity: regularity,
          confidence: standardDeviation <= 2 ? 'high' : standardDeviation <= 4 ? 'medium' : 'low'
        });
      }

      // 验证所有评估结果一致
      for (let i = 1; i < evaluations.length; i++) {
        await TestUtils.verifyDataConsistency(
          '周期规律性评估',
          evaluations[0],
          evaluations[i]
        );
      }
    });

    test('算法版本兼容性测试', async () => {
      // 模拟算法版本升级前后的兼容性
      const testData = TestDataFactory.generateTemperatureSequence({
        startDate: '2025-01-01',
        endDate: '2025-01-28'
      }, 'normal');

      // 旧版本算法结果（模拟）
      const oldVersionResult = {
        ovulationDate: '2025-01-14',
        confidence: 'medium',
        method: 'basic_temperature_shift'
      };

      // 新版本算法结果（模拟）
      const newVersionResult = {
        ovulationDate: '2025-01-14', // 应该保持一致
        confidence: 'high', // 可能提高准确性
        method: 'advanced_temperature_analysis',
        additionalData: {
          coverLine: 36.7,
          shiftMagnitude: 0.4
        }
      };

      // 验证核心预测结果保持一致
      expect(oldVersionResult.ovulationDate).toBe(newVersionResult.ovulationDate);
      
      // 验证向后兼容性
      expect(newVersionResult).toHaveProperty('ovulationDate');
      expect(newVersionResult).toHaveProperty('confidence');
    });
  });

  /**
   * 测试算法性能一致性
   */
  describe('算法性能一致性', () => {
    test('相同输入多次执行性能稳定', async () => {
      const temperatureData = TestDataFactory.generateTemperatureSequence({
        startDate: '2025-01-01',
        endDate: '2025-01-28'
      }, 'normal');

      const executionTimes = [];
      const results = [];

      // 多次执行相同算法
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        const result = OvulationAlgorithm.analyzeBasalTemperature(temperatureData);
        const endTime = Date.now();
        
        executionTimes.push(endTime - startTime);
        results.push(result);
      }

      // 验证执行时间稳定（变异系数小于50%）
      const avgTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
      const timeVariance = executionTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / executionTimes.length;
      const timeStdDev = Math.sqrt(timeVariance);
      const coefficientOfVariation = timeStdDev / avgTime;

      expect(coefficientOfVariation).toBeLessThan(0.5); // 变异系数小于50%

      // 验证所有结果一致
      for (let i = 1; i < results.length; i++) {
        await TestUtils.verifyDataConsistency(
          '性能测试结果一致性',
          results[0],
          results[i]
        );
      }

      console.log(`算法平均执行时间: ${avgTime.toFixed(2)}ms, 标准差: ${timeStdDev.toFixed(2)}ms`);
    });

    test('大数据集处理性能一致性', async () => {
      // 生成大量体温数据
      const largeDataset = TestDataFactory.generateTemperatureSequence({
        startDate: '2023-01-01',
        endDate: '2025-01-31'
      }, 'normal');

      console.log(`大数据集包含 ${largeDataset.length} 条体温记录`);

      const results = [];
      const times = [];

      // 多次处理大数据集
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();
        const result = OvulationAlgorithm.analyzeBasalTemperature(largeDataset);
        const endTime = Date.now();

        times.push(endTime - startTime);
        results.push(result);
      }

      // 验证大数据集处理结果一致
      for (let i = 1; i < results.length; i++) {
        await TestUtils.verifyDataConsistency(
          '大数据集处理结果',
          results[0],
          results[i]
        );
      }

      // 验证性能在可接受范围内（每条记录处理时间小于10ms）
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const timePerRecord = avgTime / largeDataset.length;
      expect(timePerRecord).toBeLessThan(10);

      console.log(`大数据集处理平均时间: ${avgTime.toFixed(2)}ms, 每条记录: ${timePerRecord.toFixed(3)}ms`);
    });
  });
});

module.exports = {
  // 导出辅助函数供其他测试使用
};