var Stats = (function () {

    /**
     *  Copy all of properties from others object to obj
     */
    var _extend = function (obj) {
        var type = typeof obj;
        if (type === 'function' || type === 'object' && !!obj) {
            var source;
            for (var index = 1; index < arguments.length; index++) {
                source = arguments[index];
                for (var k in source) {
                    if (hasOwnProperty.call(source, k)) {
                        obj[k] = source[k];
                    }
                }
            }
        }
        return obj;
    };

    /**
     * An function implementation oop inheritance
     */
    var extend = function (protoProps) {
        var parent = this;
        var child;
        if (protoProps && hasOwnProperty.call(protoProps, 'constructor')) {
            child = protoProps.constructor;
        } else {
            child = function () {
                return parent.apply(this, arguments);
            };
        }

        _extend(child, parent);

        var Surrogate = function () {
        };
        Surrogate.prototype = parent.prototype;
        child.prototype = new Surrogate;
        if (protoProps) {
            _extend(child.prototype, protoProps);
        }
        child.prototype.constructor = child;
        child.__super__ = parent.prototype;
        return child;
    };

    /**
     * Observer pattern implementation with event.
     *
     */
    var event = {

        on: function (name, callback, ctx) {
            this.eventMap || (this.eventMap = {});
            var cbCtx = {cb: callback, ctx: ctx || this},
                ls = this.eventMap[name] || (this.eventMap[name] = []);
            ls.push(cbCtx);
            return this;
        },

        trigger: function (name) {
            if (!this.eventMap) {
                return this;
            }
            var ls = this.eventMap[name];
            if (ls && ls.length > 0) {
                var args = Array.prototype.slice.call(arguments, 1),
                    cbCtx;
                for (var i = 0; i < ls.length; i++) {
                    cbCtx = ls[i];
                    eventCallback(cbCtx.cb, cbCtx.ctx, args);
                }
            }
            return this;
        },

        off: function (name, callback, ctx) {
            if (!name && !callback && !ctx) {
                this.eventMap = void 0;
                return this;
            }

            var names, i, j, handlers, handler, retain;
            names = name ? [name] : this._keys(this.eventMap);
            for (i = 0; i < names.length; i++) {
                name = names[i];
                if (handlers = this.eventMap[name]) {
                    this.eventMap[name] = retain = [];
                    if (callback || ctx) {
                        for (j = 0; j < handlers.length; j++) {
                            handler = handlers[j];
                            if ((callback && callback !== handler.cb) || (ctx && ctx !== handler.ctx)) {
                                retain.push(handler);
                            }
                        }
                    }
                    if (!retain.length) delete this.eventMap[name];
                }
            }
            return this;
        },

        _keys: function (obj) {
            var k = [];
            for (var key in obj) {
                k.push(key);
            }
            return k;
        }
    };

    var eventCallback = function (callback, ctx, args) {
        callback.apply(ctx, args);
    };

    /**
     * Defines an super class
     *
     */
    function Class(options) {
        this.options = {};
        _extend(this.options, this.default, options);
        this.initialize.apply(this, arguments);
    }

    _extend(Class.prototype, event, {
        initialize: function () {
        }
    });

    Class.extend = extend;
    
    var Route = Class.extend({
        event:function(str,callback){
            var events = str.split(' ');
            for (var i in events) window.addEventListener(events[i],callback,false);
        },
        initialize: function() {
            this.event('load hashchange',this.refresh.bind(this));
            return this;
        },
        refresh: function() {
            this.currentUrl = location.hash.slice(1) || '/';
            this.trigger('routeChange', this.currentUrl);
        }
    })

    var ActionSwitcher = Class.extend({
        default: {
            'parent': 'body',
            'actions': {
                //'today': {sel: '#btn-today', v: 0, 'default': true{sel: '#btn-today', v: 0, 'default': t},
                //'yesterday': {sel: '#btn-yesterday', v: -1},
                //'last7Days': {sel: '#btn-last7days', v: -7},
                //'last30Days': {sel: '#btn-last30days', v: -30}
            },
            activeCls: 'active'
        },

        initialize: function () {
            this.actions = {};
            this.$parent = $(this.options.parent);
            this.$current = void 0;
            var defaultAction = this._getDefaultAction();
            this.value = defaultAction.value;
            this.activeCls = this.options.activeCls;
            this._bindEvent();
            this.on('enableActions', this.enable);
            this.on('disableActions', this.disableOthers);
        },

        _getDefaultAction: function () {
            var o;
            for (var k in this.options.actions) {
                o = this.options.actions[k];
                if (o.default) {
                    return {action: k, value: o.v};
                }
            }
        },

        _bindEvent: function () {
            $.each(this.options.actions, $.proxy(this._doBindClick, this));
        },

        _doBindClick: function (k, v) {
            var $el = this.$parent.find(v.sel);
            if ($el.length > 0) {
                this.actions[k] = {el: $el};
                if (v.default) {
                    this.$current = $el;
                }
                $el.click($.proxy(this.doClick, this));
            }
        },

        _getActionEls: function ($exceptEl) {
            return $.map(this.actions, function (v) {
                if (!v.el.is($exceptEl)) {
                    return v.el;
                }
            });
        },

        doClick: function (e) {
            var $el = $(e.target),
                self = this;
            if ($el.is(this.$current)) {
                return;
            }

            $.each(this._getActionEls($el), function () {
                $(this).removeClass(self.activeCls);
            });
            $el.addClass(self.activeCls);
            this.$current = $el;
            for (var k in this.options.actions) {
                if (this.actions[k] && $el.is(this.actions[k].el)) this.value = this.options.actions[k].v;
            }
            //this.disableOthers($el);
            this.trigger('actionClick', this.value, $el, this.$parent);
        },

        disableOthers: function ($el) {
            var self = this,
                $el = $el || this.$current;
            $.each(this._getActionEls($el), function () {
                $(this).removeClass(self.activeCls).attr('disabled', 'disabled');
            });
            $el.addClass(self.activeCls);
        },

        enable: function () {
            $.each(this._getActionEls(), function () {
                $(this).removeAttr('disabled');
            });
        },

        getValue: function () {
            return this.value;
        }
    });

    var DaysActionSwitcher = ActionSwitcher.extend({
        default: $.extend(ActionSwitcher.prototype.default, {
            'actions': {
                'today': {sel: '#btn-today', v: 0, 'default': true},
                'yesterday': {sel: '#btn-yesterday', v: -1},
                'last7Days': {sel: '#btn-last7days', v: -7},
                'last30Days': {sel: '#btn-last30days', v: -30}
            }
        })
    });

    var RadioActionSwitcher = ActionSwitcher.extend({
        default: {
            actions: {
                one: {sel: 'input[name="type"][value=1]', v: 1, default: true},
                two: {sel: 'input[name="type"][value=2]', v: 2},
                three: {sel: 'input[name="type"][value=3]', v: 3},
                four: {sel: 'input[name="type"][value=4]', v: 4}
            },
            activeCls: ''
        }
    });

    var CheckBoxActionSwitcher = Class.extend({
        default: {
            parent: 'body',
            checkAll: ':checkbox[value="_all"]'
        },

        initialize: function () {
            this.values = [];
            this.$parent = $(this.options.parent);
            this.$checkAll = this.$parent.find(this.options.checkAll);
            this.$childs = this.$parent.find(":checkbox").not(this.$checkAll);
            if (this.enableCheckAll()) {
                this.doCheckAll(true, false);
            } else {
                var self = this;
                this.$childs.filter(":checked").each(function (i, e) {
                    if (self.values.indexOf(e.value) == -1) {
                        self.values.push(e.value);
                    }
                });
            }
            this.$parent.on('click', ':checkbox', $.proxy(this.doClick, this));
            this.on('enable', this.enable);
            this.on('disable', this.disable);
        },

        doClick: function (e) {
            var $el = $(e.target), isChecked = $el.is(":checked"), v = $el.val();
            if ($el.is(this.$checkAll) && this.doCheckAll(isChecked)) {
                return;
            }

            if ($el.is(":checked") && this.values.indexOf(v) == -1) {
                this.values.push(v);
                this._triggerChange(this.values);
            } else {
                var index = this.values.indexOf(v);
                if (index > -1) {
                    this.values.splice(index, 1);
                    this._triggerChange(this.values);
                }
            }
        },

        enableCheckAll: function () {
            return this.$checkAll.length > 0;
        },

        doCheckAll: function (checked, triggered) {
            if (this.enableCheckAll()) {
                triggered || (triggered = true);
                this.values.splice(0);
                if (checked) {
                    this.values = $.map(this.$childs, function (e) {
                        return e.value;
                    });
                }
                this.$childs.prop('checked', checked);
                if (triggered) this._triggerChange(this.values);
                return true;
            }
        },

        getValues: function () {
            if (this.enableCheckAll()) this.deleteCheckAllValue();
            return this.values;
        },

        deleteCheckAllValue: function () {
            var index = this.values.indexOf(this.$checkAll.val());
            if (index != -1) this.values.splice(index, 1);
        },

        _triggerChange: function (values) {
            if (this.enableCheckAll()) {
                this.deleteCheckAllValue();
                var checkAll = values.length == this.$childs.length;
                this.$checkAll.prop('checked', checkAll);
            }
            this.trigger('change', values);
        },

        enable: function () {
            this.$parent.find(':checkbox').prop('disabled', false);
        },

        disable: function () {
            this.$parent.find(':checkbox').prop('disabled', true);
        }
    });


    var Table = Class.extend({
        initialize: function () {
            this.$table = $("#" + this.options.id);
            this.resultHandler = this.options.resultHandler || this._resultHandler;
            this.$table.bootstrapTable();
            this.on('loading', this.showLoading);
            this.on('hideLoading', this.hideLoading);
        },

        showLoading: function () {
            this.$table.bootstrapTable('load', []);
            this.$table.bootstrapTable('showLoading');
        },

        hideLoading: function () {
            this.$table.bootstrapTable('hideLoading');
        },

        load: function (data) {
            var d = this.resultHandler(data);
            this.$table.bootstrapTable('load', d);
            this.hideLoading();
        },

        // [{}....]为每个对象添加id属性
        _resultHandler: function (res) {
            if (res && res.length > 0) {
                $.each(res, function (i, v) {
                    v._id = i + 1;
                });
                return res;
            }
            return [];
        }
    });

    var HoverTable = Table.extend({

        bindHoverEvent: function () {
            var self = this;
            this.$table.on('mouseover', "tr[data-index]", function () {
                    self.trigger('rowOver', $(this).data().index, true);
                })
                .on('mouseout', "tr[data-index]", function () {
                    self.trigger('rowOut', $(this).data().index, false);
                });
            return this;
        },

        unBindHoverEvent: function () {
            this.off('rowOver').off('rowOut');
            this.$table.off('mouseenter');
            this.$table.off('mouseleave');
            return this;
        }
    });

    var Chart = Class.extend({

        default: {
            loadingText: '正在努力地加载数据中，请稍候……',
            noDataText: '没有数据可以显示'
        },

        initialize: function (options) {
            this._id = options.id;
            this.$el = $("#" + this._id);
            this._chart = null;
            this._onLoad = this.options.onLoad;
            this.on('loading', this.showLoading);
            this.on('destroy', this.destroy);
        },

        hasData: function (data) {
            return data && (($.isArray(data) && data.length > 0) || $.isPlainObject(data));
        },

        draw: function (data) {
            if (!this.hasData.apply(this, arguments)) {
                this.showNoData();
                return;
            }
            var options = this.getOption.apply(this, arguments),
                self = this;
            // credits:默认情况下highchart右下脚会显示版权信息
            options = $.extend({}, {credits: {enabled: false}}, options);
            if (this._chart) {
                this._chart.destroy();
            }
            //new Highchart.Chart相当于onload事件；
            this._chart = new Highcharts.Chart(options, function (chart) {
                if (self._onLoad) {
                    self._onLoad(chart);
                }
            });
            this.show();
        },

        showLoading: function () {
            this.showText(this.options.loadingText);
        },

        showNoData: function () {
            this.showText(this.options.noDataText);
        },

        showText: function (text) {
            this.$el.find('.highcharts-container').hide();
            var $text = this.$el.find('.text');
            if ($text.length > 0) {
                $text.text(text).show();
            } else {
                this.$el.append('<span class="text">' + text + '</span>');
            }
        },

        show: function () {
            this.$el.find('.text').hide();
            this.$el.find('.highcharts-container:hidden').show();
        },
        //this._chart.destroy为highchart自带的方法；
        destroy: function () {
            if (this._chart) {
                this._chart.destroy();
                this._chart = null;
            }
        },

        getOption: function (data) {
        }


    });

    var PieChart = Chart.extend({

        initialize: function (options) {
            Chart.prototype.initialize.apply(this, arguments);
            this.onAnimationDone = this.options.onAnimationDone || function () {
                };
        },

        draw: function (data) {
            Chart.prototype.draw.apply(this, arguments);
            this.$el.find('.highcharts-legend text').each($.proxy(this.onLegendHover, this));
        },

        onLegendHover: function (index, element) {
            var that = this;
            $(element).hover(function () {
                if (that._chart.series && that._chart.series.length > 0) {
                    var d = that._chart.series[0].data[index];
                    if (d) that._chart.tooltip.refresh(d);
                }
            }, function () {
                that._chart.tooltip.hide();
            });
        },

        slice: function (index, sliced) {
            if (this._chart) {
                this._chart.series[0].data[index].slice(sliced);
            }
            return this;
        },

        hover: function (index, show) {
            if (this._chart) {
                var d = this._chart.series[0].data[index];
                if (show) {
                    d.setState('hover');
                    this._chart.tooltip.refresh(d);
                } else {
                    d.setState();
                    this._chart.tooltip.hide();
                }
            }
            return this;
        },

        getOption: function (data) {
            var self = this;
            return {
                chart: {
                    plotBackgroundColor: null,
                    plotBorderWidth: null,
                    plotShadow: false,
                    type: 'pie',
                    renderTo: this._id
                },
                title: {
                    text: ''
                },
                tooltip: {
                    pointFormat: ''
                },
                legend: {
                    align: 'center',
                    layout: 'vertical',
                    verticalAlign: 'middle'
                },
                plotOptions: {
                    pie: {
                        allowPointSelect: true,
                        cursor: 'pointer',
                        dataLabels: {
                            enabled: false
                        },
                        showInLegend: true,
                        point: {
                            events: {
                                legendItemClick: function (e) {
                                    e.preventDefault();
                                }
                            }
                        },
                        borderWidth: 0
                    },

                    series: {
                        animation: {
                            complete: function () {
                                self.onAnimationDone();
                            }
                        }
                    }
                },
                series: [{
                    name: '',
                    colorByPoint: true,
                    data: data
                }]
            };
        }
    });

    var BarChart = Chart.extend({

        hasData: function (data) {
            return data && data.categories && data.categories.length > 0;
        },

        getOption: function (data) {
            return {
                chart: {
                    type: 'bar',
                    renderTo: this._id
                },
                xAxis: {
                    categories: data.categories,
                    title: {
                        text: null
                    }
                },
                title: '',
                yAxis: {
                    min: 0,
                    title: {
                        text: ''
                    },
                    labels: {
                        overflow: 'justify',
                        format: '{value:,.0f}'
                    }
                },
                plotOptions: {
                    bar: {
                        showInLegend: false
                    },
                    series: {
                        pointWidth: 15
                    }
                },
                series: data.series
            }
        }
    });

    var View = Class.extend({
        default: {
            el: '#right-content',
            tmplId: ''
        },

        initialize: function () {
            this.$el = $(this.options.el);
            if (this.options.urlPrefix) {
                this.urlPrefix = this.options.urlPrefix;
            }
            if (this.options.tmplId) {
                this.$el.empty().hide().html(this._tmpl());
            }
            this._mockedData = this.options.mockedData;
            this.beforeInit();
            this.on('destroy', this._destroy);
            this.init.apply(this, arguments);
            this.beforeShow();
            this._show();
        },

        beforeInit: function () {
        },

        beforeShow: function () {
        },

        _show: function () {
            this.$el.show();
        },

        _tmpl: function () {
            return template(this.options.tmplId, this.options);
        },

        init: function () {
        },

        _destroy: function () {
            if (this.$el.children().length > 0) {
                this.$el.empty().off();
                this.off().destroy();
            }
        },

        destroy: function () {
        }
    });

    var Popover = Class.extend({

        default: {
            el: ''
        },

        initialize: function () {
            this.$el = $(this.options.el);
            this.$el.popover();
            this.on('destroy', this.destroy);
        },

        destroy: function () {
            this.$el.popover('destroy');
        }
    });

    var ajax = {

        _proxy: function (jqXHR) {
            this.jqXHRs || (this.jqXHRs = {});
            var v = Math.random(),
                self = this;
            this.jqXHRs[v] = jqXHR;
            jqXHR.always(function () {
                if (self.jqXHRs[v]) {
                    delete self.jqXHRs[v];
                }
            });
            return jqXHR;
        },

        getJSON: function () {
            return this._proxy($.getJSON.apply($, arguments));
        },

        abort: function () {
            var jqXHR;
            for (var k in this.jqXHRs) {
                jqXHR = this.jqXHRs[k];
                jqXHR.abort();
                delete this.jqXHRs[k];
            }
        }
    };

    var ResultParser = Class.extend({
        parse: function (data) {
            // try to determine the result is successful
            if (!data || ($.isPlainObject(data) && data.success == false )) return [];
            return this.doParse.apply(this, arguments);
        },

        doParse: function () {
        }
    });

    var HourResultParser = ResultParser.extend({

        doParse: function (data, day, day2) {
            var days = this._getDate(day, day2);
            this.fillData(days, data);
            return this.doParse2(days, data);
        },

        doParse2: function (days, data) {
        },

        fillData: function (startAndEndDays, data) {
            var d1 = startAndEndDays[0], d2 = startAndEndDays[1];
            var startData = data[d1], endData = data[d2];
            if (startData.length == 0 && endData.length == 0) {
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

            data[d1] = startData.length < 24 ? newStartData : startData;
            data[d2] = newEndData;
        },

        fillDataResultCreator: function (v) {
            return v;
        },

        _find: function (arr, v) {
            for (var i = 0; i < arr.length; i++) {
                if (arr[i].hour == v) {
                    return arr[i];
                }
            }
            return this.fillDataResultCreator(v);
        },

        _getDate: function (day, day2) {
            var now = new Date(),
                start = new Date(),
                end = now;

            if (day <= -1) {
                now.setTime(now.getTime() - this._getMillOfDay(1));
            }
            start.setTime(now.getTime() - this._getMillOfDay(Math.abs(day2)));
            return [
                this._format(start),
                this._format(end)
            ];
        },

        _getMillOfDay: function (days) {
            return days * 24 * 3600000;
        },

        _format: function (d) {
            var m = d.getMonth() + 1;
            m = m >= 10 ? m + '' : '0' + m;
            var day = d.getDate();
            day = day >= 10 ? day + '' : '0' + day;
            return d.getFullYear() + '' + m + '' + day;
        }
    });

    // Map code and province mapping
    var codeAndProvinceMap = {
        "cn-sh": '上海',
        "cn-zj": '浙江',
        "cn-fj": '福建',
        "cn-gd": '广东',
        "cn-yn": '云南',
        "cn-xz": '西藏',
        "cn-nx": '宁夏',
        "cn-sa": '陕西',
        "cn-ah": '安徽',
        "cn-hu": '湖北',
        "cn-cq": '重庆',
        "cn-hn": '湖南',
        "cn-bj": '北京',
        "cn-hb": '河北',
        "cn-sd": '山东',
        "cn-tj": '天津',
        "cn-ha": '海南',
        "cn-jl": '吉林',
        "cn-qh": '青海',
        "cn-xj": '新疆',
        "cn-nm": '内蒙古',
        "cn-hl": '黑龙江',
        "cn-sc": '四川',
        "cn-gz": '贵州',
        "cn-gx": '广西',
        "cn-ln": '辽宁',
        "cn-js": '江苏',
        "cn-gs": '甘肃',
        "cn-sx": '山西',
        "cn-he": '河南',
        "cn-jx": '江西',
        "cn-3681": '澳门',
        "tw-tw": '台湾',
        "cn-6666": '香港'

    };

    // Province and code mapping
    var provinceAndCodeMap = {};
    $.map(codeAndProvinceMap, function (v, k) {
        provinceAndCodeMap[v] = k
    });

    // Map code and world mapping
    var codeAndWorldNameMap = {
        'gl': '格陵兰',
        'sh': '黄岩岛',
        //'bu':'',
        'lk': '斯里兰卡',
        'as': '美属萨摩亚',
        'dk': '丹麦',
        'fo': '法罗群岛',
        'gu': '关岛',
        'mp': '北马里亚纳群岛',
        'um': '美国本土外小岛屿',
        'us': '美国',
        'vi': '美属维尔京群岛',
        'ca': '加拿大',
        'st': '圣多美和普林西比',
        'jp': '日本',
        'cv': '佛得角',
        'dm': '多米尼克',
        'sc': '塞舌尔',
        'nz': '新西兰',
        'ye': '也门',
        'jm': '牙买加',
        'ws': '萨摩亚',
        'om': '阿曼',
        'in': '印度',
        'vc': '圣文森特和格林纳丁斯',
        'bd': '孟加拉',
        'sb': '所罗门群岛',
        'lc': '圣卢西亚',
        'fr': '法国',
        'nr': '瑙鲁',
        'no': '挪威',
        'fm': '密克罗尼西亚',
        'kn': '圣基茨和尼维斯',
        'cn': '中国',
        'bh': '巴林',
        'to': '汤加',
        'fi': '芬兰',
        'id': '印度尼西亚',
        'mu': '毛里求斯',
        'se': '瑞典',
        'tt': '特立尼达和多巴哥',
        'br': '巴西',
        'bs': '巴哈马',
        'pw': '帕劳',
        'ec': '厄瓜多尔',
        'au': '澳大利亚',
        'tv': '图瓦卢',
        'mh': '马绍尔群岛',
        'cl': '智利',
        'ki': '基里巴斯',
        'ph': '菲律宾',
        'gd': '格林纳达',
        'ee': '爱沙尼亚',
        'ag': '安提瓜和巴布达',
        'es': '西班牙',
        'bb': '巴巴多斯',
        'it': '意大利',
        'mt': '马耳他',
        'mv': '马尔代夫',
        'pg': '巴布亚新几内亚',
        'vu': '瓦努阿图',
        'sg': '新加坡',
        'gb': '英国',
        'cy': '塞浦路斯',
        'gr': '希腊',
        'km': '科摩罗',
        'fj': '斐济',
        'ru': '俄罗斯',
        'va': '梵蒂冈',
        'sm': '圣马力诺',
        'am': '亚美尼亚',
        'az': '阿塞拜疆',
        'ls': '莱索托',
        'tj': '塔吉克斯坦',
        'ml': '马里',
        'dz': '阿尔及利亚',
        //'tw': '台湾',
        'uz': '乌兹别克斯坦',
        'tz': '坦桑尼亚',
        'ar': '阿根廷',
        'sa': '沙特阿拉伯',
        'nl': '荷兰',
        'ae': '阿联酋',
        'ch': '瑞士',
        'pt': '葡萄牙',
        'my': '马来西亚',
        'pa': '巴拿马',
        'tr': '土耳其',
        'ir': '伊朗',
        'ht': '海地',
        'do': '多米尼加',
        'gw': '几内亚比绍',
        'hr': '克罗地亚',
        'th': '泰国',
        'mx': '墨西哥',
        'kw': '科威特',
        'de': '德国',
        'gq': '赤道几内亚',
        'cnm': '塞浦路斯无人区',
        'nc': '北塞浦路斯',
        'ie': '爱尔兰',
        'kz': '哈萨克斯坦',
        'ge': '格鲁吉亚',
        'pl': '波兰',
        'lt': '立陶宛',
        'ug': '乌干达',
        'cd': '刚果(金)',
        'mk': '马其顿',
        'al': '阿尔巴尼亚',
        'ng': '尼日利亚',
        'cm': '喀麦隆',
        'bj': '贝宁',
        'tl': '东帝汶',
        'tm': '土库曼斯坦',
        'kh': '柬埔寨',
        'pe': '秘鲁',
        'mw': '马拉维',
        'mn': '蒙古',
        'ao': '安哥拉',
        'mz': '莫桑比克',
        'za': '南非',
        'cr': '哥斯达黎加',
        'sv': '萨尔瓦多',
        'bz': '伯利兹',
        'co': '哥伦比亚',
        'kp': '朝鲜',
        'kr': '韩国',
        'gy': '圭亚那',
        'hn': '洪都拉斯',
        'ga': '加蓬',
        'ni': '尼加拉瓜',
        'et': '埃塞俄比亚',
        'sd': '苏丹',
        'so': '索马里',
        'gh': '加纳',
        'ci': '科特迪瓦',
        'si': '斯洛文尼亚',
        'gt': '危地马拉',
        'ba': '波斯尼亚和黑塞哥维那',
        'jo': '约旦',
        'sy': '叙利亚',
        //'we': 'West Bank',
        'il': '以色列',
        'eg': '埃及',
        'zm': '赞比亚',
        'mc': '摩纳哥',
        'uy': '乌拉圭',
        'rw': '卢旺达',
        'bo': '玻利维亚',
        'cg': '刚果(布)',
        'eh': '西撒哈拉',
        'rs': '塞尔维亚',
        'me': '黑山',
        'tg': '多哥',
        'mm': '缅甸',
        'la': '老挝',
        'af': '阿富汗',
        'jk': '锡亚琴冰川',
        'pk': '巴基斯坦',
        'bg': '保加利亚',
        'ua': '乌克兰',
        'ro': '罗马尼亚',
        'qa': '卡塔尔',
        'li': '列支敦士登',
        'at': '奥地利',
        'sk': '斯洛伐克',
        'sz': '斯威士兰',
        'hu': '匈牙利',
        'ly': '利比亚',
        'ne': '尼日尔',
        'lu': '卢森堡',
        'ad': '安道尔',
        'lr': '利比里亚',
        'sl': '塞拉利昂',
        'bn': '文莱',
        'mr': '毛里塔尼亚',
        'be': '比利时',
        'iq': '伊拉克',
        'gm': '冈比亚',
        'ma': '摩洛哥',
        'td': '乍得',
        'kv': '科索沃',
        'lb': '黎巴嫩',
        'sx': '索马里兰',
        'dj': '吉布提',
        'er': '厄立特里亚',
        'bi': '布隆迪',
        'sn': '塞内加尔',
        'gn': '几内亚',
        'zw': '津巴布韦',
        'py': '巴拉圭',
        'by': '白俄罗斯',
        'lv': '拉脱维亚',
        'bt': '不丹',
        'na': '纳米比亚',
        'bf': '布基纳法索',
        'ss': '南苏丹',
        'cf': '中非',
        'md': '摩尔多瓦',
        'gz': '加沙地带',
        'ke': '肯尼亚',
        'bw': '博茨瓦纳',
        'cz': '捷克',
        'pr': '波多黎各',
        'tn': '突尼斯',
        'cu': '古巴',
        'vn': '越南',
        'mg': '马达加斯加',
        've': '委内瑞拉',
        'is': '冰岛',
        'np': '尼泊尔',
        'sr': '苏里南',
        'kg': '吉尔吉斯斯坦'
    };

    // world name and code mapping
    var worldNameAndCodeMap = {};
    $.map(codeAndWorldNameMap, function (v, k) {
        worldNameAndCodeMap[v] = k
    });


    var chartFactorMap = {
        '1': 'pv', '2': 'uv', '3': 'ip', '4': 'newUser', 'all': 'all'
    };


    return {
        Class: Class,
        Route: Route,
        event: event,
        ajax: ajax,
        ResultParser: ResultParser,
        HourResultParser: HourResultParser,
        Chart: Chart,
        PieChart: PieChart,
        BarChart: BarChart,
        Table: Table,
        HoverTable: HoverTable,
        Popover: Popover,
        View: View,
        Views: {}, // all of customized view should be attach to
        DaysButtonSwitcher: DaysActionSwitcher,
        RadioActionSwitcher: RadioActionSwitcher,
        CheckBoxActionSwitcher: CheckBoxActionSwitcher,
        isMockEnv: false,
        mockData: {},
        chinaCodeAndProvinceMap: codeAndProvinceMap,
        chinaProvinceAndCodeMap: provinceAndCodeMap,
        worldCodeAndNameMap: codeAndWorldNameMap,
        worldNameAndCodeMap: worldNameAndCodeMap,
        chartFactorMap: chartFactorMap
    };
}());