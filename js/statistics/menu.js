(function ($) {

    function Menu(options) {
        this.root = options.root;
        this.clickHandler = options.clickHandler;
    }

    Menu.prototype = {

        init: function () {
            var that = this;
            this.root.on('click', "a", function () {
                var $this = $(this);
                that.active($this);
                if (that.clickHandler) {
                    that.clickHandler($this);
                }
            });
        },

        active: function ($el) {

            var $subNav = $el.next(),
              $parentLi = $el.parent(),
              $parentUl = $parentLi.parent(),
              level = $parentUl.hasClass('nav-sub') ? 1 : 0;

            if (level == 0) {
                var $otherSubNav = $parentUl.find('.active').not($parentLi).removeClass('open active').find('.nav-sub');
                $otherSubNav.stop().slideUp('slow');
                $parentLi.addClass('active').toggleClass('open');
                $subNav.stop();
                if ($parentLi.hasClass('open')) {
                    $subNav.slideDown('slow');
                } else {
                    $subNav.find('.active').removeClass('active');
                    $subNav.slideUp('slow');
                }
            } else {
                $parentUl.find('.active').not($parentLi).removeClass('active');
                $parentLi.addClass('active');
            }
        }
    };


    $.fn.menu = function (options) {
        options = options || {};
        options.root = this;
        var menu = new Menu(options);
        menu.init();
        return this;
    };

}(jQuery));


