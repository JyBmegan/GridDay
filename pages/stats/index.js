import * as echarts from '../../ec-canvas/echarts';

Page({
  data: {
    allHabits: [],      // 所有习惯
    filteredHabits: [], // 当前分类下的习惯 (用于页面渲染)
    
    // 视图控制
    displayMode: 'trend', // 'trend' | 'time'
    currentView: 'week',  // 'week' | 'month' | 'year'
    
    // 分类筛选
    categories: [],
    currentCategory: '全部',
    showDropdown: false
  },

  onShow() {
    this.loadData();
  },

  // --- 1. 数据加载与筛选 ---
  loadData() {
    const habits = wx.getStorageSync('habits') || [];
    const categories = wx.getStorageSync('categories') || [];
    
    // 先保存原始数据
    this.setData({ 
      allHabits: habits, 
      categories: categories 
    });
    
    // 执行计算和筛选
    this.calculateStats();
  },

  // 切换下拉菜单
  toggleDropdown() { this.setData({ showDropdown: !this.data.showDropdown }); },
  closeDropdown() { if(this.data.showDropdown) this.setData({ showDropdown: false }); },
  
  // 切换分类
  switchCategory(e) {
    this.setData({ 
      currentCategory: e.currentTarget.dataset.cat,
      showDropdown: false
    });
    this.calculateStats(); // 分类变了，重新计算显示列表
  },

  // 切换大模式
  switchDisplayMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ displayMode: mode });
    if (mode === 'time') {
      setTimeout(() => this.initAllTimeCharts(), 200);
    }
  },

  // 切换时间维度 (周/月/年)
  switchView(e) {
    this.setData({ currentView: e.currentTarget.dataset.view });
    // 视图变了（比如从周变月），时段统计的数据范围也要变，所以要重新计算
    this.calculateStats();
  },

  // --- 2. 核心计算逻辑 ---
  calculateStats() {
    const { allHabits, currentCategory, currentView } = this.data;
    
    // A. 第一步：先按分类筛选习惯
    let targetHabits = allHabits;
    if (currentCategory !== '全部') {
      targetHabits = allHabits.filter(h => h.category === currentCategory);
    }

    const now = new Date();
    const currentYearStr = now.getFullYear().toString();
    const weekLabels = ['日','一','二','三','四','五','六'];
    
    // B. 准备标尺 (用于过滤数据)
    // 过去7天
    const last7Days = [];
    for(let i=6; i>=0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        last7Days.push({ str: d.toISOString().substring(0, 10), label: weekLabels[d.getDay()] });
    }
    const weekDateStrings = last7Days.map(d => d.str); // 纯日期数组用于查找

    // 过去30天
    const last30Days = [];
    for(let i=29; i>=0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        last30Days.push(d.toISOString().substring(0, 10));
    }

    // 今年12个月
    const monthsOfYear = [];
    for(let i=0; i<12; i++) {
       const m = (i + 1).toString().padStart(2, '0');
       monthsOfYear.push(`${currentYearStr}-${m}`);
    }

    // C. 遍历计算
    const processed = targetHabits.map(h => {
        const logs = h.logs || [];
        const color = h.color || '#FF9F43';

        // --- 1. 周/月/年 趋势数据 (Trend Mode) ---
        // (逻辑保持不变，用于趋势图)
        const weekData = last7Days.map(dayCfg => {
            const count = logs.filter(l => (typeof l === 'string' ? l : l.time).startsWith(dayCfg.str)).length;
            let heightPct = count > 0 ? Math.min(20 + count * 20, 100) : 0;
            return { weekDay: dayCfg.label, count, heightPct };
        });
        const weekTotal = weekData.reduce((acc, cur) => acc + (cur.count>0?1:0), 0);

        const monthData = last30Days.map(dateStr => {
            const count = logs.filter(l => (typeof l === 'string' ? l : l.time).startsWith(dateStr)).length;
            let opacity = count === 1 ? 0.6 : (count >= 2 ? (count >= 3 ? 1 : 0.8) : 0);
            return { date: dateStr, count, opacity };
        });
        const monthTotal = monthData.reduce((acc, cur) => acc + cur.count, 0);

        const yearData = monthsOfYear.map(monthStr => {
            const count = logs.filter(l => (typeof l === 'string' ? l : l.time).startsWith(monthStr)).length;
            let opacity = count > 0 ? (count > 5 ? (count > 15 ? 1 : 0.85) : 0.6) : 0;
            return { month: monthStr, count, opacity };
        });
        const yearTotal = yearData.reduce((acc, cur) => acc + cur.count, 0);

        // --- 2. 时段分布数据 (Time Mode) - ★★★ 核心修改 ★★★ ---
        // 必须根据 currentView 过滤日志，只统计该范围内的时段
        const hoursData = new Array(24).fill(0);
        
        logs.forEach(l => {
            const t = typeof l === 'string' ? l : l.time;
            if (!t) return;
            
            const datePart = t.substring(0, 10); // YYYY-MM-DD
            const monthPart = t.substring(0, 7); // YYYY-MM
            let isInRange = false;

            // 根据当前视图判断是否计入统计
            if (currentView === 'week') {
                if (weekDateStrings.includes(datePart)) isInRange = true;
            } else if (currentView === 'month') {
                if (last30Days.includes(datePart)) isInRange = true;
            } else if (currentView === 'year') {
                if (monthPart.startsWith(currentYearStr)) isInRange = true;
            }

            if (isInRange) {
                const hour = new Date(t).getHours();
                if (hour >= 0 && hour < 24) hoursData[hour]++;
            }
        });

        return {
            ...h, color,
            weekData, weekTotal, monthData, monthTotal, yearData, yearTotal,
            hoursData, // 这是一个 [0, 2, 5, ...] 的数组
            ec: { lazyLoad: true }
        };
    });

    this.setData({ filteredHabits: processed });

    // 如果当前是时段模式，计算完数据后要刷新图表
    if (this.data.displayMode === 'time') {
         setTimeout(() => this.initAllTimeCharts(), 200);
    }
  },

  // --- 3. 初始化 ECharts 曲线图 ---
  initAllTimeCharts() {
    this.data.filteredHabits.forEach(habit => {
      const comp = this.selectComponent(`#chart-time-${habit.id}`);
      if (comp) {
        comp.init((canvas, width, height, dpr) => {
          const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
          
          const option = {
            // 调整边距，给下方 X 轴留出空间
            grid: { left: 5, right: 5, top: 10, bottom: 20 }, 
            xAxis: { 
                type: 'category', 
                data: Array.from({length:24},(_,i)=>i), 
                show: true, // ★★★ 显示 X 轴 ★★★
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: {
                    interval: 5, // 每隔 6 个显示一个 (0, 6, 12, 18)
                    color: '#ccc',
                    fontSize: 9,
                    margin: 8
                }
            },
            yAxis: { type: 'value', show: false },
            series: [{
                data: habit.hoursData,
                type: 'line',
                smooth: true, // 平滑曲线
                symbol: 'none',
                lineStyle: { width: 2, color: habit.color },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                        offset: 0, color: habit.color
                    }, {
                        offset: 1, color: 'rgba(255,255,255,0)'
                    }])
                }
            }]
          };
          chart.setOption(option);
          return chart;
        });
      }
    });
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/packageA/detail/index?id=${id}` });
  }
})