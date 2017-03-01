(function($, Stats, appName){

    //-------------
    // Content analysis
    //-------------

    var videoChartDataParser = new (Stats.ResultParser.extend({
        doParse: function(data) {
            var categories = [], d = [];
            $.each(data, function (i, v) {
                categories.push(v.item);
                d.push(v.userCounts);
            });
            return {
                categories: categories,
                series: [{data: d}]
            };
        }
    }))();

    var barrageChartDataParser = new (Stats.ResultParser.extend({
        doParse: function(data) {
            var categories = [], d = [];
            $.each(data, function (i, v) {
                categories.push(v.videoName);
                d.push(v.barrageNumber);
            });
            return {
                categories: categories,
                series: [{data: d}]
            };
        }
    }))();

    var ContentBarChart = Stats.BarChart.extend({

        hasData: function(data) {
            return data && data.categories && data.categories.length > 0;
        },

        getOption: function(data) {
            var options = ContentBarChart.__super__.getOption.call(this, data),
                namePrefix = this.options.namePrefix || '';
            $.extend(options, {tooltip: {
                formatter: function() {
                    return this.x + '<br>' + namePrefix + ': ' +this.y;
                }
            }});
            return options;
        }
    });

    Stats.Views.ContentView = Stats.View.extend({
        default: $.extend({}, Stats.View.prototype.default, {
            tableId: 'data-table',
            chartId: 'chart',
            urlPrefix: '/s/c/v'
        }),

        init: function() {
            this.urlPrefix = this.options.urlPrefix;
            this.title = this.options.title;
            this.$title = this.$el.find('#title');
            this.type = this.options.type;
            this._mockedData = this.options.mockedData;

            this.daysActionSwitcher = new Stats.DaysButtonSwitcher({
                parent: '.l-search'
            });
            this.daysActionSwitcher.on('actionClick', this.disableActions, this);
            this.daysActionSwitcher.on('actionClick', this.loadData, this);

            this.table = new Stats.Table({id: this.options.tableId});
            this.chart = new ContentBarChart({id: this.options.chartId, namePrefix: this.options.namePrefix});

            this.disableActions().loadData();

        },

        getUrl: function() {
            return appName + '../resource/devData/overview_video.json';
            return appName + this.urlPrefix + '?d=' + this.daysActionSwitcher.getValue() + '&t=' + this.type;
        },

        _convertV: function (data) {
            if(data){
                var obj = {},arr=[];
                $.each(data,function (k, v) {
                    obj.item = v['common_vid'];
                    obj.userCounts = v['pvcnt'];
                    obj.percent = null;
                    arr.push(obj);
                    obj = {};
                });
                return arr;
            }
        },

        loadData: function() {
            this.onBeforeLoadData();
            var cb = $.proxy(this.onLoadDataSuccess, this), self = this;
            Stats.ajax.getJSON(this.getUrl(), cb).fail(function(){ self.onLoadDataSuccess([]) });
        },

        onBeforeLoadData: function() {
            this.setTitle();
            this.chart.trigger('loading');
            this.table.trigger('loading');
        },

        onLoadDataSuccess: function(data) {
            data = this._convertV(data);
            this.chart.draw(this.type == 0 ? barrageChartDataParser.parse(data) : videoChartDataParser.parse(data));
            this.table.load(data);
            this.enableActions();
        },

        setTitle: function() {
            this.$title.text(this.title + ' - ' + this.daysActionSwitcher.$current.text());
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


}(jQuery, Stats, APPNAME));
