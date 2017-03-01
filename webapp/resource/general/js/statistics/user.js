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

    //UserAccessSummaryParser:'{avg:[],max:[],today:[],yesterday:[]}'==>[{label:'今天',uuid:'',uid'',ip:''},...]
    var userAccessSummaryParser = new (Stats.ResultParser.extend({
        initialize: function () {
            this.labelMap = {
                'avg': '每日平均',
                'max': '历史峰值',
                'last7days': '近7天',
                'yesterday': '昨天',
                'today': '今天'
            };
        },

        doParse: function (data) {
            var d = [];
            d.push(this._convert(data['today'] ? data['today'] : {}, this.labelMap['today']));
            d.push(this._convert(data['yesterday'] ? data['yesterday'] : {}, this.labelMap['yesterday']));
            d.push(this._convert(data['avg'] ? data['avg'] : {}, this.labelMap['avg']));
            d.push(this._convert(data['max'] ? data['max'] : {}, this.labelMap['max']));
            // d.push(this._convert(data['last7days'], this.labelMap['last7days']));
            return d;
        },

        _convert: function (data, fieldName) {
            var o = {label: fieldName};
            $.each(data, function (i, v) {
                if (i == 'maxPV' || i == 'pvCnt' || i == 'avgPV') {
                    i = 'uuid'
                };
                if (i == 'maxUV' || i == 'uvCnt' || i == 'avgUV') {
                    i = 'uid'
                };
                if (i == 'maxIP' || i == 'ipCnt' || i == 'avgIP') {
                    i = 'ip'
                };
                o[i] = v;
            });
            return o;
        }
    }))();

    var accessChartHourDataParser = new (Stats.HourResultParser.extend({

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
            return {hour: v + '', value: 0}
        }
    }))();

    var accessChartDayDataParser = new (Stats.ResultParser.extend({
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

    var accessTableDataParser = new (Stats.ResultParser.extend({
        doParse: function (data, isHourData) {
            var d = [], time;
            if (isHourData) {
                $.each(data, function (k, v) {
                    $.each(v, function (i, v) {
                        time = v.hour;
                        delete v.hour;
                        v.time = time.substr(0, 4) + '-' + time.substr(4, 2) + '-' + time.substr(6, 2)
                            + ' ' + time.substr(8, 2) + ':00:00';
                        d.push(v);
                    });
                });
            } else {
                $.each(data, function (i, v) {
                    time = v.day;
                    delete v.day;
                    v.time = time.substr(0, 4) + '-' + time.substr(4, 2) + '-' + time.substr(6, 2);
                    d.push(v);
                });
            }
            d.sort(function (b, c) {
                return c.value - b.value;
            });
            return d;
        }
    }))();

    var UserAccessLineChart = Stats.Chart.extend({

        hasData: function (data) {
            if (!data) {
                return false;
            }

            if ($.isArray(data) && data.length > 0) {
                return data[1].data.length > 0;
            }

            return $.isPlainObject(data) && data.data && data.data.length > 0;
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
                temp.name = days.length >= 1 ? days[0] + ' 至 ' + days[days.length - 1] : '';
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

    Stats.Views.UserAccessView = Stats.View.extend({
        default:  $.extend({}, Stats.View.prototype.default, {
            chartId: 'chart',
            tableId: 'summary-table',
            tmplId: 'user-access-tpl',
            urlPrefix: '/s/ov/data'
        }),

        init: function() {

            this.daysActionSwitcher = new Stats.DaysButtonSwitcher({
                parent: '#days-search'
            });
            this.daysActionSwitcher.on('actionClick', this.onActionClick, this);

            this.fieldActionSwitcher = new Stats.RadioActionSwitcher({
                parent: '#field',
                actions: {
                    pv: {sel: 'input[name="f-type"][value="1"]', v: '1', 'default': true},
                    uv: {sel: 'input[name="f-type"][value="2"]', v: '2'},
                    ip: {sel: 'input[name="f-type"][value="3"]', v: '3'}
                }
            });

            this.fieldActionSwitcher.on('actionClick', this.setTableItemTitle, this)
                .on('actionClick', this.onActionClick, this);

            this.terminalActionSwitcher = new Stats.RadioActionSwitcher({
                parent: '#terminal',
                actions: {
                    'all': {sel: 'input[name="t-type"][value="all"]', v: 'all', 'default': true},
                    'flash': {sel: 'input[name="t-type"][value="f"]', v: 'f'},
                    'h5': {sel: 'input[name="t-type"][value="h"]', v: 'h'},
                    'ios': {sel: 'input[name="t-type"][value="i"]', v: 'i'},
                    'android': {sel: 'input[name="t-type"][value="a"]', v: 'a'}
                }
            });
            this.terminalActionSwitcher.on('actionClick', this.onActionClick, this);

            this.chartCompareActionSwitcher = new ChartCompareActionSwitcher({
                parent: '#chart-compare-action',
                actions: {
                    last1Day: {sel: 'input[value=-1]', v: -1, default: true},
                    last7Day: {sel: 'input[value=-7]', v: -7}
                }
            });
            this.chartCompareActionSwitcher.on('actionClick', this.onActionClick, this);

            this.actions = [this.daysActionSwitcher, this.fieldActionSwitcher, this.terminalActionSwitcher,
                this.chartCompareActionSwitcher];

            this.table = new Stats.Table({
                id: this.options.tableId
            });

            this.chart = new UserAccessLineChart({
                id: this.options.chartId
            });

            this.popover = new Stats.Popover({el: '#description'});
            this.loadSummaryData().disableActions().loadChartData();
        },

        getUrl: function () {
            var d = this.daysActionSwitcher.getValue(),
                d2 = this.chartCompareActionSwitcher.getValue(),
                // t = this.terminalActionSwitcher.getValue(),
                t = d == 0 ? 'h' : 'd',
                t2 = Stats.chartFactorMap[this.fieldActionSwitcher.getValue()];
            if(d == 0){
                return appName + '../resource/devData/userAccessData.json';
            } else if (d == -1) {
                return appName + '../resource/devData/userAccessData1.json';
            } else if (d == -7) {
                return appName + '../resource/devData/userAccessData7.json';
            } else {
                return appName + '../resource/devData/userAccessData30.json';
            }
            return appName + this.urlPrefix + "?d=" + d + "&t=" + t + "&t2="+ t2 +"&d2=" + d2;
        },

        onBeforeLoadData: function() {
            this.disableActions().setTableItemTitle();
            this.chart.trigger('loading');
            this.chartCompareActionSwitcher.trigger('hide');
        },

        loadSummaryData: function () {
            // ../resource/devData/userAccessSummary.json
            this.table.trigger('loading');
            var self = this;
            Stats.ajax.getJSON(appName + '../resource/devData/userAccessSummary.json', function (data) {
            // Stats.ajax.getJSON(appName + '/s/ov/summary', function (data) {
                self.table.load(userAccessSummaryParser.parse(data));
            }).fail(function () {
                self.table.load([]);
            });
            return this;
        },

        loadChartData: function () {
            this.onBeforeLoadData();
            var cb = $.proxy(this.onLoadChartDataDone, this),
                self = this;
            Stats.ajax.getJSON(this.getUrl(), cb).fail(function () {
                self.onLoadChartDataDone()
            });
        },

        _convertD: function (data) {
            var item = this.fieldActionSwitcher.getValue(),
                value = (item == 1) ? 'pvcnt' : (item == 2) ? 'uvcnt' : 'ipcnt';
            var result = [], obj = {} , objs = {};
            for(var k in data){
                for (var i = 0; i < data[k].length; i++) {
                    var cur = data[k][i];
                    for (var key in cur) {
                        obj['value'] = cur[value];
                        obj['hour'] = cur['common_hour']
                    }
                    result.push(obj);
                    obj = {};
                }
                objs[k] = result;
                result = [];
            }
            return objs;
        },

        _convertH:function (data) {
            //将后台返回的数据转换成项目之前的数据格式；
            var item = this.fieldActionSwitcher.getValue(),
                day = this.daysActionSwitcher.getValue(),
                value = (item == 1) ? 'pvcnt' : (item == 2) ? 'uvcnt' : 'ipcnt',
                dayVal = day == 0 ? 'common_day' : 'day';
            var result = [], obj = {};
            for (var i = 0; i < data.length; i++) {
                var cur = data[i];
                for (var key in cur) {
                    obj['value'] = cur[value];
                    obj['day'] = cur[dayVal]
                }
                result.push(obj);
                obj = {};
            }
           return result;
        },

        onLoadChartDataDone: function (data) {
            if (data) {
                var d, isHourData = false, day = this.daysActionSwitcher.getValue(),
                    compareDay = this.chartCompareActionSwitcher.getValue();
                if (day < -1 ) {
                    data = this._convertH(data);
                    d = accessChartDayDataParser.parse(data);
                } else {
                    //将后台返回的数据转换成项目之前的数据格式；
                    data = this._convertD(data);
                    d = accessChartHourDataParser.parse(data, day, compareDay);
                    isHourData = true;
                }
                this.chart.draw(d, isHourData);
                // this.table.load(accessTableDataParser.parse(data, isHourData));
                this.chartCompareActionSwitcher.trigger(day == '-7' || day == '-10' || day == '-30' ? 'hide' : 'show');
            } else {
                this.chart.draw([]);
                this.table.load([]);
            }
            this.enableActions();
        },

        onActionClick: function() {
            this.disableActions().loadChartData();
            return this;
        },

        setTableItemTitle: function() {
            var val = this.fieldActionSwitcher.getValue();
            var title = val == '1' ? '浏览量（PV）' : (val == '2' ? '访客数（UV）' : 'IP（独立IP）');
            this.table.$table.find('.item-title .th-inner').text(title);
            return this;
        },

        disableActions: function() {
            for (var i = 0; i < this.actions.length; i++) {
                this.actions[i].trigger('disableActions');
            }
            return this;
        },

        enableActions: function() {
            for (var i = 0; i < this.actions.length; i++) {
                this.actions[i].trigger('enableActions');
            }
            return this;
        },

        destroy: function() {
            this.chart.trigger('destroy');
            this.popover.trigger('destroy');
        }
    });

    //------------------
    // User sample

    var chartItemMap = {
        '1': {name: '浏览量（PV）', color: '#57C2F4'},
        '2': {name: '访客数（UV）', color: '#F9CAC0'}
    };

    var sampleUtils = {
        getUrl: function (prefix, values) {
            // return appName + prefix + "?t=" + type;
            return appName + '../resource/devData/usersample_summary.json';
            var type = values.length == 2 ? 'all' : (values[0] == 1 ? 'pv' : 'uv');
            return appName + prefix;
        },

        prefixIfLt: function (v, max, str) {
            return v < max ? str + v : v + '';
        }
    };

    var sampleResultParser = new (Stats.ResultParser.extend({
        doParse: function (data) {
            var result = {}, categories = [], category;
            $.each(data, function (k, v) {
                var d = [];
                $.each(v, function (i, vv) {
                    category = (vv.minute + '').substr(8);
                    category = category.substr(0, 2) + ':' + category.substr(2);
                    if (categories.indexOf(category) == -1) {
                        categories.push(category);
                    }
                    d.push(vv.value);
                });
                result[k] = d;
            });
            return {
                categories: categories,
                result: result
            };
        }
    }))();

    var SampleLineChart = Stats.Chart.extend({

        initialize: function () {
            SampleLineChart.__super__.initialize.apply(this, arguments);
            this.categories = [];
            this.maxXLabelAmount = 30;
        },

        hasData: function (data) {
            return data && data.categories && data.categories.length > 0;
        },

        update: function (data) {
            if (data && data.result && data.categories) {
                if (this._chart) {
                    this.appendYValue(data.result.pv);
                    this.appendYValue(data.result.uv);
                    var key;
                    $.each(this._chart.series, function (i, v) {
                        key = v.options._resultKey;
                        v.setData(data.result[key], false);
                    });

                    this.setCategories(data.categories);
                    this._chart.xAxis[0].update({}, false);

                    this._chart.redraw();
                }
            }
        },

        appendYValue: function (arr) {
            if (arr && arr.length > 0) {
                if (arr.length < this.maxXLabelAmount) {
                    for (var i = 0, len = this.maxXLabelAmount - arr.length; i < len; i++) {
                        arr.push(0);
                    }
                }
                arr.splice(0, arr.length - this.maxXLabelAmount);
            }
        },

        setCategories: function (categories) {
            if (categories.length < this.maxXLabelAmount) {
                var last, arr;
                for (var i = 0, len = this.maxXLabelAmount - categories.length; i < len; i++) {
                    last = categories[categories.length - 1];
                    arr = last.split(':');
                    var d = new Date();
                    d.setHours(parseInt(arr[0]));
                    d.setMinutes(parseInt(arr[1]));
                    var nd = new Date(d.getTime() + 60 * 1000);
                    categories.push(
                        sampleUtils.prefixIfLt(nd.getHours(), 10, '0') + ':' + sampleUtils.prefixIfLt(nd.getMinutes(), 10, '0')
                    );
                }
            }
            categories.splice(0, categories.length - this.maxXLabelAmount);
            this.categories = categories;
        },

        getOption: function (data) {
            this.setCategories(data.categories);
            this.appendYValue(data.result.pv);
            this.appendYValue(data.result.uv);
            var self = this;
            var chartOptions = {
                chart: {
                    renderTo: this._id,
                    type: 'area'
                },

                tooltip: {
                    formatter: function () {
                        var d = this.series.name;
                        return d + '<br>时间:' + self.categories[this.x] + '<br>数量: ' + this.y;
                    }
                },

                plotOptions: {
                    series: {
                        marker: {
                            radius: 3
                        }
                    },

                    area: {
                        events: {
                            legendItemClick: function () {
                                return false;
                            }
                        },
                        fillColor: 'rgba(222, 243, 253, 0.3)'
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
                            return self.categories[this.value];
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
                    verticalAlign: 'top',
                    symbolHeight: 2
                }
            };
            chartOptions.series = this.convertSeriesFrom(data);
            return chartOptions;
        },

        convertSeriesFrom: function (data) {
            var series = [], pv = data.result.pv || [], uv = data.result.uv || [];
            this.appendYValue(pv);
            this.appendYValue(uv);
            this.appendToSeries(pv, '1', series, 'pv');
            this.appendToSeries(uv, '2', series, 'uv');
            return series;
        },

        appendToSeries: function (arr, itemKey, target, resultKey) {
            if (arr.length > 0) {
                target.push(
                    {
                        name: chartItemMap[itemKey].name,
                        data: arr,
                        color: chartItemMap[itemKey].color,
                        _resultKey: resultKey
                    }
                );
            }
        }
    });

    var SampleChartDataFetcher = Stats.Class.extend({

        initialize: function () {
            this.intervalId = -1;
            this.urlPrefix = this.options.urlPrefix;
            this.chart = this.options.chart;
            this.values = [];
            this.jqXHR = void 0;
            this.on('setValues', this.setValues);
            this.on('destroy', this.stop);
        },

        start: function (values) {
            this.stop();
            if (values && values.length > 0) {
                this.setValues(values);
                this.intervalId = setInterval($.proxy(this._getData, this), 60 * 1000);
            }
            return this;
        },

        _getData: function () {
            if (this.values.length == 0) {
                return;
            }
            var cb = $.proxy(this.onGetDataDone, this);
            this.jqXHR = $.getJSON(sampleUtils.getUrl(this.urlPrefix, this.values), cb);
        },

        onGetDataDone: function (data) {
            if (this.chart._chart) {
                var d = sampleResultParser.parse(data);
                this.chart.update(d);
            }
        },

        stop: function () {
            if (this.intervalId != -1) {
                clearInterval(this.intervalId);
            }
            this.setValues([]);
            if (this.jqXHR) this.jqXHR.abort();
            return this;
        },

        setValues: function (values) {
            this.values = values;
            return this;
        }

    });

    Stats.Views.SampleView = Stats.View.extend({
        default: $.extend({}, Stats.View.prototype.default, {
            tableId: 'detail-table',
            chartId: 'chart',
            urlPrefix: '/s/user/sv',
            tmplId: 'user-sample-tpl'
        }),
        init: function () {
            this.urlPrefix = this.options.urlPrefix;
            this.tableDataUrl = this.options.tableDataUrl;

            this.table = new Stats.Table({
                id: this.options.tableId
            });

            this.chart = new SampleLineChart({
                id: this.options.chartId,
                onLoad: function (chart) {
                    $(chart.container).find(".highcharts-legend-item").find("rect").attr("y", 10);
                }
            });

            this.checkBoxActionSwitcher = new Stats.CheckBoxActionSwitcher({
                parent: '.l-search .l-search-action'
            });
            this.checkBoxActionSwitcher.on('change', this.onChartItemChange, this);

            this.chartDataFetcher = new SampleChartDataFetcher({
                urlPrefix: this.urlPrefix,
                chart: this.chart
            });

            this.popover = new Stats.Popover({el: '#description'});
            this.loadDetailData().disableActions().loadChartData();
        },

        onChartItemChange: function (values) {
            if (values.length == 0) {
                this.chart.draw([]);
            } else {
                this.disableActions().loadChartData();
            }
        },

        loadDetailData: function () {
            return this;
        },

        getUrl: function () {
            return sampleUtils.getUrl(this.urlPrefix, this.checkBoxActionSwitcher.getValues());
        },

        loadChartData: function () {
            this.chart.trigger('loading');
            var cb = $.proxy(this.onLoadChartDataDone, this),
                self = this;
            Stats.ajax.getJSON(this.getUrl(), cb).fail(function () {
                self.onLoadChartDataDone()
            });
        },

        onLoadChartDataDone: function (data) {
            var d = this.convert(data) || [];
            this.chart.draw(sampleResultParser.parse(d));
            this.chartDataFetcher.start(this.checkBoxActionSwitcher.getValues());
            this.enableActions();
        },

        convert:function (data) {
            if(data){
                var obj = {},objs = {},arr=[],val,option,select;
                var index = this.checkBoxActionSwitcher.getValues();
                $.each(index,function (i,j) {
                    if(j == '1'){
                        option = 'uuid';
                        val = 'pvcnt';
                        select = 'pv';
                    }else if(j == '2'){
                        option = 'uid';
                        val = 'uvcnt';
                        select = 'uv';
                    }else{
                        option = 'ip';
                        val = 'ipcnt';
                        select = 'ip';
                    }
                    $.each(data,function (k, v) {
                        obj.indexName = option;
                        obj.minute = v['common_minute'];
                        obj.value = v [val];
                        arr.push(obj);
                        obj = {};
                    });
                    objs[select] = arr;
                    arr = [];
                })
               return objs;
            }
        },

        enableActions: function () {
            this.checkBoxActionSwitcher.trigger('enable');
            return this;
        },

        disableActions: function () {
            this.checkBoxActionSwitcher.trigger('disable');
            return this;
        },

        destroy: function () {
            this.chartDataFetcher.trigger('destroy');
            this.chart.trigger('destroy');
            this.popover.trigger('destroy');
        }
    });

}(jQuery, Stats, APPNAME));


// (function ($, Stats, appName) {
//
//     //-------------
//     // User analysis
//     //-------------
//
//     //-------------
//     // user barrage
//
//     var barrageResultParser = new (Stats.ResultParser.extend({
//
//         doParse: function (data) {
//             var d = data || [], categories = [], chartData = [];
//             $.each(d, function (i, v) {
//                 chartData.push(v['value']);
//                 categories.push(v['name']);
//             });
//             return {
//                 categories: categories,
//                 series: [{data: chartData}]
//             }
//         }
//     }))();
//
//     var BarrageBarChart = Stats.BarChart.extend({
//         getOption: function (data) {
//             var options = BarrageBarChart.__super__.getOption.call(this, data),
//                 namePrefix = this.options.namePrefix || '';
//             $.extend(options, {
//                 tooltip: {
//                     formatter: function () {
//                         return this.x + '<br>' + namePrefix + ': ' + this.y;
//                     }
//                 }
//             });
//             return options;
//         }
//     });
//
//     Stats.Views.BarrageView = Stats.View.extend({
//         default: $.extend({}, Stats.View.prototype.default, {
//             tableId: 'data-table',
//             chartId: 'chart'
//         }),
//
//         init: function () {
//             this.urlPrefix = this.options.urlPrefix;
//             this.title = this.options.title;
//             this.$title = this.$el.find('#title');
//             this._mockedData = this.options.mockedData;
//             this.daysActionSwitcher = new Stats.DaysButtonSwitcher({
//                 parent: '.l-search'
//             });
//             this.daysActionSwitcher.on('actionClick', this.disableActions, this);
//             this.daysActionSwitcher.on('actionClick', this.loadData, this);
//
//             this.table = new Stats.Table({id: this.options.tableId});
//             this.chart = new BarrageBarChart({id: this.options.chartId, namePrefix: this.options.namePrefix});
//             this.disableActions().loadData();
//         },
//
//         getUrl: function () {
//             return appName + this.urlPrefix + '?v=' + this.daysActionSwitcher.getValue();
//         },
//
//         loadData: function () {
//             this.onBeforeLoadData();
//             if (!this._mockedData) {
//                 var cb = $.proxy(this.onLoadDataSuccess, this), self = this;
//                 Stats.ajax.getJSON(this.getUrl(), cb).fail(function () {
//                     self.onLoadDataSuccess([])
//                 });
//             } else {
//                 this.onLoadDataSuccess();
//             }
//         },
//
//         onBeforeLoadData: function () {
//             this.setTitle();
//             this.chart.trigger('loading');
//             this.table.trigger('loading');
//         },
//
//         onLoadDataSuccess: function (data) {
//             this.chart.draw(barrageResultParser.parse(this._mockedData || data));
//             this.table.load(this._mockedData ? this._mockedData : data);
//             this.enableActions();
//         },
//
//         setTitle: function () {
//             this.$title.text(this.title + ' - ' + this.daysActionSwitcher.$current.text());
//         },
//
//         enableActions: function () {
//             this.daysActionSwitcher.trigger('enableActions');
//             return this;
//         },
//
//         disableActions: function () {
//             this.daysActionSwitcher.trigger('disableActions');
//             return this;
//         }
//     });
//
//     //-------------
//     // user online
//
//     var parseDateStr = function (options) {
//         var str = options.str,
//             needHours = options.needHours,
//             dateJoin = options.dateJoin || '/',
//             year = str.substr(0, 4),
//             month = str.substr(4, 2),
//             day = str.substr(6, 2),
//             hour;
//         if (needHours && str.length == 10) {
//             hour = str.substr(8, 2);
//         }
//         var result = year + dateJoin + month + dateJoin + day;
//         if (needHours) {
//             result += (' ' + hour + ':00:00');
//         }
//         return result;
//     };
//
//     var activeUserTableDataParser = new (Stats.ResultParser.extend({
//         doParse: function (data, isHourData) {
//             var d = [], time;
//             if (isHourData) {
//                 $.each(data, function (k, v) {
//                     $.each(v, function (i, v) {
//                         time = v.hour;
//                         delete v.hour;
//                         v.time = time.substr(0, 4) + '-' + time.substr(4, 2) + '-' + time.substr(6, 2)
//                             + ' ' + time.substr(8, 2) + ':00:00';
//                         v.percent = Math.round(v.percent * 100) + '%';
//                         d.push(v);
//                     });
//                 });
//             } else {
//                 $.each(data, function (i, v) {
//                     time = v.day;
//                     delete v.day;
//                     v.time = time.substr(0, 4) + '-' + time.substr(4, 2) + '-' + time.substr(6, 2);
//                     v.percent = Math.round(v.percent * 100) + '%';
//                     d.push(v);
//                 });
//             }
//             d.sort(function (b, c) {
//                 return c.activeUserCnt - b.activeUserCnt;
//             });
//             return d;
//         }
//     }))();
//
//     var activeUserHourDataParser = new (Stats.HourResultParser.extend({
//         doParse2: function (days, data) {
//             var result = [], tempResult;
//             $.each(days, function (i, v) {
//                 tempResult = data[v];
//                 if (tempResult && tempResult.length > 0) {
//                     var val = {};
//                     val.day = parseDateStr({str: v, dateJoin: '/'});
//                     val.hours = [];
//                     val.data = [];
//                     $.each(tempResult, function (i, v) {
//                         val.hours.push(v['hour']);
//                         val.data.push(v['activeUserCnt']);
//                     });
//                     result.push(val);
//                 }
//             });
//
//             if (result.length > 1) {
//                 var temp = result[0];
//                 result[0] = result[1];
//                 result[1] = temp;
//             }
//             return result;
//         },
//
//         fillDataResultCreator: function(v) {
//             return  {activeUserCnt: 0, allUserCnt: 0, percent: 0, hour: v + ''};
//         }
//
//     }))();
//
//     var activeUserDayDataParser = new (Stats.ResultParser.extend({
//         doParse: function (data) {
//             var result = {
//                 day: [],
//                 data: []
//             };
//
//             $.each(data, function (i, v) {
//                 var o = {};
//                 result.day.push(parseDateStr({str: v.day, dateJoin: '/'}));
//                 o.y = v['activeUserCnt'];
//                 o['_data'] = v;
//                 result.data.push(o);
//             });
//             return result;
//         }
//     }))();
//
//     var FoundationLineChart = Stats.Chart.extend({
//
//         hasData: function (data, isHourData) {
//             if (!data) {
//                 return false;
//             }
//             return isHourData ? $.isArray(data) && data.length > 0
//                 : $.isPlainObject(data) && data.data && data.data.length > 0;
//         },
//
//         _mergeCategories: function (data) {
//             var categories = [],
//                 hour, i;
//             for (i = 0; i < data[0].hours.length; i++) {
//                 hour = data[0].hours[i];
//                 categories.push(parseInt(hour.substr(8)));
//             }
//             if (data.length > 1) {
//                 var d;
//                 for (i = 0; i < data[1].hours.length; i++) {
//                     hour = data[1].hours[i];
//                     d = parseInt(hour.substr(8));
//                     if (categories.indexOf(d) == -1) {
//                         categories.push(d);
//                     }
//                 }
//             }
//             categories.sort(function (a, b) {
//                 return a - b;
//             });
//             return categories;
//         },
//
//         getOption: function (data, isHourData) {
//             var categories = isHourData ? this._mergeCategories(data) : data.day;
//             var chartOptions = {
//                 chart: {
//                     renderTo: this._id
//                 },
//
//                 tooltip: {
//                     formatter: function () {
//                         var v = categories[this.x], d;
//                         if (isHourData) {
//                             d = this.series.name.replace(/\//g, '') + (v < 10 ? '0' + v : v);
//                             d = parseDateStr({str: d, dateJoin: '-', needHours: true});
//                         } else {
//                             d = v.replace(/\//g, '-');
//                         }
//                         return '日期: ' + d + '<br>在线用户: ' + this.y;
//                     }
//                 },
//
//                 plotOptions: {
//                     series: {
//                         marker: {
//                             radius: 3
//                         }
//                     },
//
//                     line: {
//                         events: {
//                             legendItemClick: function () {
//                                 return isHourData;
//                             }
//                         }
//                     }
//                 },
//
//                 xAxis: {
//                     tickInterval: 1,
//                     tickmarkPlacement: 'on',
//                     gridLineWidth: 1,
//                     lineColor: '#428bca',
//                     lineWidth: 1,
//                     tickPosition: 'inside',
//                     labels: {
//                         formatter: function () {
//                             var label = categories[this.value];
//                             if (label) {
//                                 if (!isHourData) {
//                                     label = label.split('/').splice(1).join('/');
//                                 }
//                                 return label;
//                             }
//                         }
//                     },
//                     startOnTick: true,
//                     endOnTick: true,
//                     minPadding: 0,
//                     maxPadding: 0
//                 },
//
//                 yAxis: {
//                     title: {
//                         text: ''
//                     },
//                     lineWidth: 0.5,
//                     tickWidth: 0.5,
//                     lineColor: '#428bca',
//                     labels: {
//                         format: '{value:,.0f}'
//                     },
//                     min: 0,
//                     tickAmount: 6
//                 },
//
//                 title: {
//                     text: ''
//                 },
//
//                 legend: {
//                     align: 'right',
//                     verticalAlign: 'top'
//                 }
//             };
//
//             var colors = ['#57C2F4', '#F9CAC0'],
//                 series = [];
//             if (isHourData) {
//                 $.each(data, function (i, v) {
//                     var serie = {};
//                     serie.name = v.day;
//                     serie.data = v.data;
//                     serie.color = colors[i];
//                     series.push(serie);
//                 });
//             } else {
//                 var temp = {};
//                 temp.color = colors[0];
//                 temp.data = data.data;
//                 var days = data.day;
//                 temp.name = days.length > 1 ? days[0] + ' 至 ' + days[days.length - 1] : '';
//                 series.push(temp);
//             }
//
//             chartOptions.series = series;
//             return chartOptions;
//         }
//     });
//
//     var ChartCompareActionSwitcher = Stats.RadioActionSwitcher.extend({
//         initialize: function () {
//             Stats.RadioActionSwitcher.prototype.initialize.apply(this, arguments);
//             this.on('show', this.show);
//             this.on('hide', this.hide);
//         },
//
//         show: function () {
//             this.$parent.show();
//         },
//
//         hide: function () {
//             this.$parent.hide();
//         }
//     });
//
//     Stats.Views.FoundationView = Stats.View.extend({
//         default: $.extend({}, Stats.View.prototype.default, {
//             tableId: 'summary-table',
//             chartId: 'chart',
//             urlPrefix: '/s/user/fc',
//             tmplId: 'user-foundation-tpl'
//         }),
//         init: function () {
//             this.urlPrefix = this.options.urlPrefix;
//             this.tableDataUrl = this.options.tableDataUrl;
//             this._mockedData = this.options.mockedData;
//             this.daysActionSwitcher = new Stats.DaysButtonSwitcher({
//                 parent: '.l-search'
//             });
//             this.daysActionSwitcher.on('actionClick', this.disableActions, this);
//             this.daysActionSwitcher.on('actionClick', this.loadChartData, this);
//
//
//             this.chartCompareActionSwitcher = new ChartCompareActionSwitcher({
//                 parent: '#chart-compare-action',
//                 actions: {
//                     last1Day: {sel: 'input[value=-1]', v: -1, default: true},
//                     last7Day: {sel: 'input[value=-7]', v: -7}
//                 }
//             });
//             this.chartCompareActionSwitcher.on('actionClick', this.disableActions, this);
//             this.chartCompareActionSwitcher.on('actionClick', this.loadChartData, this);
//
//             this.actionArr = [this.daysActionSwitcher, this.chartCompareActionSwitcher];
//
//             this.table = new Stats.Table({
//                 id: this.options.tableId
//             });
//
//             this.chart = new FoundationLineChart({
//                 id: this.options.chartId,
//                 onLoad: function (chart) {
//                     $(chart.container).find(".highcharts-legend-item").find("path:last").remove();
//                 }
//             });
//             this.popover = new Stats.Popover({el: '#description'});
//             this.disableActions().loadChartData();
//         },
//
//         loadSummaryData: function () {
//             //this.table.trigger('loading');
//             //var self = this;
//             //Stats.ajax.getJSON(appName + this.tableDataUrl, function (data) {
//             //    self.table.load(self.summaryResultParser.parse(data));
//             //});
//             return this;
//         },
//
//         getUrl: function () {
//             var d = this.daysActionSwitcher.getValue(),
//                 d2 = this.chartCompareActionSwitcher.getValue();
//             return appName + this.urlPrefix + "?d=" + d + "&d2=" + d2;
//         },
//
//         loadChartData: function () {
//             this.chart.trigger('loading');
//             this.table.trigger('loading');
//             this.chartCompareActionSwitcher.trigger('hide');
//             var cb = $.proxy(this.onLoadChartDataDone, this),
//                 self = this;
//             Stats.ajax.getJSON(this.getUrl(), cb).fail(function () {
//                 self.onLoadChartDataDone()
//             });
//         },
//
//         onLoadChartDataDone: function (data) {
//             if (data) {
//                 var d, isHourData = false, day = this.daysActionSwitcher.getValue(),
//                     compareDay = this.chartCompareActionSwitcher.getValue();
//                 if (day == '-7' || day == '-30') {
//                     d = activeUserDayDataParser.parse(data);
//                 } else {
//                     d = activeUserHourDataParser.parse(data, day, compareDay);
//                     isHourData = true;
//                 }
//                 d = isHourData ? (d.length > 0 ? d : []) : (d.day.length > 0 ? d : []);
//                 this.chart.draw(d, isHourData);
//                 this.table.load(activeUserTableDataParser.parse(data, isHourData) || []);
//                 this.chartCompareActionSwitcher.trigger(day == '-7' || day == '-30' ? 'hide' : 'show');
//             } else {
//                 this.chart.draw([]);
//                 this.table.load([]);
//             }
//             this.enableActions();
//         },
//
//
//         enableActions: function () {
//             for (var i = 0; i < this.actionArr.length; i++) {
//                 this.actionArr[i].trigger('enableActions');
//             }
//             return this;
//         },
//
//         disableActions: function () {
//             for (var i = 0; i < this.actionArr.length; i++) {
//                 this.actionArr[i].trigger('disableActions');
//             }
//             return this;
//         },
//
//         destroy: function () {
//             this.chart.trigger('destroy');
//             this.popover.trigger('destroy');
//         }
//     });
//
//     //--------------
//     // user access
//
//     var accessChartHourDataParser = new (Stats.HourResultParser.extend({
//
//         doParse2: function (days, data) {
//             var result = [], tempResult;
//             $.each(days, function (i, v) {
//                 tempResult = data[v];
//                 if (tempResult) {
//                     var val = {};
//                     val.day = parseDateStr({str: v, dateJoin: '/'});
//                     val.hours = [];
//                     val.data = [];
//                     $.each(tempResult, function (i, v) {
//                         val.hours.push(v['hour']);
//                         val.data.push(v['value']);
//                     });
//                     result.push(val);
//                 }
//             });
//
//             if (result.length > 1) {
//                 var temp = result[0];
//                 result[0] = result[1];
//                 result[1] = temp;
//             }
//             return result;
//         },
//
//         fillDataResultCreator: function(v) {
//             return {hour: v + '', value: 0}
//         }
//     }))();
//
//     var accessChartDayDataParser = new (Stats.ResultParser.extend({
//         parse: function (data) {
//             var result = {
//                 day: [],
//                 data: []
//             };
//             $.each(data, function (i, v) {
//                 result.day.push(parseDateStr({str: v.day, dateJoin: '/'}));
//                 result.data.push(v.value);
//             });
//             return result;
//         }
//     }))();
//
//     var accessTableDataParser = new (Stats.ResultParser.extend({
//         doParse: function (data, isHourData) {
//             var d = [], time;
//             if (isHourData) {
//                 $.each(data, function (k, v) {
//                     $.each(v, function (i, v) {
//                         time = v.hour;
//                         delete v.hour;
//                         v.time = time.substr(0, 4) + '-' + time.substr(4, 2) + '-' + time.substr(6, 2)
//                             + ' ' + time.substr(8, 2) + ':00:00';
//                         d.push(v);
//                     });
//                 });
//             } else {
//                 $.each(data, function (i, v) {
//                     time = v.day;
//                     delete v.day;
//                     v.time = time.substr(0, 4) + '-' + time.substr(4, 2) + '-' + time.substr(6, 2);
//                     d.push(v);
//                 });
//             }
//             d.sort(function (b, c) {
//                 return c.value - b.value;
//             });
//             return d;
//         }
//     }))();
//
//     var UserAccessLineChart = Stats.Chart.extend({
//
//         hasData: function (data) {
//             if (!data) {
//                 return false;
//             }
//
//             if ($.isArray(data) && data.length > 0) {
//                 return data[1].data.length > 0;
//             }
//
//             return $.isPlainObject(data) && data.data && data.data.length > 0;
//         },
//
//         _mergeCategories: function (data) {
//             var categories = [],
//                 hour, i;
//             for (i = 0; i < data[0].hours.length; i++) {
//                 hour = data[0].hours[i];
//                 categories.push(parseInt(hour.substr(8)));
//             }
//             if (data.length > 1) {
//                 var d;
//                 for (i = 0; i < data[1].hours.length; i++) {
//                     hour = data[1].hours[i];
//                     d = parseInt(hour.substr(8));
//                     if (categories.indexOf(d) == -1) {
//                         categories.push(d);
//                     }
//                 }
//             }
//             categories.sort(function (a, b) {
//                 return a - b;
//             });
//             return categories;
//         },
//
//         getOption: function (data, isHourData) {
//             var categories = isHourData ? this._mergeCategories(data) : data.day,
//                 that = this;
//             var chartOptions = {
//                 chart: {
//                     renderTo: this._id,
//                     events: {
//                         load: function () {
//                             that.$el.find(".highcharts-legend-item").find("path:last").remove();
//                         }
//                     }
//                 },
//
//                 tooltip: {
//                     formatter: function () {
//                         var v = categories[this.x], d;
//                         if (isHourData) {
//                             d = this.series.name.replace(/\//g, '') + (v < 10 ? '0' + v : v);
//                             d = parseDateStr({str: d, dateJoin: '-', needHours: true});
//                         } else {
//                             d = v.replace(/\//g, '-');
//                         }
//                         return '日期: ' + d + '<br>数量: ' + this.y;
//                     }
//                 },
//
//                 plotOptions: {
//                     series: {
//                         marker: {
//                             radius: 3
//                         }
//                     },
//
//                     line: {
//                         events: {
//                             legendItemClick: function () {
//                                 return isHourData;
//                             }
//                         }
//                     }
//                 },
//
//                 xAxis: {
//                     tickInterval: 1,
//                     tickmarkPlacement: 'on',
//                     gridLineWidth: 1,
//                     lineColor: '#428bca',
//                     lineWidth: 1,
//                     tickPosition: 'inside',
//                     labels: {
//                         formatter: function () {
//                             var label = categories[this.value];
//                             if (label) {
//                                 if (!isHourData) {
//                                     label = label.split('/').splice(1).join('/');
//                                 }
//                                 return label;
//                             }
//                         }
//                     },
//                     startOnTick: true,
//                     endOnTick: true,
//                     minPadding: 0,
//                     maxPadding: 0
//                 },
//
//                 yAxis: {
//                     title: {
//                         text: ''
//                     },
//                     lineWidth: 0.5,
//                     tickWidth: 0.5,
//                     lineColor: '#428bca',
//                     labels: {
//                         format: '{value:,.0f}'
//                     },
//                     min: 0,
//                     tickAmount: 6
//                 },
//
//                 title: {
//                     text: ''
//                 },
//
//                 legend: {
//                     align: 'right',
//                     verticalAlign: 'top'
//                 }
//             };
//
//             var colors = ['#57C2F4', '#F9CAC0'],
//                 series = [];
//             if (isHourData) {
//                 $.each(data, function (i, v) {
//                     var serie = {};
//                     serie.name = v.day;
//                     serie.data = v.data;
//                     serie.color = colors[i];
//                     series.push(serie);
//                 });
//             } else {
//                 var temp = {};
//                 temp.color = colors[0];
//                 temp.data = data.data;
//                 var days = data.day;
//                 temp.name = days.length >= 1 ? days[0] + ' 至 ' + days[days.length - 1] : '';
//                 series.push(temp);
//             }
//
//             chartOptions.series = series;
//             return chartOptions;
//         }
//     });
//
//     Stats.Views.UserAccessView = Stats.View.extend({
//         default:  $.extend({}, Stats.View.prototype.default, {
//             chartId: 'chart',
//             tableId: 'data-table',
//             tmplId: 'user-access-tpl',
//             urlPrefix: '/s/user/ac'
//         }),
//
//         init: function() {
//
//             this.daysActionSwitcher = new Stats.DaysButtonSwitcher({
//                 parent: '#days-search'
//             });
//             this.daysActionSwitcher.on('actionClick', this.onActionClick, this);
//
//             this.fieldActionSwitcher = new Stats.RadioActionSwitcher({
//                 parent: '#field',
//                 actions: {
//                     pv: {sel: 'input[name="f-type"][value="1"]', v: '1', 'default': true},
//                     uv: {sel: 'input[name="f-type"][value="2"]', v: '2'},
//                     ip: {sel: 'input[name="f-type"][value="3"]', v: '3'}
//                 }
//             });
//
//             this.fieldActionSwitcher.on('actionClick', this.setTableItemTitle, this)
//                 .on('actionClick', this.onActionClick, this);
//
//             this.terminalActionSwitcher = new Stats.RadioActionSwitcher({
//                 parent: '#terminal',
//                 actions: {
//                     'all': {sel: 'input[name="t-type"][value="all"]', v: 'all', 'default': true},
//                     'flash': {sel: 'input[name="t-type"][value="f"]', v: 'f'},
//                     'h5': {sel: 'input[name="t-type"][value="h"]', v: 'h'},
//                     'ios': {sel: 'input[name="t-type"][value="i"]', v: 'i'},
//                     'android': {sel: 'input[name="t-type"][value="a"]', v: 'a'}
//                 }
//             });
//             this.terminalActionSwitcher.on('actionClick', this.onActionClick, this);
//
//             this.chartCompareActionSwitcher = new ChartCompareActionSwitcher({
//                 parent: '#chart-compare-action',
//                 actions: {
//                     last1Day: {sel: 'input[value=-1]', v: -1, default: true},
//                     last7Day: {sel: 'input[value=-7]', v: -7}
//                 }
//             });
//             this.chartCompareActionSwitcher.on('actionClick', this.onActionClick, this);
//
//             this.actions = [this.daysActionSwitcher, this.fieldActionSwitcher, this.terminalActionSwitcher,
//                 this.chartCompareActionSwitcher];
//
//             this.table = new Stats.Table({
//                 id: this.options.tableId
//             });
//
//             this.chart = new UserAccessLineChart({
//                 id: this.options.chartId
//             });
//
//             this.popover = new Stats.Popover({el: '#description'});
//             this.disableActions().loadChartData();
//
//         },
//
//         getUrl: function () {
//             var d = this.daysActionSwitcher.getValue(),
//                 d2 = this.chartCompareActionSwitcher.getValue(),
//                 t = this.terminalActionSwitcher.getValue(),
//                 t2 = Stats.chartFactorMap[this.fieldActionSwitcher.getValue()];
//             return appName + this.urlPrefix + "?d=" + d + "&t=" + t + "&t2="+ t2 +"&d2=" + d2;
//         },
//
//         onBeforeLoadData: function() {
//             this.disableActions().setTableItemTitle();
//             this.chart.trigger('loading');
//             this.chartCompareActionSwitcher.trigger('hide');
//         },
//
//         loadChartData: function () {
//             this.onBeforeLoadData();
//             var cb = $.proxy(this.onLoadChartDataDone, this),
//                 self = this;
//             Stats.ajax.getJSON(this.getUrl(), cb).fail(function () {
//                 self.onLoadChartDataDone()
//             });
//         },
//
//         onLoadChartDataDone: function (data) {
//             if (data) {
//                 var d, isHourData = false, day = this.daysActionSwitcher.getValue(),
//                     compareDay = this.chartCompareActionSwitcher.getValue();
//                 if (day == '-7' || day == '-30') {
//                     d = accessChartDayDataParser.parse(data);
//                 } else {
//                     d = accessChartHourDataParser.parse(data, day, compareDay);
//                     isHourData = true;
//                 }
//                 this.chart.draw(d, isHourData);
//                 this.table.load(accessTableDataParser.parse(data, isHourData));
//                 this.chartCompareActionSwitcher.trigger(day == '-7' || day == '-30' ? 'hide' : 'show');
//             } else {
//                 this.chart.draw([]);
//                 this.table.load([]);
//             }
//             this.enableActions();
//         },
//
//         onActionClick: function() {
//             this.disableActions().loadChartData();
//             return this;
//         },
//
//         setTableItemTitle: function() {
//             var val = this.fieldActionSwitcher.getValue();
//             var title = val == '1' ? '浏览量（PV）' : (val == '2' ? '访客数（UV）' : 'IP（独立IP）');
//             this.table.$table.find('.item-title .th-inner').text(title);
//             return this;
//         },
//
//         disableActions: function() {
//             for (var i = 0; i < this.actions.length; i++) {
//                 this.actions[i].trigger('disableActions');
//             }
//             return this;
//         },
//
//         enableActions: function() {
//             for (var i = 0; i < this.actions.length; i++) {
//                 this.actions[i].trigger('enableActions');
//             }
//             return this;
//         },
//
//         destroy: function() {
//             this.chart.trigger('destroy');
//             this.popover.trigger('destroy');
//         }
//     });
//
//
//
//
//
// }(jQuery, Stats, APPNAME));
