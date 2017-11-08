/****************初期設定****************/
//モジュールの読み込み
var express = require('express');
var cfenv = require('cfenv');
var app = express();
var bodyParser = require('body-parser');
var appEnv = cfenv.getAppEnv();
var index = require('./routes/index');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));
app.use('/api', index);//ユーザがLINEにメッセージを送るとindex.jsが実行される
app.listen(appEnv.port, '0.0.0.0', function () {
  console.log("server starting on " + appEnv.url);
});
console.log("IPアドレス[" + process.env.CF_INSTANCE_IP + "]をLINEBotのWhiteListへ追加してください。");
