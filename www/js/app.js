// Ionic Starter App
var isTesting = false;
var isReading = false;

var bibleDb = null;
var secondBibleDb = null;
var localDb = null;

var $bookScope;
var $chapterScope;
var $rightMenuChapterScope;
var $highlightContentScope;

var isRemoveStrikedText = true;
// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
var app = angular.module('starter', ['ionic','ngCordova'])
  .config(function($stateProvider, $urlRouterProvider) {
    $stateProvider
      .state('app', {
        url: '/app',
        abstract: true,
        templateUrl: 'templates/sidebar-menu-home.html',
        controller: 'AppCtrl'
      })
      .state('app.about', {
        url: '/about',
        views: {
          menuContent: {
            templateUrl: 'templates/about.html'
          }
        }
      })
      .state('app.books', {
        url: '/books',
        views: {
          menuContent: {
            templateUrl: 'templates/books.html',
            controller: 'BookCtrl'
          }
        }
      })
      .state('bible', {
        url: '/bible',
        abstract: true,
        templateUrl: 'templates/sidebar-menu-right.html',
        controller: 'BookMenuCtrl'
      })
      .state('bible.chapter', {
        url: "/chapter",
        cache: false,
        views: {
          menuContent: {
            templateUrl: 'templates/chapter.html',
            controller: 'ChapterCtrl'
          }
        }
      })
      .state('highlight', {
        url: '/highlight',
        abstract: true,
        templateUrl: 'templates/your-highlights-sidebar-menu-right.html',
        controller: 'HighlightMenuCtrl'
      })
      .state('highlight.highlights', {
        url: "/highlights",
        cache: false,
        views: {
          menuContent: {
            templateUrl: 'templates/your-highlights.html',
            controller: 'HighlightsCtrl'
          }
        }
      })
      .state('app.search', {
        url: '/search',
        cache: false,
        views: {
          menuContent: {
            templateUrl: 'templates/search.html',
            controller: 'SearchCtrl'
          }
        }
      });
    $urlRouterProvider.otherwise("/app/books");
  })
  .run(function($rootScope, $ionicPlatform, $ionicHistory, $state, $q, $cordovaGoogleAnalytics, bibleService) {
    $ionicPlatform.ready(function() {
      // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
      // for form inputs)
      if(window.cordova && window.cordova.plugins.Keyboard) {
        cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      }
      if(window.StatusBar) {
        StatusBar.styleDefault();
      }
      // select the right Ad Id according to platform
      var admobid = {};
      if( /(android)/i.test(navigator.userAgent) ) { // for android
        admobid = {
          banner: 'ca-app-pub-6148713949526588/4298577714', // or DFP format "/6253334/dfp_example_ad"
          interstitial: 'ca-app-pub-6148713949526588/5775310914'
        };
        // Google $cordovaGoogleAnalytics
        if(typeof $cordovaGoogleAnalytics !== undefined) {
          // tracking android
          $cordovaGoogleAnalytics.startTrackerWithId("UA-29094709-14");
          $cordovaGoogleAnalytics.trackView('Home Screen');
          console.log("Google Analytics for Android started !!!");
        } else {
          console.log("Google Analytics Unavailable");
        }
      } else if(/(ipod|iphone|ipad)/i.test(navigator.userAgent)) { // for ios
        admobid = {
          banner: 'ca-app-pub-6148713949526588/8728777311', // or DFP format "/6253334/dfp_example_ad"
          interstitial: 'ca-app-pub-6148713949526588/1205510510'
        };
        // Google $cordovaGoogleAnalytics
        if(typeof $cordovaGoogleAnalytics !== undefined) {
          // tracking ios
          $cordovaGoogleAnalytics.startTrackerWithId("UA-29094709-11");
          $cordovaGoogleAnalytics.trackView('Home Screen');
          console.log("Google Analytics for iOS started !!!");
        } else {
          console.log("Google Analytics Unavailable");
        }
      }
      // it will display smart banner at top center, using the default options
      if(AdMob) AdMob.createBanner( {
        adId: admobid.banner,
        position: AdMob.AD_POSITION.BOTTOM_CENTER,
        autoShow: true } );

      registerHardwardBackBtn($ionicPlatform, $ionicHistory, $state, bibleService);

      // copy prefilled database
      if (window.plugins && window.plugins.sqlDB){
        window.plugins.sqlDB.copy("NIVUK2011_biblica.SQLite3", 0, function() {
          bibleService.initLocalDb()
            .then(function(result){
              bibleService.loadBooks();
              bibleService.loadChapters();
            });
        }, function(error) {
          console.error('failed to copy NIV Bible Database = '+JSON.stringify(error));
          bibleService.initLocalDb()
            .then(function(result){
              bibleService.loadBooks();
              bibleService.loadChapters();
            });
        });
      }
    });

    /*
     * if given group is the selected group, deselect it
     * else, select the given group
     */
    $rootScope.oldNewGroup = [0,1];
    $rootScope.toggleGroup = function(group,element) {
      if ($rootScope.isGroupShown(group,element)==true) {
        group.splice(group.indexOf(element),1);
      } else if ($rootScope.isGroupShown(group,element)==false){
        group.push(element);
      }
    };
    $rootScope.isGroupShown = function(group,element) {
      return group.indexOf(element)>-1?true:false;
    };
    $rootScope.getObjLength = function(obj){
      if (!Object.keys) {
        Object.keys = function (obj) {
          var arr = [],
            key;
          for (key in obj) {
            if (obj.hasOwnProperty(key)) {
              arr.push(key);
            }
          }
          return arr.length;
        };
      }
      return Object.keys(obj).length;
    };
    $rootScope.selectedBook = bibleService.getSelectedBook();
  });
