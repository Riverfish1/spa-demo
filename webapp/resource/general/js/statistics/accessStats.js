(function ($, Stats, appName) {
    //根据url中的参数tabIndex，决定哪个选项卡被选中；
    var getUrlParam = function (name) {
        var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)"); //构造一个含有目标参数的正则表达式对象
        var r = window.location.search.substr(1).match(reg);  //匹配目标参数
        if (r != null) return decodeURIComponent(r[2]);
        return null; //返回参数值
    }
    var tabIndex = getUrlParam('tabIndex');

    var Tabs = Stats.View.extend({
        default: {
            'items': [],
            'title': ''
        },
        init: function () {
            this.value = 0;
            this._bindEvent();
            this._selet1stTab()
        },
        _selet1stTab: function () {
            this.$el.find("a:first").tab('show')
        },
        _bindEvent: function () {
            this.$el.on('shown.bs.tab', $.proxy(this._doShowBSTab, this));
        },
        _doShowBSTab: function (e) {
            var $el = $(e.target);
            if ($el.length > 0) {
                this.value = $el.attr('data-value');
                this.trigger('tab.click', this.value, $el, this.$parent);
            }
        },
        getValue: function () {
            return this.value;
        },
        getTab: function (witch) {
            this.$el.find('li:eq('+witch+') a').tab('show');
        }
    });

    Stats.Views.accessStatsView = Stats.View.extend({
        default: $.extend({}, Stats.View.prototype.default, {
            tmplId: 'tabs-common',
            tabId: '#tabNav',
            items: ['访问量统计', '运营商统计', '访客区域统计'],
            title: '访问统计'
        }),
        init: function () {
            this.clientTabView = new Tabs({
                'el': this.options.tabId,
                'parent': '#right-content'
            })
            this.clientTabView.on('tab.click', this.onTabClick, this);
            this.creatUserAccessView();
            this.clientTabView.getTab(tabIndex);
        },
        onTabClick: function () {
            var tabVal = Number(this.clientTabView.getValue());
            switch (tabVal) {
                case 0 :
                    this.creatUserAccessView();
                    break;
                case 1 :
                    this.creatOperatorView();
                    break;
                default:
                    this.creatInlandView();
            }
        },
        creatUserAccessView: function () {
            this.userAccessView = new Stats.Views.UserAccessView({
                el: '#tabContent'
            });
        },
        creatOperatorView: function () {
            this.operatorView = new Stats.Views.OperatorView({
                el: '#tabContent'
            });
        },
        creatInlandView: function () {
            this.inlandView = new Stats.Views.InlandView({
                el: '#tabContent',
                urlPrefix: '/s/territory/stats'
            });
        },
        destroy: function () {
            this.userAccessView.trigger('destroy');
            this.operatorView && this.operatorView.trigger('destroy');
            this.inlandView && this.inlandView.trigger('destroy');
        }
    });
}(jQuery, Stats, APPNAME));
