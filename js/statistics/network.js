(function($, Stats, appName, template, moment){

    //------------
    // Operator analysis
    //------------

    var OperatorPieChart = Stats.PieChart.extend({
        getOption: function(data) {
            var options = OperatorPieChart.__super__.getOption.call(this, data);
            options.chart.marginLeft = -150;
            options.legend.x = 180;
            options.legend.y = 10;
            options.tooltip.formatter = function() {
                return this.key + '  ' + this.y;
            };
            return options;
        }
    });

    var OperatorDataParser = Stats.Class.extend({
        parse: function(data) {
            var d = [];
            if (data) {
                $.each(data, function (i, v) {
                    d.push({
                        name: v.item,
                        y: v['userCounts']
                    });
                });
            }
            return d;
        }
    });

    Stats.Views.OperatorView = Stats.View.extend({
        default: $.extend({}, Stats.View.prototype.default, {
            tableId: 'data-table',
            chartId: 'chart',
            tmplId: 'network-operator-tpl',
            title: '运营商分析',
            urlPrefix: '/s/n/op'
        }),

        init: function() {
            this.$title = this.$el.find('#title');
            this.urlPrefix = this.options.urlPrefix;
            this.daysActionSwitcher = new Stats.DaysButtonSwitcher({
                parent: '.l-search'
            });
            this.daysActionSwitcher.on('actionClick', this.disableActions, this);
            this.daysActionSwitcher.on('actionClick', this.loadData, this);
            this.chart = new OperatorPieChart({
                id: this.options.chartId
            });
            this.table = new Stats.Table({ id: this.options.tableId });
            this.dataParser = new OperatorDataParser();
            this.disableActions().loadData();
        },

        getUrl: function() {
            return appName + this.urlPrefix + '?v=' + this.daysActionSwitcher.getValue();
        },

        loadData: function() {
            this.setTitle();
            this.table.trigger('loading');
            this.chart.trigger('loading');
            if (!this._mockedData) {
                var cb = $.proxy(this.onLoadDataSuccess, this), self = this;
                Stats.ajax.getJSON(this.getUrl(), cb).fail(function() {
                    self.onLoadDataSuccess([]);
                });
            } else {
                this.onLoadDataSuccess(this._mockedData);
            }
        },

        onLoadDataSuccess: function(data) {
            this.table.load(data);
            this.chart.draw(this.dataParser.parse(data));
            this.enableActions();
        },

        setTitle: function() {
            this.$title.text(this.options.title + ' - ' + this.daysActionSwitcher.$current.text());
        },

        enableActions: function () {
            this.daysActionSwitcher.trigger('enableActions');
            return this;
        },

        disableActions: function () {
            this.chart.trigger('destroy');
            this.daysActionSwitcher.trigger('disableActions');
            return this;
        },

        destroy: function() {
            this.chart.trigger('destroy');
        }
    });

    //------------
    // Bandwidth analysis
    //------------

    var roundNumber = function (val) {
        return Math.round(val * 100) / 100;
    };

    var BandWidthParser  = Stats.ResultParser.extend({

        doParse: function (data, isMinuteData) {
            if (data && data.aggregations) {
                var d = [], maxBandWidth = 0, amountFlow = isMinuteData ? data.aggregations.flowSum : 0;
                if (isMinuteData) {
                    $.each(data.details, function(i, v) {
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

                $.each(d, function(i, o) {
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
        '<span>总流量：{{amountFlow}} {{flowUnit}}</span>' +
        '&nbsp;<span>峰值带宽：{{maxBandWidth}} {{bandWidthUnit}}</span>' +
        '&nbsp;<span>（{{start}} 至 {{end}}）</span>'
    );

    var unitMapper = new (Stats.Class.extend({
        initialize: function () {
            this._map = {
                "Mbps": {expr: "$$ < 1024", val: 1},
                "Gbps": {expr: "$$ >=1024 && $$ < (1024 * 1024)", val: 1024},
                "Tbps": {expr: "$$ > (1024 * 1024)", val: 1024 * 1024}
            }
        },

        getUnit: function (val) {
            var expr, unitKey, o;
            $.each(this._map, function(k, v) {
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


    var DomainCounter = function(checkers, $el, defaultText) {
        this.checkers = checkers || [];
        this.$el = $el;
        this.defaultText = defaultText || 0;
        this.init();
    };

    DomainCounter.prototype = {
        init: function () {
            this.$el.text(this.defaultText);
        },
        setValue: function(text) {
            if (text) {
                this.$el.text(text);
                return;
            }
            var amount = 0;
            $.each(this.checkers, function(i, o) {
                amount += (o.getDomains().length);
            });
            this.$el.text(amount);
        }
    };

    var CheckboxDomainChecker = Stats.View.extend({

        init: function () {
            this.allSelector = this.options.allSelector;
            this.checkboxSelector = this.options.checkboxSelector;
            this.domains = [];
            this.defaultCheckAll = this.options.defaultCheckAll == undefined;
        },

        init2: function() {
            this.$el.on('click', this.allSelector, $.proxy(this._doCheckAll, this))
                .on('click', this.checkboxSelector, $.proxy(this._doCheckOne, this));
            if (this.defaultCheckAll) {
                this.$el.find(this.allSelector).trigger('click');
            }
        },

        _doCheckAll: function(e) {
            var checked = $(e.target).prop('checked'),
                $all = this.$el.find(this.checkboxSelector),
                that = this;
            $all.prop('checked', checked);
            this.domains = [];
            if (checked) {
                $all.each(function(i, o) {
                    that.domains.push(o.value);
                });
            }
            this.trigger('domainChecker.checkeAll');
        },

        _doCheckOne: function(e) {
            var $el = $(e.target),
                checked = $el.prop('checked'),
                val = $el.val();
            if (checked) {
                this.domains.push(val);
            } else {
                this.domains.splice(this.domains.indexOf(val), 1);
            }
            var amount = this.$el.find(this.checkboxSelector).length;
            this.$el.find(this.allSelector)
                .prop('checked', this.domains.length == amount);
            this.trigger('domainChecker.checkeOne');
        },

        getDomains: function() {
            return this.domains;
        }


    });

    var DomainDropDown = Stats.View.extend({
        default: $.extend({}, Stats.View.prototype.default, {
            el: '#domainDropDown'
        }),

        init: function () {
            this.on('disable', function() {
                this.toggle(false);
            });
            this.on('enable', function() {
                this.toggle(true);
            });
            var that = this;
            this.$domainDropDownBtn = this.$el.find("#btn-domain-dropdown");
            this.$domainDropDownBtn.dropdown();
            this.$el.on('hide.bs.dropdown', function(e) {
                var target = e._target, hidden = true;
                if (target) {
                    target = $(target);
                    hidden = $(this).has($(target)).length == 0 || target.hasClass('input-group-btn');
                }
                if (hidden) {
                    that.trigger('hide.dropdown');
                }
                return hidden;
            });

            this.doAfterInit();
        },

        doAfterInit: function () {

        },

        toggle: function (enabled) {
            if (enabled) {
                this.$domainDropDownBtn.removeAttr('disabled');
            } else {
                this.$domainDropDownBtn.attr('disabled', 'disabled')
            }
        }
    });


    var CheckboxDropDown = DomainDropDown.extend({
        default: $.extend({}, DomainDropDown.prototype.default, {
            tmplId: 'domain-checkbox-dropdown-tpl'
        }),
        
        doAfterInit: function () {
            var that = this;
            this.aliDomainChecker = new CheckboxDomainChecker({
                allSelector: '#ali-all',
                checkboxSelector: 'input[name="ali"]',
                el: this.$el
            });
            
            this.fastWebDomainChecker = new CheckboxDomainChecker({
                allSelector: '#fastweb-all',
                checkboxSelector: 'input[name="fastweb"]',
                el: this.$el
            });

            var domainCheckers = [this.aliDomainChecker, this.fastWebDomainChecker];
            this.domainCounter = new DomainCounter(domainCheckers, this.$el.find('#domain-counter'));
            $.each(domainCheckers, function(i, o) {
                o.on('domainChecker.checkeAll', that.setAmount, that)
                    .on('domainChecker.checkeOne', that.setAmount, that);
            });

            this.aliDomainChecker.init2();
            this.fastWebDomainChecker.init2();
        },

        setAmount: function () {
            this.domainCounter.setValue(this.getDomains().length == 11 ? '全部' : '');
        },

        getDomains: function () {
            return this.aliDomainChecker.getDomains().concat(this.fastWebDomainChecker.getDomains());
        }

    });

    var RadioDropDown = DomainDropDown.extend({
        default: $.extend({}, DomainDropDown.prototype.default, {
            tmplId: 'domain-radio-dropdown-tpl',
            domainSelector: 'input[name="domain"]'
        }),

        doAfterInit: function () {
            this.domains = [];
            this.domainCounter = new DomainCounter([], this.$el.find('#domain-counter'));
            var that = this;
            this.$el.on('click', this.options.domainSelector, function () {
                var $this = $(this),
                    val = $this.val();
                that.domains = [];
                if (val == '_all') {
                    that.$el.find(that.options.domainSelector).each(function() {
                        that.domains.push($(this).val());
                    });
                } else {
                    that.domains.push($(this).val());
                }
                that.setText();
                that.$domainDropDownBtn.dropdown('toggle');
                that.trigger('domain.click');
            });

            this.$el.find(this.options.domainSelector + '[value="_all"]').prop('checked', true).trigger('click');

        },

        setText: function () {
            this.domainCounter.setValue(this.domains.length > 1 ? '全部' : this.domains[0]);
        },

        getDomains: function () {
            return this.domains;
        }

    });

    var BandWidthLineChart = Stats.Chart.extend({

        hasData: function(data) {
            return data && data.data && data.data.length > 0;
        },

        getOption: function(data) {
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

    var BandWidthTable = Stats.Table.extend({
        _resultHandler: function (res) {
            var data = [];
            if (res && res.length > 0) {
                var unit;
                $.each(res, function (i, v) {
                    unit = unitMapper.getUnit(v.sumFlow);
                    data.push(
                        $.extend({}, v,
                            {
                                maxBandwdith: roundNumber(v.maxBandwdith) + 'Mbps',
                                sumFlow: roundNumber(v.sumFlow / unit.val) + unit.fUnit
                            }
                        )
                    );
                });
                data.reverse();
                $.each(data, function(i, o) {
                    o._id = i + 1;
                });
            }
            return data;
        }
    });

    Stats.Views.BandWidthView = Stats.View.extend({
        default: $.extend({}, Stats.View.prototype.default, {
            tableId: 'data-table',
            chartId: 'chart',
            tmplId: 'network-bandwidth-tpl',
            title: '带宽分析',
            urlPrefix: '/s/n/b'
        }),

        init: function() {
            this.$title = this.$el.find('#title');
            this.urlPrefix = this.options.urlPrefix;
            this.$chartSummary = this.$el.find('.n-b-chart_summary');
            this.$detail = this.$el.find(".l-detail");
            this.checkboxDropDown = new CheckboxDropDown();
            this.checkboxDropDown.on('hide.dropdown', this.onDomainChanged, this);
            this._mockedData = this.options.mockedData;
            this.daysActionSwitcher = new Stats.DaysButtonSwitcher({
                parent: '.n-b-search'
            });
            this.daysActionSwitcher.on('actionClick', this.disableActions, this)
                .on('actionClick', this.loadData, this);

            this.bandWidthParser = new BandWidthParser();
            this.chart = new BandWidthLineChart({
                id: this.options.chartId
            });
            this.table = new BandWidthTable({ id: this.options.tableId });

            this.disableActions().loadData();
        },

        onDomainChanged: function() {
            var values = this.checkboxDropDown.getDomains();
            if (values && values.length > 0) {
                this.disableActions().loadData();
            } else {
                this.onLoadDataSuccess({});
            }
        },

        getUrl: function() {
            var url = appName + this.urlPrefix + '?v=' + this.daysActionSwitcher.getValue(),
                domains = this.checkboxDropDown.getDomains();
            for (var i = 0; i < domains.length; i++) {
                url += '&d=' + domains[i];
            }
            return url;
        },

        loadData: function() {
            this.setTitle();
            if (this.daysActionSwitcher.getValue() < -1) {
                this.$detail.show();
                this.table.trigger('loading');
            } else {
                this.$detail.hide();
            }
            this.chart.trigger('loading');
            if (!this._mockedData) {
                var cb = $.proxy(this.onLoadDataSuccess, this), self = this;
                Stats.ajax.getJSON(this.getUrl(), cb).fail(function() {
                    self.onLoadDataSuccess([]);
                });
            } else {
                this.onLoadDataSuccess(this._mockedData);
            }
        },

        onLoadDataSuccess: function(data) {
            if (this.daysActionSwitcher.getValue() < -1) {
                this.$detail.show();
                this.table.load(data.aggregations || []);
            } else {
                this.$detail.hide();
            }
            var bandWidthResult = this.bandWidthParser.parse(data, this.daysActionSwitcher.getValue() >= -1);
            this.setChartSummary(bandWidthResult);
            this.chart.draw(bandWidthResult);
            this.enableActions();
        },

        setChartSummary: function (data) {
            this.$chartSummary.hide();
            if (data && data.maxBandWidth) {
                var maxBandWidth = data.maxBandWidth,
                    amountFlow = data.amountFlow,
                    val = this.daysActionSwitcher.getValue();

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

        setTitle: function() {
            this.$title.text(this.options.title + ' - ' + this.daysActionSwitcher.$current.text());
        },

        enableActions: function () {
            this.daysActionSwitcher.trigger('enableActions');
            this.checkboxDropDown.trigger('enable');
            return this;
        },

        disableActions: function () {
            this.daysActionSwitcher.trigger('disableActions');
            this.checkboxDropDown.trigger('disable');
            return this;
        },

        destroy: function() {
            this.chart.trigger('destroy');
        }
    });

    //------------
    // Cdn analysis
    //------------

    var cdnTooltipRender = template.compile('<table class="table table-bordered text-center" style="margin-bottom: 0px;">' +
        '<tr>' +
        '<th>省市</th>' +
        '<th>cdn名称</th>' +
        '<th>节点数</th>' +
        '</tr>' +
        '{{each items as item index}}' +
        '<tr>' +
        '<td>{{if index == 0}}{{province}}{{/if}}</td>' +
        '<td>{{item.name}}</td>' +
        '<td>{{item.value}}</td>' +
        '</tr>' +
        '{{/each}}' +
        '</table>');

    var MapChart = Stats.Chart.extend({

        draw: function(data) {
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
            this._chart = new Highcharts.Map(options, function(chart) { self.onLoad(chart); });
            this.show();
        },

        onLoad: function(chart) {
            var left = this.options.left, right = this.options.right;
            $(chart.container).find(".highcharts-coloraxis-labels").remove();
            chart.renderer.text('访问次数 高', left.x, left.y).css({"font-weight": "bold"}).add();
            chart.renderer.text('低', right.x, right.y).css({"font-weight": "bold"}).add();
        },

        getOption: function(data) {
            var codeMap = this.options.codeMap, mapName = this.options.mapName;
            return {
                chart: {
                    renderTo: this._id
                },
                title : {
                    text : ''
                },
                colorAxis: {
                    min: 0,
                    reversed: true
                },
                tooltip: {
                    useHTML: true,
                    formatter: function() {
                        var d = data[this.point.index], province = codeMap[this.point['hc-key']],
                            items = [
                                {name: '阿里', value: d.aliCdnNodeCount},
                                {name: '快网', value: d.cnkuaiCdnNodeCount}

                            ];
                        return cdnTooltipRender({items: items, province: province});
                    }
                },
                legend: {
                    verticalAlign: 'top',
                    itemDistance: 0,
                    reversed: true
                },
                series : [{
                    data : data,
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

    var mapDataParser = new (Stats.ResultParser.extend({
        doParse: function(data, codeMap) {
            var d = [];
            $.each(data, function(i,v){
                var o = $.extend({}, v);
                o['hc-key'] = codeMap[v.province];
                o.value = v.allCdnNodeCount;
                d.push(o);
            });
            return d;
        }
    }))();

    var ProvinceHoverTable = Stats.HoverTable.extend({
        bindHoverEvent: function() {
            var self = this;
            this.$table.on('mouseover', "tr[data-index]", function() {
                    var $this = $(this);
                    self.trigger('rowOver', {
                        index: $this.data().index,
                        name: $this.find('.item-name').text(),
                        val: $this.find('.item-value').text()
                    }, true);
                })
                .on('mouseout', "tr[data-index]", function() {
                    var $this = $(this);
                    self.trigger('rowOut', {
                        index: $this.data().index,
                        name: $this.find('.item-name').text(),
                        val: $this.find('.item-value').text()
                    }, false);
                });
            return this;
        }
    });

    Stats.Views.CdnView = Stats.View.extend({
        default: $.extend({}, Stats.View.prototype.default, {
            tableId: 'data-table',
            chartId: 'chart',
            tmplId: 'network-cdn-tpl',
            urlPrefix: '/s/n/cdn',
            title: 'CDN节点分析'
        }),

        init: function() {
            this.$title = this.$el.find('#title');
            this.daysActionSwitcher = new Stats.DaysButtonSwitcher({
                parent: '.l-search'
            });
            this.daysActionSwitcher.on('actionClick', this.disableActions, this)
                .on('actionClick', this.loadData, this);
            this.table = new ProvinceHoverTable({id: this.options.tableId});
            this.table.unBindHoverEvent().bindHoverEvent().on('rowOver', this.onTableRowHover, this)
                .on('rowOut', this.onTableRowHover, this);
            this.chart = new MapChart({
                id: this.options.chartId,
                left: {x: 0, y:28},
                right: {x: 276, y:28},
                codeMap: Stats.chinaCodeAndProvinceMap,
                mapName: 'countries/cn/custom/cn-all-sar-taiwan'
            });

            this.disableActions().loadData();

        },

        onTableRowHover: function (data, show) {
            var d = this.chart._chart.series[0].data, mapCode = Stats.chinaProvinceAndCodeMap,
                o, v = parseInt(data.val);
            if (v == 0) {
                return;
            }
            $.each(d, function(i, v) {
                if (v['hc-key'] == mapCode[data.name]) {
                    o = v;
                    return false;
                }
            });
            if (o) {
                if (show) {
                    o.setState('hover');
                    this.chart._chart.tooltip.refresh(o);
                } else {
                    o.setState();
                    this.chart._chart.tooltip.hide();
                }
            }
        },

        setTitle: function() {
            this.$title.text(this.options.title + ' - ' + this.daysActionSwitcher.$current.text());
        },

        getUrl: function() {
            return appName + this.urlPrefix + '?v=' + this.daysActionSwitcher.getValue();
        },

        loadData: function() {
            this.setTitle();
            this.table.trigger('loading');
            this.chart.trigger('loading');
            if (!this._mockedData) {
                var cb = $.proxy(this.onLoadDataSuccess, this), self = this;
                Stats.ajax.getJSON(this.getUrl(), cb).fail(function() {
                    self.onLoadDataSuccess([]);
                });
            } else {
                this.onLoadDataSuccess(this._mockedData);
            }
        },

        onLoadDataSuccess: function(data) {
            this.chart.draw(mapDataParser.parse(data, Stats.chinaProvinceAndCodeMap));
            this.table.load(data || []);
            this.enableActions();
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

    // Fluency statistic

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

    var FluencyChart = Stats.Chart.extend({

        hasData: function (data) {
            return data && (($.isArray(data.data) && data.data.length > 0));
        },

        getCategories: function(data) {
            var categories = data.time;
            categories.sort(function (a, b) {
                return a - b;
            });
            return categories;
        },

        getOption: function (data, isHourData) {
            var categories = this.getCategories(data, isHourData),
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
                        var v = categories[this.x] + '', d = parseDateStr({str: v, dateJoin: '-', needHours: isHourData});
                        return '日期: ' + d + '<br>卡顿率: ' + this.y + '%';
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
                    labels: {
                        formatter: function () {
                            var label = categories[this.value];
                            if (label) {
                                label += '';
                                return isHourData ? parseInt(label.substr(8)) : label.substr(4, 2) + '/' + label.substr(6, 2);
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
                        format: '{value:,.2f}%'
                    },
                    min: 0,
                    max: 100,
                    tickAmount: 6
                },

                title: {
                    text: ''
                },

                legend: {
                    enabled: false
                }
            };

            chartOptions.series = [{
                name: '',
                data: data.data,
                color: '#57C2F4'
            }];
            return chartOptions;
        }
    });

    var fluencyChartDataParser = new (Stats.ResultParser.extend({

        doParse: function (data) {
            var time = [], val = [];
            $.each(data, function (i, v) {
                time.push(parseInt(v['item']));
                val.push(parseFloat(v['userPercentage']));
            });
            return {time: time, data: val};
        }
    }))();

    var FluencyRateView = Stats.View.extend({
        default: $.extend({}, Stats.View.prototype.default, {
            urlPrefix: '/s/n/fl',
            el: '#fluency',
            chartId: 'fluencyChart'
        }),

        init: function() {
            this.daysActionSwitcher = new Stats.DaysButtonSwitcher({
                parent: this.$el
            });
            this.daysActionSwitcher.on('actionClick', this.disableActions, this)
                .on('actionClick', this.loadData, this);
            this.radioDomainChecker = new RadioDropDown({
                el: this.$el.find('#domainDropDown'),
                idx: 0,
                domainSelector: 'input[name="domain_0"]'
            });
            this.radioDomainChecker.on('domain.click', this.loadData, this);
            
            this.chart = new FluencyChart({
                id: this.options.chartId
            });

            this.descriptionPopover = new Stats.Popover({ el: '#description'});
            this.disableActions().loadData();
        },

        getUrl: function() {
            var url = appName + this.urlPrefix + '?v=' + this.daysActionSwitcher.getValue(),
                domains = this.radioDomainChecker.getDomains();
            for (var i = 0; i < domains.length; i++) {
                url += '&d=' + domains[i];
            }
            return url;
        },

        loadData: function() {
            this.onBeforeLoadData();
            if (!this._mockedData) {
                var cb = $.proxy(this.onLoadDataSuccess, this), self = this;
                Stats.ajax.getJSON(this.getUrl(), cb).fail(function(){ self.onLoadDataSuccess([]) });
            } else {
                this.onLoadDataSuccess(this._mockedData);
            }
        },

        onBeforeLoadData: function() {
            this.chart.trigger('loading');
            this.disableActions();
        },

        onLoadDataSuccess: function(data) {
            var d = data && $.isArray(data) ? data : [], day = this.daysActionSwitcher.getValue();
            this.chart.draw(fluencyChartDataParser.parse(d), day >= -1);
            this.enableActions();
        },

        enableActions: function () {
            this.daysActionSwitcher.trigger('enableActions');
            this.radioDomainChecker.trigger('enable');
            return this;
        },

        disableActions: function () {
            this.daysActionSwitcher.trigger('disableActions');
            this.radioDomainChecker.trigger('disable');
            return this;
        },

        destroy: function() {
            this.chart.trigger('destroy');
        }
    });

    var PackageChart = Stats.Chart.extend({

        hasData: function (data) {
            return data && (($.isArray(data.data) && data.data.length > 0));
        },

        getOption: function (data) {
            var categories = data.time,
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
                        return '时间: ' + categories[this.x]+ 'ms<br>用户数: ' + this.y;
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
                    labels: {
                        formatter: function () {
                            var label = categories[this.value];
                            if (label) {
                                return label + 'ms';
                            }
                        }
                    },
                    startOnTick: true,
                    endOnTick: true,
                    minPadding: 0,
                    maxPadding: 0
                },

                yAxis: {
                    allowDecimals: false,
                    title: {
                        text: ''
                    },
                    lineWidth: 1,
                    tickWidth: 1,
                    lineColor: '#428bca',
                    min: 0,
                    tickAmount: 6
                },

                title: {
                    text: ''
                },

                legend: {
                    enabled: false
                }
            };

            chartOptions.series = [{
                name: '',
                data: data.data,
                color: '#57C2F4'
            }];
            return chartOptions;
        }
    });

    var packageChartDataParser = new (Stats.ResultParser.extend({

        doParse: function (data) {
            var time = [], val = [];
            $.each(data, function (i, v) {
                time.push(v['firstPlayTime']);
                val.push(v['userCount']);
            });
            return {time: time, data: val};
        }

    }))();

    var PackageView = Stats.View.extend({
        default: $.extend({}, Stats.View.prototype.default, {
            urlPrefix: '/s/n/ft',
            el: '#package',
            chartId: 'packageChart'
        }),

        init: function() {
            this.daysActionSwitcher = new Stats.DaysButtonSwitcher({
                parent: this.$el
            });
            this.daysActionSwitcher.on('actionClick', this.disableActions, this)
                .on('actionClick', this.loadData, this);
            this.radioDomainChecker = new RadioDropDown({
                el: this.$el.find('#domainDropDown'),
                idx: 1,
                domainSelector: 'input[name="domain_1"]'
            });
            this.radioDomainChecker.on('domain.click', this.loadData, this);
            this.chart = new PackageChart({
                id: this.options.chartId
            });
            this.disableActions().loadData();
        },

        getUrl: function() {
            var url = appName + this.urlPrefix + '?v=' + this.daysActionSwitcher.getValue(),
                domains = this.radioDomainChecker.getDomains();
            for (var i = 0; i < domains.length; i++) {
                url += '&d=' + domains[i];
            }
            return url;
        },

        loadData: function() {
            this.onBeforeLoadData();
            if (!this._mockedData) {
                var cb = $.proxy(this.onLoadDataSuccess, this), self = this;
                Stats.ajax.getJSON(this.getUrl(), cb).fail(function(){ self.onLoadDataSuccess([]) });
            } else {
                this.onLoadDataSuccess(this._mockedData);
            }
        },

        onBeforeLoadData: function() {
            this.chart.trigger('loading');
            this.disableActions();
        },

        onLoadDataSuccess: function(data) {
            var d = data && $.isArray(data) ? data : [];
            this.chart.draw(packageChartDataParser.parse(d));
            this.enableActions();
        },

        enableActions: function () {
            this.daysActionSwitcher.trigger('enableActions');
            this.radioDomainChecker.trigger('enable');
            return this;
        },

        disableActions: function () {
            this.daysActionSwitcher.trigger('disableActions');
            this.radioDomainChecker.trigger('disable');
            return this;
        },

        destroy: function() {
            this.chart.trigger('destroy');
        }
    });

    Stats.Views.FluencyView = Stats.View.extend({
        default: $.extend({}, Stats.View.prototype.default, {
            tmplId: 'network-fluency-tpl'
        }),

        init: function() {
            this.rateView = new FluencyRateView({mockedData: this._mockedData});
            this.packageView = new PackageView({mockedData: this.options.mockedPackageData});
        },

        destroy: function() {
            this.rateView.trigger('destroy');
            this.packageView.trigger('destroy');
        }
    });

}(jQuery, Stats, APPNAME, template, moment));

