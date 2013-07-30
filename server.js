var express = require('express')
  , databaseUrl = "mongodb://overit:0v3r1t123@dharma.mongohq.com:10070/overit"; 
  , collections = ['overits'];
  , everyauth = require('everyauth')
  , conf = require('./conf')
  , db = require("mongojs").connect(databaseUrl,collections)
  , everyauthRoot = __dirname + '.';

everyauth.debug = true;

var usersById = {};
var nextUserId = 0;

function addUser (source, sourceUser) {
  var user;
  if (arguments.length === 1) { // password-based
    user = sourceUser = source;
    user.id = ++nextUserId;
    return usersById[nextUserId] = user;
  } else { // non-password-based
    user = usersById[++nextUserId] = {id: nextUserId};
    user[source] = sourceUser;
  }
  return user;
}


var usersByTwitId = {};

var usersByLogin = {
  'brian@example.com': addUser({ login: 'brian@example.com', password: 'password'})
};

everyauth.everymodule
  .findUserById( function (id, callback) {
    callback(null, usersById[id]);
  });

everyauth
  .twitter
    .consumerKey(conf.twit.consumerKey)
    .consumerSecret(conf.twit.consumerSecret)
    .findOrCreateUser( function (sess, accessToken, accessSecret, twitUser) {
      return usersByTwitId[twitUser.id] || (usersByTwitId[twitUser.id] = addUser('twitter', twitUser));
    })
    .redirectPath('/');


var app = express();
app.use(express.static(__dirname + '/public'))
  .use(express.favicon())
  .use(express.bodyParser())
  .use(express.cookieParser('htuayreve'))
  .use(express.session())
  .use(everyauth.middleware());

app.configure( function () {
  app.set('view engine', 'jade');
  app.set('views', 'views');
});

app.get('/', function (req, res) {
  console.log(req.user); 	
  res.render('index');
});

app.post('/overit', function (req, res){
	
	var url = req.query.q;
	db.overits.save({timestame: datetime, user: everyauth.twitter.user.screen_name, url: url})
})

app.listen(3000);

//console.log('Go to http://local.host:3000');

module.exports = app;