function registerHardwardBackBtn($ionicPlatform, $ionicHistory, $state){
  return $ionicPlatform.registerBackButtonAction(function (event) {
    event.preventDefault();
    event.stopPropagation();
    var currentStateName = $ionicHistory.currentStateName();
    $ionicHistory.nextViewOptions({
      historyRoot: true
    });
    if (currentStateName=='app.books') {
      navigator.app.exitApp();
    }
    else if (currentStateName=='app.about'){
      $bookScope.init();
      $state.transitionTo('app.books');
    }
    else if (currentStateName=='app.bibles'){
      $bookScope.init();
      $state.transitionTo('app.books');
    }
    else if (currentStateName=='bible.chapter'){
      $bookScope.init();
      $state.transitionTo('app.books');
    }
    else if (currentStateName=='highlight.highlights'){
      $bookScope.init();
      $state.transitionTo('app.books');
    }
    else if (currentStateName=='app.search'){
      $bookScope.init();
      $state.transitionTo('app.books');
    }
  }, 600);
};

/**
 * Left sidebar menus
 */
app.controller('AppCtrl', function($scope,$state,bibleService) {
  $scope.isTesting = isTesting;
  $scope.startRead = function(){
    isReading = true;
    // open the last book & chapter that you were reading
    bibleService.getReading()
      .then(function(result){
        if (!result || result.length < 2){
          result[0] = 10;
          result[1] = 1;
        }
        bibleService.setSelectedBook(result[0])
          .then(function(book){
          });
        bibleService.updateBookname();
        bibleService.setSelectedChapter(result[1])
          .then(function(book){
          });
        $state.transitionTo('bible.chapter');

        if ($rightMenuChapterScope){
          $rightMenuChapterScope.setupPopover();
        }

      });
  };
});
/**
 * Controller of main homepage
 */
