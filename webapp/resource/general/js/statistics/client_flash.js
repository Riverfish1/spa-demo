(function ($, Stats, appName) {
    var ClientConView = Stats.View.extend({
        default: {
            'el': '#tabContent',
            'tmplId': 'client-flash-common-tpl',
        },
        init: function () {
            this.clientUrlPrefix = this.options.clientUrlPrefix;
            this.domainUrlPrefix = this.options.domainUrlPrefix;
            this.submitBtn = this.$el.find('#submit');
            this.domainCheckBtn = this.$el.find('#domainCheck');
            this.submitBtn.on('click', $.proxy(this.clientFlash, this));
            this.domainCheckBtn.on('click', $.proxy(this.domainCheck, this));
        },
        getClientUrl: function () {
            // return appName + this.clientUrlPrefix
            return appName + '../resource/devData/clientFlashSubmit.json';
        },
        getDomainUrl: function () {
            // return appName + this.domainUrlPrefix
            return appName + '../resource/devData/clientFlashDomainCheck.json';
        },
        clientFlash: function () {
            var cb = $.proxy(this.onLoadClientDataSuccess, this), self = this;
            Stats.ajax.getJSON(this.getClientUrl(), cb).fail(function () {
                self.onLoadClientDataSuccess([]);
            });
        },
        domainCheck: function () {
            var cb = $.proxy(this.onLoadDomainDataSuccess, this), self = this;
            Stats.ajax.getJSON(this.getDomainUrl(), cb).fail(function () {
                self.onLoadDomainDataSuccess([]);
            });
        },
        onLoadClientDataSuccess: function (result) {
            if(result.code == 0){
                this.showSuccessInfo('提交成功');
            }else{
                this.showErrorInfo('提交失败');
            }
        },
        onLoadDomainDataSuccess: function (result) {
            if(result.code == 0){
                this.showSuccessInfo('域名正确');
            }else{
                this.showErrorInfo('域名错误');
            }
        },
        showSuccessInfo: function (title) {
            $('#info-success-id').html("<strong>" + title + "</strong>");
            $('#info-success-id').show().delay(3000).fadeOut();
        },
        showErrorInfo: function (title) {
            $('#info-error-id').html("<strong>" + title + "</strong>");
            $('#info-error-id').show().delay(3000).fadeOut();
        }
    });
    var createQueryView = Stats.View.extend({
        default: {
            'el': '#tabContent',
            'tmplId': 'client-flash-query-tpl',
            'queryUrlPrefix': '',
            'tableId': 'data-table'
        },
        init: function () {
            this.queryUrlPrefix = this.options.queryUrlPrefix;
            this.$queryBtn = this.$el.find('#search');
            this.$queryBtn.on('click', $.proxy(this.clientQuery, this));
            this.table = new Stats.Table({
                id: this.options.tableId
            });
            this.clientQuery();
        },
        getQueryUrl: function () {
            // return appName + this.queryUrlPrefix
            return appName + '../resource/devData/clientQueryTable.json'
        },
        clientQuery: function () {
            this.table.trigger('loading');
            var cb = $.proxy(this.onLoadQueryDataSuccess, this), self = this;
            Stats.ajax.getJSON(this.getQueryUrl(), cb).fail(function () {
                self.onLoadQueryDataSuccess([]);
            });
        },
        onLoadQueryDataSuccess: function (data) {
            this.table.load(data.result);
        }
    });
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
            if($el.length > 0){
                this.value = $el.attr('data-value');
                this.trigger('tab.click', this.value, $el, this.$parent);
            }
        },
        getValue: function () {
            return this.value;
        }
    })
    Stats.Views.ClientFlashView = Stats.View.extend({
        default: $.extend({}, Stats.View.prototype.default, {
            tmplId: 'tabs-common',
            tabId: '#tabNav',
            items: ['URL刷新', '目录刷新', 'URL预热', '查询操作记录'],
            fillData: [
                {
                    'clientUrlPrefix': '',
                    'domainUrlPrefix': '',
                    'fillData': {
                        'title': '输入刷新缓存的文件路径：',
                        'name': '',
                        'id': '',
                        'placeholder': 'http://abc.com/abc/image/1.png，刷新首页请输入http://abc.com/',
                        'tip': '多个URL请用回车分隔，每个URL应当以http://或https://开头，一次提交不能超过100个URL'
                    }
                },
                {
                    'clientUrlPrefix': '',
                    'domainUrlPrefix': '',
                    'fillData': {
                        'title': '输入刷新缓存的目录路径：',
                        'name': '',
                        'id': '',
                        'placeholder': 'http://abc.com/abc/image/，刷新全站请输入http://abc.com/',
                        'tip': '多个URL请用回车分隔，每个URL应当以http://或https://开头，一次提交不能超过100个URL'
                    }
                },
                {
                    'clientUrlPrefix': '',
                    'domainUrlPrefix': '',
                    'fillData': {
                        'title': '输入预热缓存的文件路径，主动推送资源到CDN节点：',
                        'name': '',
                        'id': '',
                        'placeholder': 'http://abc.com/abc/image/1.png',
                        'tip': '多个URL请用回车分隔，每个URL应当以http://或https://开头，一次提交不能超过100个URL'
                    }
                }
            ]
        }),
        init: function () {
            this.fillData = this.options.fillData;
            this.clientTabView = new Tabs({
                'el': this.options.tabId,
                'parent': '#right-content'
            })
            this.clientTabView.on('tab.click', this.onTabClick, this);
            this.createCommon(this.fillData[0]);
        },
        onTabClick: function () {
            var tabVal = Number(this.clientTabView.getValue());
            switch (tabVal){
                case 0 :
                case 1 :
                case 2 :
                    this.createCommon(this.fillData[tabVal]);
                    break;
                default:
                    this.createQuery();
            }
        },
        createCommon: function (opts) {
           this.clientConView = new ClientConView({
               'clientUrlPrefix': opts.clientUrlPrefix,
               'domainUrlPrefix': opts.domainUrlPrefix,
               'fillData': opts.fillData
           })
        },
        createQuery: function () {
            this.createQueryView = new createQueryView();
        },
        destroy: function () {
            this.clientTabView.trigger('destroy');
            this.clientConView.trigger('destroy');
            this.createQueryView.trigger('destroy');
        }
    });
}(jQuery, Stats, APPNAME));
