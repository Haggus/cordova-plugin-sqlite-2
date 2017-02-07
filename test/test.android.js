'use strict';

var Promise = require('bluebird');
var assert = require('assert');

/*jshint -W079 */
var openDatabase = typeof sqlitePlugin !== 'undefined' ?
  sqlitePlugin.openDatabase.bind(sqlitePlugin) :
  window.openDatabase.bind(window);

function transactionPromise(db, sql, sqlArgs) {
  return new Promise(function (resolve, reject) {
    var result;
    db.transaction(function (txn) {
      txn.executeSql(sql, sqlArgs, function (txn, res) {
        result = res;
      });
    }, reject, function () {
      resolve(result);
    });
  });
}

describe('android specific test suite', function () {

  var db;

  beforeEach(function () {
    db = openDatabase(':memory:', '1.0', 'yolo', 100000);
  });

  afterEach(function () {
    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('DROP TABLE IF EXISTS table1');
        txn.executeSql('DROP TABLE IF EXISTS table2');
        txn.executeSql('DROP TABLE IF EXISTS table3');
      }, reject, resolve);
    }).then(function () {
      db = null;
    });
  });

  it('issue #43 - null saves as "null" string in db', function () {
    var sql = 'CREATE TABLE table1 (text1 string, text2 string)';
    return transactionPromise(db, sql).then(function () {
    }).then(function () {
      return Promise.all([
        transactionPromise(db,
          'INSERT INTO table1 VALUES (?, ?)', ["foo", "bar"]),
        transactionPromise(db,
          'INSERT INTO table1 VALUES (?, ?)', [null, "baz"]),
        transactionPromise(db,
          'INSERT INTO table1 VALUES (?, ?)', ["toto", null]),
        transactionPromise(db,
          'INSERT INTO table1 VALUES (?, ?)', [null, null])
      ]);
    }).then(function () {
      var sql = 'SELECT * from table1';
      return transactionPromise(db, sql);
    }).then(function (res) {
      assert.equal(res.rows.length, 4);

      assert.strictEqual(res.rows.item(0).text1, "foo");
      assert.strictEqual(res.rows.item(0).text2, "bar");

      assert.strictEqual(res.rows.item(1).text1, null);
      assert.strictEqual(res.rows.item(1).text2, "baz");

      assert.strictEqual(res.rows.item(2).text1, "toto");
      assert.strictEqual(res.rows.item(2).text2, null);

      assert.strictEqual(res.rows.item(3).text1, null);
      assert.strictEqual(res.rows.item(3).text2, null);
    });
  });

});
