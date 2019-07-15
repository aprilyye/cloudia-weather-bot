var http = require('http');

var server = http.createServer(function(request, response) {

    response.writeHead(200, {"Content-Type": "text/plain"});
    var random_boolean = Math.random() >= 0.5;
    response.end(random_boolean.toString());

});

var port = process.env.PORT || 8080;
server.listen(port);
