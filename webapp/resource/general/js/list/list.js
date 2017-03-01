(function ($, Stats, appName) {

    var unitMapper = {
        _map: {
            "Kbps": {expr: "$$ < 1000", val: 1},
            "Mbps": {expr: "$$ >=1000 && $$ < (1000 * 1000)", val: 1000},
            "Gbps": {expr: "$$ >=1000 * 1000 && $$ < (1000 * 1000* 1000)", val: 1000 * 1000},
            "Tbps": {expr: "$$ > (1000 * 1000* 1000)", val: 1000 * 1000* 1000}
        },
        getUnit: function (val) {
            var expr, unitKey, o;
            $.each(this._map, function (k, v) {
                expr = v.expr.replace(/\$\$/g, val);
                if (eval(expr)) {
                    unitKey = k;
                    o = v;
                    return false;
                }
            });
            return {fUnit: unitKey.substr(0, 2).toUpperCase(), bUnit: unitKey, val: o.val};
        }
    };
    var roundNumber = function (val) {
        return Math.round(val * 100) / 100;
    };

    var ListSummary = Stats.View.extend({
        'default': $.extend({}, Stats.View.prototype.default, {
            'urlPrefix': '/l/s/list',
            'el': '#indexStats'
        }),
        init: function () {
            this.loadData();
        },
        getUrl: function () {
            return '../resource/devData/l_s_list.json';
            // return appName + this.urlPrefix + '?d=' + this.daysActionSwitcher.getValue() + '&t=1';
        },
        loadData: function () {
            var cb = $.proxy(this.onLoadDataSuccess, this), self = this;
            if (this.jqXHR) this.jqXHR.abort();
            this.jqXHR = $.getJSON(this.getUrl(), cb).fail(function () {
                self.onLoadDataSuccess([])
            });
        },
        onLoadDataSuccess: function (data) {
            var aa = data.result;
            $("#video-num").html(aa.videoTotal);
            $("#video-time").html(aa.uploadMinutes);
            $("#video-playTime").html(aa.playTotal);
        }
    })

    var ListProgressBar = Stats.View.extend({
        init: function () {
            this.loadData();
        },
        getUrl: function () {

        },
        loadData: function () {
            var cb = $.proxy(this.onLoadDataSuccess, this), self = this;
            if (this.jqXHR) this.jqXHR.abort();
            this.jqXHR = $.getJSON(this.getUrl(), cb).fail(function () {
                self.onLoadDataSuccess([])
            });
        },
        onLoadDataSuccess: function (data) {

        },
        toFlowPosition: function (num) {
            var lt10G = num / 1000,
              lt100TB = lt10G / 1000;
            if (0 <= lt10G && lt10G <= 10) {
                return this.toPercent(0.125 * (lt10G / 10));
            }
            if (10 < lt10G && lt10G <= 1000) {
                return this.toPercent(0.125 + 0.25 * (lt10G - 10) / (1000 - 10));
            }
            if (1 < lt100TB && lt100TB <= 100) {
                return this.toPercent(0.375 + 0.25 * (lt100TB - 1) / (100 - 1));
            }
            if (100 < lt100TB && lt100TB <= 1000) {
                return this.toPercent(0.625 + 0.25 * (lt100TB - 100) / (1000 - 100));
            }
            if (1000 < lt100TB && lt100TB <= 1000 * 1000) {
                return this.toPercent(0.875 + 0.125 * (lt100TB - 1000) / (1000 * 1000 - 1000));
            }
        },
        // 小数转化为百分数
        toPercent: function (num) {
            // var range =
            return (Math.round(num * 10000) / 100).toFixed(2) + '%';
        }
    })
    var ListUsedFlowProgressBar = ListProgressBar.extend({
        default: $.extend({}, ListProgressBar.prototype.default, {
            urlPrefix: '/l/p/t'
        }),
        getUrl: function () {
            return '../resource/devData/l_p_t.json';
            // return appName + this.urlPrefix + '?d=' + this.daysActionSwitcher.getValue() + '&t=1';
        },
        onLoadDataSuccess: function (data) {
            if (data.code == 0) {
                var space = data.result;
                var usedFlow = (space / 1000).toFixed(2) + "G";     //使用空间
                var $useFlowProgressBar = $('#processTraffic').find('.progress-bar');
                $("#usedFlow").html(usedFlow);
                $useFlowProgressBar.css('width', this.toFlowPosition(space));
            }
        }
    })
    var ListUsedSpaceProgressBar = ListProgressBar.extend({
        default: $.extend({}, ListProgressBar.prototype.default, {
            urlPrefix: '/l/p/s'
        }),
        getUrl: function () {
            return '../resource/devData/l_p_s.json';
            // return appName + this.urlPrefix + '?d=' + this.daysActionSwitcher.getValue() + '&t=1';
        },
        onLoadDataSuccess: function (data) {
            if (data.code == 0) {
                var space = data.result;
                var userSpace = (space.usedSpace / 1024 / 1024).toFixed(2) + "G";   //使用空间
                // var spaceprecent = ((space.usedSpace / space.totalSpace) * 100).toFixed(2) + "%";//使用空间比例
                var totalSpace = (space.totalSpace / 1024 / 1024).toFixed(2) + "G";  //总空间
                var $useSpaceProgressBar = $('#processSpace').find('.progress-bar');
                $("#usedSpace").html(userSpace);
                // if (isTrail) {
                //     $("#space-pro").css("width", spaceprecent);
                // }
                $("#space-total").html(parseInt(totalSpace) + "G");
                $("#space-precent").html(userSpace);//放置使用空间
                $("#user-Id").html(space.userId);
                $useSpaceProgressBar.css('width', this.toSpacePosition(space.usedSpace));
            }
        },
        toSpacePosition: function (num) {
            var lt10G = num / 1024 / 1024,
              lt100TB = lt10G / 1024;
            if (0 <= lt10G && lt10G <= 10) {
                return this.toPercent(0.125 * (lt10G / 10));
            }
            if (10 < lt10G && lt10G <= 1024) {
                return this.toPercent(0.125 + 0.25 * (lt10G - 10) / (1024 - 10));
            }
            if (1 < lt100TB && lt100TB <= 100) {
                return this.toPercent(0.375 + 0.25 * (lt100TB - 1) / (100 - 1));
            }
            if (100 < lt100TB && lt100TB <= 1024) {
                return this.toPercent(0.625 + 0.25 * (lt100TB - 100) / (1024 - 100));
            }
            if (1024 < lt100TB && lt100TB <= 1024 * 1024) {
                return this.toPercent(0.875 + 0.125 * (lt100TB - 1024) / (1024 * 1024 - 1024));
            }
        }
    })

    var trafficChartResultParse = new (Stats.ResultParser.extend({
        doParse: function (data, flowSum) {
            if (data && data.length > 0) {
                var categories = [], d = [];
                //拆线图数据转换
                var val = unitMapper.getUnit(this.getMax(data, 'dayflow') / 1000).val;
                var unit = unitMapper.getUnit(this.getMax(data, 'dayflow') / 1000).fUnit;
                $.each(data, function (i, v) {
                    //进制换算单位,val为换算进制；
                    categories.push(v.day);
                    d.push(v.dayflow / 1000 / val);
                });
                return {
                    categories: categories,
                    data: d,
                    val: val,
                    unit: unit
                };
            }
        },
        getMax: function (data, index) {
            var max = 0;
            if (data.length) {
                $.each(data, function (k, v) {
                    if (v[index] >= max) {
                        max = v[index];
                    }
                })
            }
            return max;
        }
    }))()
    var TrafficChart = Stats.Chart.extend({
        getOption: function (data) {
            return {
                chart: {
                    renderTo: this._id,
                    backgroundColor: {
                        linearGradient: {x1: 0, y1: 0, x2: 1, y2: 1},
                        stops: [
                            [0, 'rgb(255, 255, 255)'],
                            [1, 'rgb(255, 255, 255)']
                        ]
                    },
                    plotBackgroundColor: 'rgba(255, 255, 255, .9)',
                    plotShadow: true,
                    plotBorderWidth: 1
                },
                title: {
                    text: null
                },
                credits: {
                    enabled: false
                },
                xAxis: {
                    categories: data.categories
                },
                yAxis: {
                    title: null,
                    labels: {
                        formatter: function () {  //设置纵坐标值的样式
                            return this.value + "(" + data.unit + ")";//Highcharts.numberFormat()数字进行格式化
                        }
                    },
                    min: 0,
                    tickAmount: 6,
                    plotLines: [{
                        value: 0,
                        width: 1,
                        color: '#808080'
                    }]
                },
                tooltip: {
                    formatter: function () {
                        var amountFlowUnit = unitMapper.getUnit(this.y * data.val),
                          amountFlow = roundNumber(this.y * data.val / amountFlowUnit.val),
                          flowUnit = amountFlowUnit.fUnit
                        toolTipFomater = amountFlow + " " + flowUnit;
                        return '流量: ' + toolTipFomater;
                    }
                },
                series: [{
                    type: 'line',
                    showInLegend: false, // 设置为 false 即为不显示在图例中
                    data: data.data//获取数据源操作信息
                }]
            }
        }
    })

    Stats.Views.ListView = Stats.View.extend({
        'default': $.extend({}, Stats.View.prototype.default, {
            'tmplId': 'list-tpl',
            'urlPrefix': '/l/list',
            'tabTmplId': 'tabs-common',
            'container': '#tabContainer',
            'items': ['近7天使用流量', '近1个月使用流量'],
            'chartId': 'tabContent'
        }),
        init: function () {
            this.urlPrefix = this.options.urlPrefix;
            this.tabVal = 0;
            this.listSummary = new ListSummary();
            this.listUsedFlowProgressBar = new ListUsedFlowProgressBar();
            this.listUsedSpaceProgressBar = new ListUsedSpaceProgressBar();
            this.listTabView = new Stats.Tabs({
                'el': this.options.container,
                'tmplId': this.options.tabTmplId,
                'items': this.options.items
            })
            this.listTabView.on('tab.click', this.onTabClick, this)
            this.chart = new TrafficChart({
                'id': this.options.chartId
            })
            this.loadData();
        },
        getUrl: function () {
            // return appName + this.urlPrefix + '?v=' + 0 + '&t=' + 'all';
            var urlMap = {
                '0': '../resource/devData/l_t_c_7.json',
                '1': '../resource/devData/l_t_c_30.json',
                'default': '../resource/devData/l_t_c_7.json'
            }
            return appName + (urlMap[this.tabVal] || urlMap['default']);
        },

        loadData: function () {
            this.chart.trigger('loading');
            if (!this._mockedData) {
                var cb = $.proxy(this.onLoadDataSuccess, this), self = this;
                Stats.ajax.getJSON(this.getUrl(), cb).fail(function () {
                    self.onLoadDataSuccess([]);
                });
            } else {
                this.onLoadDataSuccess(this._mockedData);
            }
        },

        onLoadDataSuccess: function (data) {
            var data = trafficChartResultParse.parse(data.result);
            this.chart.draw(data);
            // this.enableActions();
        },
        onTabClick: function () {
            this.tabVal = Number(this.listTabView.getValue());
            this.loadData();
        },
        destroy: function () {
            this.listSummary.trigger('destroy');
            this.listUsedFlowProgressBar.trigger('destroy');
            this.listUsedSpaceProgressBar.trigger('destroy');
            this.chart.trigger('destroy');
            this.listTabView.trigger('destroy');
        }
    })
}(jQuery, Stats, APPNAME));
