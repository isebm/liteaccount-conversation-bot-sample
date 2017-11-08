/*時刻の取得関数*/
var time = require('time');

exports.getCurrentDateTime = function (){
  //現在のタイムゾーンで時刻を取得
  var date = new time.Date();
  //日本のタイムゾーンにセット
  date.setTimezone("Asia/Tokyo");
  var format = 'YYYY-MM-DD_hh:mm:ss';
  format = format.replace(/YYYY/g, date.getFullYear());
  format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2));
  format = format.replace(/DD/g, ('0' + date.getDate()).slice(-2));
  format = format.replace(/hh/g, ('0' + date.getHours()).slice(-2));
  format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2));
  format = format.replace(/ss/g, ('0' + date.getSeconds()).slice(-2));
  return format;
}
