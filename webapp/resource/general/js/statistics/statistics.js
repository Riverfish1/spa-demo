(function ($, Stats, Highcharts) {

    Highcharts.setOptions({
        global: {
            useUTC: false,
            timezoneOffset: -8
        },
        lang: {
            resetZoom: '取消缩放',
            resetZoomTitle: ''
        }
    });

    // Disable get cache
    $.ajaxPrefilter(function (options) {
        if (options.type == 'get') {
            options.cache = false;
        }
    });

    //Stats.isMockEnv = true;

    function getData(data) {
        if (Stats.isMockEnv === true) {
            return data;
        }
        return void 0;
    }

    // mock data for content analysis
    function contentVideoData() {
        var data = [{
            count: 6000,
            name: '谍影重重1',
            percent: '80%'
        }, {
            count: 5000,
            name: '谍影重重1',
            percent: '80%'
        }, {
            count: 4000,
            name: '谍影重重1',
            percent: '80%'
        }, {
            count: 3000,
            name: '谍影重重1',
            percent: '80%'
        }, {
            count: 2000,
            name: '谍影重重1',
            percent: '80%'
        }, {
            count: 1000,
            name: '谍影重重1',
            percent: '80%'
        }, {
            count: 900,
            name: '谍影重重1',
            percent: '80%'
        }, {
            count: 800,
            name: '谍影重重1',
            percent: '80%'
        }, {
            count: 700,
            name: '谍影重重1',
            percent: '80%'
        }, {
            count: 600,
            name: '谍影重重1',
            percent: '80%'
        }];
        var categories = [],
          d = [];
        $.each(data, function (i, v) {
            categories.push(v.name);
            d.push(v.count);
        });

        return {
            table: data,
            chart: {
                categories: categories,
                series: [{
                    data: d
                }]
            }
        };
    }

    function contentBarrageData() {
        var data = [{
            count: 6000,
            video: '谍影重重1',
            sourceCount: '1000',
            percent: '80%'
        }, {
            count: 5000,
            video: '谍影重重1',
            sourceCount: '1000',
            percent: '80%'
        }, {
            count: 4000,
            video: '谍影重重1',
            sourceCount: '1000',
            percent: '80%'
        }, {
            count: 3000,
            video: '谍影重重1',
            sourceCount: '1000',
            percent: '80%'
        }, {
            count: 2000,
            video: '谍影重重1',
            sourceCount: '1000',
            percent: '80%'
        }, {
            count: 1000,
            video: '谍影重重1',
            sourceCount: '1000',
            percent: '80%'
        }, {
            count: 900,
            video: '谍影重重1',
            sourceCount: '1000',
            percent: '80%'
        }, {
            count: 800,
            video: '谍影重重1',
            sourceCount: '1000',
            percent: '80%'
        }, {
            count: 700,
            video: '谍影重重1',
            sourceCount: '1000',
            percent: '80%'
        }, {
            count: 600,
            video: '谍影重重1',
            sourceCount: '1000',
            percent: '80%'
        }];
        var categories = [],
          d = [];
        $.each(data, function (i, v) {
            categories.push(v.video);
            d.push(v.count);
        });

        return {
            table: data,
            chart: {
                categories: categories,
                series: [{
                    data: d
                }]
            }
        };
    }

    function userBarrage() {
        return [{
            barrageNumber: 1316503,
            userId: "8f8698e045c24614ac95731f9ebb9e39",
            videoNumber: 2212
        }, {
            barrageNumber: 597693,
            userId: "112ec7966c4743e3ba6790bb1c57724f",
            videoNumber: 759
        }, {
            barrageNumber: 278557,
            userId: "dc31c917eba24fab9f4cf01396070e8c",
            videoNumber: 409
        }, {
            barrageNumber: 241448,
            userId: "49762e9515c444dba37c60a70ad29f6f",
            videoNumber: 307
        }, {
            barrageNumber: 225405,
            userId: "bd8851878c8b462893c85db05d7c19ba",
            videoNumber: 205
        }, {
            barrageNumber: 203742,
            userId: "9bc914c289c84deab8cc4dd87a300953",
            videoNumber: 90
        }, {
            barrageNumber: 182129,
            userId: "2f7104ff09bb4162810fc90b791e1416",
            videoNumber: 306
        }, {
            barrageNumber: 166302,
            userId: "96ac11f957d04d219605cf36858d05b3",
            videoNumber: 74
        }, {
            barrageNumber: 152154,
            userId: "bd4d9a56c2a1430e88f5ce8de7a722ff",
            videoNumber: 101
        }, {
            barrageNumber: 149180,
            userId: "7ee51e506f4840b5a6c3bce2d562b2af",
            videoNumber: 224
        }];
    }

    var userFoundationDates = {
        getDate: function (day, day2) {
            var now = new Date(),
              start = new Date(),
              end = now;

            if (day <= -1) {
                now.setDate(now.getDate() - 1);
            }
            start.setDate(now.getDate() - Math.abs(day2));
            return [
                this._format(start),
                this._format(end)
            ];
        },

        _format: function (d) {
            var m = d.getMonth() + 1;
            m = m >= 10 ? m + '' : '0' + m;
            var day = d.getDate();
            day = day >= 10 ? day + '' : '0' + day;
            return d.getFullYear() + '' + m + '' + day;
        }
    };


    function replaceKeyWith(o, keys) {
        var clone = {},
          index = 0;
        $.each(o, function (k, v) {
            clone[keys[index]] = v;
            index++;
        });
        return clone;
    }

    function userFoundation() {
        var todayAndBefore1DayDate = userFoundationDates.getDate(0, -1);
        var todayAndBefore7DayDate = userFoundationDates.getDate(0, -7);
        var d = {},
          mockedChartData = Stats.mockData.userFoundationMockedData.chart;
        d['0-3--1'] = replaceKeyWith(mockedChartData.todayAndBefore1Day, todayAndBefore1DayDate);
        d['0-3--7'] = replaceKeyWith(mockedChartData.todayAndBefore7Days, todayAndBefore7DayDate);
        d['-7-3'] = mockedChartData.before7Days;
        d['-30-3'] = mockedChartData.before30Days;

        d['0-4--1'] = replaceKeyWith(mockedChartData.todayAndBefore1Day, todayAndBefore1DayDate);
        d['0-4--7'] = replaceKeyWith(mockedChartData.todayAndBefore7Days, todayAndBefore7DayDate);
        d['-7-4'] = mockedChartData.before7Days;
        d['-30-4'] = mockedChartData.before30Days;
        d['table'] = Stats.mockData.userFoundationMockedData.table;
        return d;
    }

    function userSample() {
        var chartData = [{
            "time": "0857",
            "pv": 100,
            "uv": 100
        }, {
            "time": "0859",
            "pv": 200,
            "uv": 200
        }, {
            "time": "0901",
            "pv": 300,
            "uv": 300
        }, {
            "time": "0903",
            "pv": 400,
            "uv": 400
        }, {
            "time": "0905",
            "pv": 500,
            "uv": 500
        }, {
            "time": "0907",
            "pv": 600,
            "uv": 600
        }, {
            "time": "0909",
            "pv": 700,
            "uv": 700
        }, {
            "time": "0911",
            "pv": 100,
            "uv": 100
        }, {
            "time": "0913",
            "pv": 100,
            "uv": 100
        }, {
            "time": "0915",
            "pv": 100,
            "uv": 100
        }, {
            "time": "0917",
            "pv": 100,
            "uv": 100
        }, {
            "time": "0919",
            "pv": 100,
            "uv": 100
        }, {
            "time": "0921",
            "pv": 100,
            "uv": 100
        }];

        return {
            chart: chartData,
            table: []
        }
    }

    function operatorMockedData() {
        return [{
            "item": "联通",
            "userCounts": 24044,
            "userPercentage": "43.09%"
        }, {
            "item": "电信",
            "userCounts": 10151,
            "userPercentage": "18.19%"
        }, {
            "item": "宽带通",
            "userCounts": 5372,
            "userPercentage": "9.63%"
        }, {
            "item": "歌华",
            "userCounts": 4644,
            "userPercentage": "8.32%"
        }, {
            "item": "教育网",
            "userCounts": 1735,
            "userPercentage": "3.11%"
        }, {
            "item": "教育网",
            "userCounts": 1490,
            "userPercentage": "2.67%"
        }, {
            "item": "歌华",
            "userCounts": 1294,
            "userPercentage": "2.32%"
        }, {
            "item": "教育网",
            "userCounts": 1149,
            "userPercentage": "2.06%"
        }, {
            "item": "教育网",
            "userCounts": 1134,
            "userPercentage": "2.03%"
        }, {
            "item": "教育网",
            "userCounts": 818,
            "userPercentage": "1.47%"
        }];
    }


    Stats.App = Stats.Class.extend({

        default: {
            nav: '.nav-sidebar',
            route: '/overview',
            routes: {
                '/': {
                    action: function() {
                        return this.list();
                    }
                },
                '/list': {
                    action: function() {
                        return this.list();
                    }
                },
                '/overview': {
                    action: function () {
                        return this.overview();
                    }
                },
                '/business': {
                    action: function () {
                        return this.business();
                    }
                },
                '/network_fluency': {
                    action: function() {
                        return this.fluency();
                    }
                },
                '/terminal': {
                    action: function() {
                        return this.terminal();
                    }
                },
                '/accessStats': {
                    action: function () {
                        return this.accessStats();
                    }
                },
                '/client_query': {
                    action: function () {
                        return this.clientQuery();
                    }
                },


                '/clientFlash': {
                    action: function () {
                        return this.clientFlash();
                    }
                },
                '/t-a': {
                    action: function() {
                        return this.terminal('终端访问量', '/s/terminal/ov', {}, true);
                    }
                },
                '/pc-b': {
                    action: function() {
                        return this.terminal('浏览器', '/s/terminal/pc/browser');
                    }
                },
                '/pc-o': {
                    action: function() {
                        return this.terminal('操作系统', '/s/terminal/pc/os');
                    }
                },
                '/a-t': {
                    action: function() {
                        return this.terminal('机型', '/s/terminal/android/device');
                    }
                },
                '/a-p': {
                    action: function() {
                        return this.terminal('播放器', '/s/terminal/android/player');
                    }
                },
                '/a-r': {
                    action: function() {
                        return this.terminal('分辨率', '/s/terminal/android/resolution');
                    }
                },
                '/a-o': {
                    action: function() {
                        return this.terminal('操作系统', '/s/terminal/android/os');
                    }
                },
                '/ios-t': {
                    action: function() {
                        return this.terminal('机型', '/s/terminal/ios/device');
                    }
                },
                '/ios-p': {
                    action: function() {
                        return this.terminal('播放器', '/s/terminal/ios/player');
                    }
                },
                '/ios-r': {
                    action: function() {
                        return this.terminal('分辨率', '/s/terminal/ios/resolution');
                    }
                },
                '/ios-o': {
                    action: function() {
                        return this.terminal('操作系统', '/s/terminal/ios/os');
                    }
                },
                '/h5-r': {
                    action: function() {
                        return this.terminal('分辨率', '/s/terminal/h5', {
                            factor: 'resolution'
                        });
                    }
                },
                '/h5-o': {
                    action: function() {
                        return this.terminal('操作系统', '/s/terminal/h5', {
                            factor: 'os'
                        });
                    }
                },
                '/h5-b': {
                    action: function() {
                        return this.terminal('浏览器', '/s/terminal/h5', {
                            factor: 'browser'
                        });
                    }
                },
                '/t-inland': {
                    action: function() {
                        return this.inland('/s/territory/stats');
                    }
                },
                '/t-national': {
                    action: function() {
                        return this.national('/s/territory/stats');
                    }
                },
                '/c-v': {
                    action: function() {
                        return this.content('视频访问量top10', 'content-video-tpl', '访问量', 1);
                    }
                },
                '/c-b': {
                    action: function() {
                        return this.content('视频弹幕发送量top10', 'content-barrage-tpl', '发送量', 0);
                    }
                },

                '/u-s': {
                    action: function() {
                        return this.userSample('/s/user/fs', '/s/user/f', userSample());
                    }
                },

                '/u-a': {
                    action: function() {
                        return this.userAccess();
                    }
                },

                '/u-b': {
                    action: function() {
                        return this.userBarrage('/s/user/b', '用户发送弹幕top10', 'user-barrage-tpl', '弹幕数', userBarrage());
                    }
                },

                '/u-f': {
                    action: function() {
                        return this.userFoundation('/s/user/fs');
                    }
                },
                '/n-o': {
                    action: function() {
                        return this.operator();
                    }
                },

                '/n-b': {
                    action: function() {
                        return this.bandWidth();
                    }
                },

                '/n-c': {
                    action: function() {
                        return this.cdn();
                    }
                },

                '/n-f': {
                    action: function() {
                        return this.fluency();
                    }
                }
            }
        },

        initialize: function () {
            this.initMenu();
            this._view = void 0;
            this.route = new Stats.Route();
            this.route.on('routeChange', $.proxy(this.changeTo, this));
        },

        initMenu: function () {
            $(this.options.nav).menu();
        },

        changeTo: function (route) {
            var routeConfig = this.options.routes[route];
            this.ensureView();
            setSubNav(route == '/' ? 'list' : route.slice(1));
            this._view = (routeConfig.action).apply(this);
        },

        ensureView: function () {
            Stats.ajax.abort();
            this._view && this._view.trigger('destroy');
        },

        list: function () {
            return new Stats.Views.ListView();
        },
        overview: function () {
            return new Stats.Views.OverviewView();
        },
        business: function () {
            return new Stats.Views.businessView();
        },

        clientQuery: function () {
            return new Stats.Views.ClientQueryView();
        },
        clientFlash: function () {
            return new Stats.Views.ClientFlashView();
        },
        accessStats: function () {
            return new Stats.Views.accessStatsView();
        },

        terminal: function (title, urlPrefix, additionalParams, isAccessOverview) {
            // return new Stats.Views.TerminalView({
            //     title: title,
            //     urlPrefix: urlPrefix,
            //     additionalParams: additionalParams,
            //     isAccessOverview: isAccessOverview === undefined ? false : isAccessOverview
            // });

            return new Stats.Views.TerminalView({
                android_param:{
                    deviceParam:{
                        title: '机型',
                        urlPrefix: '/s/terminal/android/device',
                        additionalParams: {item:'deviceinfo_m'},
                        isAccessOverview:  false,
                        el:'#tab1>.device',
                   url:'../resource/devData/terminal_device.json'
                    },
                    osParam:{
                        title: '操作系统',
                        urlPrefix: '/s/terminal/android/os',
                        additionalParams: {item:'deviceinfo_os_v'},
                        isAccessOverview:  false,
                        el:'#tab1>.os',
                   url:'../resource/devData/terminal_operator.json'
                    },
                    resolutionParam:{
                        title: '分辨率',
                        urlPrefix: '/s/terminal/android/resolution',
                        additionalParams: {item:'common_res_value'},
                        isAccessOverview:  false,
                        el:'#tab1>.resolution',
                   url:'../resource/devData/terminal_resolution.json'
                    }
                },
                ios_param:{
                    deviceParam:{
                        title: '机型',
                        urlPrefix: '/s/terminal/ios/device',
                        additionalParams: {item:'deviceinfo_m'},
                        isAccessOverview:  false,
                        el:'#tab2>.device',
                   url:'../resource/devData/terminal_device.json'
                    },
                    osParam:{
                        title: '操作系统',
                        urlPrefix: '/s/terminal/ios/os',
                        additionalParams: {item:'deviceinfo_os_v'},
                        isAccessOverview:  false,
                        el:'#tab2>.os',
                   url:'../resource/devData/terminal_operator.json'
                    },
                    resolutionParam:{
                        title: '分辨率',
                        urlPrefix: '/s/terminal/ios/resolution',
                        additionalParams: {item:'common_res_value'},
                        isAccessOverview:  false,
                        el:'#tab2>.resolution',
                   url:'../resource/devData/terminal_resolution.json'
                    }
                },
                flash_param:{
                    deviceParam:{
                        title: '浏览器',
                        urlPrefix: '/s/terminal/pc/browser',
                        additionalParams: {item:'browser_br'},
                        isAccessOverview:  false,
                        el:'#tab3>.device',
                   url:'../resource/devData/terminal_browser.json'
                    },
                    osParam:{
                        title: '操作系统',
                        urlPrefix: '/s/terminal/pc/os',
                        additionalParams: {item:'common_os_val'},
                        isAccessOverview:  false,
                        el:'#tab3>.os',
                   url:'../resource/devData/terminal_os.json'
                    }
//                resolutionParam:{
//                    title: '分辨率',
//                    urlPrefix: '/s/terminal/android/resolution',
//                    additionalParams: {item:'common_res_value'},
//                    isAccessOverview:  false,
//                    el:'#tab3>.resolution',
//                    url:'../resource/devData/terminal_resolution.json'
//                }
                },
                h5_param:{
                    deviceParam:{
                        title: '浏览器',
                        urlPrefix: '/s/terminal/h5',
                        additionalParams: { factor: 'browser',item:'browser_br'},
                        isAccessOverview:  false,
                        el:'#tab4>.device',
                   url:'../resource/devData/terminal_browser.json'
                    },
                    osParam:{
                        title: '操作系统',
                        urlPrefix: '/s/terminal/h5',
                        additionalParams: { factor: 'os', item:'common_os_val'},
                        isAccessOverview:  false,
                        el:'#tab4>.os',
                   url:'../resource/devData/terminal_os.json'
                    }
//                resolutionParam:{
//                    title: '分辨率',
//                    urlPrefix: '/s/terminal/android/resolution',
//                    additionalParams: {item:'common_res_value'},
//                    isAccessOverview:  false,
//                    el:'#tab1>.resolution',
//                    url:'../resource/devData/terminal_resolution.json'
//                }
                }
            });
        },

        inland: function (urlPrefix) {
            return new Stats.Views.InlandView({
                urlPrefix: urlPrefix
            });
        },
        // inland: function(urlPrefix) {
        //     return new Stats.Views.InlandView({
        //         urlPrefix: urlPrefix
        //     });
        // },

        // national: function(urlPrefix) {
        //     return new Stats.Views.NationalView({
        //         urlPrefix: urlPrefix
        //     });
        // },

        content: function (title, tmplId, namePrefix, type) {
            return new Stats.Views.ContentView({
                title: title,
                tmplId: tmplId,
                namePrefix: namePrefix,
                type: type
            });
        },

        userBarrage: function (urlPrefix, title, tmplId, namePrefix, mockedData) {
            return new Stats.Views.BarrageView({
                urlPrefix: urlPrefix,
                title: title,
                mockedData: getData(mockedData),
                tmplId: tmplId,
                namePrefix: namePrefix
            });
        },

        userAccess: function () {
            return new Stats.Views.UserAccessView();
        },

        userFoundation: function (tableDataUrl) {
            return new Stats.Views.FoundationView({
                tableDataUrl: tableDataUrl
            });
        },

        userSample: function () {
            return new Stats.Views.SampleView({
                mockedData: getData(userSample())
            });
        },

        operator: function () {
            return new Stats.Views.OperatorView();
        },

        bandWidth: function () {
            var o = {};
            o.series = [{
                data: [{
                    y: 5000,
                    domains: {
                        'a.com': 1000,
                        'b.com': 2000,
                        'c.com': 2000
                    }
                }, {
                    y: 5500,
                    domains: {
                        'a.com': 1000,
                        'b.com': 2000,
                        'c.com': 2500
                    }
                }, {
                    y: 6000,
                    domains: {
                        'a.com': 1000,
                        'b.com': 2000,
                        'c.com': 3000
                    }
                }, {
                    y: 10000,
                    domains: {
                        'a.com': 1000,
                        'b.com': 2000,
                        'c.com': 7000
                    }
                }, {
                    y: 12000,
                    domains: {
                        'a.com': 1000,
                        'b.com': 2000,
                        'c.com': 9000
                    }
                }],
                name: '',
                color: '#F7CA6F'
            }];
            o.categories = [
                "2016-03-03 14:00:00", "2016-03-03 15:00:00", "2016-03-03 16:00:00", "2016-03-03 17:00:00", "2016-03-03 18:00:00"
            ];
            return new Stats.Views.BandWidthView();
        },

        cdn: function () {
            var data = {
                "result": [{
                    "day": "20160602",
                    "province": "浙江",
                    "allCdnNodeCount": 38,
                    "aliCdnNodeCount": 14,
                    "cnkuaiCdnNodeCount": 24
                }, {
                    "day": "20160602",
                    "province": "河南",
                    "allCdnNodeCount": 28,
                    "aliCdnNodeCount": 11,
                    "cnkuaiCdnNodeCount": 17
                }, {
                    "day": "20160602",
                    "province": "江苏",
                    "allCdnNodeCount": 26,
                    "aliCdnNodeCount": 12,
                    "cnkuaiCdnNodeCount": 14
                }, {
                    "day": "20160602",
                    "province": "北京",
                    "allCdnNodeCount": 20,
                    "aliCdnNodeCount": 11,
                    "cnkuaiCdnNodeCount": 9
                }, {
                    "day": "20160602",
                    "province": "山西",
                    "allCdnNodeCount": 19,
                    "aliCdnNodeCount": 8,
                    "cnkuaiCdnNodeCount": 11
                }, {
                    "day": "20160602",
                    "province": "河北",
                    "allCdnNodeCount": 18,
                    "aliCdnNodeCount": 7,
                    "cnkuaiCdnNodeCount": 11
                }, {
                    "day": "20160602",
                    "province": "四川",
                    "allCdnNodeCount": 18,
                    "aliCdnNodeCount": 8,
                    "cnkuaiCdnNodeCount": 10
                }, {
                    "day": "20160602",
                    "province": "广东",
                    "allCdnNodeCount": 17,
                    "aliCdnNodeCount": 6,
                    "cnkuaiCdnNodeCount": 11
                }, {
                    "day": "20160602",
                    "province": "山东",
                    "allCdnNodeCount": 16,
                    "aliCdnNodeCount": 4,
                    "cnkuaiCdnNodeCount": 12
                }, {
                    "day": "20160602",
                    "province": "云南",
                    "allCdnNodeCount": 15,
                    "aliCdnNodeCount": 7,
                    "cnkuaiCdnNodeCount": 8
                }],
                "endDay": "20160602",
                "status": "OK",
                "startDay": "20160602"
            };
            return new Stats.Views.CdnView();
        },

        fluency: function () {
            var data = [{
                item: '2016060300',
                userPercentage: 1.90
            }, {
                item: '2016060301',
                userPercentage: 1.21
            }, {
                item: '2016060302',
                userPercentage: 1.32
            }, {
                item: '2016060323',
                userPercentage: 1.42
            }, {
                item: '2016060304',
                userPercentage: 1.52
            }, {
                item: '2016060305',
                userPercentage: 1.12
            }, {
                item: '2016060306',
                userPercentage: 1.02
            }, {
                item: '2016060307',
                userPercentage: 2.32
            }, {
                item: '2016060308',
                userPercentage: 3.32
            }, {
                item: '2016060309',
                userPercentage: 4.32
            }, {
                item: '2016060310',
                userPercentage: 5.32
            }, {
                item: '2016060311',
                userPercentage: 8.32
            }, {
                item: '2016060312',
                userPercentage: 11.32
            }];

            var packageData = [{
                firstPlayTime: 0.5,
                userCount: 100
            }, {
                firstPlayTime: 1.2,
                userCount: 1000
            }, {
                firstPlayTime: 3.5,
                userCount: 120
            }, {
                firstPlayTime: 4.5,
                userCount: 50
            }, {
                firstPlayTime: 2.5,
                userCount: 150
            }, {
                firstPlayTime: 3.5,
                userCount: 190
            }, {
                firstPlayTime: 4.5,
                userCount: 180
            }, {
                firstPlayTime: 2.5,
                userCount: 170
            }, {
                firstPlayTime: 3.5,
                userCount: 160
            }, {
                firstPlayTime: 4.5,
                userCount: 150
            }];

            return new Stats.Views.FluencyView({
                // mockedData: data,
                // mockedPackageData: packageData
            });
        }
    });

}(jQuery, Stats, Highcharts));


