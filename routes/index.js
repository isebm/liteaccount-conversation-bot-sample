/****************初期設定****************/
//モジュールの読み込み
var express = require('express');
var app = express();
var syncRequest = require('sync-request');
var ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3');
var LanguageTranslatorV2 = require('watson-developer-cloud/language-translator/v2');
var watson = require('watson-developer-cloud');
var request = require('request');
var router = express.Router();
//環境変数取得
var vcap = JSON.parse(process.env.VCAP_SERVICES);
var vcapApplication = JSON.parse(process.env.VCAP_APPLICATION);
//関数の読み込み
var getCurrentDateTime = require('../utils/getTime')

/****************グローバル変数****************/
var translatedText; //日本語から翻訳された英文
var angerScore; // 英文から分析されたanger値
var context = {}; //conversationで用いるcontext
var responseMessage; //LINEからの送信メッセージ

router.post('/', function (req, res) { //① LINEbotに対してユーザーがメッセージを送る
  var lineInputText = req.body.events[0].message.text;
  var toneAnalyzerUsername = vcap.tone_analyzer[0].credentials.username;
  var toneAnalyzerPassword = vcap.tone_analyzer[0].credentials.password;
  var conversationUsername = vcap.conversation[0].credentials.username;
  var conversationPassword = vcap.conversation[0].credentials.password;
  var languageTranslatorUsername = vcap.language_translator[0].credentials.username;
  var languageTranslatorPassword = vcap.language_translator[0].credentials.password;

  /****************Language Translator API****************/ //②メッセージを英訳する
  var translator = new LanguageTranslatorV2({
   username: languageTranslatorUsername,
   password: languageTranslatorPassword,
   url: 'https://gateway.watsonplatform.net/language-translator/api'
  });
  translator.translate({
    text: lineInputText,
    source: 'ja',
    target: 'en'
  }, function(err, translation) {
    if (err)
      console.log(err)
      else
        translatedText = translation.translations[0].translation
        console.log("translatedText: " + translatedText);

        /****************Tone Analyzer API****************/ //③英訳されたメッセージの感情を分析し、怒りを表す数値をangerScore変数に入れる
        var tone_analyzer = new ToneAnalyzerV3({
          username: toneAnalyzerUsername,
          password: toneAnalyzerPassword,
          version_date: '2016-05-19'
        });
        var params = {
          text: translatedText,
          tones: 'emotion'
        };
        tone_analyzer.tone(params, function (error, response) {
          if (error) {
            console.log('error:', error);
          } else {
            angerScore = response.document_tone.tone_categories[0].tones[0].score;
            context.anger = angerScore;
            console.log("angerScore: " + angerScore)
          }

          /****************Conversation API****************/ //④(①)で入力されたメッセージをConversationAPIのInputに、angerScoreをcontextに設定する
          var conversation = watson.conversation({
            username: conversationUsername,
            password: conversationPassword,
            version: 'v1',
            version_date: '2017-05-26'
          });
          conversation.message({
            workspace_id: process.env.convesationID,
            input: {
              "text": lineInputText
            },
            context: context
          }, function (err, response) {
            if (err) {
              console.log('error:', err);
            } else {
              responseMessage = response.output.text[0];
              context = response.context;
              console.log("context:" + JSON.stringify(context, null, ' '))
              console.log(JSON.stringify(response, null, 2));

              /****************Cloudant API****************/ //⑤Conversationとの会話履歴をCloudantに保存する
              var toCloudant = {
                "context": context,
                "watson_text": responseMessage,
                "userinput": lineInputText,
                "dateTime": getCurrentDateTime.getCurrentDateTime()
              };
              var cloudantUrl = vcap.cloudantNoSQLDB[0].credentials.url + '/conversation';
              var res = syncRequest('POST', cloudantUrl, {
                json: toCloudant
              });
            }

            /****************LINEbotサーバー****************/ //⑥conversationのアウトプットをLINEbotの返答に設定する
            var options = {
              method: 'POST',
              uri: 'https://api.line.me/v2/bot/message/reply',
              body: {
                replyToken: req.body.events[0].replyToken,
                messages: [{
                  type: "text",
                  text: responseMessage
                }]
              },
              auth: {
                bearer: process.env.lineBotAccessToken
              },
              json: true
            };
            //画像追加送信の履歴があれば初期化
            if (options.body.messages[1]) {
              options.body.messages.pop();
            }
            //context.sendResultImageがonのときは画像を追加送信
            if (context.sendResultImage == 'on') {
              var imgUrl;
              imgUrl = "https://" + vcapApplication.application_uris[0] + "/images/" + context.carColor + "_car.jpg";
              options.body.messages[1] = {
                "type": "image",
                "originalContentUrl": imgUrl,
                "previewImageUrl": imgUrl
              };
            }
            request(options, function (err, res, body) {
              console.log(JSON.stringify(res));
            });
          });
        });

  });


  res.send('OK');
});
module.exports = router;
