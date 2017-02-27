(function($, Stats, appName){

    var TerminalPieChart = Stats.PieChart.extend({
        getOption: function(data) {
            var options = TerminalPieChart.__super__.getOption.call(this, data);
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
            options.legend.x = 130;
            options.legend.y = 10;
            options.tooltip.formatter = function() {
                return '数量: ' + this.y + '<br>占比: ' + this.point.percent;
            };
            return options;
        }
    });

    var terminalDataParser = new (Stats.ResultParser.extend({
        doParse: function(data) {
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

    Stats.Views.TerminalView = Stats.View.extend({
        default: $.extend({}, Stats.View.prototype.default, {
            tableId: 'data-table',
            chartId: 'chart',
            tmplId: 'terminal-tpl',
            isAccessOverview: false
        }),

        init: function() {
            this.$title = this.$el.find('#title');
            this.urlPrefix = this.options.urlPrefix;
            this.isAccessOverview = this.options.isAccessOverview;
            this.additionalParams = this.options.additionalParams;
            this.daysActionSwitcher = new Stats.DaysButtonSwitcher({
                parent: '.l-search'
            });
            this.daysActionSwitcher.on('actionClick', this.disableActions, this);
            this.daysActionSwitcher.on('actionClick', this.loadData, this);
            var self = this;
            if (this.isAccessOverview) {
                this.chart = new AccessOverViewChart({id: this.options.chartId});
            } else {
                this.chart = new TerminalPieChart({
                    id: this.options.chartId,
                    onAnimationDone: function() {
                        self.table.unBindHoverEvent().bindHoverEvent();
                        self.table.on('rowOver', self.onTableRowHover, self)
                            .on('rowOut', self.onTableRowHover, self);
                    }
                });
            }

            if (!this.isAccessOverview) {
                this.table = new Stats.HoverTable({ id: this.options.tableId });
            }
            this.disableActions().loadData();
        },

        onTableRowHover: function(index, show) {
            this.chart.hover(index, show);
        },

        getUrl: function() {
            var url = appName + this.urlPrefix + '?v=' + this.daysActionSwitcher.getValue();
            if (this.additionalParams) {
                $.each(this.additionalParams, function(k, v) {
                    url += ("&" + k + "=" + v);
                });
            }
            return url;
        },

        loadData: function() {
            this.setTitle();
            var cb = $.proxy(this.onLoadDataSuccess, this), self = this;
            if (!this.isAccessOverview) this.table.trigger('loading');
            this.chart.trigger('loading');
            Stats.ajax.getJSON(this.getUrl(), cb).fail(function() {
                self.onLoadDataSuccess([]);
            });
        },

        onLoadDataSuccess: function(data) {
            if (!this.isAccessOverview) this.table.load(data);
            this.chart.draw(terminalDataParser.parse(data));
            this.enableActions();
        },

        setTitle: function() {
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

        destroy: function() {
            this.chart.trigger('destroy');
        }
    });

}(jQuery, Stats, APPNAME));
