var http = require('http');

var server = http.createServer(function(request, response) {

    response.writeHead(200, {"Content-Type": "text/plain"});
    var random_boolean = Math.random() >= 0.5;
    response.end(random_boolean.toString());

});

var port = 80;
server.listen(port);

console.log("Server running at http://localhost:%d", port);