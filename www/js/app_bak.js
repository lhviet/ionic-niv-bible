// Ionic Starter App

var db = null;
var $bookScope;
var $chapterScope;
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
      });
    $urlRouterProvider.otherwise("/app/books");
  })
  .run(function($ionicPlatform, $ionicHistory, $state, bibleService) {
    $ionicPlatform.ready(function() {
      // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
      // for form inputs)
      if(window.cordova && window.cordova.plugins.Keyboard) {
        cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      }
      if(window.StatusBar) {
        StatusBar.styleDefault();
      }
      registerHardwardBackBtn($ionicPlatform, $ionicHistory, $state, bibleService);
      // copy prefilled database
      if (window.plugins && window.plugins.sqlDB){
        window.plugins.sqlDB.copy("NIVUK2011_biblica.SQLite3", 0, function() {
          bibleService.initDb()
            .then(function(result){
              bibleService.loadBooks();
              bibleService.loadChapters();
            });
        }, function(error) {
          bibleService.initDb()
            .then(function(result){
              bibleService.loadBooks();
              bibleService.loadChapters();
            });
        });

      }
      // select the right Ad Id according to platform
      var admobid = {};
      if( /(android)/i.test(navigator.userAgent) ) { // for android
        admobid = {
          banner: 'ca-app-pub-6148713949526588/2479034511', // or DFP format "/6253334/dfp_example_ad"
          interstitial: 'ca-app-pub-6148713949526588/9723099716'
        };
        // Google Analytics
        if(typeof analytics !== undefined) {
          // tracking android
          analytics.startTrackerWithId("UA-29094709-10");
        } else {
          console.log("Google Analytics Unavailable");
        }
      } else if(/(ipod|iphone|ipad)/i.test(navigator.userAgent)) { // for ios
        admobid = {
          banner: 'ca-app-pub-6148713949526588/9025095718', // or DFP format "/6253334/dfp_example_ad"
          interstitial: 'ca-app-pub-6148713949526588/1501828916'
        };
        // Google Analytics
        if(typeof analytics !== undefined) {
          // tracking ios
          analytics.startTrackerWithId("UA-29094709-11");
        } else {
          console.log("Google Analytics Unavailable");
        }
      }
      // it will display smart banner at top center, using the default options
      if(AdMob) AdMob.createBanner( {
        adId: admobid.banner,
        position: AdMob.AD_POSITION.BOTTOM_CENTER,
        autoShow: true } );
    });
  });
function registerHardwardBackBtn($ionicPlatform, $ionicHistory, $state, bibleService){
  return $ionicPlatform.registerBackButtonAction(function (event) {
    event.preventDefault();
    event.stopPropagation();
    var currentStateName = $ionicHistory.currentStateName();
    //console.log('currentStateName = '+currentStateName);
    if (currentStateName=='app.books') {
      navigator.app.exitApp();
    } else if (currentStateName=='app.about'){
      $bookScope.init();
      $state.transitionTo('app.books');
    } else if (currentStateName=='bible.chapter'){
      $bookScope.init();
      $state.transitionTo('app.books');
    }
  }, 600);
}
/**
 * Shared setting service
 */
app.factory('settingService',function(){
  var chapterSetting = true;
  return {
    getChapterSettingToggle: function(){
      return chapterSetting;
    },
    toggleChapterSetting: function(){
      chapterSetting = chapterSetting?false:true;
      return chapterSetting;
    }
  }
});
/**
 * Bible Service
 */
