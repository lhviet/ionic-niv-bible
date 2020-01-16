/**
 * Created by Viet on 11/19/2015.
 */

/**
 * Shared setting service
 */
app.factory('settingService',function(){
  var isFullReading = false;
  var isCopyMode = false;
  return {
    isFullReadingToggle: function(){
      return isFullReading;
    },
    toggleFullReading: function(){
      isFullReading = isFullReading?false:true;
      return isFullReading;
    },
    isCopyModeToggle: function(){
      return isCopyMode;
    },
    toggleCopyMode: function(){
      isCopyMode = isCopyMode?false:true;
      return isCopyMode;
    }
  }
});
/**
 * Bible Service
 */
app.factory('bibleService', function($cordovaSQLite,$q,$sce) {
  var books = {
    oldTestament:{},
    newTestament:{}
  };
  var highlight_books = {
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
  var readingHistories = {};
  var availableBibles = [];
  return {
    reset: function(){
      books = {
        oldTestament:{},
        newTestament:{}
      };
      highlight_books = {
        oldTestament:{},
        newTestament:{}
      };
      selectedBook = {
        number: 0,
        name: "",
        chapters: [],  // chapters = [1,2,3...]
        chapter: 0,
        verses: {},
        highlights: []
      };
      availableBibles = [];
    },
    initLocalDb: function(){
      var dfd = $q.defer();
      bibleDb = $cordovaSQLite.openDB("NIVUK2011_biblica.SQLite3");
      localDb = $cordovaSQLite.openDB("LOCAL_DB.SQLite3");
      // create table for storing highlights
      var query = "CREATE TABLE IF NOT EXISTS highlight (book INTEGER NOT NULL, chapter INTEGER NOT NULL, verse INTEGER NOT NULL, createdAt DATE DEFAULT (datetime('now','localtime')), PRIMARY KEY(book,chapter,verse));";
      $cordovaSQLite.execute(localDb, query).then(function(result) {
        query = "CREATE TABLE IF NOT EXISTS configuration (key TEXT PRIMARY KEY, value TEXT NOT NULL);";
        $cordovaSQLite.execute(localDb, query).then(function(result) {
          dfd.resolve(true);
        }, function(error) {
          console.log('CREATE configuration error = '+JSON.stringify(error));
          dfd.resolve(false);
        });
      }, function(error) {
        console.log('CREATE highlight error = '+JSON.stringify(error));
        dfd.resolve(false);
      });
      return dfd.promise;
    },
    setConfig: function(key,value){
      var query = "REPLACE INTO configuration (key,value) VALUES (?,?)";
      $cordovaSQLite.execute(localDb,query,[key,value])
        .then(function(result){
          //console.log('set config '+key+' : '+value+' succeed = '+JSON.stringify(result));
        },function(error){
          //console.log('set config '+key+' : '+value+' error = '+JSON.stringify(error));
        });
    },
    getConfig: function(key){
      var dfd = $q.defer();
      var query = "SELECT value FROM configuration WHERE key LIKE ?";
      $cordovaSQLite.execute(localDb,query,[key])
        .then(function(result) {
          var val = false;
          if (result.rows.length > 0) {
            val = result.rows.item(0).value;
          }
          dfd.resolve(val);
        }, function(error) {
          console.error('getConfig error = '+JSON.stringify(error));
          dfd.resolve(false);
        });
      return dfd.promise;
    },
    setReading: function(book_number,chapter_number){
      var readingBookChap = book_number+"_"+chapter_number;
      this.setConfig(configuration.reading_book,readingBookChap);
    },
    getReading: function(){
      var dfd = $q.defer();
      this.getConfig(configuration.reading_book)
        .then(function(result){
          if (result && result.indexOf("_")>0){
            var bookNumber = result.substr(0,result.indexOf("_"));
            var chapNumber = result.substr(result.indexOf("_")+1);
            dfd.resolve([bookNumber,chapNumber]);
          }else{
            dfd.resolve([10,1]);
          }
        });
      return dfd.promise;
    },
    highlight: function(verse){
      var query = "INSERT INTO highlight (book,chapter,verse) VALUES (?,?,?)";
      $cordovaSQLite.execute(localDb,query,[selectedBook.number,selectedBook.chapter,verse]).then(function(result) {
        selectedBook.highlights.push(verse.toString());
        //console.log("INSERT ID -> " + result.insertId);
      }, function(error) {
        console.error(JSON.stringify(error));
      });
    },
    unhighlight: function(verse){
      var query = "DELETE FROM highlight WHERE (book = ? AND chapter = ? AND verse = ?)";
      $cordovaSQLite.execute(localDb,query,[selectedBook.number,selectedBook.chapter,verse]).then(function(result) {
        selectedBook.highlights.splice(selectedBook.highlights.indexOf(verse.toString()),1);
        //console.log("DELETE ID -> " + verse);
      }, function(error) {
        console.error(JSON.stringify(error));
      });
    },
    loadBooks: function(){
      var dfd = $q.defer();
      // loading books of bible
      var query = "SELECT book_number,long_name FROM books";
      $cordovaSQLite.execute(bibleDb, query).then(function(result) {
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
        dfd.resolve(true);
      }, function(error) {
        console.log('sqlite loadBooks error = '+JSON.stringify(error));
        dfd.resolve(false);
      });
      return dfd.promise;
    },
    loadHighlightedBooks: function(){
      var dfd = $q.defer();
      // loading books of bible
      var query = "SELECT DISTINCT book FROM highlight";
      $cordovaSQLite.execute(localDb, query).then(function(result) {
        var book, name, chapter, chapters;
        for (var i=0; i<result.rows.length; i++) {
          book = result.rows.item(i).book;
          if (book < 470){
            highlight_books.oldTestament[book] = {
              name: books.oldTestament[book].name,
              chapters: []
            };
          }else{
            highlight_books.newTestament[book] = {
              name: books.newTestament[book].name,
              chapters: []
            };
          }
        }
        query = "SELECT book,chapter FROM highlight";
        $cordovaSQLite.execute(localDb, query).then(function(result) {
          for (var i=0; i<result.rows.length; i++) {
            book = result.rows.item(i).book;
            chapter = result.rows.item(i).chapter;
            if (book < 470){
              if(highlight_books.oldTestament[book]['chapters'].indexOf(chapter) < 0){
                highlight_books.oldTestament[book]['chapters'].push(chapter)
              }
            }else{
              if(highlight_books.newTestament[book]['chapters'].indexOf(chapter) < 0){
                highlight_books.newTestament[book]['chapters'].push(chapter)
              }
            }
          }
          dfd.resolve(highlight_books);
        }, function(error) {
          console.log('sqlite loadHighlightedBooks error = '+JSON.stringify(error));
          dfd.resolve(false);
        });
      }, function(error) {
        console.log('sqlite loadHighlightedBooks error = '+JSON.stringify(error));
        dfd.resolve(false);
      });
      return dfd.promise;
    },
    getHighlightedBooks: function () {
      return highlight_books;
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
      $cordovaSQLite.execute(bibleDb, query).then(function(result) {
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
        console.log('sqlite loadChapters error = '+JSON.stringify(error));
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
        $cordovaSQLite.execute(bibleDb, query, [book_number]).then(function(result) {
          for (var i=0; i<result.rows.length; i++) {
            selectedBook.chapters.push(result.rows.item(i).chapter);
          }
          dfd.resolve(selectedBook);
        }, function(error) {
          console.log('sqlite setSelectedBook error = '+JSON.stringify(error));
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
      //console.log('ready to query book = '+selectedBook.number + ' + chapter = '+chapter_number);
      $cordovaSQLite.execute(bibleDb, query, [selectedBook.number,chapter_number]).then(function(result) {
        var verse,text;
        // clear the verses
        for (var member in selectedBook.verses) delete selectedBook.verses[member];
        // loading verses' content
        for (var i=0; i<result.rows.length; i++) {
          verse = result.rows.item(i).verse;
          text = result.rows.item(i).text;
          if (isRemoveStrikedText==true){
            text = text.replace(/<s>[\s\S]*?<\/s>/ig, "");
          }
          selectedBook.verses[verse] =
          {
            text: text
          };
        }
        // remove this item in history if it is existing
        var keyId = selectedBook.number + "_" + selectedBook.chapter;
        delete readingHistories[keyId];
        // add new history
        readingHistories[keyId] = {
          number: selectedBook.number,
          name: selectedBook.name,
          chapter: selectedBook.chapter
        };
        // query highlights of verses in selected chapter
        query = "SELECT verse FROM highlight WHERE (book = ? AND chapter = ?)";
        $cordovaSQLite.execute(localDb,query,[selectedBook.number,chapter_number]).then(function(result) {
          for (var i=0; i<result.rows.length; i++) {
            verse = result.rows.item(i).verse;
            selectedBook.highlights.push(verse.toString());
          }
          // query stories of verses in selected chapter
          query = "SELECT verse,title FROM stories WHERE (book_number = ? AND chapter = ?)";
          $cordovaSQLite.execute(bibleDb,query,[selectedBook.number,chapter_number]).then(function(result) {
            for (var i=0; i<result.rows.length; i++) {
              verse = result.rows.item(i).verse;
              selectedBook.verses[verse]['title'] = result.rows.item(i).title;
            }
            dfd.resolve(selectedBook);
          }, function(error) {
            //console.error('setSelectedChapter stories error = '+JSON.stringify(error));
            dfd.resolve(selectedBook);
          });
        }, function(error) {
          console.error('setSelectedChapter highlights error = '+JSON.stringify(error));
          dfd.resolve(false);
        });
      }, function(error) {
        console.log('setSelectedChapter query error = '+JSON.stringify(error));
        dfd.resolve(false);
      });
      return dfd.promise;
    },
    updateBookname: function(){
      var query = "SELECT long_name FROM books WHERE book_number LIKE ?";
      $cordovaSQLite.execute(bibleDb, query,[selectedBook.number]).then(function(result) {
        if (result.rows.length==1){
          selectedBook.name = result.rows.item(0).long_name;
        }
      }, function(error) {
        console.log('sqlite updateSecondBookname error = '+JSON.stringify(error));
      });
    },
    getHistory: function(){
      return readingHistories;
    },
    removeHistory: function(key){
      delete readingHistories[key];
    },
    getHighlights: function(index,limit,searchText){
      var dfd = $q.defer();
      var highlights = [];
      var textVerseQuery = '';
      var textVerseQueryParam = [];
      var query = "SELECT book,chapter,verse FROM highlight ORDER BY createdAt ASC LIMIT ?,?";
      $cordovaSQLite.execute(localDb,query,[index,limit]).then(function(result) {
        var book_number, chapter, verse, text='';
        for (var i=0; i<result.rows.length; i++) {
          textVerseQuery += ' (book_number = ? AND chapter = ? AND verse = ?) OR';
          textVerseQueryParam.push(result.rows.item(i).book,result.rows.item(i).chapter,result.rows.item(i).verse);
        }
        textVerseQuery = textVerseQuery.substr(0,textVerseQuery.length-3);
        query = "SELECT book_number,chapter,verse,text FROM verses WHERE ( " + textVerseQuery + " )";
        $cordovaSQLite.execute(bibleDb, query, textVerseQueryParam).then(function(result) {
          for (var i = 0; i < result.rows.length; i++) {
            book_number = result.rows.item(i).book_number;
            chapter = result.rows.item(i).chapter;
            verse = result.rows.item(i).verse;
            text = result.rows.item(i).text;
            if (isRemoveStrikedText == true) {
              text = text.replace(/<s>[\s\S]*?<\/s>/ig, "");
            }
            highlights.push({
              book_number:book_number,
              chapter:chapter,
              verse:verse,
              text:text
            });
          }
          dfd.resolve(highlights);
        }, function(error) {
          console.error('retrieve highlight texts error = '+JSON.stringify(error));
          dfd.resolve(highlights);
        });
      }, function(error) {
        console.error('retrieve highlights error = '+JSON.stringify(error));
        dfd.resolve(highlights);
      });
      return dfd.promise;
    },
    searchVerseText: function(searchText,index,limit){
      var dfd = $q.defer();
      var verseResults = [];
      var searchTextArray = searchText.split(' ');
      var queryText = searchText.trim().replace(/\s/ig,'%');
      queryText = '%' + queryText + '%';
      var query = "SELECT book_number,chapter,verse,text FROM verses WHERE text LIKE ? LIMIT ?,?";
      if (bibleDb){
        $cordovaSQLite.execute(bibleDb, query, [queryText,index,limit]).then(function (result) {
          var book_number,chapter,verse,text,book_name;
          var re;
          // loading verses' content
          for (var i = 0; i < result.rows.length; i++) {
            book_number = result.rows.item(i).book_number;
            chapter = result.rows.item(i).chapter;
            verse = result.rows.item(i).verse;
            text = result.rows.item(i).text;
            if (isRemoveStrikedText == true) {
              text = text.replace(/<s>[\s\S]*?<\/s>/ig, "");
            }

            for (var j=0; j<searchTextArray.length; j++){
              re = new RegExp(searchTextArray[j], 'ig');
              text = text.replace(re,'<b>'+searchTextArray[j]+'</b>');
            }

            if (book_number < 470){
              book_name = books.oldTestament[book_number].name;
            }else{
              book_name = books.newTestament[book_number].name;
            }
            verseResults.push({
              book_number: book_number,
              book_name: book_name,
              chapter: chapter,
              verse: verse,
              text: $sce.trustAsHtml(text)
            });
          }
          dfd.resolve(verseResults);
        }, function (error) {
          console.log('searchVerseText query error = ' + JSON.stringify(error));
          dfd.resolve(verseResults);
        });
      }else{
        dfd.resolve(verseResults);
      }
      return dfd.promise;
    }
  };
});
