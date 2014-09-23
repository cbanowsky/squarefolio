Y.use('node', 'squarespace-gallery-ng' ,'squarespace-image-loader', 'event-key', function(Y) {

  window.Site = Singleton.create({

    ready: function() {
      this.slideshow = null;
      this.thumbs = null;

      Y.on('domready', this.initialize, this);
    },

    initialize: function() {

      this.setupNavigation();

      if (Y.one('body.collection-type-gallery')) {
        this.setupGallery();
        this.setupTweakHandlers();
      } else if (Y.one('body.collection-type-blog')) {
        var sidebarEl = Y.one('#sidebarWrapper');
        Y.one('#page').setStyle('minHeight', sidebarEl.get('offsetHeight'));
      }
    },

    setupNavigation: function() {

      // folder click thru fix
      if (Modernizr && Modernizr.touch) {
        Y.all('nav .folder').each(function (f){

          if (f.all('a').size() > 1) {

            f.one('a').on('click', function (e) {
              e.preventDefault();
            });
          }
        });
      }

      // Mobile Nav ///////////////////////////////////
      var mobileMenu = Y.one('#mobileMenuLink a');
      mobileMenu && mobileMenu.on('click', function(e){
        var mobileMenuHeight = parseInt(Y.one('#mobileNav .wrapper').get('offsetHeight'),10);
        if (Y.one('#mobileNav').hasClass('menu-open')) {
          new Y.Anim({ node: Y.one('#mobileNav'), to: { height: 0 }, duration: 0.5, easing: 'easeBoth' }).run();
        } else {
          new Y.Anim({ node: Y.one('#mobileNav'), to: { height: mobileMenuHeight }, duration: 0.5, easing: 'easeBoth' }).run();
        }

        Y.one('#mobileNav').toggleClass('menu-open');
      });

    },

    loadThumbs: function() {
      if (Y.one('body.full-view')) {
        return;
      }

      if (Y.one('body.index-fullwidth')) {
        var imgHeight = parseInt(Y.Squarespace.Template.getTweakValue('indexItemHeight'),10);
        var padding = parseInt(Y.Squarespace.Template.getTweakValue('indexItemPadding'),10);
        var thumbListWidth = Y.one('#thumbList').width() + padding; // to compensate for marginRight on last-in-row

        var imgsInRow = new Y.NodeList();
        var sumWidths = 0; // sum of image widths
        var sumRatios = 0; // sum of image aspect ratios

        Y.all('#thumbList img').each(function(img) {
          var dims = Y.Squarespace.Rendering.getDimensionsFromNode(img);
          var itemWidth = padding + Y.Squarespace.Rendering.getWidthForHeight(dims.width, dims.height, imgHeight);

          // if overshooting, fit existing images in row
          if (itemWidth + sumWidths > thumbListWidth) {
            var newHeight = imgHeight + ((thumbListWidth - sumWidths) / sumRatios); // rough estimate
            
            var imgsWidth = 0;
            imgsInRow.each(function(img, i) {
              var newWidth = Math.ceil(img.aspectRatio * newHeight);
              var lastOne = i === imgsInRow.size() - 1;

              if (lastOne) { // make last one take up remaining space
                newWidth = thumbListWidth - imgsWidth - padding;
                img.ancestor('span').addClass('last-in-row');
              }

              img.setStyle('height', newHeight + 'px').get('parentNode').setStyles({
                height: newHeight + 'px',
                width: newWidth + 'px',
                marginRight: lastOne ? 0 : null
              });
              ImageLoader.load(img.removeAttribute('data-load'));

              imgsWidth += padding + newWidth;
            });
            
            sumWidths = 0;
            sumRatios = 0;
            imgsInRow = new Y.NodeList();
          }

          img.aspectRatio = dims.width / dims.height;
          sumRatios += img.aspectRatio;
          sumWidths += itemWidth;
          imgsInRow.push(img);
        });

        // Load the remaining
        imgsInRow.each(function(img) {
          img.setStyle('height', null).get('parentNode').setStyles({
            marginRight: null,
            height: null,
            width: null
          });
          ImageLoader.load(img.removeAttribute('data-load'));
        });
      } else {
        Y.all('#thumbList img').each(function(img) {
          img.setStyle('height', null).get('parentNode').setStyles({
            marginRight: null,
            height: null,
            width: null
          });
          ImageLoader.load(img.removeAttribute('data-load'));
        });
      }

    },

    setupGallery: function() {

      if (Y.one('body').get('winWidth') < 800) {

        Y.all('#slideshow .slide').each(function(slide) {
          if (slide.one('.sqs-video-wrapper')) {
            slide.one('.sqs-video-wrapper').plug(Y.Squarespace.VideoLoader);
          } else {
            ImageLoader.load(slide.one('img').removeAttribute('data-load'));
          }
        });

      } else {

        var canvasPadding = parseInt(Y.Squarespace.Template.getTweakValue('outerPadding'),10);
        var logoHeight = parseInt(Y.Squarespace.Template.getTweakValue('logoSize'),10);
        var siteSubTitleHeight = Y.one('.logo-subtitle') ? Y.one('.logo-subtitle').get('offsetHeight') : 0;
        var headerHeight = Y.one('#headerWrapper').get('offsetHeight');
        if (logoHeight > headerHeight) {
          headerHeight = logoHeight + parseInt(Y.Squarespace.Template.getTweakValue('headerPadding'),10);
        }
        var controlsHeight = Y.one('#simpleControls').get('offsetHeight') + Y.one('#numberControls').get('offsetHeight') + Y.one('#dotControls').get('offsetHeight') + Y.one('#tinyThumbControls').get('offsetHeight') + 40;

        console.log('canvasPadding', canvasPadding);
        console.log('logoHeight', logoHeight);
        console.log('siteSubTitleHeight', siteSubTitleHeight);
        console.log('headerHeight', headerHeight);
        console.log('controlsHeight', controlsHeight);

        

        var setHeight = function() {
          var windowHeight = Y.one('body').get('winHeight');
          var headerHeight = Y.one('#headerWrapper').get('offsetHeight');
          console.log('windowHeight', windowHeight);
          console.log('htmlheight - windowHeight', Y.one('html').get('offsetHeight') - windowHeight);
          if ((windowHeight - canvasPadding - headerHeight*2) > 600) {
            Y.one('#slideshowWrapper').setStyle('height', windowHeight - canvasPadding*2 - headerHeight - controlsHeight);
          } else {
            Y.one('#slideshowWrapper').setStyle('height', '600px');
          }
        };

        setHeight();
        this.lazyOnResize(function(e) {
          this.loadThumbs();
          setHeight();
          this.slideshow.refresh();
        }, 100);

        var itemId = (new Y.HistoryHash()).get('itemId');

        // full slideshow
        if (Y.one('#slideshow .slide')) {
          this.slideshow = new Y.Squarespace.Gallery2({
            container: Y.one('#slideshow'),
            elements: {
              next: '.next-slide',
              previous: '.prev-slide',
              controls: '#dotControls, #numberControls, #tinyThumbControls'
            },
            lazyLoad: true,
            loop: true,
            design: 'stacked',
            designOptions: {
              autoHeight: false,
              preloadCount: 1
            },
            loaderOptions: { mode: 'fit' },
            historyHash: true
          });
        }

        // thumbnails set currentIndex and toggle full-view
        Y.one('#thumbList').delegate('click', function(e) {
          this.slideshow.set('currentIndex', Y.all('.thumb').indexOf(e.currentTarget));
          Y.one('body').addClass('full-view');
          Y.one('#slideshowWrapper').addClass('slideshow-ready');
        }, '.thumb', this);

        Y.one('#imageInfoToggle').on('click', function(e) {
          Y.one('#slideshowWrapper').toggleClass('image-info-on');
        });




        /* Bind Escape Key to Close Lightbox
        **************************************/

        // Disable the escape to login if the lighbox is open.
        Y.one(window).on('key', function (e) {
          Y.one('.full-view') ? Y.Squarespace.EscManager.disable() : Y.Squarespace.EscManager.enable();
        }, 'esc');

        // Store the lightbox close function.
        var closeLightbox = Y.bind(function () {
          Y.one('body').removeClass('full-view');
          Y.one('#slideshowWrapper').removeClass('slideshow-ready');
          if (window.history && window.history.replaceState) {
            window.history.replaceState('itemId', null, Static.SQUARESPACE_CONTEXT.collection.fullUrl);
          }
          this.loadThumbs();
        }, this);

        // Bind the event handlers.
        Y.one('#backToThumbs').on('click', closeLightbox, this);
        Y.one(window).on('key', closeLightbox, 'esc');





        if (itemId) {
          var thumbNode = Y.one('#thumbList .thumb[data-slide-id="'+itemId+'"]');
          thumbNode && thumbNode.simulate('click');
        }

      }

      // Fix for videos not stopping when closing lightbox.
      Y.one('#backToThumbs').on('click', function () {
        Y.all('.sqs-video-wrapper').each(function(video) {
          video.videoloader.reload();
        });
      });

      /*
        Hack to fix broken layouts. We really should fix this,
        this solution is just awful. Sorry.
      */
      if (Y.one('#thumbList .last-in-row') && Y.one('#thumbList .thumb')) {
        if (Y.one('#thumbList .last-in-row').getY() != Y.one('#thumbList .thumb').getY()) {
          Y.one(window).simulate('resize');
        }
      }
    },

    setupTweakHandlers: function() {

      Y.Global.on('tweak:change', function(f){
        if (f.getName() == 'gallery-style' || f.getName() == 'gallery-auto-play' ) {
          if (f.getName() == 'gallery-auto-play') {
            this.slideshow.set('autoplay', Y.Squarespace.Template.getTweakValue('gallery-auto-play') + '' === 'true');
          }
        } else if (f.getName().match(/indexItem|index-fullwidth/) !== null) {
          this.loadThumbs();
        }
      }, this);

      Y.Global.on(['tweak:reset','tweak:beforeopen'], function(){
        this.slideshow && Y.later(500, this, function() {
          this.slideshow.refresh();
          this.loadThumbs();
        });
      }, this);

      Y.Global.on('tweak:close', function(){
        this.slideshow && Y.later(500, this, function() {
          this.slideshow.refresh();
          this.loadThumbs();
        });
      }, this);

    },

    lazyOnResize: function(f,t) {
      var timer;
      Y.one('window').on('resize', function(e){
        if (timer) { timer.cancel(); }
        timer = Y.later(t, this, f);
      }, this);
    }

  });

});