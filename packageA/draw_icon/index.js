Page({
  data: {
    palette: [
      'transparent', '#ffffff', '#e0e0e0', '#aaaaaa', '#666666', '#000000',
      '#ff4d4f', '#ff7a45', '#ffa940', '#fadb14', '#a0d911', '#52c41a', 
      '#13c2c2', '#1890ff', '#2f54eb', '#722ed1', '#eb2f96', '#ff85c0',
      '#ffa39e', '#ffd591', '#ffe58f', '#b7eb8f', '#87e8de', '#91d5ff'
    ],
    currentColor: '#000000',
    currentBgColor: 'transparent',
    isEraser: false,
    activeTab: 'pen',
    brushSize: 6,
    
    showPalette: false,
    showCustomPicker: false,

    customH: 180,   
    customS: 50, 
    customL: 50,  
    customColorPreview: '#3fa3a3' 
  },

  onReady() {
    // 增加一点点延迟，确保微信底层视图完全渲染完毕后再初始化画布
    setTimeout(() => { this.initCanvas(); }, 300);
  },

  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#drawCanvas').fields({ node: true, size: true });
    
    query.exec((res) => {
        if(!res[0] || !res[0].node) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        const sysInfo = wx.getSystemInfoSync();
        const safeSize = sysInfo.windowWidth - 48; 
        const finalWidth = res[0].width || safeSize;
        const finalHeight = res[0].height || safeSize;
        
        canvas.width = finalWidth * dpr;
        canvas.height = finalHeight * dpr;
        ctx.scale(dpr, dpr);
        
        this.canvas = canvas;
        this.ctx = ctx;
        this.cssWidth = finalWidth;
        this.cssHeight = finalHeight;
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    });
  },

  touchStart(e) {
    const touch = e.touches[0];
    this.isDrawing = true;
    this.lastX = touch.x;
    this.lastY = touch.y;
    if (this.data.showPalette || this.data.showThickness) {
        this.setData({ showPalette: false, showThickness: false });
    }
  },

  setTool(e) { this.setData({ isEraser: e.currentTarget.dataset.tool === 'eraser' }); },
  onBrushSizeChange(e) { this.setData({ brushSize: e.detail.value }); },
  clearCanvas() { if(this.ctx) this.ctx.clearRect(0, 0, this.cssWidth, this.cssHeight); },

  // --- 弹窗逻辑 ---
  openPalette(e) { 
    this.setData({ 
      showPalette: true, 
      activeTab: e.currentTarget.dataset.tab 
    }); 
  },
  closePalette() { this.setData({ showPalette: false }); },
  switchTab(e) { this.setData({ activeTab: e.currentTarget.dataset.tab }); },

  selectColor(e) {
    this.setData({ currentColor: e.currentTarget.dataset.color, isEraser: false, showPalette: false });
  },
  selectBg(e) {
    this.setData({ currentBgColor: e.currentTarget.dataset.color, showPalette: false });
  },

  openCustomColorPicker() { this.setData({ showCustomPicker: true, showPalette: false }); },
  closeCustomColorPicker() { this.setData({ showCustomPicker: false }); },

  hslToHex(h, s, l) {
    s /= 100; l /= 100;
    let c = (1 - Math.abs(2 * l - 1)) * s;
    let x = c * (1 - Math.abs((h / 60) % 2 - 1));
    let m = l - c/2;
    let r=0, g=0, b=0;
    if (0<=h && h<60) {r=c; g=x; b=0;} else if (60<=h && h<120) {r=x; g=c; b=0;} else if (120<=h && h<180) {r=0; g=c; b=x;}
    else if (180<=h && h<240) {r=0; g=x; b=c;} else if (240<=h && h<300) {r=x; g=0; b=c;} else if (300<=h && h<360) {r=c; g=0; b=x;}
    r = Math.round((r + m) * 255).toString(16).padStart(2, '0');
    g = Math.round((g + m) * 255).toString(16).padStart(2, '0');
    b = Math.round((b + m) * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  },

  onSliderChange(e) {
    const type = e.currentTarget.dataset.type;
    const val = e.detail.value;
    const nextH = type === 'H' ? val : this.data.customH;
    const nextS = type === 'S' ? val : this.data.customS;
    const nextL = type === 'L' ? val : this.data.customL;

    const hexColor = this.hslToHex(nextH, nextS, nextL);
    this.setData({ [`custom${type}`]: val, customColorPreview: hexColor });
  },

  confirmCustomColor() {
    const newColor = this.data.customColorPreview; 
    let newPalette = [...this.data.palette];
    newPalette.push(newColor);

    if (this.data.activeTab === 'pen') {
        this.setData({ currentColor: newColor, isEraser: false, palette: newPalette, showCustomPicker: false });
    } else {
        this.setData({ currentBgColor: newColor, palette: newPalette, showCustomPicker: false });
    }
  },

  // --- 绘画逻辑 ---
  touchStart(e) {
    const touch = e.touches[0];
    this.isDrawing = true;
    this.lastX = touch.x;
    this.lastY = touch.y;
  },

  touchMove(e) {
    if (!this.isDrawing || !this.ctx) return;
    const touch = e.touches[0];
    
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(touch.x, touch.y);
    
    if (this.data.isEraser) {
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.lineWidth = 20; 
        this.ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.lineWidth = this.data.brushSize; 
        this.ctx.strokeStyle = this.data.currentColor;
    }
    
    this.ctx.stroke();
    this.lastX = touch.x;
    this.lastY = touch.y;
  },

  touchEnd() { this.isDrawing = false; },

  saveIcon() {
    if (!this.canvas) return;
    
    if (this.data.currentBgColor !== 'transparent') {
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'destination-over';
        this.ctx.fillStyle = this.data.currentBgColor;
        this.ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);
        this.ctx.restore();
    }
    
    const dataURL = this.canvas.toDataURL('image/png');
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];
    
    if (prevPage) {
        prevPage.setData({ icon: dataURL, isCustomIcon: true });
        if(prevPage.data.category && typeof prevPage.saveCatSettings === 'function') {
            prevPage.saveCatSettings(prevPage.data.category, prevPage.data.selectedColor, dataURL);
        }
    }
    wx.navigateBack();
  }
});