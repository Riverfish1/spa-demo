(function ($, Stats, appName) {

    var TerminalPieChart = Stats.PieChart.extend({
        getOption: function (data) {
            var options = TerminalPieChart.__super__.getOption.call(this, data);
            options.chart.renderTo = $('#' + this._id)[0];
            options.chart.marginLeft = -200;
            options.legend.x = 130;
            options.legend.y = 20;
            return options;
        }
    });

    var AccessOverViewChart = Stats.PieChart.extend({
        getOption: function (data) {
            var options = TerminalPieChart.__super__.getOption.call(this, data);
            options.chart.marginLeft = -200;
            options.chart.renderTo = '#' + this._id;
            options.legend.x = 130;
            options.legend.y = 10;
            options.tooltip.formatter = function () {
                return '数量: ' + this.y + '<br>占比: ' + this.point.percent;
            };
            return options;
        }
    });

    var terminalDataParser = new (Stats.ResultParser.extend({
        doParse: function (data) {
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
    }))();

    var terminalView = Stats.View.extend({
        default: $.extend({}, Stats.View.prototype.default, {
            tableId: 'data-table',
            chartId: 'chart',
            tmplId: 'terminal-tpl',
            isAccessOverview: false
        }),

        init: function () {
            // console.log(this);
            this.$title = this.$el.find('#title');
            this.urlPrefix = this.options.urlPrefix;
            this.isAccessOverview = this.options.isAccessOverview;
            this.additionalParams = this.options.additionalParams;
            this.daysActionSwitcher = new Stats.DaysButtonSwitcher({
                parent: this.options.el + ' ' + '.l-search'
            });
            this.daysActionSwitcher.on('actionClick', this.disableActions, this);
            this.daysActionSwitcher.on('actionClick', this.loadData, this);
            var self = this;
            if (this.isAccessOverview) {
                this.chart = new AccessOverViewChart({id: this.options.el.substring(1) + ' #' + this.options.chartId});
            } else {
                this.chart = new TerminalPieChart({
                    id: this.options.el.substring(1) + ' #' + this.options.chartId,
                    onAnimationDone: function () {
                        self.table.unBindHoverEvent().bindHoverEvent();
                        self.table.on('rowOver', self.onTableRowHover, self)
                            .on('rowOut', self.onTableRowHover, self);
                    }
                });
            }

            if (!this.isAccessOverview) {
                this.table = new Stats.HoverTable({id: this.options.el.substring(1) + ' #' + this.options.tableId});
            }
            this.disableActions().loadData();
        },

        onTableRowHover: function (index, show) {
            this.chart.hover(index, show);
        },

        getUrl: function () {
            var url = appName + this.urlPrefix + '?v=' + this.daysActionSwitcher.getValue();
            if (this.additionalParams) {
                $.each(this.additionalParams, function (k, v) {
                    url += ("&" + k + "=" + v);
                });
            }
            // 模拟
            return appName + '../resource/devData/terminal_device.json';
            // return appName + this.options.url;
            return url;
        },

        loadData: function () {
            this.setTitle();
            var cb = $.proxy(this.onLoadDataSuccess, this), self = this;
            if (!this.isAccessOverview) this.table.trigger('loading');
            this.chart.trigger('loading');
            Stats.ajax.getJSON(this.getUrl(), cb).fail(function () {
                self.onLoadDataSuccess([]);
            });
        },

        onLoadDataSuccess: function (data) {
            var data = this.convert(data) || [];
            if (!this.isAccessOverview) this.table.load(data);
            this.chart.draw(terminalDataParser.parse(data));
            this.enableActions();
        },

        convert: function (data) {
            if (data) {
                var obj = {}, arr = [], self = this, sum = this.getSum(data);
                $.each(data, function (k, v) {
                    obj.item = v[self.additionalParams.item];
                    obj.userCounts = v['pvcnt'];
                    obj.userPercentage = Math.round(v['pvcnt'] / sum * 10000) / 100.00 + '%';
                    arr.push(obj);
                    obj = {};
                });
                return arr;
            }
        },

        getSum: function (arr) {
            var sum = 0;
            $.each(arr, function (k, v) {
                sum += v['pvcnt']
            })
            return sum;
        },

        setTitle: function () {
            this.$title.text('top10' + this.options.title + ' - ' + this.daysActionSwitcher.$current.text());
        },

        enableActions: function () {
            this.daysActionSwitcher.trigger('enableActions');
            return this;
        },

        disableActions: function () {
            if (!this.isAccessOverview) this.table.unBindHoverEvent();
            this.chart.trigger('destroy');
            this.daysActionSwitcher.trigger('disableActions');
            return this;
        },

        destroy: function () {
            this.chart.trigger('destroy');
        }
    });

    Stats.Views.TerminalView = Stats.View.extend({
        default: $.extend({}, Stats.View.prototype.default, {
            tmplId: 'terminal-tabs-tpl'
        }),

        init: function () {
            var self = this;
            this.createView1(this.options.android_param);
            $('#terminalNav').on('shown.bs.tab', function (e) {
                // 获取已激活的标签页的名称
                var activeTab = $(e.target).text();
                if (activeTab == 'Android') {
                    self.createView1(self.options.android_param);
                } else if (activeTab == 'iOS') {
                    self.createView1(self.options.ios_param);
                } else if (activeTab == 'Flash') {
                    self.createView2(self.options.flash_param);
                } else {
                    self.createView2(self.options.h5_param);
                }
            });
        },

        createView1: function (opts) {
            this.terminalDevice = new terminalView(opts.deviceParam);
            this.terminalOS = new terminalView(opts.osParam);
            this.terminalResolution = new terminalView(opts.resolutionParam);
        },
        createView2: function (opts) {
            this.terminalDevice = new terminalView(opts.deviceParam);
            this.terminalOS = new terminalView(opts.osParam);
        },

        destroy: function () {
            this.terminalDevice.trigger('destroy');
            this.terminalOS.trigger('destroy');
            this.terminalResolution.trigger('destroy');
        }
    });

}(jQuery, Stats, APPNAME));