app.factory('bibleService', function($cordovaSQLite,$q) {
  var books = {
    oldTestament:{},
    newTestament:{}
  };
  var selectedBook = {
    number: 0,
    name: "",
    chapters: [],  // chapters = [1,2,3...]
    chapter: 0,
    verses: {},
    highlights: []
  };
  return {
    initDb: function(){
      var dfd = $q.defer();
      db = $cordovaSQLite.openDB("NIVUK2011_biblica.SQLite3");
      // create table for storing highlights
      var query = "CREATE TABLE IF NOT EXISTS highlight (book INTEGER NOT NULL, chapter INTEGER NOT NULL, verse INTEGER NOT NULL, PRIMARY KEY(book,chapter,verse))";
      $cordovaSQLite.execute(db, query).then(function(result) {
        dfd.resolve(true);
      }, function(error) {
        console.log('sqlite query error = '+JSON.stringify(error));
        dfd.resolve(false);
      });
      return dfd.promise;
    },
    highlight: function(verse){
      var query = "INSERT INTO highlight (book,chapter,verse) VALUES (?,?,?)";
      $cordovaSQLite.execute(db,query,[selectedBook.number,selectedBook.chapter,verse]).then(function(result) {
        selectedBook.highlights.push(verse.toString());
        //console.log("INSERT ID -> " + result.insertId);
      }, function(error) {
        console.error(error);
      });
    },
    unhighlight: function(verse){
      var query = "DELETE FROM highlight WHERE (book = ? AND chapter = ? AND verse = ?)";
      $cordovaSQLite.execute(db,query,[selectedBook.number,selectedBook.chapter,verse]).then(function(result) {
        selectedBook.highlights.splice(selectedBook.highlights.indexOf(verse.toString()),1);
        //console.log("DELETE ID -> " + verse);
      }, function(error) {
        console.error(error);
      });
    },
    loadBooks: function(){
      var dfd = $q.defer();
      // loading books of bible
      var query = "SELECT book_number,long_name FROM books";
      $cordovaSQLite.execute(db, query).then(function(result) {
        var book_number, long_name;
        for (var i=0; i<result.rows.length; i++) {
          book_number = result.rows.item(i).book_number;
          long_name = result.rows.item(i).long_name;
          if (book_number < 470){
            books.oldTestament[book_number] = {
              name: long_name,
              chapters: []
            };
          }else{
            books.newTestament[book_number] = {
              name: long_name,
              chapters: []
            };
          }
        }
        dfd.resolve();
      }, function(error) {
        console.log('sqlite query error = '+JSON.stringify(error));
        dfd.resolve();
      });
      return dfd.promise;
    },
    getBooks: function () {
      return books;
    },
    getBookname: function (book_number) {
      if (book_number < 470){
        return books.oldTestament[book_number].name;
      }else{
        return books.newTestament[book_number].name;
      }
    },
    getBookchapter: function (book_number) {
      if (book_number < 470){
        return books.oldTestament[book_number].chapters;
      }else{
        return books.newTestament[book_number].chapters;
      }
    },
    loadChapters: function(){ // loading all chapters into loaded books
      var query = "SELECT DISTINCT book_number,chapter FROM verses";
      $cordovaSQLite.execute(db, query).then(function(result) {
        var book_number, chapter;
        for (var i=0; i<result.rows.length; i++) {
          book_number = result.rows.item(i).book_number;
          chapter = result.rows.item(i).chapter;
          if (book_number < 470){
            books.oldTestament[book_number].chapters.push(chapter);
          }else{
            books.newTestament[book_number].chapters.push(chapter);
          }
        }
      }, function(error) {
        console.log('sqlite query error = '+JSON.stringify(error));
      });
    },
    getSelectedBook: function () {
      return selectedBook;
    },
    setSelectedBook: function (book_number) {
      var dfd = $q.defer();
      selectedBook.number = book_number;
      selectedBook.name = this.getBookname(book_number);
      selectedBook.chapters = this.getBookchapter(book_number);
      if (selectedBook.chapters.length==0){
        var query = "SELECT DISTINCT chapter FROM verses WHERE book_number = ?";
        $cordovaSQLite.execute(db, query, [book_number]).then(function(result) {
          for (var i=0; i<result.rows.length; i++) {
            selectedBook.chapters.push(result.rows.item(i).chapter);
          }
          dfd.resolve(selectedBook);
        }, function(error) {
          console.log('sqlite query error = '+JSON.stringify(error));
          dfd.resolve(false);
        });
      }else{
        dfd.resolve(selectedBook);
      }
      return dfd.promise;
    },
    setSelectedChapter: function(chapter_number){
      var dfd = $q.defer();
      selectedBook.chapter = chapter_number;
      selectedBook.highlights = [];
      var query = "SELECT verse,text FROM verses WHERE book_number = ? AND chapter = ?";
      $cordovaSQLite.execute(db, query, [selectedBook.number,chapter_number]).then(function(result) {
        var verse;
        // clear the verses
        for (var member in selectedBook.verses) delete selectedBook.verses[member];
        // loading verses' content
        for (var i=0; i<result.rows.length; i++) {
          verse = result.rows.item(i).verse;
          selectedBook.verses[verse] = result.rows.item(i).text;
        }
        query = "SELECT verse FROM highlight WHERE (book = ? AND chapter = ?)";
        $cordovaSQLite.execute(db,query,[selectedBook.number,chapter_number]).then(function(result) {
          for (var i=0; i<result.rows.length; i++) {
            verse = result.rows.item(i).verse;
            selectedBook.highlights.push(verse.toString());
          }
          dfd.resolve(selectedBook);
        }, function(error) {
          console.error(error);
          dfd.resolve(false);
        });
      }, function(error) {
        console.log('sqlite query error = '+JSON.stringify(error));
        dfd.resolve(false);
      });
      return dfd.promise;
    }
  };
});
/**
 * Left sidebar menus
 */