app.controller('BookCtrl', function($rootScope,$scope,$state,$ionicScrollDelegate,bibleService) {
  $bookScope = $scope;
  $scope.searchText = '';
  $scope.books = bibleService.getBooks();

  $scope.spinner = 0;
  $scope.init = function(){
    $scope.spinner = 0;
  };

  // reset Book after deleting all available Bibles
  $scope.reset = function(){
    $scope.books = bibleService.getBooks();
  };

  $scope.selectBook = function(book_number){
    bibleService.setSelectedBook(book_number)
      .then(function(book){
      });
    bibleService.updateBookname();
  };
  $scope.selectChapter = function(chapter_number){
    $scope.spinner = chapter_number;
    bibleService.setSelectedChapter(chapter_number)
      .then(function(book){
      });
    isReading = false;
    $state.transitionTo('bible.chapter');
    if ($rightMenuChapterScope){
      $rightMenuChapterScope.setupPopover();
    }
  };
  /**
   * Scroll top
   */
  $scope.scrollTop = function(){
    $rootScope.oldNewGroup = [0,1];
    $ionicScrollDelegate.scrollTop();
  };
});
app.controller('BookMenuCtrl', function($rootScope,$scope,$ionicScrollDelegate,$cordovaClipboard,$cordovaToast,$ionicPopover,
                                        bibleService,settingService) {
  $rightMenuChapterScope = $scope;

  $scope.searchText = '';
  $scope.books = bibleService.getBooks();

  $scope.selectBook = function(book_number){
    bibleService.setSelectedBook(book_number)
      .then(function(book){
      });
    bibleService.updateBookname();
    $scope.changeChapter(1);
  };
  $scope.changeChapter = function(chapter_number){
    bibleService.setSelectedChapter(chapter_number)
      .then(function(book){
      });
    // update if there is reading page
    if (isReading == true){
      bibleService.setReading($rootScope.selectedBook.number, chapter_number);
    }
    setTimeout(function(){
      var bookElement, chapterElement;

      // update position of books
      if ($rootScope.selectedBook.number > 0 && $rootScope.selectedBook.number < 470){
        bookElement = document.getElementById('oldbookchapter_'+$rootScope.selectedBook.number);
        bookElement.scrollIntoView();
      }
      else if ($rootScope.selectedBook.number >= 470){
        bookElement = document.getElementById('newbookchapter_'+$rootScope.selectedBook.number);
        bookElement.scrollIntoView();
      }

      // update position of chapters
      chapterElement = document.getElementById('chapter_'+$rootScope.selectedBook.chapter);
      chapterElement.scrollIntoView();
    },500);
    $ionicScrollDelegate.scrollTop();
  };
  $scope.initBookPage = function(){
    $bookScope.init();
  };
  /////////////////////////////////////////////////////
  $scope.popover_setting = null;

  // Popover for Setting
  $scope.setupPopover = function(){
    $ionicPopover.fromTemplateUrl('templates/chapter-setting-popover.html', {
      scope: $scope
    }).then(function(popover) {
      $scope.popover_setting = popover;
    });
  };
  $ionicPopover.fromTemplateUrl('templates/chapter-setting-popover.html', {
    scope: $scope
  }).then(function(popover) {
    $scope.popover_setting = popover;
  });
  $scope.openPopover = function($event) {
    $scope.popover_setting.show($event);
  };
  /////////////////////////////////////////////////////
  $scope.isFullReading = settingService.isFullReadingToggle();
  $scope.isShowZoomIn = true;
  $scope.isShowZoomOut = false;
  $scope.toggleSetting = function(){
    $scope.isFullReading = settingService.toggleFullReading();
    $chapterScope.updateSetting();
    $scope.updateSetting();
  };
  /////////////////////////////////////////////////////
  var verse_text;
  var fontsize, lineHeight;
  $scope.updateSetting = function(){
    verse_text = document.getElementsByClassName("verse_text");
    if (verse_text.length > 0) {
      fontsize = verse_text[0].style.fontSize;
      fontsize = parseInt(fontsize.substr(0,2));
      if (fontsize < 44)
        $scope.isShowZoomIn = true;
      else
        $scope.isShowZoomIn = false;
      if (fontsize > 16)
        $scope.isShowZoomOut = true;
      else
        $scope.isShowZoomOut = false;
    }
  };
  $scope.increaseFontSize = function(){
    verse_text = document.getElementsByClassName("verse_text");
    if(verse_text.length > 0){
      fontsize = verse_text[0].style.fontSize;
      fontsize = parseInt(fontsize.substr(0,2));
      lineHeight = verse_text[0].style.lineHeight;
      lineHeight = parseInt(lineHeight.substr(0,2));
      if (fontsize < 44){
        fontsize += 2;
        lineHeight += 2;
      }
      for (var i = 0; i < verse_text.length; i++) {
        verse_text[i].style.fontSize = fontsize+'px';
        verse_text[i].style.lineHeight = lineHeight+'px';
      }
      $scope.updateSetting();
    }
    verse_text = document.getElementsByClassName("secondary-text");
    if(verse_text.length > 0){
      fontsize = verse_text[0].style.fontSize;
      fontsize = parseInt(fontsize.substr(0,2));
      lineHeight = verse_text[0].style.lineHeight;
      lineHeight = parseInt(lineHeight.substr(0,2));
      if (fontsize < 42){
        fontsize += 2;
        lineHeight += 2;
      }
      for (var i = 0; i < verse_text.length; i++) {
        verse_text[i].style.fontSize = fontsize+'px';
        verse_text[i].style.lineHeight = lineHeight+'px';
      }
    }
  };
  $scope.decreaseFontSize = function(){
    verse_text = document.getElementsByClassName("verse_text");
    if(verse_text.length > 0){
      fontsize = verse_text[0].style.fontSize;
      fontsize = parseInt(fontsize.substr(0,2));
      lineHeight = verse_text[0].style.lineHeight;
      lineHeight = parseInt(lineHeight.substr(0,2));
      if (fontsize > 16){
        fontsize -= 2;
        lineHeight -= 2;
      }
      for (var i = 0; i < verse_text.length; i++) {
        verse_text[i].style.fontSize = fontsize+'px';
        verse_text[i].style.lineHeight = lineHeight+'px';
      }
      $scope.updateSetting();
    }
  };
  /////////////////////////////////////////////////////
  // toggle copy mode function
  $scope.isCopyMode = settingService.isCopyModeToggle();
  $scope.toggleCopyMode = function(){
    $scope.isCopyMode = settingService.toggleCopyMode();
    if ($chapterScope){
      $chapterScope.isCopyMode = $scope.isCopyMode;
      if ($scope.isCopyMode==false) {
        $chapterScope.resetCopy();
      }
    }
  };
  /////////////////////////////////////////////////////
  $scope.scrollTop = function(){
    $rootScope.oldNewGroup = [0,1];
    $ionicScrollDelegate.scrollTop();
  };
});
app.controller('ChapterCtrl', function($rootScope,$scope,$ionicScrollDelegate,$cordovaClipboard,$cordovaToast,$ionicPopover,
                                       $state, bibleService,settingService) {
  $chapterScope = $scope;

  $scope.isReload = true;

  ///////////////////////////////////////////////////////////////////////
  $scope.readingHistories = {};
  // Popover for Reading History
  $scope.popover_history = null;
  $ionicPopover.fromTemplateUrl('templates/history-popover.html', {
    scope: $scope
  }).then(function(popover) {
    $scope.popover_history = popover;
  });
  // open history popup
  $scope.openHistory = function($event){
    $scope.readingHistories = bibleService.getHistory();
    $scope.popover_history.show($event);
  };
  // restore history
  $scope.restoreHistory = function(key,value){
    bibleService.setSelectedBook(value.number)
      .then(function(book){
      });
    bibleService.setSelectedChapter(value.chapter)
      .then(function(book){
      });
    $ionicScrollDelegate.scrollTop();

    // update if there is reading page
    if (isReading == true){
      bibleService.setReading($rootScope.selectedBook.number, $rootScope.selectedBook.chapter);
    }
    $scope.popover_history.hide();
  };
  // remove history
  $scope.removeHistory = function(key){
    bibleService.removeHistory(key);
  };
  ///////////////////////////////////////////////////////////////////////

  // show & hide the setting of chapter
  $scope.isFullReading = settingService.isFullReadingToggle();
  $scope.isShowNext = false;
  $scope.isShowPrev = false;
  $scope.updateSetting = function(){
    $scope.isFullReading = settingService.isFullReadingToggle();
    if ($scope.isFullReading==false){
      if ($rootScope.selectedBook.chapter > 1)
        $scope.isShowPrev = true;
      else
        $scope.isShowPrev = false;
      if ($rootScope.selectedBook.chapter < $rootScope.selectedBook.chapters.length)
        $scope.isShowNext = true;
      else
        $scope.isShowNext = false;
    }
  };
  // init in the first time load the view/controller
  $scope.updateSetting();

  $scope.isCopyMode = false;
  $scope.copyText = [];
  $scope.highlight_copies = [];
  $scope.onTapVerse = function(id,verse){
    var uniqueId = $rootScope.selectedBook.number + "_" + $rootScope.selectedBook.chapter + "_" + id;
    $scope.isCopyMode = settingService.isCopyModeToggle();
    if (settingService.isCopyModeToggle()==true){
      // copy text to clipboard
      var index = $scope.highlight_copies.indexOf(uniqueId);
      if (index < 0){
        var text = '';
        if ($scope.copyText.length > 0)
          text= "\n";
        text += "(" + $rootScope.selectedBook.name + " " + $rootScope.selectedBook.chapter + ":" + id + ") " + verse.text;

        $scope.copyText.push(text);
        $scope.highlight_copies.push(uniqueId);
        $cordovaToast.showShortBottom('Press Copy Button to copy.');
      }else{
        $scope.copyText.splice(index,1);
        $scope.highlight_copies.splice(index,1);
      }
    }else{
      // highlight (change font-weight also) text
      var index = $rootScope.selectedBook.highlights.indexOf(id.toString());
      if (index > -1){
        bibleService.unhighlight(id);
        $rootScope.selectedBook.highlights.splice(index,1);
      }else{
        bibleService.highlight(id);
        $rootScope.selectedBook.highlights.push(id);
      }
    }
  };
  $scope.copySelectedVerses = function(){
    var fullText = '';
    for	(var index = 0; index < $scope.copyText.length; index++) {
      fullText += $scope.copyText[index];
    }
    $cordovaClipboard.copy(fullText);
    $cordovaToast.showShortBottom('Copied to clipboard.');
    settingService.toggleCopyMode();
    $scope.resetCopy();
    if ($rightMenuChapterScope)
      $rightMenuChapterScope.isCopyMode = false;
  };
  $scope.resetCopy = function(){
    $scope.copyText = [];
    $scope.highlight_copies = [];
    $scope.isCopyMode = false;
  };
  // next & previous chapter function
  $scope.prevChapter = function(){
    var chap = parseInt($rootScope.selectedBook.chapter);
    chap = chap > 1 ? chap-1 : chap;
    bibleService.setSelectedChapter(chap)
      .then(function(book){
      });

    $ionicScrollDelegate.scrollTop();
    // update if there is reading page
    if (isReading == true){
      bibleService.setReading($rootScope.selectedBook.number, $rootScope.selectedBook.chapter);
    }
    $scope.updateSetting();
  };
  $scope.nextChapter = function(){
    var chap = parseInt($rootScope.selectedBook.chapter);
    chap = chap < $rootScope.selectedBook.chapters.length ? chap+1 : chap;
    bibleService.setSelectedChapter(chap)
      .then(function(book){
      });

    $ionicScrollDelegate.scrollTop();
    // update if there is reading page
    if (isReading == true){
      bibleService.setReading($rootScope.selectedBook.number, $rootScope.selectedBook.chapter);
    }
    $scope.updateSetting();
  };

});

