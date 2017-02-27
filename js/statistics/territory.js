(function($, Stats, appName, Highcharts){

    //-------------------
    // Inland analysis
    //-------------------

    var inlandPieChartDataParser = new (Stats.ResultParser.extend({
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

    var mapDataParser = new (Stats.ResultParser.extend({
        doParse: function(data, codeMap) {
            var d = [];
            $.each(data, function(i,v){
                var o = {};
                o['hc-key'] = codeMap[v.name];
                o.value = v.value;
                o.percent = Math.round(v.percent * 10000) / 100;
                d.push(o);
            });
            return d;
        }
    }))();

    var InlandPipeChart = Stats.PieChart.extend({
        getOption: function(data) {
            var options = InlandPipeChart.__super__.getOption.call(this, data);
            options.legend.x = 150;
            $.extend(options.legend, {itemMarginTop: 5, itemMarginBottom: 5});
            options.plotOptions.pie.center = [100, 100];
            options.plotOptions.pie.dataLabels.enabled = true;
            options.plotOptions.pie.dataLabels.distance = 15;
            options.plotOptions.pie.dataLabels.formatter = function() {
                return this.point.index <= 2 ? this.key : null;
            };
            return options;
        }
    });

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
            this.trigger('afterMapChartLoad');
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
                    formatter: function() {
                        var d = data[this.point.index];
                        var str = '<span style="font-weight: bold">'+ codeMap[this.point['hc-key']]  +'</span><br>';
                        str += '排名: <span style="color:red">'+ (this.point.index + 1) +'</span><br>';
                        str += '数量: <span style="color:red">'+ d.value +'</span><br>';
                        str += '占比: <span style="color:red">'+ d.percent +'%</span>';
                        return  str;
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

    var InlandTable = Stats.HoverTable.extend({
        bindHoverEvent: function() {
            var self = this;
            this.$table.on('mouseover', "tr[data-index]", function() {
                    var $this = $(this);
                    self.trigger('rowOver', {index: $this.data().index, name: $this.find('.item-name').text()}, true);
                })
                .on('mouseout', "tr[data-index]", function() {
                    var $this = $(this);
                    self.trigger('rowOut', {index: $this.data().index, name: $this.find('.item-name').text()}, false);
                });
            return this;
        }
    });

    var TerritoryView = Stats.View.extend({
        default: $.extend({}, Stats.View.prototype.default, {
            tableId: 'data-table'
        }),

        init: function() {
            this.urlPrefix = this.options.urlPrefix;
            this.$title = this.$el.find('#title');
            this.daysActionSwitcher = new Stats.DaysButtonSwitcher({
                parent: '.l-search'
            });
            this.daysActionSwitcher.on('actionClick', this.disableActions, this);
            this.daysActionSwitcher.on('actionClick', this.loadData, this);

            this.itemActionSwitcher = new Stats.RadioActionSwitcher({
                'parent': '.l-search-action'
            });
            this.itemActionSwitcher.on('actionClick', this.disableActions, this);
            this.itemActionSwitcher.on('actionClick', this.loadData, this);

            this.table = new InlandTable({ id: this.options.tableId });

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

        onTableRowHover: function(data, show) {
            var d = this.mapChart._chart.series[0].data, mapCode = this.options.mapCode,
                o;
            $.each(d, function(i, v) {
                if (v['hc-key'] == mapCode[data.name]) {
                    o = v;
                    return false;
                }
            });
            if (o) {
                if (show) {
                    o.setState('hover');
                    this.mapChart._chart.tooltip.refresh(o);
                } else {
                    o.setState();
                    this.mapChart._chart.tooltip.hide();
                }
            }
            this.trigger('after-tableRowHover', data, show);
        },

        setTableItemTitle: function() {
            var title = this.itemActionSwitcher.getValue() == 1 ? '浏览量（PV）' : '访客数（UV）';
            this.table.$table.find('.item-title .th-inner').text(title);
        },

        getUrl: function() {
            return appName + this.urlPrefix + '?v=' + this.daysActionSwitcher.getValue() +
                '&t=' + this.itemActionSwitcher.getValue() + '&t2=' + this.options.type;
        },

        loadData: function() {
            this.onBeforeLoadData();
            var cb = $.proxy(this.onLoadDataSuccess, this), self = this;
            Stats.ajax.getJSON(this.getUrl(), cb).fail(function(){ self.onLoadDataSuccess([]) });
        },

        onBeforeLoadData: function() {
            this.setTitle();
            this.setTableItemTitle();
            this.mapChart.trigger('loading');
            this.trigger('after-mapChart-loading');
            this.table.trigger('loading');
        },

        onLoadDataSuccess: function(data) {
            var d = data && $.isArray(data) ? data : [];
            this.mapChart.draw(mapDataParser.parse(d, this.options.mapCode));
            this.trigger('after-mapChart-draw', d);
            this.table.load(d);
            this.enableActions();
        },

        setTitle: function() {
            this.$title.text(this.options.titlePrefix + ' - ' + this.daysActionSwitcher.$current.text());
        },

        enableActions: function () {
            this.daysActionSwitcher.trigger('enableActions');
            this.itemActionSwitcher.trigger('enableActions');
            return this;
        },

        disableActions: function () {
            this.table.unBindHoverEvent();
            this.daysActionSwitcher.trigger('disableActions');
            this.itemActionSwitcher.trigger('disableActions');
            return this;
        }
    });

    Stats.Views.InlandView = TerritoryView.extend({
        default: $.extend({}, TerritoryView.prototype.default, {
            mapChartId: 'map-chart',
            pipChartId: 'pip-chart',
            tmplId: 'territory-inland-tpl',
            type: 1,
            legendTitlePos: {
                left: {x: 0, y:28},
                right: {x: 276, y:28}
            },
            codeMap: Stats.chinaCodeAndProvinceMap,
            mapCode: Stats.chinaProvinceAndCodeMap,
            mapName: 'countries/cn/custom/cn-all-sar-taiwan',
            titlePrefix: '国内分析'
        }),

        init: function() {
            this.on('init-before-loadData', this.onInitBeforeLoadData);
            this.on('after-tableRowHover', this.onAfterTableRowHover);
            this.on('after-mapChart-loading', this.onAfterMapCharLoading);
            this.on('after-mapChart-draw', this.onAfterMapChartDraw);
            TerritoryView.prototype.init.apply(this, arguments);
        },

        onInitBeforeLoadData: function() {
            var self = this;
            this.pipChart = new InlandPipeChart({
                id: this.options.pipChartId,
                onAnimationDone: function() {
                    self.table.unBindHoverEvent().bindHoverEvent()
                        .on('rowOver', self.onTableRowHover, self)
                        .on('rowOut', self.onTableRowHover, self);
                }
            });
        },

        onAfterTableRowHover: function(data, show) {
            this.pipChart.hover(data.index, show);
        },

        onAfterMapCharLoading: function() {
            this.pipChart.trigger('loading');
        },

        onAfterMapChartDraw: function(data) {
            this.pipChart.draw(inlandPieChartDataParser.parse(data));
        }
    });

    //-------------------
    // National analysis
    //-------------------

    Stats.Views.NationalView = TerritoryView.extend({
        default: $.extend({}, TerritoryView.prototype.default, {
            mapChartId: 'chart',
            tmplId: 'territory-national-tpl',
            legendTitlePos: {
                left: {x: 125, y:27},
                right: {x: 405, y:27}
            },
            type: 0,
            codeMap: Stats.worldCodeAndNameMap,
            mapCode: Stats.worldNameAndCodeMap,
            mapName: 'custom/world-palestine-highres',
            titlePrefix: '国家分析'
        }),

        init: function() {
            this.on('init-before-loadData', this.onInitBeforeLoadData);
            TerritoryView.prototype.init.apply(this, arguments);
        },

        onInitBeforeLoadData: function() {
            this.mapChart.on('afterMapChartLoad', $.proxy(this.onAfterMapChartLoad, this));
        },

        onAfterMapChartLoad: function() {
            this.table.unBindHoverEvent().bindHoverEvent()
                .on('rowOver', this.onTableRowHover, this)
                .on('rowOut', this.onTableRowHover, this);
        }
    });

}(jQuery, Stats, APPNAME, Highcharts));
