var express = require('express')
  , routes  = require('./routes')
  , user    = require('./routes/user')
  , http    = require('http')
  , fs      = require('fs')
  , path    = require('path');

var app = express();
var port = 3000;
// all environments
app.set('port', process.env.PORT || port);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);

var users = [];

var io = require('socket.io').listen(app.listen(port));

io.sockets.on('connection', function(socket){

	io.sockets.emit('newUserList', {users});

	socket.on('addUser', function(name){
		socket.username = name.username;
		socket.points = name.points;
		var user = {};
		console.log("HEREISAREALLYIMPORTANTTHING");
		console.log(name);
		user.name = name.username;
		user.points = name.points;
		users.push(user);
		console.log(users);
		io.sockets.emit('updateUserList', {user, connectionType:'add'});
		fs.readFile(__dirname + "/lib/questions.json", "Utf-8", function(err, data){
			socket.emit('sendQuestions', JSON.parse(data));
		});
	});
	socket.on('disconnect', function(){
		console.log(socket.user + " has disconnected");
		var index = users.indexOf(socket.user);
		users.splice(index, 1);
		io.sockets.emit('updateUserList', {user:socket.user, connectionType:'delete'});
	});
	console.log(users);
	//Kóði tengdur því að uppfæra stigagjöf
	socket.on('correctAnswer', function(data){
		users.forEach(function(user) {
		    if (user.name == data.username) {
		    	user.points = data.points;
		    	io.sockets.emit('updatePoints', {data:user});
		    }
		});
	});
	socket.on("wrongAnswer", function(data) {
		io.sockets.emit("incorrectAnswer", {data});
		console.log("sent to clients");
	});
	//code for finishing the game
	socket.on("makeAwareOfFinishing", function(data) {
		io.sockets.emit("sendFinishToClients", {data});
		console.log("sent to clients");
	});
});
setInterval(function(){ console.log(users) }, 1000);