app.controller('AppCtrl', function($scope) {
});
/**
 * Controller of main homepage
 */
app.controller('BookCtrl', function($scope,$state,$ionicScrollDelegate,bibleService) {
  $bookScope = $scope;
  $scope.books = bibleService.getBooks();
  $scope.searchText = '';
  $scope.shownGroup = [1];
  $scope.selectedBook = bibleService.getSelectedBook();

  $scope.isSpinner=false;
  $scope.init = function(){
    $scope.isSpinner = false;
  };
  $scope.selectBook = function(book_number){
    if (book_number > 0){
      bibleService.setSelectedBook(book_number)
        .then(function(book){
          $scope.selectedBook = book;
        });
    }
  };
  $scope.selectChapter = function(chapter_number){
    $scope.isSpinner=true;
    bibleService.setSelectedChapter(chapter_number)
      .then(function(book){
        $state.transitionTo('bible.chapter');
      });
  };
  /**
   * Scroll top
   */
  $scope.scrollTop = function(){
    $scope.shownGroup = [0,1];
    $ionicScrollDelegate.scrollTop();
  };
  /*
   * if given group is the selected group, deselect it
   * else, select the given group
   */
  $scope.toggleGroup = function(group) {
    if ($scope.isGroupShown(group)) {
      $scope.shownGroup.splice($scope.shownGroup.indexOf(group),1);
    } else {
      $scope.shownGroup.push(group);
    }
  };
  $scope.isGroupShown = function(group) {
    return $scope.shownGroup.indexOf(group)>-1?true:false;
  };
  $scope.getObjLength = function(obj){
    if (!Object.keys) {
      Object.keys = function (obj) {
        var arr = [],
          key;
        for (key in obj) {
          if (obj.hasOwnProperty(key)) {
            arr.push(key);
          }
        }
        return arr;
      };
    }
    return Object.keys(obj).length;
  };
});
app.controller('BookMenuCtrl', function($scope,$ionicScrollDelegate,$cordovaClipboard,$cordovaToast,bibleService,settingService) {
  $scope.searchText = '';
  $scope.shownGroup = [1];
  $scope.books = bibleService.getBooks();
  $scope.selectedBook = bibleService.getSelectedBook();
  if ($scope.selectedBook.number > 0 && $scope.selectedBook.number < 470)
    $scope.shownGroup = [0,1];
  $scope.changeChapter = function(chapter_number){
    $scope.selectedBook.chapter = chapter_number;
    bibleService.setSelectedChapter(chapter_number)
      .then(function(book){
        $scope.selectedBook = book;
      });
    setTimeout(function(){
      var bookElement, chapterElement;

      // update position of books
      if ($scope.selectedBook.number > 0 && $scope.selectedBook.number < 470){
        bookElement = document.getElementById('oldbookchapter_'+$scope.selectedBook.number);
        bookElement.scrollIntoView();
      }
      else if ($scope.selectedBook.number >= 470){
        bookElement = document.getElementById('newbookchapter_'+$scope.selectedBook.number);
        bookElement.scrollIntoView();
      }

      // update position of chapters
      chapterElement = document.getElementById('chapter_'+$scope.selectedBook.chapter);
      chapterElement.scrollIntoView();
    },500);
  };
  $scope.selectBook = function(book_number){
    bibleService.setSelectedBook(book_number)
      .then(function(book){
        $scope.selectedBook = book;
        $scope.changeChapter(1);
      });
  };
  $scope.initBookPage = function(){
    $bookScope.init();
  };
  $scope.getObjLength = function(obj){
    if (!Object.keys) {
      Object.keys = function (obj) {
        var arr = [],
          key;
        for (key in obj) {
          if (obj.hasOwnProperty(key)) {
            arr.push(key);
          }
        }
        return arr;
      };
    }
    return Object.keys(obj).length;
  };
  /////////////////////////////////////////////////////
  /////////////////////////////////////////////////////
  $scope.isShowSetting = settingService.getChapterSettingToggle();
  $scope.toggleSetting = function(){
    $scope.isShowSetting = settingService.toggleChapterSetting();
    $chapterScope.updateSetting();
  };
  $scope.scrollTop = function(){
    $scope.shownGroup = [0,1];
    $ionicScrollDelegate.scrollTop();
  };
  /*
   * if given group is the selected group, deselect it
   * else, select the given group
   */
  $scope.toggleGroup = function(group) {
    if ($scope.isGroupShown(group)) {
      $scope.shownGroup.splice($scope.shownGroup.indexOf(group),1);
    } else {
      $scope.shownGroup.push(group);
    }
  };
  $scope.isGroupShown = function(group) {
    return $scope.shownGroup.indexOf(group)>-1?true:false;
  };
});
app.controller('ChapterCtrl', function($scope,$ionicScrollDelegate,$cordovaClipboard,$cordovaToast,bibleService,settingService) {

  $chapterScope = $scope;
  $scope.selectedBook = bibleService.getSelectedBook();
  $scope.isReload = true;
  ///////////////////////////////////////////////////////////////////////
  var verse_text = document.getElementsByClassName("verse_text");
  var fontsize, lineHeight;

  // show & hide the setting of chapter
  $scope.isShowSetting = settingService.getChapterSettingToggle();
  $scope.isShowZoomIn = true;
  $scope.isShowZoomOut = false;
  $scope.isShowNext = false;
  $scope.isShowPrev = false;
  $scope.updateSetting = function(){
    $scope.isShowSetting = false;
    if (settingService.getChapterSettingToggle()){
      $scope.isShowSetting = true;
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
      if ($scope.selectedBook.chapter > 1)
        $scope.isShowPrev = true;
      else
        $scope.isShowPrev = false;
      if ($scope.selectedBook.chapter < $scope.selectedBook.chapters.length)
        $scope.isShowNext = true;
      else
        $scope.isShowNext = false;
    }
  };
  // init in the first time load the view/controller
  $scope.updateSetting();

  $scope.onHoldVerse = function(text){
    // copy text to clipboard
    $cordovaClipboard.copy(text);
    $cordovaToast.showShortBottom('Text was copied...');
  };
  $scope.onTapVerse = function(id){
    // highlight (change font-weight also) text
    var index = $scope.selectedBook.highlights.indexOf(id.toString());
    if (index > -1){
      bibleService.unhighlight(id);
      $scope.selectedBook.highlights.splice(index,1);
    }else{
      bibleService.highlight(id);
      $scope.selectedBook.highlights.push(id);
    }
  };
  $scope.increaseFontSize = function(){
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
  };
  $scope.decreaseFontSize = function(){
    var verse_text = document.getElementsByClassName("verse_text");
    var fontsize,
      lineHeight;
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
  $scope.prevChapter = function(){
    var chap = parseInt($scope.selectedBook.chapter);
    chap = chap > 1 ? chap-1 : chap;
    bibleService.setSelectedChapter(chap)
      .then(function(book){
        $scope.selectedBook = book;
        $ionicScrollDelegate.scrollTop();
      });
    $scope.updateSetting();
  };
  $scope.nextChapter = function(){
    var chap = parseInt($scope.selectedBook.chapter);
    chap = chap < $scope.selectedBook.chapters.length ? chap+1 : chap;
    bibleService.setSelectedChapter(chap)
      .then(function(book){
        $scope.selectedBook = book;
        $ionicScrollDelegate.scrollTop();
      });
    $scope.updateSetting();
  };
});
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
////////////////////////////////////////////////////////////////////////////////////////

