//index.js
//获取应用实例
const app = getApp()
import util from '../../utils/util.js'
import { req } from '../../utils/api.js'

Page({
  data: {
    isHideLoadMore: false,        // 判断加载
    tabIndex: 0,                  // tab切换
    todayTime: 0,                 // 今天日期
    categoriesTabIndex: 0,        // 分类tab切换
    returnTopStatus: false,       // 返回顶部按钮显示状态
    categories: [],               // 一级分类数组
    categoriesChild: [],          // 二级分类数组
    categoriesGoods: [],          // 分类关联商品数组
    categoriesgoodsPages: 1,      // 分类商品页数
    hotGoods: [],                 // 热门商品列表
    hotgoodPages: 1,              // 热门商品分页
    salesGoods: [],               // 哆嗦排行榜列表
    bannerItem: [],               // banner列表
    newGoods: [],                 // 新品列表
    apiStatus: 0,                 // 顺序加载
    activityStatus: false,        // 活动状态
    activityDialogStatus: false   // 弹窗状态
  },
  onLoad: function () {
    wx.showNavigationBarLoading()
    wx.showLoading({
      title: '加载中',
      mask: true
    })
    // 更新今日推荐 副标题时间
    this.getTime()
    // 查看活动是否结束
    var time = new Date()
    req(app.globalData.bastUrl, 'appv5_1/tigger/getStatus', {}, "GET", true).then(res => {
      const tiggerGetStatus = wx.getStorageSync('tiggerGetStatus')
      if (res.data) {
        this.setData({
          activityStatus: true
        })
        if (tiggerGetStatus == '' || tiggerGetStatus < time.getUTCDate().toString()) {
          this.setData({
            activityDialogStatus: true
          })
          wx.setStorageSync('tiggerGetStatus', time.getUTCDate().toString())
        }
      }
    })
    // 获取分类
    req(app.globalData.bastUrl, 'appv3/categories', {
      level: 1,
      depth: 1
    }, "GET", true).then(res => {
      this.setData({
        categories: res.data,
        apiStatus: this.data.apiStatus + 1
      })
      this.getHotlistLoading()
    })
    // 获取banner
    req(app.globalData.bastUrl, 'appv3/advertis/1024', {}, "GET", true).then(res => {
      this.setData({
        bannerItem: res.data,
        apiStatus: this.data.apiStatus + 1
      })
      this.getHotlistLoading()
    })
    // 获取新品
    req(app.globalData.bastUrl, 'appv3/modules', {
      qt: 4
    }, "GET", true).then(res => {
      this.setData({
        newGoods: res.data.result,
        apiStatus: this.data.apiStatus + 1
      })
      this.getHotlistLoading()
    })
    // 哆嗦排行榜
    req(app.globalData.bastUrl, 'appv3/channels', {
      channel: '2',
      random: '1'
    }, "GET", true).then(res => {
      this.setData({
        salesGoods: res.data.modules[0].data.result,
        apiStatus: this.data.apiStatus + 1
      })
      this.getHotlistLoading()
    })
  },
  // 顶部tab切换
  tabtap: function (e) {
    let that = this
    // tab切换
    let id = e.target.dataset.id
    this.setData({
      tabIndex: id,
      categoriesTabIndex:id
    })
    // 设置滚动条在顶部
    this.returnTop()
    // 切换到商店直接返回
    if (id == 0) return
    // 赋值子分类
    this.data.categories.forEach(function (value) {
      if (value.id == id) {
        that.setData({
          categoriesChild: value.children
        })
      }
    })
    // 切换到新的
    this.clearcategoriesGoods()
    // 分类关联商品
    this.getcategoriesGoods()
  },
  // 返回顶部
  returnTop: function() {
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 300
    })
  },
  // 横向滚动监控
  scroll: function(e) {
    // console.log(e)
  },
  // 滚动监控
  onPageScroll: function(e) {
    // 控制按钮显示
    if (e.scrollTop >= 500 && this.data.tabIndex != 0){
      this.setData({
        returnTopStatus: true
      })
    }else{
      this.setData({
        returnTopStatus: false
      })
    }
  },
  // 二级分类切换
  classifySonTab: function(e) {
    // tab切换
    let id = e.target.dataset.id
    this.setData({
      categoriesTabIndex: id
    })
    // 切换到新的
    this.clearcategoriesGoods()
    // 分类关联商品
    this.getcategoriesGoods()
  },
  // 商品跳转article
  navigateToGoods: function(e) {
    let id = e.target.dataset.id
    const url = '/pages/article/article?id=' + id
    wx.navigateTo({
      url: url
    })
  },
  // 跳转WebView
  navigateToWebView: function (e) {
    let webUrl = e.target.dataset.url
    let title = e.target.dataset.title
    const url = '/pages/webView/webView?url=' + webUrl + '&title=' + title
    wx.navigateTo({
      url: url
    })
  },
  // 跳转到活动页
  navigateToActivity: function() {
    wx.navigateTo({
      url: '/pages/activity/activity'
    })
  },
  // 卖家中心跳转user
  navigateToUser: function (e) {
    let id = e.target.dataset.id
    let name = e.target.dataset.name
    const url = '/pages/user/user?id=' + id + '&name=' + name
    wx.navigateTo({
      url: url
    })
  },
  //触底加载
  onReachBottom: function(e) {
    // 根据tabIndex判断0为商店 其他为当前显示一级分类id 
    // 如果点击二级分类则优先加载二级
    if (this.data.tabIndex == 0) {
      // 首页加载
      this.getHotlist()
    } else {
      // 分类加载
      this.getcategoriesGoods()
    }
  },
  // 获取当下最热商品列表
  getHotlist: function() {
    if (this.data.isHideLoadMore) return
    this.setData({
      isHideLoadMore: true
    })
    req(app.globalData.bastUrl, 'appv3/modules', {
      'qt': 11,
      'page': this.data.hotgoodPages,
      'size': 10
    }).then(res => {
      this.setData({
        hotGoods: this.data.hotGoods.concat(res.data.result),
        hotgoodPages: this.data.hotgoodPages + 1,
        isHideLoadMore: false
      })
    })
  },
  // 获取分类商品列表
  getcategoriesGoods: function() {
    if (this.data.isHideLoadMore) return
    this.setData({
      isHideLoadMore: true
    })
    const category_id = this.data.categoriesTabIndex == 0 ? this.data.tabIndex : this.data.categoriesTabIndex
    req(app.globalData.bastUrl, 'appv3/category/posts', {
      'category_id': category_id,
      'cur_page': this.data.categoriesgoodsPages
    }).then(res => {
      const categoriesGoods = res.data.data.item_list.result
      this.setData({
        categoriesGoods: this.data.categoriesGoods.concat(categoriesGoods),
        categoriesgoodsPages: this.data.categoriesgoodsPages + 1,
        isHideLoadMore: false
      })
    })
  },
  // 切换分类商品清空数据
  clearcategoriesGoods: function() {
    this.setData({
      categoriesGoods: [],
      categoriesgoodsPages: 1,
    })
  },
  // 首页模块加载完成后，加载热门商品
  getHotlistLoading: function() {
    // 初始化当下热门
    if (this.data.apiStatus == 4){
      wx.hideNavigationBarLoading()
      wx.hideLoading()
      this.getHotlist()
      this.setData({
        apiStatus: 0
      })
    }
  },
  // 关闭活动提示
  closeActivityDialog: function() {
    this.setData({
      activityDialogStatus: false
    })
  },
  //getTime
  getTime: function() {
    const timeArr = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May.', 'June.', 'July.', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.']
    const time = new Date()
    const mon = timeArr[time.getMonth()]
    this.setData({
      todayTime: mon + time.getDate()
    })
  },
  // 分享
  onShareAppMessage: function() {
    return {
      title: '公路商店 - 为了你不着边际的企图心',
      path: '/pages/index/index'
    }
  },
  // 下拉刷新
  onPullDownRefresh: function() {
    const tabIndex = this.data.tabIndex
    const that = this
    setTimeout(function () {
      wx.stopPullDownRefresh()
    }, 400)
    setTimeout(function () {
      if (tabIndex == 0) {
        that.onLoad()
      } else {
        // 切换到新的
        that.clearcategoriesGoods()
        // 分类关联商品
        that.getcategoriesGoods()
      }
    }, 1000)
  }
})
