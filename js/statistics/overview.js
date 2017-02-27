(function ($, Stats, appName) {

    // parseDateStr:'20160728'==>'2016/07/28'
    var parseDateStr = function (options) {
        var str = options.str,
            needHours = options.needHours,
            dateJoin = options.dateJoin || '/',
            year = str.substr(0, 4),
            month = str.substr(4, 2),
            day = str.substr(6, 2),
            hour;
        if (needHours && str.length == 10) {
            hour = str.substr(8, 2);
        }
        var result = year + dateJoin + month + dateJoin + day;
        if (needHours) {
            result += (' ' + hour + ':00:00');
        }
        return result;
    };

    //overviewSummaryParser:'{avg:[],max:[],today:[],yesterday:[]}'==>[{label:'今天',uuid:'',uid'',ip:''},...]
    var overviewSummaryParser = new (Stats.ResultParser.extend({
        initialize: function () {
            this.labelMap = {
                'avg': '每日平均',
                'max': '历史峰值',
                'yesterday': '昨天',
                'today': '今天'
            };
        },

        doParse: function (data) {
            var d = [];
            d.push(this._convert(data['today'], this.labelMap['today']));
            d.push(this._convert(data['yesterday'], this.labelMap['yesterday']));
            d.push(this._convert(data['avg'], this.labelMap['avg']));
            d.push(this._convert(data['max'], this.labelMap['max']));
            return d;
        },

        _convert: function (data, fieldName) {
            var o = {label: fieldName};
            $.each(data, function (i, v) {
                o[v['indexName']] = v['value'];
            });
            return o;
        }
    }))();

    var overviewHourDataParser = new (Stats.HourResultParser.extend({

        doParse2: function (days, data) {
            var result = [], tempResult;
            $.each(days, function (i, v) {
                tempResult = data[v];
                if (tempResult) {
                    var val = {};
                    val.day = parseDateStr({str: v, dateJoin: '/'});
                    val.hours = [];
                    val.data = [];
                    $.each(tempResult, function (i, v) {
                        val.hours.push(v['hour']);
                        val.data.push(v['value']);
                    });
                    result.push(val);
                }
            });

            if (result.length > 1) {
                var temp = result[0];
                result[0] = result[1];
                result[1] = temp;
            }
            return result;
        },

        fillDataResultCreator: function(v) {
            return {hour: v + '', value: 0};
        }

    }))();

    var overviewDayDataParser = new (Stats.ResultParser.extend({
        parse: function (data) {
            var result = {
                day: [],
                data: []
            };
            $.each(data, function (i, v) {
                result.day.push(parseDateStr({str: v.day, dateJoin: '/'}));
                result.data.push(v.value);
            });
            return result;
        }
    }))();

    var OverviewLineChart = Stats.Chart.extend({

        hasData: function (data) {
            if (!data) {
                return false;
            }

            if ($.isArray(data) && data.length > 0) {
                return data[1].data.length > 0;
            }

            return $.isPlainObject(data) && data.data.length > 0;
        },

        _mergeCategories: function (data) {
            var categories = [],
                hour, i;
            for (i = 0; i < data[0].hours.length; i++) {
                hour = data[0].hours[i];
                categories.push(parseInt(hour.substr(8)));
            }
            if (data.length > 1) {
                var d;
                for (i = 0; i < data[1].hours.length; i++) {
                    hour = data[1].hours[i];
                    d = parseInt(hour.substr(8));
                    if (categories.indexOf(d) == -1) {
                        categories.push(d);
                    }
                }
            }
            categories.sort(function (a, b) {
                return a - b;
            });
            return categories;
        },

        getOption: function (data, isHourData) {
            var categories = isHourData ? this._mergeCategories(data) : data.day,
                that = this;
            var chartOptions = {
                chart: {
                    renderTo: this._id,
                    events: {
                        load: function () {
                            that.$el.find(".highcharts-legend-item").find("path:last").remove();
                        }
                    }
                },

                tooltip: {
                    formatter: function () {
                        var v = categories[this.x], d;
                        if (isHourData) {
                            d = this.series.name.replace(/\//g, '') + (v < 10 ? '0' + v : v);
                            d = parseDateStr({str: d, dateJoin: '-', needHours: true});
                        } else {
                            d = v.replace(/\//g, '-');
                        }
                        return '日期: ' + d + '<br>数量: ' + this.y;
                    }
                },

                plotOptions: {
                    series: {
                        marker: {
                            radius: 3
                        }
                    },

                    line: {
                        events: {
                            legendItemClick: function () {
                                return isHourData;
                            }
                        }
                    }
                },

                xAxis: {
                    tickInterval: 1,
                    tickmarkPlacement: 'on',
                    gridLineWidth: 1,
                    lineColor: '#428bca',
                    lineWidth: 1,
                    tickPosition: 'inside',
                    labels: {
                        formatter: function () {
                            var label = categories[this.value];
                            if (label) {
                                if (!isHourData) {
                                    label = label.split('/').splice(1).join('/');
                                }
                                return label;
                            }
                        }
                    },
                    startOnTick: true,
                    endOnTick: true,
                    minPadding: 0,
                    maxPadding: 0
                },

                yAxis: {
                    title: {
                        text: ''
                    },
                    lineWidth: 0.5,
                    tickWidth: 0.5,
                    lineColor: '#428bca',
                    labels: {
                        format: '{value:,.0f}'
                    },
                    min: 0,
                    tickAmount: 6
                },

                title: {
                    text: ''
                },

                legend: {
                    align: 'right',
                    verticalAlign: 'top'
                }
            };

            var colors = ['#57C2F4', '#F9CAC0'],
                series = [];
            if (isHourData) {
                $.each(data, function (i, v) {
                    var serie = {};
                    serie.name = v.day;
                    serie.data = v.data;
                    serie.color = colors[i];
                    series.push(serie);
                });
            } else {
                var temp = {};
                temp.color = colors[0];
                temp.data = data.data;
                var days = data.day;
                temp.name = days.length > 1 ? days[0] + ' 至 ' + days[days.length - 1] : '';
                series.push(temp);
            }

            chartOptions.series = series;
            return chartOptions;
        }
    });

    var ChartCompareActionSwitcher = Stats.RadioActionSwitcher.extend({
        initialize: function () {
            Stats.RadioActionSwitcher.prototype.initialize.apply(this, arguments);
            this.on('show', this.show);
            this.on('hide', this.hide);
        },

        show: function () {
            this.$parent.show();
        },

        hide: function () {
            this.$parent.hide();
        }
    });

    // for top 10 video
    var VideoView = Stats.View.extend({
        default: $.extend({}, Stats.View.prototype.default, {
            tableId: 'video-table',
            urlPrefix: '/s/c/v',
            el: '#video'
        }),

        init: function() {
            this.daysActionSwitcher = new Stats.DaysButtonSwitcher({
                parent: '#video .l-search'
            });
            this.daysActionSwitcher.on('actionClick', this.disableActions, this);
            this.daysActionSwitcher.on('actionClick', this.loadData, this);
            this.table = new Stats.Table({id: this.options.tableId});
            this.jqXHR = void 0;
            this.disableActions().loadData();
        },

        getUrl: function() {
            return './resource/devData/s_c_v.json';
            return appName + this.urlPrefix + '?d=' + this.daysActionSwitcher.getValue() + '&t=1';
        },

        loadData: function() {
            this.onBeforeLoadData();
            var cb = $.proxy(this.onLoadDataSuccess, this), self = this;
            if (this.jqXHR) this.jqXHR.abort();
            this.jqXHR = $.getJSON(this.getUrl(), cb).fail(function(){ self.onLoadDataSuccess([]) });
        },

        onBeforeLoadData: function() {
            this.table.trigger('loading');
        },

        onLoadDataSuccess: function(data) {
            this.table.load(data);
            this.enableActions();
        },

        enableActions: function () {
            this.daysActionSwitcher.trigger('enableActions');
            return this;
        },

        disableActions: function () {
            this.daysActionSwitcher.trigger('disableActions');
            return this;
        },

        destroy: function() {
            if (this.jqXHR) this.jqXHR.abort();
        }
    });

    // for access region
    var accessRegionResultParser = new (Stats.ResultParser.extend({
        // parse data for pipe chart
        doParse: function(data) {
            var d = [];
            $.each(data, function(i,v){
                var o = {};
                o.name = v.name;
                o.y = v.value;
                d.push(o);
            });
            return d;
        }
    }))();

    var AccessRegionPipeChart = Stats.PieChart.extend({
        getOption: function(data) {
            var options = AccessRegionPipeChart.__super__.getOption.call(this, data);
            options.legend.x = 160;
            $.extend(options.legend, {itemMarginTop: 5, itemMarginBottom: 5});
            options.chart.marginLeft = 30;
            options.chart.marginTop = 90;
            options.plotOptions.pie.center = [100, 100];
            options.plotOptions.pie.dataLabels.enabled = true;
            options.plotOptions.pie.dataLabels.distance = 15;
            options.plotOptions.pie.dataLabels.formatter = function() {
                return this.point.index <= 2 ? this.key : null;
            };
            return options;
        }
    });

    var AccessRegionView = Stats.View.extend({
        default: $.extend({}, Stats.View.prototype.default,{
            chartId: 'region-chart',
            el: '#region',
            urlPrefix: '/s/territory/stats'
        }),

        init: function() {
            this.daysActionSwitcher = new Stats.DaysButtonSwitcher({
                parent: '#region .l-search'
            });
            this.daysActionSwitcher.on('actionClick', this.disableActions, this)
                .on('actionClick', this.loadData, this);
            this.jqXHR = void 0;
            this.chart = new AccessRegionPipeChart({id: this.options.chartId});
            this.disableActions().loadData();
        },

        getUrl: function() {
            return './resource/devData/s_territory_stats.json';
            return appName + this.urlPrefix + '?v=' + this.daysActionSwitcher.getValue() +
                '&t=2&t2=0';
        },

        loadData: function() {
            this.onBeforeLoadData();
            var cb = $.proxy(this.onLoadDataSuccess, this), self = this;
            if (this.jqXHR) this.jqXHR.abort();
            this.jqXHR = $.getJSON(this.getUrl(), cb).fail(function(){ self.onLoadDataSuccess([]) });
        },

        onBeforeLoadData: function() {
            this.chart.trigger('loading');
        },

        onLoadDataSuccess: function(data) {
            var d = data && $.isArray(data) ? data : [];
            this.chart.draw(accessRegionResultParser.parse(d));
            this.enableActions();
        },

        enableActions: function () {
            this.daysActionSwitcher.trigger('enableActions');
            return this;
        },

        disableActions: function () {
            this.daysActionSwitcher.trigger('disableActions');
            return this;
        },

        destroy: function() {
            if (this.jqXHR) this.jqXHR.abort();
            this.chart.trigger('destroy');
        }
    });

    Stats.Views.OverviewView = Stats.View.extend({
        default: $.extend({}, Stats.View.prototype.default, {
            tableId: 'summary-table',
            chartId: 'chart',
            urlPrefix: '/s/ov/data',
            tmplId: 'overview-tpl'
        }),
        init: function () {
            this.urlPrefix = this.options.urlPrefix;
            this.daysActionSwitcher = new Stats.DaysButtonSwitcher({
                parent: '#overview .l-search'
            });
            this.daysActionSwitcher.on('actionClick', this.disableActions, this)
                .on('actionClick', this.loadChartData, this);


            this.itemActionSwitcher = new Stats.RadioActionSwitcher({
                parent: '#overview .l-search-action'
            });
            this.itemActionSwitcher.on('actionClick', this.disableActions, this)
                .on('actionClick', this.loadChartData, this);

            this.chartCompareActionSwitcher = new ChartCompareActionSwitcher({
                parent: '#overview #chart-compare-action',
                actions: {
                    last1Day: {sel: 'input[value=-1]', v: -1, default: true},
                    last7Day: {sel: 'input[value=-7]', v: -7}
                }
            });
            this.chartCompareActionSwitcher.on('actionClick', this.disableActions, this)
                .on('actionClick', this.loadChartData, this);

            this.actionArr = [this.daysActionSwitcher, this.itemActionSwitcher, this.chartCompareActionSwitcher];

            this.table = new Stats.Table({
                id: this.options.tableId
            });

            this.chart = new OverviewLineChart({
                id: this.options.chartId
            });
            this.descriptionPopover = new Stats.Popover({ el: '#description'});

            this.loadSummaryData().disableActions().loadChartData();
            this.videoView = new VideoView();
            this.accessRegionView = new AccessRegionView();
        },

        loadSummaryData: function () {
            this.table.trigger('loading');
            var self = this;
            Stats.ajax.getJSON(appName + './resource/devData/s_ov_summary.json', function (data) {
                self.table.load(overviewSummaryParser.parse(data));
            }).fail(function(){ self.table.load([]); });
            return this;
        },

        getUrl: function () {
            var d = this.daysActionSwitcher.getValue(),
                d2 = this.chartCompareActionSwitcher.getValue(),
                t = Stats.chartFactorMap[this.itemActionSwitcher.getValue()];
            return './resource/devData/s_ov_data.json';
            return appName + this.urlPrefix + "?d=" + d + "&t=" + t + "&d2=" + d2;
        },

        loadChartData: function () {
            var cb = $.proxy(this.onLoadChartDataDone, this),
                self = this;
            this.chart.trigger('loading');
            this.chartCompareActionSwitcher.trigger('hide');
            Stats.ajax.getJSON(this.getUrl(), cb).fail(function () {
                self.onLoadChartDataDone()
            });
        },

        onLoadChartDataDone: function (data) {
            if (data) {
                var d, isHourData = false, day = this.daysActionSwitcher.getValue(),
                    compareDay = this.chartCompareActionSwitcher.getValue();
                if (day == '-7' || day == '-30') {
                    d = overviewDayDataParser.parse(data);
                } else {
                    d = overviewHourDataParser.parse(data, day, compareDay);
                    isHourData = true;
                }
                this.chart.draw(d, isHourData);
                this.chartCompareActionSwitcher.trigger(day == '-7' || day == '-30' ? 'hide' : 'show');
            } else {
                this.chart.draw([]);
            }
            this.enableActions();
        },


        enableActions: function () {
            for (var i = 0; i < this.actionArr.length; i++) {
                this.actionArr[i].trigger('enableActions');
            }
            return this;
        },

        disableActions: function () {
            for (var i = 0; i < this.actionArr.length; i++) {
                this.actionArr[i].trigger('disableActions');
            }
            return this;
        },

        destroy: function () {
            this.chart.trigger('destroy');
            this.descriptionPopover.trigger('destroy');
            this.videoView.trigger('destroy');
            this.accessRegionView.trigger('destroy');
        }
    });

}(jQuery, Stats, APPNAME));
