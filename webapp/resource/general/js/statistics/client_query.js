(function ($, Stats, appName, template, moment) {

    //------------
    // Bandwidth analysis
    //------------

    var roundNumber = function (val) {
        return Math.round(val * 100) / 100;
    };

    var BandWidthParser = Stats.ResultParser.extend({

        doParse: function (data, start_date, end_date, isMinuteData) {
            if (data && data.dataModel && data.dataModel.length > 0) {
                var d = [{name: '峰值带宽', color: '#2CB044'}], maxBandWidth = 0, amountFlow = 0;
                // if (isMinuteData) {
                //     $.each(data.details, function (i, v) {
                //         var year = parseInt(v.dayHourMin.substr(0, 4));
                //         var month = parseInt(v.dayHourMin.substr(4, 2));
                //         var day = parseInt(v.dayHourMin.substr(6, 2));
                //         var hour = parseInt(v.dayHourMin.substr(8, 2));
                //         var minute = parseInt(v.dayHourMin.substr(10));
                //         d.push({x: new Date(year, month - 1, day, hour, minute, 0).getTime(), y: v.bandwidth});
                //     });
                // } else {
                //     $.each(data.dataModel, function (i, o) {
                //         var year = parseInt(o.day.substr(0, 4));
                //         var month = parseInt(o.day.substr(5, 2));
                //         var day = parseInt(o.day.substr(8, 2));
                //         d.push({x: new Date(year, month - 1, day, 0, 0, 0).getTime(), y: o.maxBandwdith});
                //     });
                // }
                $.each(data.dataModel, function (k, v) {
                    var data_list = v.dataList,
                        arr = [];
                    $.each(data_list, function (m, n) {
                        if (n.value == data.max.value) {
                            n.marker = {fillColor: '#2CB044', lineWidth: 3, lineColor: "#2CB044", enabled: true};
                        }
                        arr.push({x: n.time * 1000, y: roundNumber(n.value/1000/1000),domain: v.domain});
                    })
                    d.push({
                        name: v.domain.slice(0,12) + '...',
                        data: arr
                    });
                })

                // $.each(d, function (i, o) {
                //     if (o.y == maxBandWidth) {
                //         o.marker = {fillColor: '#2CB044', lineWidth: 3, lineColor: "#2CB044", enabled: true};
                //     }
                //     o.y = roundNumber(o.y);
                // });

                var result = {
                    data: d,
                    maxBandWidth: roundNumber(data.max.value/1000/1000),
                    amountFlow: roundNumber(data.total)
                };
                result.startDate = start_date;
                result.endDate = end_date;
                return result;
            }
            return {};
        }
    });

    var bandWidthRender = template.compile('<div><span><b>{{time}}</b></span></div>' +
        '<div style="margin-top: 5px;">' +
        '<span style="width: 3px; height: 3px; background-color: #2CB044;">&nbsp;&nbsp;&nbsp;&nbsp;</span>' +
        '&nbsp;<span> 域名 <b>{{domain}}</b></span>' +
        '</div>' +
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

    var domainResultParser = new (Stats.ResultParser.extend({
        doParse: function (data) {
            if (data.length > 0) {
                var d = [], domainAllName = [], domainAllType = [];
                $.each(data, function (k, v) {
                    // if (v.b2b == 1 && (v.cdn == "AL" || v.cdn == "KW")) {
                    if (v.b2b == 1 ) {
                        domainAllName.push(v.domainName);
                        domainAllType.push(v.cdn);
                        d.push({
                            domain: v.domainName,
                            domainName: v.domainName,
                            domainType: v.cdn
                        });
                    }
                });
                if (d.length > 1) {
                    d.unshift({
                        domain: 'all',
                        domainName: domainAllName.join(','),
                        domainType: domainAllType.join(',')
                    });
                }
                return {
                    domainList: d
                }
            }
        }
    }))()
    var DomainView = Stats.Class.extend({
        default: {
            el: ''
        },
        initialize: function () {
            this.$domain = $(this.options.el);
            this.urlPrefix = this.options.urlPrefix;
            this.hasDomain = false;
            this.value = {};
            this.loadData();
            this._bindEvent();
        },
        getUrl: function () {
            return appName + '../resource/devData/clientQueryDomainList.json';
            return appName + this.urlPrefix;
        },
        loadData: function () {
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
            var d = {};
            if (data.code == 0 && data.result.length > 0) {
                d = domainResultParser.parse(data.result);
            }
            if (d.domainList && d.domainList.length > 0) {
                this.hasDomain = true;
            }
            this.renderDomain(d);
            this.getDefaultValue();
            this.trigger('hasDomain', this.hasDomain);
        },
        renderDomain: function (data) {
            var html = this.domainRender(data);
            this.$domain.empty().html(html).show();
        },
        domainRender: template.compile(
            '{{each domainList as domain i}}' +
            '<option data-domainName = "{{domain.domainName}}" data-domainType = "{{domain.domainType}}">{{domain.domain}}</option>' +
            '{{/each}}'
        ),
        _bindEvent: function () {
            var self = this;
            this.$domain.change(function (e) {
                var $el = $(e.target), $option = $el.find('option:selected');
                self.value = {
                    "domainName": $option.attr('data-domainName'),
                    "domainType": $option.attr('data-domainType')
                }
            })
        },
        getValue: function () {
            return this.value;
        },
        getDomainValue: function () {
            return this.hasDomain;
        },
        getDefaultValue: function () {
            var $option = this.$domain.find('option:checked');
            this.value = {
                "domainName": $option.attr('data-domainName'),
                "domainType": $option.attr('data-domainType')
            }
        }
    });

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
                    type: 'line',
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
                            maxBandWidth: data.maxBandWidth,
                            domain: this.point.domain
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
                        color: '#2CB044',
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
                    align: 'center',
                    y: 14,
                    x: -80
                },

                legend: {
                    layout: 'vertical',
                    align: 'right',
                    verticalAlign: 'middle',
                    borderWidth: 0,
                    enabled: true,
                    symbolRadius: 5,
                    symbolWidth: 10,
                    symbolHeight: 10
                },

                series: data.data
            };
        }

    });

    Stats.Views.ClientQueryView = Stats.View.extend({
        default: $.extend({}, Stats.View.prototype.default, {
            chartId: 'chart',
            tmplId: 'client-network-bindwidth-tpl',
            urlPrefix: '/c/clientQuryRes',
            domainUrlPrefix: '/c/clientQueryDomain',
            tipId: '#query_info'
        }),

        _show: function () {
        },

        init: function () {
            var self = this;
            this.domainUrlPrefix = this.options.domainUrlPrefix;
            this.domainView = new DomainView({el: '#domain', urlPrefix: this.domainUrlPrefix});
            this.domainView.on('hasDomain', function (hasDomain) {
                self.urlPrefix = self.options.urlPrefix;
                self.$tip = $(self.options.tipId);
                self.$chartSummary = self.$el.find('.n-b-chart_summary');
                self.$detail = self.$el.find(".l-detail");
                self.$qryBtn = self.$el.find('#btn-query');
                self.$alert = self.$el.find("#alert");
                self.$alertText = self.$el.find('#alert-text');
                self.$dateInput = self.$el.find('#value');
                self.$dateRange = self.$el.find('#date-range');
                self.$st = self.$el.find('#st');
                self.$et = self.$el.find('#et');
                self._mockedData = self.options.mockedData;
                // self.bandWidthConvert = new BandWidthConvert();
                self.bandWidthParser = new BandWidthParser();
                self.chart = new BandWidthLineChart({
                    id: self.options.chartId
                });
                // self.disableActions().loadData();
                if (hasDomain) {
                    self.daterangepicker().dateInputEvent().queryBtnEvent();
                    self.$el.show();
                } else {
                    self.$tip.show();
                    self.$el.hide();
                }
            })

        },

        getUrl: function () {
            var startTime = $("#st").val();
            var endTime = $("#et").val();
            // var domainName = 'hls10.xiankan.com';
            var domainName =  this.domainView.getValue().domainName;
            // var domainType = 'AL';
            var domainType =  this.domainView.getValue().domainType;
            return appName + '../resource/devData/clientQueryRes.json'
            return appName + this.urlPrefix + '?start_date=' + startTime + '&end_date=' + endTime + '&domainName=' + domainName + '&domainType=' + domainType;
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
            // data = this.bandWidthConvert.parse(data, -7);
            var bandWidthResult = this.bandWidthParser.parse(data.result, $("#st").val(), $("#et").val(), false);
            this.setChartSummary(bandWidthResult);
            this.chart.draw(bandWidthResult);
            // this.enableActions();
        },

        setChartSummary: function (data) {
            this.$chartSummary.hide();
            if (data && data.maxBandWidth) {
                var maxBandWidth = data.maxBandWidth,
                    val = -7,
                    amountFlow = val == 0 ? data.amountFlow : data.amountFlow / 1000 / 1000;

                var amountFlowUnit = unitMapper.getUnit(amountFlow),
                    maxBandWidthUnit = unitMapper.getUnit(maxBandWidth);
                var html = bandWidthSummaryRender({
                    amountFlow: roundNumber(amountFlow / amountFlowUnit.val),
                    maxBandWidth: roundNumber(maxBandWidth / maxBandWidthUnit.val),
                    start: val >= -1 ? data.startDate : data.startDate ,
                    end: val >= -1 ? data.endDate : data.endDate ,
                    flowUnit: amountFlowUnit.fUnit,
                    bandWidthUnit: maxBandWidthUnit.bUnit
                });
                this.$chartSummary.empty().html(html).show();
            }
        },

        daterangepicker: function () {
            var self = this;
            this.$dateRange.daterangepicker({
                locale: {
                    format: 'YYYY-MM-DD',
                    applyLabel: '确定',
                    cancelLabel: '关闭'
                },
                "opens": "center",
                "minDate": "2016-11-01",
                "maxDate": moment()
            }, function (start, end, label) {
                var startDate = start.format("YYYY-MM-DD"),
                    endDate = end.format("YYYY-MM-DD");
                self.$dateInput.val(startDate + " - " + endDate).change();
                self.$st.val(startDate);
                self.$et.val(endDate);
            });
            return this;
        },

        dateInputEvent: function () {
            var self = this;
            this.$dateInput.change(function () {
                var $this = $(this);
                if (!self.isValid()) {
                    // self.toggleErrorClass($this.val(), $this.parent().parent());
                }
            });
            return this;
        },

        queryBtnEvent: function () {
            var self = this;
            this.$qryBtn.click(function () {
                if (self.isValid()) {
                    self.loadData();
                }
            });
            return this;
        },


        isValid: function () {
            var value = this.$dateInput.val();
            var startTime = new Date(Date.parse($("#st").val().replace(/-/g, "/"))).getTime();
            var endTime = new Date(Date.parse($("#et").val().replace(/-/g, "/"))).getTime();
            var days = (endTime - startTime)/(1000*60*60*24);
            if (!value) {
                this.showAlert("查询时间不能为空");
                return false;
            }
            if (days >= 31) {
                this.showAlert("查询时间段不能大于31天！");
                return false;
            }
            // if(days < 0){
            //     this.showAlert("结束时间不能小于起始时间！");
            //     return false;
            // }

            return true;
        },

        showAlert: function (msg) {
            msg = (msg || '域名流量带宽统计处理失败');
            this.$alertText.empty().append('<p>' + msg + '</p>');
            if (!this.$alert.is(":visible")) {
                this.$alert.fadeIn(500).delay(5000).fadeOut(500);
            }
            return this;
        },

        destroy: function () {
            this.chart.trigger('destroy');
        }
    });

}(jQuery, Stats, APPNAME, template, moment));


