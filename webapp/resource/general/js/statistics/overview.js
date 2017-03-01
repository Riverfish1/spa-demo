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
    //数据统计概览summart-table数据处理
    var SummaryTable = Stats.Table.extend({
        initialize: function () {
            this.$table = $("#" + this.options.id);
            this.resultHandler = this.options.resultHandler || this._resultHandler;
            this.d = [{}];
            this.i = 0;
            this.$table.bootstrapTable([]);
            this.on('loading', this.showLoading);
            this.on('hideLoading', this.hideLoading);
        },

        load: function () {
            if (this.i == 2) {
                this.$table.bootstrapTable('load', this.d);
                this.hideLoading();
            }
        },

        // 多个接口数据合并
        _resultHandler: function (obj) {
            if (obj && $.isPlainObject(obj)) {
                for (var k in obj) {
                    this.d[0][k] = obj[k];
                }
                this.i++;
            }
            if (this.i == 2) {
                return this.d;
            } else {
                return false
            }
        }
    })

    // var overviewSummaryParser = new (Stats.ResultParser.extend({
    //     initialize: function () {
    //         this.labelMap = {
    //             'avg': '每日平均',
    //             'max': '历史峰值',
    //             'yesterday': '昨天',
    //             'today': '今天'
    //         };
    //     },
    //
    //     doParse: function (data) {
    //         var d = [];
    //         d.push(this._convert(data['today'], this.labelMap['today']));
    //         d.push(this._convert(data['yesterday'], this.labelMap['yesterday']));
    //         d.push(this._convert(data['avg'], this.labelMap['avg']));
    //         d.push(this._convert(data['max'], this.labelMap['max']));
    //         return d;
    //     },
    //
    //     _convert: function (data, fieldName) {
    //         var o = {label: fieldName};
    //         $.each(data, function (i, v) {
    //             o[v['indexName']] = v['value'];
    //         });
    //         return o;
    //     }
    // }))();

    var overviewHourDataParser = new (Stats.HourResultParser.extend({
        doParse: function (data, day, day2) {
            var days = this._getDate(day, day2);
            this.fillData(days, data);
            return this.doParse2(days, data);
        },
        fillData: function (startAndEndDays, data) {
            var d1 = startAndEndDays[0], d2 = startAndEndDays[1];
            var startData = data['浏览量PV' + '_' + d1], endData = data['独立IP' + '_' + d2];
            if (!startData || !endData || (startData.length == 0 && endData.length == 0)) {
                return;
            }
            var newStartData = [], newEndData = [];
            if (startData.length < 24) {
                for (var i = parseInt(d1 + '00'); i <= parseInt(d1 + '23'); i++) {
                    newStartData.push(this._find(startData, i));
                }
            }
            if (endData && endData.length > 0) {
                var maxEndVal = parseInt(endData[endData.length - 1].hour);
                for (var i = parseInt(d2 + '00'); i <= maxEndVal; i++) {
                    newEndData.push(this._find(endData, i));
                }
            }
            data['浏览量PV'] = startData.length < 24 ? newStartData : startData;
            data['独立IP'] = newEndData;
        },
        doParse2: function (days, data) {
            var result = [], tempResult;
            var isPv = '独立IP';
            $.each(days, function (i, v) {
                tempResult = data[isPv + '_' + v];
                if (tempResult) {
                    var val = {};
                    val.day = parseDateStr({str: v, dateJoin: '/'});
                    val.legend = isPv
                    val.hours = [];
                    val.data = [];
                    $.each(tempResult, function (i, v) {
                        val.hours.push(v['hour']);
                        val.data.push(v['value']);
                    });
                    result.push(val);
                    isPv = '浏览量PV';
                }
            });

            if (result.length > 1) {
                var temp = result[0];
                result[0] = result[1];
                result[1] = temp;
            }
            return result;
        },

        fillDataResultCreator: function (v) {
            return {hour: v + '', value: 0};
        }

    }))();

    // var overviewDayDataParser = new (Stats.ResultParser.extend({
    //     parse: function (data) {
    //         var result = {
    //             day: [],
    //             data: []
    //         };
    //         var isPv = true;
    //         $.each(data, function (i, v) {
    //             // result.day.push(parseDateStr({str: v.day, dateJoin: '/'}));
    //             result.day.push(isPv ? '浏览量PV' : '独立IP');
    //             result.data.push(v.value);
    //             isPv = false;
    //         });
    //         return result;
    //     }
    // }))();

    var OverviewLineChart = Stats.Chart.extend({

        hasData: function (data) {
            if (!data) {
                return false;
            }

            if ($.isArray(data) && data.length > 0) {
                return data[0].data.length > 0;
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
                }
            };

            var colors = ['#57C2F4', '#F9CAC0'],
                series = [];
            if (isHourData) {
                $.each(data, function (i, v) {
                    var serie = {};
                    serie.name = v.day;
                    serie.data = v.data;
                    serie.legend = v.legend;
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
            chartOptions.legend = {
                align: 'left',
                verticalAlign: 'top',
                labelFormatter: function () {
                    return this.options.legend;
                }
            };

            return chartOptions;
        }
    });

    // var ChartCompareActionSwitcher = Stats.RadioActionSwitcher.extend({
    //     initialize: function () {
    //         Stats.RadioActionSwitcher.prototype.initialize.apply(this, arguments);
    //         this.on('show', this.show);
    //         this.on('hide', this.hide);
    //     },
    //
    //     show: function () {
    //         this.$parent.show();
    //     },
    //
    //     hide: function () {
    //         this.$parent.hide();
    //     }
    // });

    var roundNumber = function (val) {
        return Math.round(val * 100) / 100;
    };
    var BandWidthConvert = Stats.ResultParser.extend({
        doParse: function (data, flowSum) {
            if (data && data.length > 0) {
                var mixObj = {};
                var keys = {'min5': 'dayHourMin'};
                mixObj.details = this.replaceKeyWidth(data, keys);
                mixObj.aggregations = {
                    "flowSum": flowSum,
                    "day": this.getDay(data),
                    "bandwidthMax": this.getBindwidthMax(data)
                };
                return mixObj;
            }
        },
        getBindwidthMax: function (data) {
            var max = 0;
            $.each(data, function (k, v) {
                if (v.bandwidth >= max) {
                    max = v.bandwidth;
                }
            })
            return max;
        },
        replaceKeyWidth: function (arr, keys) {
            var o = {}, arrs = [], self = this;
            $.each(arr, function (i, v) {
                for (var k in v) {
                    if (keys[k]) {
                        o[keys[k]] = v[k];
                    } else {
                        o[k] = v[k];
                    }
                    if (k == 'min5') {
                        o.time = self.timeFomat(v[k]);
                    }
                }
                arrs.push(o);
                o = {}
            })
            return arrs;
        },
        getDay: function (data) {
            var dayStr = data[0].min5;
            return dayStr.substr(0, 4) + '-' + dayStr.substr(4, 2) + '-' + dayStr.substr(6, 2);
        },
        timeFomat: function (str) {
            return str.substr(0, 4) + '-' + str.substr(4, 2) + '-' + str.substr(6, 2) + ' ' + str.substr(8, 2) + ':' + str.substr(10, 2);
        }
    });
    var BandWidthParser = Stats.ResultParser.extend({

        doParse: function (data, isMinuteData) {
            if (data && data.aggregations) {
                var d = [], maxBandWidth = 0, amountFlow = isMinuteData ? data.aggregations.flowSum : 0;
                if (isMinuteData) {
                    $.each(data.details, function (i, v) {
                        var year = parseInt(v.dayHourMin.substr(0, 4));
                        var month = parseInt(v.dayHourMin.substr(4, 2));
                        var day = parseInt(v.dayHourMin.substr(6, 2));
                        var hour = parseInt(v.dayHourMin.substr(8, 2));
                        var minute = parseInt(v.dayHourMin.substr(10));
                        d.push({x: new Date(year, month - 1, day, hour, minute, 0).getTime(), y: v.bandwidth});
                        maxBandWidth = v.bandwidth > maxBandWidth ? v.bandwidth : maxBandWidth;
                    });
                } else {
                    $.each(data.aggregations, function (i, o) {
                        var year = parseInt(o.day.substr(0, 4));
                        var month = parseInt(o.day.substr(5, 2));
                        var day = parseInt(o.day.substr(8, 2));
                        d.push({x: new Date(year, month - 1, day, 0, 0, 0).getTime(), y: o.maxBandwdith});
                        amountFlow += o.sumFlow;
                        maxBandWidth = o.maxBandwdith > maxBandWidth ? o.maxBandwdith : maxBandWidth;
                    });
                }

                $.each(d, function (i, o) {
                    if (o.y == maxBandWidth) {
                        o.marker = {fillColor: '#4094D2', lineWidth: 3, lineColor: "#4094D2", enabled: true};
                    }
                    o.y = roundNumber(o.y);
                });

                var result = {
                    data: d,
                    maxBandWidth: roundNumber(maxBandWidth),
                    amountFlow: roundNumber(amountFlow)
                };
                result.startDate = data.details && data.details.length > 0 ? data.details[0].time
                    : data.aggregations[0].day;
                result.endDate = data.details && data.details.length > 0 ? data.details[data.details.length - 1].time
                    : data.aggregations[data.aggregations.length - 1].day;

                return result;
            }
            return {};
        }
    });

    var bandWidthRender = template.compile('<div><span><b>{{time}}</b></span></div>' +
        '<div style="margin-top: 5px;">' +
        '<span style="width: 3px; height: 3px; background-color: #4094D2;">&nbsp;&nbsp;&nbsp;&nbsp;</span>' +
        '&nbsp;<span> 峰值带宽 <b>{{maxBandWidth}} Mbps</b></span>' +
        '</div>' +
        '<div style="margin-top: 5px;">' +
        '<span style="width: 3px; height: 3px; background-color: #F7CA6F;">&nbsp;&nbsp;&nbsp;&nbsp;</span>' +
        '&nbsp;<span> 带宽统计 <b>{{bandWidth}} Mbps</b></span>' +
        '</div>');

    var bandWidthSummaryRender = template.compile(
        '<span>峰值带宽：{{maxBandWidth}} {{bandWidthUnit}}</span>' +
        '&nbsp;<span>累计流量：{{amountFlow}} {{flowUnit}}</span>' +
        '&nbsp;<span>（{{start}} 至 {{end}}）</span>'
    );

    var unitMapper = new (Stats.Class.extend({
        initialize: function () {
            this._map = {
                "Mbps": {expr: "$$ < 1000", val: 1},
                "Gbps": {expr: "$$ >=1000 && $$ < (1000 * 1000)", val: 1000},
                "Tbps": {expr: "$$ > (1000 * 1000)", val: 1000 * 1000}
            }
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
    }))();

    var BandWidthLineChart = Stats.Chart.extend({

        hasData: function (data) {
            return data && data.data && data.data.length > 0;
        },

        getOption: function (data) {
            return {
                chart: {
                    renderTo: this._id,
                    type: 'area',
                    zoomType: 'x',
                    resetZoomButton: {
                        position: {
                            // x: -130,
                            y: -35
                        }
                    }
                },

                tooltip: {
                    useHTML: true,
                    borderColor: '#D5DBDB',
                    formatter: function () {
                        var d = {
                            time: moment(this.x).format("YYYY-MM-DD HH:mm:ss"),
                            bandWidth: this.y,
                            maxBandWidth: data.maxBandWidth
                        };
                        return bandWidthRender(d);
                    }
                },

                plotOptions: {
                    series: {
                        marker: {
                            symbol: 'circle',
                            radius: 3
                        }
                    },

                    area: {
                        events: {
                            legendItemClick: function () {
                                return false;
                            }
                        },
                        marker: {
                            enabled: false
                        }
                    }
                },

                xAxis: {
                    type: 'datetime',
                    dateTimeLabelFormats: {
                        day: '%m/%d',
                        month: '%m/%d',
                        week: '%m/%d'
                    },
                    startOnTick: false,
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
                    labels: {
                        format: '{value:,.1f} Mbps'
                    },
                    min: 0,
                    max: data.maxBandWidth,
                    tickAmount: 4,
                    plotLines: [{
                        color: '#4094D2',
                        dashStyle: 'ShortDot',
                        value: data.maxBandWidth,
                        width: 2
                    }]
                },

                title: {
                    text: ''
                },

                subtitle: {
                    text: '点击并拖拽可放大细节',
                    align: 'right',
                    y: 14,
                    x: -80
                },

                legend: {
                    enabled: true,
                    symbolRadius: 5,
                    symbolWidth: 10,
                    symbolHeight: 10
                },
                series: [
                    {
                        name: '峰值带宽',
                        color: '#4094D2'
                    },
                    {
                        name: '带宽统计',
                        color: '#F7CA6F',
                        data: data.data
                    }
                ]
            };
        }

    });

    var BandWidthView = Stats.View.extend({
        default: $.extend({}, Stats.View.prototype.default, {
            chartId: 'fluency-chart',
            el: '#fluencyAndBindWidth',
            urlPrefix: '/s/n/b2'
        }),

        init: function () {
            this.urlPrefix = this.options.urlPrefix;
            this._mockedData = this.options.mockedData;
            this.flow = this.options.flow;
            this.bandWidthConvert = new BandWidthConvert();
            this.bandWidthParser = new BandWidthParser();
            this.$chartSummary = this.$el.find('.n-b-chart_summary');
            this.chart = new BandWidthLineChart({
                id: this.options.chartId
            });
            // this.loadData();
        },

        getUrl: function () {
            return appName + '../resource/devData/network_bindwidth.json';
            return appName + this.urlPrefix + '?v=' + 0 + '&t=' + 'all';
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
            var data = this.bandWidthConvert.parse(data, this.flow);
            var bandWidthResult = this.bandWidthParser.parse(data, true);
            this.setChartSummary(bandWidthResult);
            this.chart.draw(bandWidthResult);
            // this.enableActions();
        },

        setChartSummary: function (data) {
            this.$chartSummary.hide();
            if (data && data.maxBandWidth) {
                var maxBandWidth = data.maxBandWidth,
                    amountFlow = data.amountFlow,
                    val = 0;

                var amountFlowUnit = unitMapper.getUnit(amountFlow),
                    maxBandWidthUnit = unitMapper.getUnit(maxBandWidth);
                var html = bandWidthSummaryRender({
                    amountFlow: roundNumber(amountFlow / amountFlowUnit.val),
                    maxBandWidth: roundNumber(maxBandWidth / maxBandWidthUnit.val),
                    start: val >= -1 ? data.startDate : data.startDate + ' 00:00',
                    end: val >= -1 ? data.endDate : data.endDate + ' 00:00',
                    flowUnit: amountFlowUnit.fUnit,
                    bandWidthUnit: maxBandWidthUnit.bUnit
                });
                this.$chartSummary.empty().html(html).show();
            }
        },

        destroy: function () {
            this.chart.trigger('destroy');
        }
    });

    //------------
    // Operator analysis
    //------------

    var OperatorPieChart = Stats.PieChart.extend({
        getOption: function (data) {
            var options = OperatorPieChart.__super__.getOption.call(this, data);
            options.chart.marginLeft = -150;
            options.legend.x = 180;
            options.legend.y = 10;
            options.tooltip.formatter = function () {
                var str = '<span style="font-weight: bold">' + this.key + '</span><br>';
                str += '浏览量: <span style="color:red">' + this.y + '</span><br>';
                str += '占比: <span style="color:red">' + this.point.percent + '</span>';
                return str;
            };
            return options;
        }
    });

    var OperatorDataParser = Stats.Class.extend({
        parse: function (data) {
            var d = [];
            if (data) {
                $.each(data, function (i, v) {
                    d.push({
                        name: v.item,
                        y: v['userCounts'],
                        percent: v['userPercentage']
                    });
                });
            }
            return d;
        }
    });

    var OperatorView = Stats.View.extend({
        default: $.extend({}, Stats.View.prototype.default, {
            chartId: 'operator_pie',
            title: '运营商分析',
            el: '#operator',
            urlPrefix: '/s/n/op'
        }),

        init: function () {
            this.$title = this.$el.find('#title');
            this.urlPrefix = this.options.urlPrefix;
            // this.daysActionSwitcher = new Stats.DaysButtonSwitcher({
            //     parent: '.l-search'
            // });
            // this.daysActionSwitcher.on('actionClick', this.disableActions, this);
            // this.daysActionSwitcher.on('actionClick', this.loadData, this);
            this.chart = new OperatorPieChart({
                id: this.options.chartId
            });
            // this.table = new Stats.Table({ id: this.options.tableId });
            this.dataParser = new OperatorDataParser();
            this.disableActions().loadData();
        },

        getUrl: function () {
            return appName + '../resource/devData/network_operator.json';
            return appName + this.urlPrefix + '?v=' + 0;
        },

        hasData: function (data) {
            return data && (($.isArray(data) && data.length > 0) || $.isPlainObject(data));
        },

        loadData: function () {
            // this.setTitle();
            // this.table.trigger('loading');
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
            data = this._convert(data) || [];
            if (this.hasData(data)) {
                this.chart.draw(this.dataParser.parse(this._getTop(data, 10)));
            } else {
                this.chart.draw(this.dataParser.parse(data));
            }
            this.enableActions();
        },

        _convert: function (data) {
            if (data) {
                var obj = {}, arr = [], self = this, sum = this.getSum(data, 'pvcnt');
                $.each(data, function (k, v) {
                    // obj.item = v["common_cdnloc_isp"];
                    obj.item = v["telopr"];
                    obj.userCounts = v['pvcnt'];
                    obj.userPercentage = Math.round(v['pvcnt'] / sum * 10000) / 100.00 + '%';
                    arr.push(obj);
                    obj = {};
                });
                return arr;
            }
        },
        _getTop: function (data, num) {
            var arrs = [], parcent = userCounts = 0, sum = this.getSum(data, 'userCounts');
            $.each(data, function (k, v) {
                if (k < num) {
                    arrs.push(v)
                    parcent += v.userPercentage;
                    userCounts += v.userCounts;
                }
            })
            arrs.push({
                'item': '其他',
                'userCounts': sum - userCounts,
                'userPercentage': Math.round((sum - userCounts) / sum * 10000) / 100.00 + '%',
            })
            return arrs;
        },
        getSum: function (arr, index) {
            var sum = 0;
            $.each(arr, function (k, v) {
                sum += v[index]
            })
            return sum;
        },

        setTitle: function () {
            this.$title.text(this.options.title + ' - ' + this.daysActionSwitcher.$current.text());
        },

        enableActions: function () {
            // this.daysActionSwitcher.trigger('enableActions');
            return this;
        },

        disableActions: function () {
            this.chart.trigger('destroy');
            // this.daysActionSwitcher.trigger('disableActions');
            return this;
        },

        destroy: function () {
            this.chart.trigger('destroy');
        }
    });

    //-------------------
    // // for access region
    //-------------------

    var inlandPieChartDataParser = new (Stats.ResultParser.extend({
        doParse: function (data) {
            var d = [];
            $.each(data, function (i, v) {
                var o = {};
                o.name = v.name;
                o.y = v.value;
                d.push(o);
            });
            return d;
        }
    }))();

    var mapDataParser = new (Stats.ResultParser.extend({
        doParse: function (data, codeMap) {
            var d = [];
            $.each(data, function (i, v) {
                var o = {};
                o['hc-key'] = codeMap[v.name];
                o.value = v.value;
                o.percent = v.percent;
                d.push(o);
            });
            return d;
        }
    }))();

    var InlandPipeChart = Stats.PieChart.extend({
        default: {
            loadingText: '',
            noDataText: ''
        },
        getOption: function (data) {
            var options = InlandPipeChart.__super__.getOption.call(this, data);
            options.legend.x = 150;
            $.extend(options.legend, {itemMarginTop: 5, itemMarginBottom: 5});
            options.plotOptions.pie.center = [100, 100];
            options.plotOptions.pie.dataLabels.enabled = false;
            options.plotOptions.pie.dataLabels.distance = 15;
            options.plotOptions.pie.dataLabels.formatter = function () {
                return this.point.index <= 2 ? this.key : null;
            };
            return options;
        }
    });

    var MapChart = Stats.Chart.extend({

        draw: function (data) {
            if (!data || data.length == 0) {
                this.showNoData();
                return;
            }
            var options = this.getOption.apply(this, arguments);
            $.extend(options, {credits: {enabled: false}});
            if (this._chart) {
                this._chart.destroy();
            }
            var self = this;
            this._chart = new Highcharts.Map(options, function (chart) {
                self.onLoad(chart);
            });
            this.show();
        },

        onLoad: function (chart) {
            var left = this.options.left, right = this.options.right;
            $(chart.container).find(".highcharts-coloraxis-labels").remove();
            chart.renderer.text('访问次数 高', left.x, left.y).css({"font-weight": "bold"}).add();
            chart.renderer.text('低', right.x, right.y).css({"font-weight": "bold"}).add();
            this.trigger('afterMapChartLoad');
        },

        getOption: function (data) {
            var codeMap = this.options.codeMap, mapName = this.options.mapName;
            return {
                chart: {
                    renderTo: this._id
                },
                title: {
                    text: ''
                },
                colorAxis: {
                    min: 0,
                    reversed: true
                },
                tooltip: {
                    formatter: function () {
                        var d = data[this.point.index];
                        var str = '<span style="font-weight: bold">' + codeMap[this.point['hc-key']] + '</span><br>';
                        str += '排名: <span style="color:red">' + (this.point.index + 1) + '</span><br>';
                        str += '数量: <span style="color:red">' + d.value + '</span><br>';
                        str += '占比: <span style="color:red">' + d.percent + '</span>';
                        return str;
                    }
                },
                legend: {
                    verticalAlign: 'top',
                    itemDistance: 0,
                    reversed: true
                },
                series: [{
                    data: data,
                    mapData: Highcharts.maps[mapName],
                    joinBy: 'hc-key',
                    name: '',
                    states: {
                        hover: {
                            color: '#BADA55'
                        }
                    },
                    borderWidth: 0.2,
                    borderColor: 'black'
                }]
            };
        }

    });

    var TerritoryView = Stats.View.extend({
        default: $.extend({}, Stats.View.prototype.default),

        init: function () {
            this.urlPrefix = this.options.urlPrefix;
            this.daysActionSwitcher = new Stats.DaysButtonSwitcher({
                parent: '.l-search'
            });
            this.daysActionSwitcher.on('actionClick', this.disableActions, this);
            this.daysActionSwitcher.on('actionClick', this.loadData, this);

            var legendTitlePos = this.options.legendTitlePos;
            this.mapChart = new MapChart({
                id: this.options.mapChartId,
                left: legendTitlePos.left,
                right: legendTitlePos.right,
                codeMap: this.options.codeMap,
                mapName: this.options.mapName,
                onLoad: this.options.onLoad
            });
            this.trigger('init-before-loadData');
            this.disableActions().loadData();
        },

        getUrl: function () {
            // return appName + this.urlPrefix + '?v=' + this.daysActionSwitcher.getValue() +
            //     '&t=' + 0 + '&t2=' + this.options.type;
            return appName + '../resource/devData/inland.json';
        },

        loadData: function () {
            this.onBeforeLoadData();
            var cb = $.proxy(this.onLoadDataSuccess, this), self = this;
            Stats.ajax.getJSON(this.getUrl(), cb).fail(function () {
                self.onLoadDataSuccess([])
            });
        },

        onBeforeLoadData: function () {
            this.mapChart.trigger('loading');
            this.trigger('after-mapChart-loading');
        },

        onLoadDataSuccess: function (data) {
            var d = data && $.isArray(data) ? data : [];
            d = this._convert(d);
            this.mapChart.draw(mapDataParser.parse(d, this.options.mapCode));
            this.trigger('after-mapChart-draw', d);
            this.enableActions();
        },

        _convert: function (data) {
            if (data) {
                var obj = {}, arr = [], self = this, sum = this.getSum(data, 'pvcnt');
                //index 用于判断是国内还是国家；
                var index = data[0] && data[0].hasOwnProperty('prov') ? 'prov' : 'nat';
                $.each(data, function (k, v) {
                    obj.name = v[index];
                    obj.value = v['pvcnt'];
                    obj.percent = Math.round(v['pvcnt'] / sum * 10000) / 100.00 + '%';
                    arr.push(obj);
                    obj = {};
                });
                return arr;
            }
        },
        _getTop: function (data, num) {
            var arrs = [], parcent = userCounts = 0, sum = this.getSum(data, 'userCounts');
            $.each(data, function (k, v) {
                if (k < num) {
                    arrs.push(v)
                    parcent += v.percent;
                    value += v.value;
                }
            })
            arrs.push({
                'name': '其他',
                'value': sum - value,
                'percent': Math.round((sum - value) / sum * 10000) / 100.00 + '%',
            })
            return arrs;
        },
        getSum: function (arr, index) {
            var sum = 0;
            $.each(arr, function (k, v) {
                sum += v[index]
            })
            return sum;
        },

        enableActions: function () {
            this.daysActionSwitcher.trigger('enableActions');
            return this;
        },

        disableActions: function () {
            this.daysActionSwitcher.trigger('disableActions');
            return this;
        }
    });

    var InlandView = TerritoryView.extend({
        default: $.extend({}, TerritoryView.prototype.default, {
            mapChartId: 'map-chart',
            pipChartId: 'pip-chart',
            // tmplId: 'overview-inland-tpl',
            type: 1,
            legendTitlePos: {
                left: {x: 0, y: 28},
                right: {x: 276, y: 28}
            },
            codeMap: Stats.chinaCodeAndProvinceMap,
            mapCode: Stats.chinaProvinceAndCodeMap,
            mapName: 'countries/cn/custom/cn-all-sar-taiwan',
            el: '#region',
            urlPrefix: '/s/territory/stats'
        }),

        init: function () {
            this.on('init-before-loadData', this.onInitBeforeLoadData);
            this.on('after-tableRowHover', this.onAfterTableRowHover);
            this.on('after-mapChart-loading', this.onAfterMapCharLoading);
            this.on('after-mapChart-draw', this.onAfterMapChartDraw);
            TerritoryView.prototype.init.apply(this, arguments);
        },

        onInitBeforeLoadData: function () {
            var self = this;
            this.pipChart = new InlandPipeChart({
                id: this.options.pipChartId
            });
        },

        onAfterTableRowHover: function (data, show) {
            this.pipChart.hover(data.index, show);
        },

        onAfterMapCharLoading: function () {
            this.pipChart.trigger('loading');
        },

        onAfterMapChartDraw: function (data) {
            this.pipChart.draw(inlandPieChartDataParser.parse(data));
        },
        hasData: function (data) {
            return data && (($.isArray(data) && data.length > 0) || $.isPlainObject(data));
        }
    });

    Stats.Views.OverviewView = Stats.View.extend({
        default: $.extend({}, Stats.View.prototype.default, {
            tableId: 'summary-table',
            chartId: 'chart',
            urlPrefix: '/s/ov/data',
            tmplId: 'overview-tpl',
            fluencyId: 'fluency-chart',
            flow: 0
        }),
        init: function () {
            this.urlPrefix = this.options.urlPrefix;
            this.flow = this.options.flow;
            this.table = new SummaryTable({
                id: this.options.tableId
            });

            this.chart = new OverviewLineChart({
                id: this.options.chartId
            });
            this.fluencyChart = new BandWidthView({
                flow: this.flow
            });
            this.descriptionPopover = new Stats.Popover({el: '#description'});

            this.loadSummaryData().loadChartData();
            // this.loadChartData();
            // this.videoView = new VideoView();
            this.operatorView = new OperatorView();
            this.accessRegionView = new InlandView();
        },

        loadSummaryData: function () {
            this.table.trigger('loading');
            var self = this;
            Stats.ajax.getJSON(appName + '../resource/devData/network_bindwidth.json', function (data) {
            // Stats.ajax.getJSON(appName + '/s/n/b2?v=0&t=all', function (data) {
                var result = data.result;
                self.flow = '0', bindwidth = 0;
                //带宽分析
                if (result && result.current && result.current.length > 0) {
                    self.flow = result.current[0].flow && result.current[0].flow.flow;
                    bindwidth = result.current[0].bandwidth && result.current[0].bandwidth.bandwidth;
                    self.table._resultHandler({'flow': self.flow, 'bindwidth': bindwidth});
                } else {
                    self.table._resultHandler({'flow': self.flow, 'bindwidth': bindwidth});
                }
                self.table.load();
                self.fluencyChart = new BandWidthView({
                    flow: self.flow
                });
                self.fluencyChart.chart.trigger('loading');
                if (result && result.bandwidthDetail && result.bandwidthDetail.length > 0) {
                    self.fluencyChart.onLoadDataSuccess(result.bandwidthDetail);
                } else {
                    self.fluencyChart.onLoadDataSuccess([]);
                }
            }).fail(function () {
                self.table.load([]);
            });
            return this;
        },

        getUrl: function () {
            // var d = 0, d2 = -1, t = 'h';
            // return appName + this.urlPrefix + "?d=" + d + "&t=" + t + "&d2=" + d2;
            return appName + '../resource/devData/userAccessData.json';
            return appName + this.urlPrefix + "?d=0&t=h&t2=pv&d2=-1";
        },

        _getMax: function (data) {
            var arrs = [], obj = {};
            for (var k in data) {
                obj[k] = data[k];
                arrs.push(obj);
                obj = {};
            }
            return arrs[1];
        },

        _convertD: function (data) {
            data = this._getMax(data);
            for (var k in data) {
                var objs = {};
                var pvObj = this._get1KeyVal(data, '浏览量PV', 'pvcnt');
                var ipObj = this._get1KeyVal(data, '独立IP', 'ipcnt');
                //summary-table数据处理
                this.table._resultHandler({
                    'pv': this._getTotal(data[k], 'pvcnt'),
                    'ip': this._getTotal(data[k], 'ipcnt')
                });
                this.table.load();
                objs['浏览量PV' + '_' + pvObj['浏览量PV']] = pvObj.value;
                objs['独立IP' + '_' + ipObj['独立IP']] = ipObj.value;
            }
            return objs;
        },

        _get1KeyVal: function (data, index, value) {
            var result = [], obj = {}, objs = {};
            for (var k in data) {
                for (var i = 0; i < data[k].length; i++) {
                    var cur = data[k][i];
                    for (var key in cur) {
                        obj['value'] = cur[value];
                        obj['hour'] = cur['common_hour']
                    }
                    result.push(obj);
                    obj = {};
                }
                objs[index] = k;
                objs['value'] = result;
                return objs;
            }
        },

        _convertH: function (data) {
            //将后台返回的数据转换成项目之前的数据格式；
            var item = this.fieldActionSwitcher.getValue(),
                value = (item == 1) ? 'pvcnt' : (item == 2) ? 'uvcnt' : 'ipcnt';
            var result = [], obj = {};
            for (var i = 0; i < data.length; i++) {
                var cur = data[i];
                for (var key in cur) {
                    obj['value'] = cur[value];
                    obj['day'] = cur['common_day']
                }
                result.push(obj);
                obj = {};
            }
            return result;
        },

        _getTotal: function (data, index) {
            var total = 0;
            $.each(data, function (k, v) {
                total += v[index];
            })
            return total;
        },

        loadChartData: function () {
            var cb = $.proxy(this.onLoadChartDataDone, this),
                self = this;
            this.chart.trigger('loading');
            // this.chartCompareActionSwitcher.trigger('hide');
            Stats.ajax.getJSON(this.getUrl(), cb).fail(function () {
                self.onLoadChartDataDone()
            });
        },

        onLoadChartDataDone: function (data) {
            if (data) {
                var d, isHourData = false, day = 0;
                // compareDay = this.chartCompareActionSwitcher.getValue();
                // if (day == '-7' || day == '-30') {
                //     //将后台返回的数据转换成项目之前的数据格式；
                //     data = this._convertH(data);
                //     d = overviewDayDataParser.parse(data);
                // } else {
                //将后台返回的数据转换成项目之前的数据格式；
                data = this._convertD(data);
                d = overviewHourDataParser.parse(data, day, -1);
                isHourData = true;
                // }
                this.chart.draw(d, isHourData);
                // this.chartCompareActionSwitcher.trigger(day == '-7' || day == '-30' ? 'hide' : 'show');
            } else {
                this.chart.draw([]);
            }
            // this.enableActions();
        },


        // enableActions: function () {
        //     for (var i = 0; i < this.actionArr.length; i++) {
        //         this.actionArr[i].trigger('enableActions');
        //     }
        //     return this;
        // },

        // disableActions: function () {
        //     for (var i = 0; i < this.actionArr.length; i++) {
        //         this.actionArr[i].trigger('disableActions');
        //     }
        //     return this;
        // },

        destroy: function () {
            this.chart.trigger('destroy');
            this.descriptionPopover.trigger('destroy');
            this.operatorView.trigger('destroy');
            this.accessRegionView.trigger('destroy');
            this.fluencyChart.trigger('destroy');
        }
    });

}(jQuery, Stats, APPNAME));
