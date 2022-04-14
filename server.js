const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const chat_log = [];
const chat_users = [];
const random_nicknames = ["Joe", "Nimble", "Gonzo", "Chuck", "Rock", "Brow", "Mule", "Kiki"];
const original_random_nicknames = ["Joe", "Nimble", "Gonzo", "Chuck", "Rock", "Brow", "Mule", "Kiki"];

app.use(express.static('public'));
app.use(express.static(__dirname));

io.on('connection', (socket) => {
    console.log(socket.id + ' connected');

    // ability to change/set nickname and color also acts as user connecting
    // n == 0 new user
    // n == 1 existing user changing name
    // n == 2 existing user changing color
    socket.on('set_name_color', (nickname, color, n) => {
        if (n == 1) {
            // remove old nickname
            const i = chat_users.indexOf(socket.data.nickname);
            if (i > -1) {
                chat_users.splice(i, 1);
            }
            // give back random nickname to available pool
            if (original_random_nicknames.includes(socket.data.nickname)) {
                random_nicknames.unshift(socket.data.nickname);
            }
            // change chat log messages name
            chat_log.forEach((e) => {
                if (e.nickname === socket.data.nickname) {
                    e.nickname = nickname;
                }
            });
            io.emit('nn_change', socket.data.nickname, nickname);
        } else if (n == 2) {
            // change chat log messages name
            chat_log.forEach((e) => {
                if (e.nickname === nickname) {
                    e.color = color;
                }
            });
            io.emit('c_change', nickname, color);
        }
        // if user didn't choose nickname give random one from list
        if (nickname === "default_nickname") {
            socket.data.nickname = random_nicknames.pop();
            socket.emit('random_nn', socket.data.nickname);
            // add user to existing users list
            chat_users.push(socket.data.nickname);
            io.emit('add_user', socket.data.nickname);
        } else if (nickname !== socket.data.nickname) { // check if not adding the same
            socket.data.nickname = nickname;
            // add user to existing users list
            chat_users.push(socket.data.nickname);
            io.emit('add_user', socket.data.nickname);
        }
        socket.data.color = color;
        if (!n) {
            socket.broadcast.emit('user_connection', socket.data.nickname);
        }
    })

    // load chat history
    socket.emit('load_chat_history', chat_log);

    // load chat users
    socket.emit('load_chat_users', chat_users);

    // send chat message
    socket.on('chat message', (text) => {
        var time = new Date();
        console.log(time.getHours() + ":" + (time.getMinutes() < 10 ? '0' : '') +
            time.getMinutes() + ' ' + socket.data.nickname + ' message: ' + text);
        const msg = { text: text, time: time, nickname: socket.data.nickname, color: socket.data.color };

        if (chat_log.length <= 200) { // record last 200 messages
            chat_log.unshift(msg);
        } else {
            chat_log.pop();
            chat_log.unshift(msg);
        }

        io.emit('chat message', msg);
    });

    // on user disconnect (id, closing the window)
    socket.on('disconnect', () => {
        console.log(socket.id + ' disconnected');
        io.emit('user_disconnect', socket.data.nickname);
        const i = chat_users.indexOf(socket.data.nickname);
        if (i > -1) {
            chat_users.splice(i, 1);
        }
        if (original_random_nicknames.includes(socket.data.nickname)) {
            random_nicknames.unshift(socket.data.nickname);
        }
    });

    // on user disconnect (username, clicking leave)
    socket.on('user_disconnect', () => {
        io.emit('user_disconnect', socket.data.nickname);
        const i = chat_users.indexOf(socket.data.nickname);
        if (i > -1) {
            chat_users.splice(i, 1);
        }
        if (original_random_nicknames.includes(socket.data.nickname)) {
            random_nicknames.unshift(socket.data.nickname);
        }
    });

});

server.listen(process.env.PORT || 3000, () => {
    console.log('listening on *:3000');
});