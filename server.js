var express = require('express')
  , databaseUrl = "mongodb://overit:0v3r1t123@dharma.mongohq.com:10070/overit"
  , collections = ['overits', 'links']
  , everyauth = require('everyauth')
  , conf = require('./conf')
  , db = require("mongojs").connect(databaseUrl,collections)
  , everyauthRoot = __dirname + '.'
  , request = require("request");

var port = 3000
var UserService = require('service').UserService

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

everyauth.everymodule
  .findUserById( function (id, callback) {
    callback(null, usersById[id]);
  });

var usersByTwitId = {};

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
  //console.log(req.user); 	
  //res.render('index');
  //console.log(req.loggedIn);
  if( req.loggedIn ){
    username = req.user.twitter.screen_name;
    db.overits.aggregate( [ { $match: {user: username } }, { $group: { _id: "$url", total: { $sum: 1 } } }, { $sort: { total: - 1 } }, { $limit: 5 } ], function (err, data){
    console.log(JSON.stringify(data));
    //res.render('index', { locals: { jadedata: data } });
    res.render('index', { layout : 'layout', jadedata: JSON.stringify(data) });
  })
  } else {
    db.overits.aggregate( [ { $match: {url: /.*http.*/ } }, { $group: { _id: "$url", total: { $sum: 1 } } }, { $sort: { total: - 1 } } ], function (err, data){
      console.log("un-logged-in data: " + JSON.stringify(data));
      //res.render('index', { locals: { jadedata: data } });
      res.render('index', { layout : 'layout', jadedata: JSON.stringify(data) });
  })
  }




});

app.post('/overit', function (req, res){
	
	var url = req.body['url'];
  var datetime = new Date().getTime();

	db.overits.save({timestame: datetime , user: req.user.twitter.screen_name, url: url}, function(err, overits){
    console.log("saving the overit...");
      
      var url = req.body['url'];
      // If the URL doesn't start with http, add it.
      if (url.search(/^http/) == -1) {
          url = 'http://' + url;
      
      }

      var url = req.body['url'];
      var shortcode = makeid(url);
      console.log("here's the shortcode: " + shortcode);
      

          db.links.save({shortcode: shortcode, url: url}, function(err, saved) {

            if( err || !saved ) {
               console.log("Link not saved...already exists");
               db.links.find({url: url}, function(err, data){
                  console.log("here's the shortcode: " + JSON.stringify(data[0].shortcode));

                  res.redirect('/' + data[0].shortcode);
               });

              //res.send("Here's your shortcode: " + shortcode);
            } else {
               console.log("Link saved: http://www.delike.us/" + shortcode );
              res.redirect('/'+shortcode);
            }

          });
      })

    });


app.get('/link', function(req, res){
  res.render('overit');
});


app.get('/:link', function(req, res){

  db.links.find({shortcode: req.params.link}, function(err, links) {

  
    if( err || !links.length) {
      res.render('index');
    } else {

      req.session.shortcode = req.params.link;
      req.session.url = links[0].url;

      db.overits.find({url: links[0].url}, function(err, data) {
        res.render('overit', { layout: 'layout', data: JSON.stringify(data), showurl: data[0].url})
      })      
      
    }
    //dash.dashupdate();

  }); 

});


app.listen(process.env.PORT || port);
console.log('starting server on port ' + port);

// Link shortener logic
function makeid()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}                  


//console.log('Go to http://local.host:3000');

module.exports = app;
