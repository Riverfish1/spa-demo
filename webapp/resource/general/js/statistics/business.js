(function ($, Stats, appName) {
    var businessChartDataParser = new (Stats.ResultParser.extend({
        doParse: function (data, jqXhr, indexs) {
            data = this.getSort(data);
            var arrs = [];
            if (indexs.length > 0) {
                var day = this.getCurdate({jqXHR: jqXhr}).result,
                    serverHour = this.getCurdate({jqXHR: jqXhr}).serverHour,
                    that = this;
                $.each(indexs, function (k, v) {
                    arrs.push({
                        data: that.getValue(data, v, jqXhr, serverHour),
                        day: day,
                        lagend: that.getLagend(v),
                        hours: that.getValue(data, 'hour', jqXhr, serverHour)
                    })
                });
                return arrs;
            }
        },
        getSort: function (data) {
            if (data && data.length > 0) {
                data.sort(function (a, b) {
                    return a.hour - b.hour;
                });
                return data;
            }
        },

        getValue: function (data, index, jqXhr, num) {
            var arr = [], that = this;
            $.each(data, function (i, v) {
                if (index == 'hour') {
                    arr.push(that.getCurdate({
                        jqXHR: jqXhr,
                        needHours: true,
                        dateJoin: '-',
                        hour: v.hour
                    }).result);
                } else {
                    arr.push(v[index]);
                }
            });
            //根据服务器时间hour，显示返回数据条数；
            arr.length = num+1;
            return arr;
        },
        getLagend: function (lagend) {
            var lagendMap = {
                'programAmount': '点播节目总量(个)',
                'videoAmount': '点播视频总量(个)',
                'programTimeAmount': '点播节目总时长(h)',
                'eventAmount': '事件直播数(个)',
                'eventLivingAmount': '事件直播中频道数(个)',
                'mobileAmount': '移动直播数(个)',
                'mobileLivingAmount': '移动直播中频道数(个)'
            }
            return lagendMap[lagend];
        },
        getCurdate: function (options) {
            // 将GMT时间转换成北京时间需要加8小时
            var time = new Date(options.jqXHR.getResponseHeader("Date"));
            var year = time.getFullYear();
            var month = time.getMonth() + 1;
            month = month < 10 ? '0' + month : month;
            var day = time.getDate() < 10 ? '0' + time.getDate() : time.getDate();
            var serverHour = time.getHours();
            var needHours = options.needHours || false;
            var hour = options.hour;
            var dateJoin = options.dateJoin || '/';
            var result = year + dateJoin + month + dateJoin + day;
            if (needHours) {
                result += (' ' + hour + ':00:00');
            }
            return {
                result: result,
                serverHour: serverHour
            };
        }
    }))();

    var businessTableDataParser = new (Stats.ResultParser.extend({
        doParse: function (data,jqXhr) {
            var serverHour = this.getCurdate({jqXHR: jqXhr}).serverHour;
            data.length = serverHour+1
            return [{
                // mobileLivingAmount
                "programTimeAmount": this._getTotal(data, 'programTimeAmount'),
                "videoAmount": this._getTotal(data, 'videoAmount'),
                "mobileAmount": this._getTotal(data, 'mobileAmount'),
                // "eventLivingAmount": this._getTotal(data, 'eventLivingAmount'),
                "eventLivingAmount": this._getLast(data, 'eventLivingAmount', serverHour),
                // "mobileLivingAmount": this._getTotal(data, 'mobileLivingAmount'),
                "mobileLivingAmount": this._getLast(data, 'mobileLivingAmount', serverHour),
                "programAmount": this._getTotal(data, 'programAmount'),
                "eventAmount": this._getLast(data, 'eventAmount' , serverHour)
            }];
        },
        _getTotal: function (data, index) {
            var total = 0;
            $.each(data, function (k, v) {
                total += v[index];
            })
            //节目总时长保留2位小数；
            if(index == 'programTimeAmount'){
                return total.toFixed(2);
            }else{
                return total;
            }
        },
        _getLast: function (data, index, num) {
            // 获取当前时间的数据
            return data[num][index];
        },
        getCurdate: function (options) {
            // 将GMT时间转换成北京时间需要加8小时
            var time = new Date(options.jqXHR.getResponseHeader("Date"));
            var year = time.getFullYear();
            var month = time.getMonth() + 1;
            month = month < 10 ? '0' + month : month;
            var day = time.getDate() < 10 ? '0' + time.getDate() : time.getDate();
            var serverHour = time.getHours();
            var needHours = options.needHours || false;
            var hour = options.hour;
            var dateJoin = options.dateJoin || '/';
            var result = year + dateJoin + month + dateJoin + day;
            if (needHours) {
                result += (' ' + hour + ':00:00');
            }
            return {
                result: result,
                serverHour: serverHour
            };
        }
    }))();

    var OverviewLineChart = Stats.Chart.extend({
        hasData: function (data) {
            if (!data) {
                return false;
            }

            if ($.isArray(data) && data.length > 0) {
                return data[0].data.length > 0;
            }
            return $.isPlainObject(data);
        },
        getOption: function (data) {
            var that = this;
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
                        var d = data[0].hours[Number(this.x)];
                        return '日期: ' + d + '<br>数量: ' + this.y;
                    }
                },

                plotOptions: {
                    series: {
                        marker: {
                            radius: 3
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
                    // labels: {
                    //     formatter: function () {
                    //         var label = categories[this.value];
                    //         if (label) {
                    //             if (!isHourData) {
                    //                 label = label.split('/').splice(1).join('/');
                    //             }
                    //             return label;
                    //         }
                    //     }
                    // },
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
                    // minTickInterval:1, //刻度上允许显示的最小值
                    labels: {
                        // format: '{value:,.0f}'
                    },
                    min: 0,
                    tickAmount: 6
                },

                title: {
                    text: ''
                },

                legend: {
                    align: 'left',
                    verticalAlign: 'top'
                }
            };
            // 针对除点播总时长做特殊处理，y轴允许小数
            if (this._id != 'core-time-chart') {
                chartOptions.yAxis.labels = {
                    format: '{value:,.0f}'
                }
                chartOptions.yAxis.minTickInterval = 1 //刻度上允许显示的最小值
            }

            var colors = ['#57C2F4', '#F9CAC0'],
                series = [];
            $.each(data, function (i, v) {
                var serie = {};
                serie.name = v.lagend;
                serie.data = v.data;
                serie.color = colors[i];
                series.push(serie);
            });
            chartOptions.series = series;
            return chartOptions;
            // return {
            //     chart: {
            //         renderTo: this._id,
            //         events: {
            //             load: function () {
            //                 that.$el.find(".highcharts-legend-item").find("path:last").remove();
            //             }
            //         },
            //         backgroundColor: {
            //             linearGradient: {x1: 0, y1: 0, x2: 1, y2: 1},
            //             stops: [
            //                 [0, 'rgb(255, 255, 255)'],
            //                 [1, 'rgb(255, 255, 255)']
            //             ]
            //         },
            //         plotBackgroundColor: 'rgba(255, 255, 255, .9)',
            //         plotShadow: true,
            //         plotBorderWidth: 1
            //     },
            //     title: {
            //         text: null
            //     },
            //     credits: {
            //         enabled: false
            //     },
            //     xAxis: {
            //         categories: data.categories
            //     },
            //     yAxis: {
            //         title: null,
            //         labels: {
            //             formatter: function () {  //设置纵坐标值的样式
            //                 // return this.value + "(" + data.unit + ")";//Highcharts.numberFormat()数字进行格式化
            //             }
            //         },
            //         min: 0,
            //         tickAmount: 6,
            //         plotLines: [{
            //             value: 0,
            //             width: 1,
            //             color: '#808080'
            //         }]
            //     },
            //     tooltip: {
            //         formatter: function () {
            //             // var amountFlowUnit = unitMapper.getUnit(this.y * data.val ),
            //             //     amountFlow = roundNumber(this.y * data.val  / amountFlowUnit.val),
            //             //     flowUnit = amountFlowUnit.fUnit
            //             // toolTipFomater = amountFlow + " " + flowUnit;
            //             // return '流量: '  + toolTipFomater;
            //         }
            //     },
            //     series: data[index]
            // };
        }
    });

    Stats.Views.businessView = Stats.View.extend({
        default: $.extend({}, Stats.View.prototype.default, {
            tableId: 'summary-table',
            chartId: 'core-amount-chart',
            chartId2: 'core-time-chart',
            chartId3: 'live-event-chart',
            chartId4: 'live-mobile-chart',
            urlPrefix: '/s/bussiness',
            tmplId: 'business-tpl'
        }),

        init: function () {
            this.urlPrefix = this.options.urlPrefix;
            this.table = new Stats.Table({
                id: this.options.tableId
            });
            this.chart = new OverviewLineChart({
                id: this.options.chartId
            });
            this.chart2 = new OverviewLineChart({
                id: this.options.chartId2
            });
            this.chart3 = new OverviewLineChart({
                id: this.options.chartId3
            });
            this.chart4 = new OverviewLineChart({
                id: this.options.chartId4
            });
            this.loadChartData();
        },

        getUrl: function () {
            return appName + '../resource/devData/business.json';
            return appName + this.urlPrefix;
        },

        loadChartData: function () {
            var cb = $.proxy(this.onLoadChartDataDone, this),
                self = this;
            this.chart.trigger('loading');
            this.chart2.trigger('loading');
            this.chart3.trigger('loading');
            this.chart4.trigger('loading');
            this.table.trigger('loading');
            Stats.ajax.getJSON(this.getUrl(), cb).fail(function () {
                self.onLoadChartDataDone()
            });
        },

        onLoadChartDataDone: function (data, textStatus, jqXHR) {
            if (data) {
                // 表格相关数据处理
                d = businessTableDataParser.parse(data.result, jqXHR);
                this.table.load(d);
                // 拆线图相关数据处理
                d1 = businessChartDataParser.parse(data.result, jqXHR, ['programAmount', 'videoAmount']);
                d2 = businessChartDataParser.parse(data.result, jqXHR, ['programTimeAmount']);
                d3 = businessChartDataParser.parse(data.result, jqXHR, ['eventAmount', 'eventLivingAmount']);
                d4 = businessChartDataParser.parse(data.result, jqXHR, ['mobileAmount', 'mobileLivingAmount']);
                this.chart.draw(d1);
                this.chart2.draw(d2);
                this.chart3.draw(d3);
                this.chart4.draw(d4);
            } else {
                this.table.load([]);
                this.chart.draw([]);
                this.chart2.draw([]);
                this.chart3.draw([]);
                this.chart4.draw([]);
            }
        },

        destroy: function () {
            this.chart.trigger('destroy');
            this.chart2.trigger('destroy');
            this.chart3.trigger('destroy');
            this.chart4.trigger('destroy');
        }
    });

}(jQuery, Stats, APPNAME));


