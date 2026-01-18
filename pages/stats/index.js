import * as echarts from '../../ec-canvas/echarts';

Page({
  data: {
    statType: 'habit',
    
    // Habit Data
    allHabits: [], filteredHabits: [], categories: [], 
    currentCategory: 'All', showDropdown: false, displayMode: 'trend',
    
    // Plan Data
    planCategories: [], 
    planSummary: { totalHours: 0, count: 0, activeDays: 0, topCat: '-' },
    planFilterCats: [], 
    currentPlanCategory: 'All', 
    showPlanDropdown: false,
    
    heatmapGrid: [], 
    isYearView: false, 
    trendHeight: 300,
    currentView: 'week', // week, month, year, all
    dateRangeStr: '',
    anchorDate: new Date().getTime(),
    
    footerData: {
        heatmap: { label1: '-', val1: '-', label2: '-', val2: '-' },
        trend:   { label1: '-', val1: '-', label2: '-', val2: '-' },
        dist:    { label1: '-', val1: '-', label2: '-', val2: '-' },
        curve:   { label1: '-', val1: '-', label2: '-', val2: '-' }
    },
    
    ecPie: { lazyLoad: true },
    ecStackBar: { lazyLoad: true },
    ecLine: { lazyLoad: true }
  },

  chartInstances: {}, 
  habitChartInstances: {}, 

  goToHelp() {
    wx.navigateTo({ url: '/packageA/help/index' });
  },

  onShow() {
    this.updateDateRangeStr();
    if(this.data.statType === 'plan') this.autoJumpToData();
    setTimeout(() => this.loadData(), 200);
  },

  safeDate(dateStr) {
    if (!dateStr) return new Date();
    const cleanStr = dateStr.toString().replace(/-/g, '/').split(' ')[0]; 
    return new Date(cleanStr);
  },
  
  safeDateTime(dateStr) {
      if(!dateStr) return new Date();
      return new Date(dateStr.toString().replace(/-/g, '/').replace('T', ' '));
  },

  fmt(d) {
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  },
  pad(n) { return n.toString().padStart(2, '0'); },

  stopProp(){ return; },

  switchStatType(e) {
    // Clear instances when switching types to avoid conflicts
    this.chartInstances = {}; 
    this.habitChartInstances = {}; 
    
    this.setData({ statType: e.currentTarget.dataset.type });
    if(e.currentTarget.dataset.type === 'plan') this.autoJumpToData();
    setTimeout(() => { this.updateDateRangeStr(); this.loadData(); }, 100);
  },
  
  switchView(e) {
    // Don't clear instances here, we want to reuse them for smooth transition
    this.setData({ currentView: e.currentTarget.dataset.view });
    this.updateDateRangeStr();
    this.loadData();
  },

  loadData() {
    if (this.data.statType === 'habit') this.loadHabitStats();
    else this.loadPlanStats();
  },

  prevRange() { this.shiftRange(-1); },
  nextRange() { this.shiftRange(1); },
  shiftRange(dir) {
    if (this.data.currentView === 'all') return;
    const d = new Date(this.data.anchorDate);
    const v = this.data.currentView;
    if (v === 'week') d.setDate(d.getDate() + (7 * dir));
    else if (v === 'month') d.setMonth(d.getMonth() + dir);
    else d.setFullYear(d.getFullYear() + dir);
    this.setData({ anchorDate: d.getTime() });
    this.updateDateRangeStr();
    this.loadData();
  },

  updateDateRangeStr() {
    const d = new Date(this.data.anchorDate);
    const v = this.data.currentView;
    let str = '';
    const mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    
    if (v === 'week') {
      const day = d.getDay() || 7; 
      const start = new Date(d); start.setDate(d.getDate() - day + 1);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      str = `${start.getMonth()+1}/${start.getDate()} - ${end.getMonth()+1}/${end.getDate()}`;
    } else if (v === 'month') { 
        str = `${mNames[d.getMonth()]} ${d.getFullYear()}`; 
    } else if (v === 'year') { 
        str = `${d.getFullYear()}`; 
    } else {
        str = 'All Time';
    }
    this.setData({ dateRangeStr: str });
  },

  autoJumpToData() {
    const plans = wx.getStorageSync('plans') || [];
    if (plans.length > 0) {
        const lastPlan = plans[plans.length - 1];
        const lastDate = this.safeDate(lastPlan.date);
        const anchor = new Date(this.data.anchorDate);
        if (lastDate.getFullYear() !== anchor.getFullYear() || lastDate.getMonth() !== anchor.getMonth()) {
            this.setData({ anchorDate: lastDate.getTime() });
            this.updateDateRangeStr();
        }
    }
  },


  loadHabitStats() {
    const habits = wx.getStorageSync('habits') || [];
    const categories = wx.getStorageSync('categories') || [];
    this.setData({ categories, allHabits: habits });
    
    let targetHabits = habits;
    if(this.data.currentCategory !== 'All') {
        targetHabits = habits.filter(h => h.category === this.data.currentCategory);
    }
    
    const view = this.data.currentView;
    const anchor = new Date(this.data.anchorDate);
    const anchorYear = anchor.getFullYear();
    const anchorMonth = anchor.getMonth();

    let startStr = '1900-01-01', endStr = '2099-12-31';
    const weekLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const currentWeekDays = []; 
    const currentMonthDays = [];
    const monthsOfYear = []; 
    
    if (view === 'week') {
        const day = anchor.getDay() || 7; 
        const monday = new Date(anchor); monday.setDate(anchor.getDate() - day + 1);
        const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
        startStr = this.fmt(monday); endStr = this.fmt(sunday);

        for(let i=0; i<7; i++) {
            const d = new Date(monday); d.setDate(monday.getDate() + i);
            currentWeekDays.push({ str: this.fmt(d), label: weekLabels[i] });
        }
    } 
    else if (view === 'month') {
        const firstDay = new Date(anchorYear, anchorMonth, 1);
        const lastDay = new Date(anchorYear, anchorMonth + 1, 0);
        startStr = this.fmt(firstDay); endStr = this.fmt(lastDay);

        for(let i = 1; i <= lastDay.getDate(); i++) {
            const d = new Date(anchorYear, anchorMonth, i);
            currentMonthDays.push(this.fmt(d));
        }
    }
    else if (view === 'year') {
        startStr = `${anchorYear}-01-01`; endStr = `${anchorYear}-12-31`;
        for(let i=0; i<12; i++) { 
            const m = (i + 1).toString().padStart(2, '0'); 
            monthsOfYear.push(`${anchorYear}-${m}`); 
        }
    }

    const processed = targetHabits.map(h => {
        const logs = h.logs || [];
        const color = h.color || '#FF9F43';

        // Trend Data
        const weekData = currentWeekDays.map(dayCfg => {
            const count = logs.filter(l => (typeof l==='string'?l:l.time).startsWith(dayCfg.str)).length;
            let heightPct = count > 0 ? Math.min(30 + count * 20, 100) : 0;
            return { weekDay: dayCfg.label, count, heightPct };
        });
        const weekTotal = weekData.reduce((acc, cur) => acc + cur.count, 0);

        const monthData = currentMonthDays.map(dateStr => {
            const count = logs.filter(l => (typeof l==='string'?l:l.time).startsWith(dateStr)).length;
            const dayNum = parseInt(dateStr.split('-')[2]); 
            return { date: dateStr, dayNum: dayNum, count, opacity: count > 0 ? (count >= 3 ? 1 : 0.6) : 1, isEmpty: count === 0 };
        });
        const monthTotal = monthData.reduce((acc, cur) => acc + cur.count, 0);

        const yearData = monthsOfYear.map(monthStr => {
            const count = logs.filter(l => (typeof l==='string'?l:l.time).startsWith(monthStr)).length;
            return { month: monthStr, count, opacity: count > 0 ? (count > 5 ? 1 : 0.6) : 1, isEmpty: count === 0 };
        });
        const yearTotal = yearData.reduce((acc, cur) => acc + cur.count, 0);

        const hoursData = new Array(24).fill(0);
        let rangeTotalCount = 0;

        logs.forEach(l => { 
            const t = typeof l === 'string' ? l : l.time; 
            if(t) { 
                const datePart = t.split('T')[0];
                if (datePart >= startStr && datePart <= endStr) {
                    const d = this.safeDateTime(t);
                    const hour = d.getHours(); 
                    if(!isNaN(hour) && hour >= 0 && hour < 24) {
                        hoursData[hour]++; 
                    }
                    rangeTotalCount++;
                }
            } 
        });

        let displayTotal = 0;
        if (this.data.displayMode === 'trend') {
            if (view === 'week') displayTotal = weekTotal;
            else if (view === 'month') displayTotal = monthTotal;
            else if (view === 'year') displayTotal = yearTotal;
            else displayTotal = logs.length; 
        } else {
            displayTotal = rangeTotalCount;
        }

        return { 
            ...h, color, 
            weekData, weekTotal, 
            monthData, monthTotal, 
            yearData, yearTotal, 
            hoursData, 
            rangeTotalCount, 
            displayTotal,    
            ec: { lazyLoad: true } 
        };
    });

    this.setData({ filteredHabits: processed });
    
    if (this.data.displayMode === 'time') { 
        setTimeout(() => this.initAllHabitTimeCharts(3), 200); 
    }
  }, 

  toggleDropdown() { this.setData({ showDropdown: !this.data.showDropdown }); },
  closeDropdown() { if(this.data.showDropdown) this.setData({ showDropdown: false }); if(this.data.showPlanDropdown) this.setData({ showPlanDropdown: false }); },
  switchCategory(e) { this.setData({ currentCategory: e.currentTarget.dataset.cat, showDropdown: false }); this.loadHabitStats(); },
  switchPlanCategory(e) { this.setData({ currentPlanCategory: e.currentTarget.dataset.cat, showPlanDropdown: false }); this.loadPlanStats(); },
  switchDisplayMode(e) { this.setData({ displayMode: e.currentTarget.dataset.mode }); if(e.currentTarget.dataset.mode==='time') setTimeout(()=>this.initAllHabitTimeCharts(3),300); },
  togglePlanDropdown() { this.setData({ showPlanDropdown: !this.data.showPlanDropdown }); },
  
  initAllHabitTimeCharts(retry) {
    if(retry <= 0) return;
    const xLabels = Array.from({length: 24}, (_, i) => i);

    this.data.filteredHabits.forEach(habit => {
      const chartId = `chart-time-${habit.id}`;
      
      if (this.habitChartInstances[chartId]) {
         const chart = this.habitChartInstances[chartId];
         chart.setOption({
            series: [{
                data: habit.hoursData,
                lineStyle: { color: habit.color },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0,0,0,1, [
                        {offset:0, color:habit.color}, 
                        {offset:1, color:'rgba(255,255,255,0)'}
                    ])
                }
            }]
         });
         return; 
      }

      const comp = this.selectComponent(`#${chartId}`);
      if(comp) {
        comp.init((canvas, width, height, dpr) => {
          const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
          
          const option = {
            grid: { left: 10, right: 10, top: 10, bottom: 20 },
            xAxis: { 
                type: 'category', 
                data: xLabels, 
                show: true, 
                axisLine: { show: false }, 
                axisTick: { show: false }, 
                axisLabel: { interval: 3, color: '#5d5d5d', fontSize: 10, margin: 8 } 
            }, 
            yAxis: { show: false, min: 0 },
            series: [{ 
                data: habit.hoursData, 
                type: 'line', 
                smooth: 0.8, 
                symbol: 'none',
                lineStyle: { width: 3, color: habit.color }, 
                areaStyle: { 
                    color: new echarts.graphic.LinearGradient(0,0,0,1, [
                        {offset:0, color:habit.color}, 
                        {offset:1, color:'rgba(255,255,255,0)'}
                    ]),
                    opacity: 0.5 
                } 
            }]
          };
          chart.setOption(option);
          this.habitChartInstances[chartId] = chart;
          return chart;
        });
      } else {
          setTimeout(() => this.initAllHabitTimeCharts(retry - 1), 200);
      }
    });
  },
  
  goToDetail(e) { wx.navigateTo({ url: `/packageA/detail/index?id=${e.currentTarget.dataset.id}` }); },
  fmt(d) { return `${d.getFullYear()}-${this.pad(d.getMonth()+1)}-${this.pad(d.getDate())}`; },
  pad(n) { return n.toString().padStart(2, '0'); },

  loadPlanStats() {
    const plans = wx.getStorageSync('plans') || [];
    const view = this.data.currentView;
    const anchor = new Date(this.data.anchorDate);
    const anchorYear = anchor.getFullYear();
    const anchorMonth = anchor.getMonth();

    let startStr = '', endStr = '';
    let yLabels = []; let dataLength = 0; let getIndex = () => -1; let tHeight = 250;

    if (view === 'week') {
        const day = anchor.getDay() || 7; 
        const start = new Date(anchor); start.setDate(anchor.getDate() - day + 1);
        const end = new Date(start); end.setDate(start.getDate() + 6);
        startStr = this.fmt(start); endStr = this.fmt(end);
        yLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        dataLength = 7;
        getIndex = (dateStr) => (this.safeDate(dateStr).getDay() || 7) - 1;
        tHeight = 300;
    } else if (view === 'month') {
        startStr = `${anchorYear}-${this.pad(anchorMonth+1)}-01`;
        const lastDay = new Date(anchorYear, anchorMonth + 1, 0).getDate();
        endStr = `${anchorYear}-${this.pad(anchorMonth+1)}-${lastDay}`;
        yLabels = ['W1', 'W2', 'W3', 'W4', 'W5'];
        dataLength = 5;
        getIndex = (dateStr) => {
            const day = parseInt(dateStr.split('-')[2]);
            let w = Math.floor((day - 1) / 7);
            if(w > 4) w = 4; return w;
        };
        tHeight = 300;
    } else if (view === 'year') { 
        startStr = `${anchorYear}-01-01`; endStr = `${anchorYear}-12-31`;
        yLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        dataLength = 12;
        getIndex = (dateStr) => parseInt(dateStr.split('-')[1]) - 1;
        tHeight = 400;
    } else {
        // All View
        startStr = '1900-01-01'; endStr = '2099-12-31';
        yLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        dataLength = 12;
        getIndex = (dateStr) => parseInt(dateStr.split('-')[1]) - 1;
        tHeight = 400;
    }

    const dateFilteredPlans = plans.filter(p => {
        const pDate = this.fmt(this.safeDate(p.date));
        return pDate >= startStr && pDate <= endStr;
    });

    const uniqueCatsInView = [...new Set(dateFilteredPlans.map(p => p.category))];
    let finalPlans = dateFilteredPlans;
    let targetColor = '#212121'; 
    if (this.data.currentPlanCategory !== 'All') {
        finalPlans = dateFilteredPlans.filter(p => p.category === this.data.currentPlanCategory);
        const sample = dateFilteredPlans.find(p => p.category === this.data.currentPlanCategory);
        if (sample && sample.color) targetColor = sample.color;
    }

    const valMap = {}; 
    const catMap = {}; 
    const seriesMap = {}; 
    const hourCounts = new Array(24).fill(0); 
    const activeDaysSet = new Set();
    let total = 0; 
    let maxDailyDuration = 0; 

    finalPlans.forEach(p => {
        let dur = parseFloat(p.duration);
        if (isNaN(dur) || dur === 0) { 
            const [sh, sm] = (p.startTime || '00:00').split(':').map(Number); 
            const [eh, em] = (p.endTime || '00:00').split(':').map(Number); 
            dur = (eh + em/60) - (sh + sm/60); 
            if (dur < 0) dur += 24; 
        }
        if (isNaN(dur)) dur = 0;

        const pDate = this.fmt(this.safeDate(p.date));
        if(!valMap[pDate]) valMap[pDate] = 0; 
        valMap[pDate] += dur; 
        if(dur > 0) activeDaysSet.add(pDate);
        if(valMap[pDate] > maxDailyDuration) maxDailyDuration = valMap[pDate];
        total += dur;
        
        if (!catMap[p.category]) catMap[p.category] = { name: p.category, value: 0, color: p.color || '#5d5d5d' }; 
        catMap[p.category].value += dur;
        
        if (!seriesMap[p.category]) seriesMap[p.category] = new Array(dataLength).fill(0);
        const idx = getIndex(pDate); 
        if (idx >= 0 && idx < dataLength) seriesMap[p.category][idx] += dur;
        
        const s = parseInt((p.startTime||'00:00').split(':')[0]); 
        const e = parseInt((p.endTime||'00:00').split(':')[0]); 
        for(let h=s; h<=e; h++) if(h<24) hourCounts[h]++;
    });
    
    if (maxDailyDuration === 0) maxDailyDuration = 1;

    let heatmapGrid = []; 
    let isYearView = (view === 'year');
    
    const getCellStyle = (val, isCurrent) => { 
        if (!isCurrent) return { color: 'transparent', opacity: 0 }; 
        if (val === 0) return { color: '#ebedf0', opacity: 1 }; 
        let ratio = val / maxDailyDuration; 
        let opacity = 0.3 + (ratio * 0.7); 
        if (opacity > 1) opacity = 1; 
        return { color: targetColor, opacity: opacity.toFixed(2) }; 
    };
    
    if (view === 'year') {
        isYearView = true; 
        let dIter = new Date(anchorYear, 0, 1); 
        const startDay = dIter.getDay() || 7; 
        dIter.setDate(dIter.getDate() - startDay + 1); 
        
        for(let i=0; i<371; i++) { 
            const dStr = this.fmt(dIter); 
            const val = valMap[dStr] || 0; 
            const isCurrentYear = dIter.getFullYear() === anchorYear;
            heatmapGrid.push({ value: val, ...getCellStyle(val, isCurrentYear) }); 
            dIter.setDate(dIter.getDate() + 1); 
        }
    } else {
        isYearView = false;
        if (view === 'month') { 
            const firstDay = new Date(anchorYear, anchorMonth, 1); 
            let dayOfWeek = firstDay.getDay() || 7; // Mon=1..Sun=7
            for(let i=1; i<dayOfWeek; i++) heatmapGrid.push({ empty: true }); 
            const loopLimit = new Date(anchorYear, anchorMonth+1, 0).getDate(); 
            for(let i=1; i<=loopLimit; i++) { 
                const dStr = `${anchorYear}-${this.pad(anchorMonth+1)}-${this.pad(i)}`; 
                const val = valMap[dStr] || 0; 
                heatmapGrid.push({ value: val, ...getCellStyle(val, true) }); 
            } 
        } else { 
            const day = anchor.getDay() || 7; 
            const dIter = new Date(anchor); dIter.setDate(dIter.getDate() - day + 1); 
            for(let i=0; i<7; i++) { 
                const dStr = this.fmt(dIter); 
                const val = valMap[dStr] || 0; 
                heatmapGrid.push({ value: val, ...getCellStyle(val, true) }); 
                dIter.setDate(dIter.getDate() + 1); 
            } 
        }
    }
    const pieData = Object.values(catMap).map(c => ({...c, hours: c.value.toFixed(1), percent: total>0?Math.round(c.value/total*100):0})).sort((a,b)=>b.value-a.value);
    const series = Object.keys(seriesMap).map(cat => ({ name: cat, type: 'bar', stack: 'total', barWidth: view==='month'?'50%':'60%', itemStyle: { color: catMap[cat].color, borderRadius: 0 }, data: seriesMap[cat].map(v=>parseFloat(v.toFixed(1))) }));
    const avgDur = dataLength > 0 ? (total / dataLength).toFixed(1) : 0; 
    const topCat = pieData.length>0 ? pieData[0].name : '-'; 
    const maxHourVal = Math.max(...hourCounts); 
    const peakHour = hourCounts.indexOf(maxHourVal);

    this.setData({
        planCategories: pieData, heatmapGrid, isYearView, trendHeight: tHeight, planFilterCats: uniqueCatsInView, 
        planSummary: { totalHours: total.toFixed(1), count: finalPlans.length, activeDays: activeDaysSet.size, topCat },
        footerData: { heatmap: { label1: 'Active Days', val1: activeDaysSet.size, label2: 'Total Hours', val2: total.toFixed(1) }, trend: { label1: 'Daily Average', val1: avgDur+'h', label2: 'Top Category', val2: topCat }, dist: { label1: 'Categories', val1: pieData.length, label2: 'Coverage', val2: '100%' }, curve: { label1: 'Peak Hour', val1: maxHourVal>0?`${peakHour}:00`:'-', label2: 'Intensity', val2: maxHourVal } }
    });
    
    setTimeout(() => { 
        this.initPlanBar(yLabels, series, view); 
        this.initPlanPie(); 
        this.initPlanCurve(hourCounts); 
    }, 200);
  },

  initPlanBar(yLabels, series, view) {
    const option = { tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, confine: true }, grid: { left: '3%', right: '5%', bottom: '2%', top: '2%', containLabel: true }, xAxis: { type: 'value', show: false, splitLine: { show: false }, axisLine: { show: false } }, yAxis: { type: 'category', data: yLabels, inverse: true, axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { color: '#666', fontSize: 10, fontWeight: 'bold', interval: 0 } }, series: series.length > 0 ? series : [{type: 'bar', data: []}] };
    if (this.chartInstances['planBar']) { this.chartInstances['planBar'].setOption(option, true); return; }
    const comp = this.selectComponent('#chart-plan-bar'); if(!comp) return;
    comp.init((canvas, width, height, dpr) => { const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr }); chart.setOption(option); this.chartInstances['planBar'] = chart; return chart; });
  },
  initPlanCurve(data) { if (this.chartInstances['planCurve']) { this.chartInstances['planCurve'].setOption({series:[{data}]}); return; } const comp = this.selectComponent('#chart-plan-curve'); if(!comp) return; comp.init((canvas, width, height, dpr) => { const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr }); const option = { grid: { left: 5, right: 5, top: 10, bottom: 20 }, tooltip: { trigger: 'axis', formatter: '{b}:00 : {c}' }, xAxis: { type: 'category', data: Array.from({length:24},(_,i)=>i), show: true, axisLine: {show:false}, axisTick: {show:false}, axisLabel: { interval: 5, color: '#999', fontSize: 10 } }, yAxis: { type: 'value', show: false }, series: [{ data: data, type: 'line', smooth: true, symbol: 'none', lineStyle: { width: 3, color: '#54a0ff' }, areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1, [{offset:0, color:'#54a0ff'}, {offset:1, color:'rgba(84,160,255,0)'}]) } }] }; chart.setOption(option); this.chartInstances['planCurve'] = chart; return chart; }); },
  initPlanPie() { const pieData = this.data.planCategories.map(c => ({ value: c.value, name: c.name, itemStyle: { color: c.color } })); if (this.chartInstances['planPie']) { this.chartInstances['planPie'].setOption({series:[{data:pieData}]}); return; } const comp = this.selectComponent('#chart-plan-pie'); if(!comp) return; comp.init((canvas, width, height, dpr) => { const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr }); const option = { backgroundColor: '#ffffff', tooltip: { trigger: 'item', formatter: '{b}: {c}h' }, series: [{ type: 'pie', radius: ['60%', '85%'], center: ['50%', '50%'], itemStyle: { borderRadius: 5, borderColor: '#fff', borderWidth: 2 }, label: { show: false }, data: pieData }] }; chart.setOption(option); this.chartInstances['planPie'] = chart; return chart; }); },
});