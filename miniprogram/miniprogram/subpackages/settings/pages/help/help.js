// pages/help/help.js - 使用说明页面
Page({
  data: {
    filteredSections: [], // 过滤后的章节数据
    helpSections: [
      {
        id: 'basic',
        title: '基础功能',
        icon: '📱',
        items: [
          {
            title: '首页概览',
            content: '首页显示当前周期的基本信息，包括周期天数、平均体温、预测排卵日等关键数据。'
          },
          {
            title: '快捷记录（新）',
            content: '首页“快捷记录”支持语音/文字一键解析体温、时间、经量（含颜色）、同房（含是否避孕），解析后可在表单中编辑确认再保存；支持相对日期（昨天/前天），不支持未来日期。'
          },
          {
            title: '数据统计',
            content: '首页卡片展示本周期的数据摘要，帮助您快速了解记录情况。'
          }
        ]
      },
      {
        id: 'calendar',
        title: '日历功能',
        icon: '📅',
        items: [
          {
            title: '月视图',
            content: '日历页面以月为单位显示所有记录，不同颜色的标记代表不同类型的数据。'
          },
          {
            title: '数据标记与背景（更新）',
            content: '• 红色圆点：月经记录\n• 蓝色：同房记录\n• 背景浅橙：易孕期\n• 背景红色：最佳受孕期（排卵日前2天至排卵日）'
          },
          {
            title: '日期操作',
            content: '点击任意日期可以查看详细信息或添加/编辑当日记录。'
          },
          {
            title: '月份切换',
            content: '使用左右箭头或滑动手势可以切换查看不同月份的数据。'
          }
        ]
      },
      {
        id: 'chart',
        title: '图表分析',
        icon: '📊',
        items: [
          {
            title: '体温曲线',
            content: '图表页面显示基础体温的变化趋势，帮助识别排卵期和黄体期。'
          },
          {
            title: '数据标记与背景（更新）',
            content: '• 蓝色连线：体温曲线\n• 红色圆点：月经记录\n• 紫色圆点：同房记录\n• 背景浅橙：易孕期\n• 背景红色：最佳受孕期'
          },
          {
            title: '日期格式',
            content: '图表底部显示日期，格式为MMDD（如0728表示7月28日）。'
          },
          {
            title: '显示模式',
            content: '可以切换"全部数据"和"仅体温"两种显示模式，满足不同分析需求。'
          },
          {
            title: '周期切换',
            content: '使用左右箭头可以查看不同周期的数据，方便对比分析。'
          }
        ]
      },
      {
        id: 'temperature',
        title: '体温记录',
        icon: '🌡️',
        items: [
          {
            title: '测量时间',
            content: '建议每天早晨醒来后，在同一时间测量基础体温，保持数据的一致性。'
          },
          {
            title: '测量方法',
            content: '使用体温计测量口腔、腋下或直肠温度，推荐使用数字体温计获得精确读数。'
          },
          {
            title: '数据范围',
            content: '正常基础体温范围为35.0°C-40.0°C，系统会自动验证输入数据的合理性；快捷记录支持中文数字与时段（如“晚上十点”）。'
          },
          {
            title: '趋势分析',
            content: '排卵后体温通常会上升0.3-0.5°C，持续到下次月经来潮前。'
          }
        ]
      },
      {
        id: 'menstrual',
        title: '月经记录',
        icon: '🩸',
        items: [
          {
            title: '流量与颜色（更新）',
            content: '支持记录流量（无/少量/中量/大量）与颜色（鲜红/暗红/褐色/粉色），颜色以小圆点展示。'
          },
          {
            title: '周期计算',
            content: '系统会自动计算月经周期长度，并预测下次月经开始时间。'
          },
          {
            title: '颜色标记',
            content: '• 浅红色：轻度流量\n• 中红色：中度流量\n• 深红色：重度流量'
          },
          {
            title: '健康提醒',
            content: '如果月经周期异常（过长或过短），建议咨询医生。'
          }
        ]
      },
      {
        id: 'intercourse',
        title: '同房记录',
        icon: '💕',
        items: [
          {
            title: '时间记录',
            content: '可以记录同房的具体时间，帮助计算受孕概率。'
          },
          {
            title: '安全措施',
            content: '可以标记是否采取了安全措施，便于生育计划管理。'
          },
          {
            title: '频次统计',
            content: '系统会统计每个周期的同房次数，在图表中用数字标记多次记录。'
          },
          {
            title: '最佳时机',
            content: '排卵期前后是受孕的最佳时机，可结合体温曲线判断。'
          }
        ]
      },
      {
        id: 'settings',
        title: '个人设置',
        icon: '⚙️',
        items: [
          {
            title: '个人信息（更新）',
            content: '可设置“平均周期长度”和“黄体期长度”。系统将据此统一计算排卵与易孕期。黄体期长度与周期长度存在冲突时，页面会给出联动建议。'
          },
          {
            title: '提醒设置',
            content: '可以设置体温测量提醒、月经预测提醒等，避免遗漏重要记录。'
          },
          {
            title: '数据管理',
            content: '支持数据导出与导入；导出文件包含 schemaVersion 字段以便版本兼容。'
          },
          {
            title: '隐私保护',
            content: '所有数据仅存储在您的设备本地，确保个人隐私安全。'
          }
        ]
      },
      {
        id: 'tips',
        title: '使用技巧',
        icon: '💡',
        items: [
          {
            title: '坚持记录',
            content: '建议每天坚持记录体温，至少连续记录3个月经周期才能获得准确的排卵预测。'
          },
          {
            title: '数据完整性',
            content: '尽量记录完整的数据（体温、月经、同房），这样分析结果会更准确。'
          },
          {
            title: '异常情况',
            content: '如果出现发烧、失眠、饮酒等影响体温的情况，可以在备注中说明。'
          },
          {
            title: '医生咨询',
            content: '可以将图表数据截图或导出，在就医时提供给医生参考。'
          },
          {
            title: '备份数据',
            content: '定期备份数据，避免因设备问题导致重要记录丢失。'
          }
        ]
      }
    ],
    expandedSections: {},
    searchKeyword: ''
  },

  onLoad(query) {
    // 支持以隐私政策/联系我们模式显示
    if (query && query.view === 'privacy') {
      const privacySections = [
        {
          id: 'privacy',
          title: '隐私政策',
          icon: '🔒',
          items: [
            { title: '本地存储', content: '所有数据仅保存在您的设备，不会上传服务器。' },
            { title: '权限使用', content: '仅在必要时使用读写存储、剪贴板、文件访问等本地权限。' },
            { title: '数据导出', content: '导出文件仅供您本人保管与分享，请勿泄露敏感信息。' },
            { title: '数据删除', content: '可在设置→危险操作中清空全部数据，此操作不可恢复。' },
            { title: '变更通知', content: '隐私政策如有变更，将在设置页同步更新版本说明。' }
          ]
        }
      ];
      this.setData({
        helpSections: privacySections,
        filteredSections: privacySections,
        expandedSections: { privacy: true }
      });
      return;
    }
    if (query && query.view === 'contact') {
      const contactSections = [
        {
          id: 'contact',
          title: '联系我们',
          icon: '📮',
          items: [
            { title: '微信官方反馈（推荐）', content: '1. 在任意页面，点击右上角“...”菜单\n2. 选择“反馈与投诉”进入反馈入口\n3. 按引导提交问题（可附截图/描述/联系方式）' },
            { title: '邮箱联系', content: '邮箱：chenyuanqi@outlook.com' },
            { title: '提交建议的最佳实践', content: '请尽量提供问题出现的页面、复现步骤、截图或录屏、设备型号与系统版本，以便快速定位与修复。' }
          ]
        }
      ];
      this.setData({
        helpSections: contactSections,
        filteredSections: contactSections,
        expandedSections: { contact: true }
      });
      return;
    }
    // 默认展开第一个部分
    this.setData({
      'expandedSections.basic': true,
      filteredSections: this.data.helpSections
    });
  },

  /**
   * 切换章节展开/收起状态
   */
  toggleSection(e) {
    const sectionId = e.currentTarget.dataset.id;
    const key = `expandedSections.${sectionId}`;
    const currentState = this.data.expandedSections[sectionId] || false;
    
    this.setData({
      [key]: !currentState
    });
  },

  /**
   * 搜索功能
   */
  onSearchInput(e) {
    const keyword = e.detail.value.toLowerCase();
    this.setData({
      searchKeyword: keyword
    });
    this.filterSections(keyword);
  },

  /**
   * 清除搜索
   */
  clearSearch() {
    this.setData({
      searchKeyword: ''
    });
    this.filterSections('');
  },

  /**
   * 过滤章节数据
   */
  filterSections(keyword) {
    if (!keyword) {
      // 没有搜索关键词时显示所有章节
      this.setData({
        filteredSections: this.data.helpSections
      });
      return;
    }

    // 过滤章节和项目
    const filteredSections = this.data.helpSections.map(section => {
      // 检查章节标题是否匹配
      const sectionMatches = section.title.toLowerCase().includes(keyword);
      
      // 过滤匹配的项目
      const filteredItems = section.items.filter(item => 
        item.title.toLowerCase().includes(keyword) || 
        item.content.toLowerCase().includes(keyword)
      );
      
      // 如果章节标题匹配或有匹配的项目，则包含此章节
      if (sectionMatches || filteredItems.length > 0) {
        return {
          ...section,
          items: sectionMatches ? section.items : filteredItems
        };
      }
      
      return null;
    }).filter(section => section !== null);

    this.setData({
      filteredSections: filteredSections
    });
  },

  /**
   * 展开所有章节
   */
  expandAll() {
    const expandedSections = {};
    this.data.filteredSections.forEach(section => {
      expandedSections[section.id] = true;
    });
    this.setData({ expandedSections });
  },

  /**
   * 收起所有章节
   */
  collapseAll() {
    this.setData({ expandedSections: {} });
  },

  /**
   * 分享使用说明
   */
  onShareAppMessage() {
    return {
      title: '备孕助手使用说明',
      path: '/pages/help/help'
    };
  },

  /**
   * 返回设置页面
   */
  goBack() {
    wx.navigateBack();
  }
});