app.controller('HighlightMenuCtrl', function($rootScope,$scope,$ionicScrollDelegate,bibleService) {

  $scope.books = bibleService.getHighlightedBooks();

  $scope.pageName = "Recent Highlights";

  $scope.isRecentHighlight = true;

  $scope.initBookPage = function(){
    $bookScope.init();
  };

  $scope.initHighlightMenu = function(){
    bibleService.loadHighlightedBooks()
      .then(function(result){
        if (result){
          $scope.books = result;
        }
      });
  };
  $scope.selectBook = function(book_number){
    if (book_number > 0){
      bibleService.setSelectedBook(book_number)
        .then(function(book){
          bibleService.updateBookname();
          if (book_number < 470){
            $rootScope.selectedBook['chapters'] = $scope.books.oldTestament[book_number]['chapters'];
          }
          else {
            $rootScope.selectedBook['chapters'] = $scope.books.newTestament[book_number]['chapters'];
          }
          $scope.changeChapter(book.chapters[0]);
          $scope.pageName = book.name + " " + book.chapters[0];
        });
    }else{
      $scope.pageName = "Recent Highlights";
      $highlightContentScope.initLoading();
      $scope.isRecentHighlight = true;
    }
  };
  $scope.changeChapter = function(chapter_number){
    bibleService.setSelectedChapter(chapter_number)
      .then(function(book){
        $scope.isRecentHighlight = false;
        $scope.pageName = book.name + " " + chapter_number;
      });
    setTimeout(function(){
      var bookElement, chapterElement;

      // update position of books
      if ($rootScope.selectedBook.number > 0 && $rootScope.selectedBook.number < 470){
        bookElement = document.getElementById('oldbookchapter_'+$rootScope.selectedBook.number);
        bookElement.scrollIntoView();
      }
      else if ($rootScope.selectedBook.number >= 470){
        bookElement = document.getElementById('newbookchapter_'+$rootScope.selectedBook.number);
        bookElement.scrollIntoView();
      }

      // update position of chapters
      chapterElement = document.getElementById('chapter_'+chapter_number);
      if (chapterElement)
        chapterElement.scrollIntoView();

    },500);
    $ionicScrollDelegate.scrollTop();
  };

  /////////////////////////////////////////////////////
  $scope.scrollTop = function(){
    $rootScope.oldNewGroup = [0,1];
    $ionicScrollDelegate.scrollTop();
  };
});
app.controller('HighlightsCtrl', function($scope,$ionicScrollDelegate,$state,bibleService,settingService) {

  $highlightContentScope = $scope;
  $scope.index = 0;
  $scope.limit = 20;
  $scope.isLoadMore = true;
  $scope.highlights= [];

  $scope.initLoading = function(){
    $scope.index = 0;
    $scope.limit = 20;
    $scope.isLoadMore = true;
    $scope.highlights= [];
    $scope.loadHighlights();
  };
  // loading highlighted verses
  $scope.loadHighlights = function(){
    bibleService.getHighlights($scope.index, $scope.limit)
      .then(function(highlights){
        $scope.highlights = $scope.highlights.concat(highlights);
        $scope.index += $scope.highlights.length;
        if (highlights.length < $scope.limit){
          $scope.isLoadMore = false;
        }
      });
  };
  // retrieve book name of verse
  $scope.getBookname = function(book_number){
    return bibleService.getBookname(book_number);
  };

});

