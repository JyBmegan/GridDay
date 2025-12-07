import * as echarts from '../../ec-canvas/echarts';

Page({
  data: {
    habit: {},
    ec: { lazyLoad: true }, // 延迟加载图表
    
    // 周视图数据
    currentWeekNum: 0,
    weekStats: { days: 0, count: 0, rate: 0, notes: 0 },
    
    // 月视图数据
    currentYear: 0,
    currentMonth: 0,
    calendarDays: [],
    calendarEmptyDays: [],
    monthStats: { days: 0, count: 0, rate: 0 },

    // 历史记录
    logsList: []
  },

  onLoad(options) {
    if (options.id) {
      this.habitId = Number(options.id);
      this.loadHabit();
    }
  },

  // 加载数据核心函数
  loadHabit() {
    const habits = wx.getStorageSync('habits') || [];
    const habit = habits.find(h => h.id === this.habitId);
    
    if (!habit) {
      wx.showToast({ title: '习惯不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    // 默认颜色防错
    if (!habit.color) habit.color = '#FF9F43';

    this.setData({ habit });
    
    // 1. 处理历史记录列表
    this.processLogs(habit.logs || []);
    
    // 2. 初始化周视图数据
    this.updateWeekView();
    
    // 3. 初始化月视图日历
    this.updateMonthView();
    
    // 4. 初始化图表组件
    this.chartComp = this.selectComponent('#mychart-week');
    this.initChart();
  },

  // --- 1. 处理历史记录 (倒序) ---
  processLogs(logs) {
    const list = logs.map(log => {
      // 兼容旧数据(纯字符串)和新数据(对象)
      const timeStr = typeof log === 'string' ? log : log.time;
      const note = typeof log === 'string' ? '' : log.note;
      
      if (!timeStr) return null;
      
      const d = new Date(timeStr);
      return {
        ts: d.getTime(), // 用于排序
        date: `${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`,
        time: `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`,
        note: note
      };
    }).filter(item => item !== null);

    // 按时间倒序，最新的在上面
    list.sort((a, b) => b.ts - a.ts);

    this.setData({ 
      logsList: list.slice(0, 50) // 只显示最近50条，防止卡顿
    }); 
  },

  // --- 2. 周视图数据逻辑 ---
  updateWeekView() {
    const today = new Date();
    // 获取本周一 (如果今天是周日0，则回退6天)
    const dayOfWeek = today.getDay() || 7; 
    const monday = new Date(today);
    monday.setHours(0,0,0,0);
    monday.setDate(monday.getDate() - dayOfWeek + 1);

    const xLabels = ['一','二','三','四','五','六','日'];
    const dataCounts = [];
    let doneDays = 0;
    let totalCount = 0;

    for(let i=0; i<7; i++) {
        const temp = new Date(monday);
        temp.setDate(temp.getDate() + i);
        const dateStr = this.formatDate(temp);
        
        // 统计当天的打卡数
        const count = (this.data.habit.logs || []).filter(l => {
           const t = typeof l === 'string' ? l : l.time;
           return t && t.startsWith(dateStr);
        }).length;
        
        if(count > 0) doneDays++;
        totalCount += count;
        dataCounts.push(count);
    }

    // 更新页面数据
    this.setData({
        weekStats: {
            days: doneDays,
            count: totalCount,
            rate: Math.round((doneDays/7)*100),
            notes: this.data.logsList.filter(l => l.note).length
        }
    });

    // 如果图表实例已存在，更新图表
    if(this.chartInstance) {
        this.setChartOption(this.chartInstance, xLabels, dataCounts);
    }
  },

  // --- 3. 月视图日历逻辑 ---
  updateMonthView() {
      const d = this.data.currentMonthDate || new Date();
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      
      const firstDay = new Date(year, month-1, 1);
      const lastDay = new Date(year, month, 0);
      
      // 计算月初前面的空白格 (周一为起始)
      let startDay = firstDay.getDay(); 
      if(startDay === 0) startDay = 7;
      
      const calendarDays = [];
      let doneDays = 0;
      let totalCount = 0;

      for(let i=1; i<=lastDay.getDate(); i++) {
          const dateStr = `${year}-${month.toString().padStart(2,'0')}-${i.toString().padStart(2,'0')}`;
          
          const logs = (this.data.habit.logs || []).filter(l => {
            const t = typeof l === 'string' ? l : l.time;
            return t && t.startsWith(dateStr);
          });
          
          if(logs.length > 0) doneDays++;
          totalCount += logs.length;

          calendarDays.push({ 
            day: i, 
            isDone: logs.length > 0 
          });
      }

      this.setData({
          currentYear: year,
          currentMonth: month,
          calendarEmptyDays: new Array(startDay - 1).fill(0),
          calendarDays: calendarDays,
          monthStats: {
              days: doneDays,
              count: totalCount,
              rate: Math.round((doneDays/lastDay.getDate())*100)
          }
      });
  },

  // --- 4. ECharts 图表初始化 ---
  initChart() {
    this.chartComp.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
      this.chartInstance = chart;
      
      // 稍微延迟，确保数据已准备好
      setTimeout(() => {
         this.updateWeekView(); 
      }, 200);
      
      return chart;
    });
  },

  setChartOption(chart, xLabels, data) {
    const color = this.data.habit.color;
    const option = {
        grid: { top: 30, bottom: 20, left: 0, right: 0 },
        tooltip: { 
            trigger: 'axis', 
            confine: true,
            formatter: '{b}: {c}次'
        },
        xAxis: { 
            type: 'category', 
            data: xLabels, 
            axisLine: {show: false}, 
            axisTick: {show: false},
            axisLabel: { color: '#999', fontSize: 11, margin: 10 }
        },
        yAxis: { 
            show: false, 
            minInterval: 1 
        },
        series: [{
            type: 'bar', 
            data: data, 
            barWidth: 14,
            itemStyle: { 
                borderRadius: [6,6,6,6], 
                color: color 
            },
            showBackground: true,
            backgroundStyle: { color: '#f5f6fa', borderRadius: 6 },
            label: { 
                show: true, 
                position: 'top', 
                color: color, 
                fontSize: 12,
                formatter: p => p.value > 0 ? p.value : '' 
            }
        }]
    };
    chart.setOption(option);
  },

  // 辅助：日期格式化 YYYY-MM-DD
  formatDate(d) {
      return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
  },

  // 删除习惯
  deleteHabit() {
     wx.showModal({
      title: '⚠️ 确认删除',
      content: `确定要删除“${this.data.habit.name}”吗？此操作无法撤销。`,
      confirmColor: '#ff6b6b',
      success: (res) => {
        if (res.confirm) {
          let habits = wx.getStorageSync('habits') || [];
          const newHabits = habits.filter(h => h.id !== this.data.habit.id);
          wx.setStorageSync('habits', newHabits);
          wx.navigateBack();
        }
      }
    })
  }
});