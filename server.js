//http модул оруулж ирээд сервэр үүсгэх
var app = require('http').createServer(handler),
//socket модул оруулж ирэх
//io = require('socket.io').listen(app),
io = require('socket.io')(app),
//файлтай ажиллах file system модул оруулж ирэх
fs = require('fs'),
//mysql модул оруулж ирэх
mysql = require('mysql2'),

//Нийт холболтыг энэ хувьсагчид авна.
connectionsArray = [],
//холбогч мөрийг тодорхойлох
connection = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: '1234',
	database: 'lab8',
	port: 3306
}),
	//ӨС-д хандах давтамж

POLLING_INTERVAL = 3000,
pollingTimer;
//ӨС-тай холбогдох хэсэг
connection.connect(function(err) {
	// connected! (unless `err` is set)
	if (err) {
		console.log(err);
	}
});
// сервэр үүсгэж уг порт дээр сонсох( localhost:3000 )
app.listen(8000);
// сервэрт хүсэлт ирэхэд client.html - г буцаана.
function handler(req, res) {
	fs.readFile(__dirname + '/client.html', function(err, data) {
		if (err) {
			console.log(err);
			res.writeHead(500);
			return res.end('Error loading client.html');
		}
		res.writeHead(200);
		res.end(data);
	});
}
/* * *
Хэрэглэгч холбогдсон бол тодорхой интервалын давтамжтайгаар ӨС-н users хүснэгтээс бичлэг * уншин үр дүнг холбогдсон
хэрэглэгчидэд буцаах Loop функц. Уг функц нь POLLING_INTERVAL * давтамжзаар өөрийгөө дуудна.
* */
var pollingLoop = function() {
	var query = connection.query('SELECT * FROM users'),
	users = [];
	// энэ массивд query-н үр дүнг авна.
	//query listeners
	query
	.on('error', function(err) {
		// алдаа үүсэхэд
		console.log(err);
		updateSockets(err);
	})
	.on('result', function(user) {
		// үр дүнг массивд авах
		users.push(user);
	})
	.on('end', function() {
		// ядаж нэг хэрэглэгч холбогдсон бол loop функц дахин дуудагдана.
		if (connectionsArray.length) {
			pollingTimer = setTimeout(pollingLoop, POLLING_INTERVAL);
			updateSockets({
				users: users
			});
		}
		else {
			console.log('The server timer was stopped because there are no more socket connections on the app')
		}
	});
};
// шинэ websocket үүсгэх
io.sockets.on('connection', function(socket){
	console.log('Number of connections:' + connectionsArray.length);
	// starting the loop only if at least there is one user connected
	if (!connectionsArray.length) {
		pollingLoop();
	}
	socket.on('disconnect', function() {
		var socketIndex = connectionsArray.indexOf(socket);
		console.log('socketID = %s got disconnected', socketIndex);
		if (~socketIndex) {
			connectionsArray.splice(socketIndex, 1);
		}
	});
	console.log('A new socket is connected!');
	connectionsArray.push(socket);
});
var updateSockets = function(data) {
	// adding the time of the last update
	data.time = new Date();
	console.log('Pushing new data to the clients connected ( connections amount = %s ) - %s',
	connectionsArray.length , data.time);
	// sending new data to all the sockets connected
	connectionsArray.forEach(function(tmpSocket) {
		tmpSocket.volatile.emit('notification', data);
	});
};