/**
 * Controller of Search Page
 */
app.controller('SearchCtrl', function($scope,$state,$ionicScrollDelegate,bibleService) {
  $scope.index = 0;
  $scope.limit = 20;
  $scope.searchText = '';
  $scope.verses = [];

  $scope.searchVerse = function(){
    if ($scope.searchText && $scope.searchText.length > 2){
      bibleService.searchVerseText($scope.searchText,$scope.index,$scope.limit)
        .then(function(result){
          $scope.verses = result;
          $ionicScrollDelegate.scrollTop();
        });
    }
  };
  $scope.openBookChapter = function(verse){
    bibleService.setSelectedBook(verse.book_number);
    bibleService.setSelectedChapter(verse.chapter);
    $state.transitionTo('bible.chapter');
  };
});

////////////////////////////////////////////////////////////////////////////////////////
app.filter('objectByKeyValFilter', function () {
  return function (input, filterKey, filterVal) {
    var filteredInput ={};
    angular.forEach(input, function(value, key){
      if(value[filterKey] && value[filterKey].search(new RegExp(filterVal, "i")) > -1){
        filteredInput[key]= value;
      }
    });
    return filteredInput;
  }
});
app.filter('bibleObjFilter', function () {
  return function (input, filterKeyVal) {
    var filteredInput ={};
    angular.forEach(input, function(value, key){
      for (var filterKey in filterKeyVal){
        if(value[filterKey] && value[filterKey].search(new RegExp(filterKeyVal[filterKey], "i")) > -1){
          filteredInput[key]= value;
        }
      }
    });
    return filteredInput;
  }
});

